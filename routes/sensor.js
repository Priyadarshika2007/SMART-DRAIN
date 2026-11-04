import express from 'express';
import { getDb } from '../config/db.js';
import { handleValidationErrors, validateSensorPayload } from '../middleware/validate.js';
import sendAlertEmail from '../utils/emailService.js';

const router = express.Router();

function calculateDhi(waterLevelCm, flowRateLMin) {
  return Number((waterLevelCm * 0.6 + flowRateLMin * 0.4).toFixed(2));
}

function getDrainStatus(dhiScore) {
  if (dhiScore < 40) return 'Good';
  if (dhiScore < 80) return 'Moderate';
  return 'Critical';
}

function getSeverity(status) {
  if (status === 'Critical') return 'High';
  if (status === 'Moderate') return 'Medium';
  return null;
}

/**
 * Normalize any input drain identifier into a valid drain_id
 * e.g. 1 -> "DRN001", "DRN1" -> "DRN001", "DRN005" -> "DRN005"
 */
async function resolveDrainId(db, rawDrainId) {
  if (!rawDrainId) return 'DRN001';

  const str = String(rawDrainId).trim();

  // Exact match
  const exact = await db.collection('drains').findOne({ drain_id: str });
  if (exact) return exact.drain_id;

  // Numeric pad match (e.g. 1 -> DRN001)
  const numMatch = str.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    const padded = `DRN${String(num).padStart(3, '0')}`;
    const byPadded = await db.collection('drains').findOne({ drain_id: padded });
    if (byPadded) return byPadded.drain_id;
  }

  // First available drain fallback
  const first = await db.collection('drains').findOne({}, { sort: { drain_id: 1 } });
  return first ? first.drain_id : 'DRN001';
}

async function processSensorPayload(req, res) {
  try {
    const db = await getDb();
    const { drain_id, water_level_cm, flow_rate_l_min, flow_rate_lps } = req.body;

    const numericWaterLevel = Number(water_level_cm) || 0;
    const numericFlowRate = Number(flow_rate_l_min || (flow_rate_lps ? flow_rate_lps * 60 : 0)) || 0;
    const flowLps = flow_rate_lps ? Number(flow_rate_lps) : Math.round((numericFlowRate / 60) * 1000) / 1000;

    const resolvedDrainId = await resolveDrainId(db, drain_id);

    console.log('[SENSOR] Received sensor payload', {
      raw_drain_id: drain_id,
      resolved_drain_id: resolvedDrainId,
      water_level_cm: numericWaterLevel,
      flow_rate_l_min: numericFlowRate,
    });

    const dhiScore = calculateDhi(numericWaterLevel, numericFlowRate);
    const status = getDrainStatus(dhiScore);
    const alertEmail = process.env.ALERT_EMAIL || process.env.EMAIL_USER;

    console.log(`[SENSOR] Computed DHI=${dhiScore}, status=${status}`);

    // Resolve associated device
    const device = await db.collection('devices').findOne({ drain_id: resolvedDrainId });
    const deviceId = device?.device_id || `DEV${resolvedDrainId.replace('DRN', '')}`;

    // Get drain info
    const drain = await db.collection('drains').findOne({ drain_id: resolvedDrainId });
    const areaName = drain?.area_name || drain?.location_name || 'Chennai';

    // Next reading_id
    const highestReading = await db.collection('sensor_readings').find({}).sort({ reading_id: -1 }).limit(1).toArray();
    const nextReadingId = (highestReading[0]?.reading_id || 100000) + 1;

    const now = new Date();

    const sensorReadingDoc = {
      reading_id: nextReadingId,
      device_id: deviceId,
      drain_id: resolvedDrainId,
      recorded_at: now,
      timestamp: now,
      water_level_cm: numericWaterLevel,
      flow_rate_lps: flowLps,
      flow_rate_l_min: numericFlowRate,
      dhi_score: dhiScore,
      mq7_raw_value: Math.round(dhiScore * 3.5 * 10) / 10,
      h2s_raw_value: 0.45,
      methane_raw_value: 1.1,
      temperature_c: 26.5,
      humidity_percent: 58.0,
    };

    await db.collection('sensor_readings').insertOne(sensorReadingDoc);

    // Update drain status
    await db.collection('drains').updateOne(
      { drain_id: resolvedDrainId },
      { $set: { drain_status: status, status: status, updated_at: now } }
    );

    // Record in analytics_results
    const highestAnalysis = await db.collection('analytics_results').find({}).sort({ analysis_id: -1 }).limit(1).toArray();
    const nextAnalysisId = (highestAnalysis[0]?.analysis_id || 500000) + 1;

    const healthDoc = {
      analysis_id: nextAnalysisId,
      drain_id: resolvedDrainId,
      area_name: areaName,
      dhi_score: dhiScore,
      status: status,
      drain_condition: status,
      avg_water_level_cm: numericWaterLevel,
      max_water_level_cm: numericWaterLevel,
      min_water_level_cm: numericWaterLevel,
      avg_mq7_value: Math.round(dhiScore * 3.5 * 10) / 10,
      avg_temperature_c: 26.5,
      avg_humidity_percent: 58.0,
      abnormal_reading_count: status === 'Critical' ? 10 : (status === 'Moderate' ? 5 : 0),
      analysis_created_at: now,
      created_at: now,
    };

    await db.collection('analytics_results').insertOne(healthDoc);

    let alertRecord = null;
    if (status !== 'Good') {
      const severity = getSeverity(status) || 'Medium';
      const highestAlert = await db.collection('alerts').find({}).sort({ alert_id: -1 }).limit(1).toArray();
      const nextAlertId = (highestAlert[0]?.alert_id || 900000) + 1;

      alertRecord = {
        alert_id: nextAlertId,
        id: nextAlertId,
        drain_id: resolvedDrainId,
        device_id: deviceId,
        reading_id: nextReadingId,
        area_name: areaName,
        alert_type: status === 'Critical' ? 'CRITICAL_WATER_LEVEL' : 'HIGH_WATER_LEVEL',
        severity,
        alert_message: `Elevated water level (${numericWaterLevel} cm) and DHI (${dhiScore}) in ${resolvedDrainId} (${areaName})`,
        message: `Elevated water level (${numericWaterLevel} cm) and DHI (${dhiScore}) in ${resolvedDrainId} (${areaName})`,
        detected_at: now,
        alert_time: now,
        alert_status: 'Open',
        status: 'Open',
        resolved_at: null,
        created_at: now,
      };

      await db.collection('alerts').insertOne(alertRecord);
      console.log('[ALERT] Created alert record', alertRecord.alert_id);
    }

    // Send email notification for critical alert
    if (status === 'Critical' && alertEmail) {
      await sendAlertEmail({
        email: alertEmail,
        drainId: resolvedDrainId,
        area: areaName,
        dhi: dhiScore,
        status,
      }).catch((emailErr) => console.warn('[EMAIL] Alert email failed:', emailErr.message));
    }

    return res.status(201).json({
      success: true,
      data: {
        sensor_reading: sensorReadingDoc,
        drain_health: healthDoc,
        alert: alertRecord,
      },
    });
  } catch (error) {
    console.error('[SENSOR] Failed to process sensor payload:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

router.post('/sensor-data', validateSensorPayload, handleValidationErrors, processSensorPayload);

router.post('/readings', async (req, res) => {
  const level = Number(req.body?.level);

  if (!Number.isFinite(level)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'level', message: 'level must be a number' }],
    });
  }

  try {
    const db = await getDb();
    const highestReading = await db.collection('sensor_readings').find({}).sort({ reading_id: -1 }).limit(1).toArray();
    const nextReadingId = (highestReading[0]?.reading_id || 100000) + 1;

    const readingDoc = {
      reading_id: nextReadingId,
      device_id: 'DEV001',
      drain_id: 'DRN001',
      recorded_at: new Date(),
      timestamp: new Date(),
      water_level_cm: level,
      flow_rate_lps: 7.0,
      flow_rate_l_min: 420.0,
      dhi_score: Math.round((level * 0.6 + 7.0 * 0.4) * 100) / 100,
    };

    await db.collection('sensor_readings').insertOne(readingDoc);

    return res.status(200).json({
      success: true,
      message: 'Reading inserted successfully',
      data: readingDoc,
    });
  } catch (error) {
    console.error('[READINGS-POST] Failed to insert reading:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert reading',
      error: error.message,
    });
  }
});

router.post('/send-data', async (req, res) => {
  try {
    const db = await getDb();
    const { area, level, status } = req.body;

    const resolvedDrainId = await resolveDrainId(db, area);
    const now = new Date();

    const highestReading = await db.collection('sensor_readings').find({}).sort({ reading_id: -1 }).limit(1).toArray();
    const nextReadingId = (highestReading[0]?.reading_id || 100000) + 1;

    await db.collection('sensor_readings').insertOne({
      reading_id: nextReadingId,
      drain_id: resolvedDrainId,
      area_name: area || 'Chennai',
      water_level_cm: Number(level) || 0,
      status: status || 'Normal',
      timestamp: now,
      recorded_at: now,
    });

    return res.json({
      success: true,
      message: 'Data stored successfully',
    });
  } catch (err) {
    console.error('[SEND-DATA-POST]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message,
    });
  }
});

router.get('/send-data', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db
      .collection('sensor_readings')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .project({ _id: 0 })
      .toArray();

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error('[SEND-DATA-GET]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message,
    });
  }
});

export default router;
