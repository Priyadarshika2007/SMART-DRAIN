import express from 'express';
import { getDb } from '../config/db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Transparent default thresholds and gas channel specifications
// Clearly documented as uncalibrated raw thresholds unless field-calibrated
const DEFAULT_GAS_CONFIG = {
  channels: [
    {
      key: 'h2s_raw_value',
      name: 'Hydrogen Sulfide (H₂S) Sensor Channel',
      shortName: 'H₂S Channel',
      sensorModel: 'Electrochemical / Metal Oxide H₂S Node',
      isCalibrated: false,
      displayUnit: 'Raw Ratio (0–2.0 scale)',
      verificationStatus: 'Uncalibrated Raw Value — Concentration Unverified',
      description: 'Measures raw analog response to sulfurous sewer gas. Toxic at trace concentrations; requires onsite calibrated atmospheric test before chamber entry.',
      defaultWarningThreshold: 1.6, // Flag high raw response
      targetGas: 'Hydrogen Sulfide (H₂S)',
    },
    {
      key: 'methane_raw_value',
      name: 'Methane (CH₄) Sensor Channel',
      shortName: 'Methane Channel',
      sensorModel: 'Semiconductor MQ-4 / Catalytic Bead Node',
      isCalibrated: false,
      displayUnit: 'Raw Ratio (0–5.0 scale)',
      verificationStatus: 'Uncalibrated Raw Value — Concentration Unverified',
      description: 'Measures raw response to combustible hydrocarbon gas. Flammable and asphyxiant hazard. Do not enter without calibrated multigas meter.',
      defaultWarningThreshold: 3.2, // Flag high raw response
      targetGas: 'Methane (CH₄)',
    },
    {
      key: 'mq7_raw_value',
      name: 'MQ-7 Sensor Channel (Carbon Monoxide Sensitive)',
      shortName: 'MQ-7 Channel (CO)',
      sensorModel: 'Hanwei MQ-7 Micro-electrochemical / Metal Oxide Sensor',
      isCalibrated: false,
      displayUnit: 'Raw ADC Output (0–1023 scale)',
      verificationStatus: 'Uncalibrated Raw ADC Count — Concentration Unverified',
      description: 'MQ-7 sensor is sensitive primarily to Carbon Monoxide (CO). Raw ADC count indicates relative response; does not represent verified PPM without laboratory calibration curve.',
      defaultWarningThreshold: 380.0, // Flag high raw ADC count
      targetGas: 'Carbon Monoxide (CO)',
    },
  ],
  confinedSpaceSafetyProtocol: {
    mandatoryNotice: 'CRITICAL SAFETY NOTICE: Continuous telemetry does not replace mandatory onsite atmospheric pre-entry testing with calibrated multi-gas detectors, approved confined-space permits, mechanical forced ventilation, or appropriate personal protective equipment (PPE).',
    entryGuidance: 'Do not authorize human entry based solely on dashboard readings or the absence of an active telemetry alarm. Atmospheric conditions can stratify rapidly in inspection chambers.',
  },
};

/**
 * Helper to fetch gas channel summaries across drains
 */
async function getChamberGasData(db, areaFilter = null) {
  let drainFilter = {};
  if (areaFilter && areaFilter !== 'all') {
    const areaRegex = new RegExp(areaFilter, 'i');
    drainFilter = {
      $or: [
        { area_name: { $regex: areaRegex } },
        { location_name: { $regex: areaRegex } },
        { district: { $regex: areaRegex } },
      ],
    };
  }

  const [drains, devices] = await Promise.all([
    db.collection('drains').find(drainFilter).toArray(),
    db.collection('devices').find().toArray(),
  ]);

  const drainMap = new Map(drains.map((d) => [d.drain_id, d]));
  const deviceByDrain = new Map(devices.map((dev) => [dev.drain_id, dev]));
  const drainIds = drains.map((d) => d.drain_id);

  // Get latest reading per drain
  const latestReadings = await db
    .collection('sensor_readings')
    .aggregate([
      { $match: { drain_id: { $in: drainIds } } },
      { $sort: { timestamp: -1, recorded_at: -1 } },
      {
        $group: {
          _id: '$drain_id',
          doc: { $first: '$$ROOT' },
        },
      },
    ])
    .toArray();

  const readingsMap = new Map(latestReadings.map((r) => [r._id, r.doc]));

  // Reference time from latest db timestamp
  const latestDbReading = await db.collection('sensor_readings').find().sort({ timestamp: -1 }).limit(1).toArray();
  const refTime = latestDbReading[0]?.timestamp ? new Date(latestDbReading[0].timestamp).getTime() : Date.now();

  return drains.map((drain) => {
    const reading = readingsMap.get(drain.drain_id);
    const device = deviceByDrain.get(drain.drain_id);

    const h2s = reading ? Number(reading.h2s_raw_value) : null;
    const ch4 = reading ? Number(reading.methane_raw_value) : null;
    const mq7 = reading ? Number(reading.mq7_raw_value) : null;

    let freshness = 'No Readings Available';
    let elapsedHours = 999;
    if (reading?.timestamp) {
      const readMs = new Date(reading.timestamp).getTime();
      elapsedHours = Math.max(0, (refTime - readMs) / (1000 * 60 * 60));
      if (elapsedHours < 2) freshness = 'Fresh (< 2h)';
      else if (elapsedHours < 24) freshness = 'Normal (< 24h)';
      else if (elapsedHours < 72) freshness = 'Delayed (> 24h)';
      else freshness = 'Stale (> 72h)';
    }

    // Evaluate gas risk status
    let gasRiskLevel = 'Normal / Baseline';
    let riskSeverity = 'Normal';
    const alerts = [];
    const recommendedActions = [];

    const isMissing = !reading || h2s === null || ch4 === null || mq7 === null;
    const isStale = elapsedHours > 48;

    if (isMissing) {
      gasRiskLevel = 'Monitoring Unavailable';
      riskSeverity = 'High';
      alerts.push('Gas telemetry unavailable at chamber. Atmospheric condition cannot be confirmed.');
      recommendedActions.push('Do not use missing reading to authorise entry. Deploy portable multigas detector before opening chamber.');
    } else if (isStale) {
      gasRiskLevel = 'Monitoring Unavailable (Stale)';
      riskSeverity = 'High';
      alerts.push(`Telemetry stale (${Math.round(elapsedHours)}h without update). Chamber gas status unconfirmed.`);
      recommendedActions.push('Atmospheric condition cannot be verified via stationary sensor. Onsite gas test mandatory.');
    } else {
      // Evaluate raw anomalies against transparent thresholds
      const h2sHigh = h2s !== null && h2s >= DEFAULT_GAS_CONFIG.channels[0].defaultWarningThreshold;
      const ch4High = ch4 !== null && ch4 >= DEFAULT_GAS_CONFIG.channels[1].defaultWarningThreshold;
      const mq7High = mq7 !== null && mq7 >= DEFAULT_GAS_CONFIG.channels[2].defaultWarningThreshold;

      if (h2sHigh && ch4High) {
        gasRiskLevel = 'Critical Multigas Anomaly';
        riskSeverity = 'Critical';
        alerts.push(`Abnormal raw spikes on both H₂S (${h2s}) and Methane (${ch4}) channels.`);
        recommendedActions.push('CRITICAL GAS WARNING: Keep personnel clear, do not enter chamber, adhere to confined-space procedure, and dispatch safety team.');
      } else if (h2sHigh) {
        gasRiskLevel = 'High H₂S Raw Anomaly';
        riskSeverity = 'High';
        alerts.push(`H₂S sensor channel shows abnormal raw reading (${h2s}). Concentration is unverified.`);
        recommendedActions.push('Treat atmospheric condition as hazardous. Stand back from chamber cover until verified.');
      } else if (ch4High) {
        gasRiskLevel = 'High Methane Raw Anomaly';
        riskSeverity = 'High';
        alerts.push(`Methane sensor channel shows abnormal raw reading (${ch4}). Flammable risk possible.`);
        recommendedActions.push('Eliminate ignition sources. Follow sewer ventilation protocol.');
      } else if (mq7High) {
        gasRiskLevel = 'Elevated MQ-7 Raw Response';
        riskSeverity = 'Medium';
        alerts.push(`MQ-7 CO-sensitive channel shows elevated raw count (${mq7}).`);
        recommendedActions.push('Ventilate area and check combustion / industrial exhaust ingress.');
      }
    }

    if (recommendedActions.length === 0) {
      recommendedActions.push('Sensor telemetry within baseline raw range. Mandatory onsite multigas test required prior to manhole entry.');
    }

    return {
      drain_id: drain.drain_id,
      area_name: drain.area_name || drain.location_name || 'Chennai',
      district: drain.district || 'Chennai',
      latitude: drain.latitude,
      longitude: drain.longitude,
      device_id: device?.device_id || `DEV${drain.drain_id.replace(/\D/g, '')}`,
      device_status: device?.status || 'Online',
      gas_risk_level: gasRiskLevel,
      risk_severity: riskSeverity,
      data_freshness: freshness,
      elapsed_hours: Math.round(elapsedHours * 10) / 10,
      timestamp: reading?.timestamp || null,
      channels: {
        h2s: {
          key: 'h2s_raw_value',
          label: 'H₂S Raw',
          value: h2s,
          unit: 'Raw ratio',
          is_calibrated: false,
          threshold: DEFAULT_GAS_CONFIG.channels[0].defaultWarningThreshold,
          is_abnormal: h2s !== null && h2s >= DEFAULT_GAS_CONFIG.channels[0].defaultWarningThreshold,
        },
        methane: {
          key: 'methane_raw_value',
          label: 'Methane Raw',
          value: ch4,
          unit: 'Raw ratio',
          is_calibrated: false,
          threshold: DEFAULT_GAS_CONFIG.channels[1].defaultWarningThreshold,
          is_abnormal: ch4 !== null && ch4 >= DEFAULT_GAS_CONFIG.channels[1].defaultWarningThreshold,
        },
        mq7: {
          key: 'mq7_raw_value',
          label: 'MQ-7 (CO) Raw',
          value: mq7,
          unit: 'ADC count',
          is_calibrated: false,
          threshold: DEFAULT_GAS_CONFIG.channels[2].defaultWarningThreshold,
          is_abnormal: mq7 !== null && mq7 >= DEFAULT_GAS_CONFIG.channels[2].defaultWarningThreshold,
        },
      },
      alerts,
      recommended_actions: recommendedActions,
    };
  });
}

/**
 * GET /api/gas-safety/summary
 * Summary metrics of atmospheric safety, high risk count, and safety alerts
 */
router.get('/gas-safety/summary', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const area = req.query.area || null;
    const chambers = await getChamberGasData(db, area);

    const counts = {
      total_monitored: chambers.length,
      normal: chambers.filter((c) => c.risk_severity === 'Normal').length,
      medium: chambers.filter((c) => c.risk_severity === 'Medium').length,
      high_risk: chambers.filter((c) => c.risk_severity === 'High').length,
      critical_hazard: chambers.filter((c) => c.risk_severity === 'Critical').length,
      monitoring_unavailable: chambers.filter((c) => c.gas_risk_level.includes('Unavailable')).length,
    };

    // Calculate average raw values for chambers with readings
    const validH2s = chambers.map((c) => c.channels.h2s.value).filter((v) => v !== null);
    const validCh4 = chambers.map((c) => c.channels.methane.value).filter((v) => v !== null);
    const validMq7 = chambers.map((c) => c.channels.mq7.value).filter((v) => v !== null);

    const averages = {
      avg_h2s_raw: validH2s.length ? Math.round((validH2s.reduce((a, b) => a + b, 0) / validH2s.length) * 100) / 100 : 0,
      avg_methane_raw: validCh4.length ? Math.round((validCh4.reduce((a, b) => a + b, 0) / validCh4.length) * 100) / 100 : 0,
      avg_mq7_raw: validMq7.length ? Math.round((validMq7.reduce((a, b) => a + b, 0) / validMq7.length) * 10) / 10 : 0,
    };

    const highRiskChambers = chambers
      .filter((c) => ['Critical', 'High'].includes(c.risk_severity))
      .slice(0, 10);

    return res.json({
      success: true,
      counts,
      averages,
      high_risk_chambers: highRiskChambers,
      protocol: DEFAULT_GAS_CONFIG.confinedSpaceSafetyProtocol,
      channels_config: DEFAULT_GAS_CONFIG.channels,
    });
  } catch (err) {
    console.error('GAS SAFETY SUMMARY ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gas-safety/chambers
 * Detailed chamber-by-chamber gas telemetry list
 */
router.get('/gas-safety/chambers', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const area = req.query.area || null;
    const severity = req.query.severity || null;
    const search = String(req.query.search || '').trim().toLowerCase();

    let list = await getChamberGasData(db, area);

    if (severity && severity !== 'all') {
      list = list.filter((item) => item.risk_severity.toLowerCase() === severity.toLowerCase());
    }

    if (search) {
      list = list.filter(
        (item) =>
          item.drain_id.toLowerCase().includes(search) ||
          item.area_name.toLowerCase().includes(search) ||
          item.gas_risk_level.toLowerCase().includes(search)
      );
    }

    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error('GAS SAFETY CHAMBERS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gas-safety/readings
 * Historical gas channel time-series readings for graphing
 */
router.get('/gas-safety/readings', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const drainId = req.query.drain_id || null;
    const limit = Math.min(Number(req.query.limit) || 100, 300);

    let filter = {};
    if (drainId && drainId !== 'all') {
      filter = { drain_id: drainId };
    }

    const readings = await db
      .collection('sensor_readings')
      .find(filter)
      .sort({ timestamp: -1, recorded_at: -1 })
      .limit(limit)
      .toArray();

    // Map to clear data format with explicit channel labels
    const mapped = readings.map((r) => ({
      reading_id: r.reading_id,
      drain_id: r.drain_id,
      device_id: r.device_id,
      timestamp: r.timestamp || r.recorded_at,
      h2s_raw_value: Number(r.h2s_raw_value) || 0,
      methane_raw_value: Number(r.methane_raw_value) || 0,
      mq7_raw_value: Number(r.mq7_raw_value) || 0,
      water_level_cm: Number(r.water_level_cm) || 0,
      flow_rate_l_min: Number(r.flow_rate_l_min) || 0,
      temperature_c: Number(r.temperature_c) || null,
      humidity_percent: Number(r.humidity_percent) || null,
    }));

    return res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    console.error('GAS READINGS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gas-safety/incidents
 * Gas hazards and sensor-related incidents
 */
router.get('/gas-safety/incidents', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const area = req.query.area || null;

    let drainFilter = {};
    if (area && area !== 'all') {
      drainFilter = { area_name: new RegExp(area, 'i') };
    }

    const drains = await db.collection('drains').find(drainFilter).toArray();
    const drainIds = drains.map((d) => d.drain_id);
    const drainMap = new Map(drains.map((d) => [d.drain_id, d]));

    // Query alerts that relate to sensor response, gas, or hazardous conditions
    const alerts = await db
      .collection('alerts')
      .find({
        drain_id: { $in: drainIds },
        $or: [
          { alert_type: 'ABNORMAL_SENSOR_RESPONSE' },
          { alert_message: /gas|sensor|response|chamber|hazard/i },
          { severity: { $in: ['Critical', 'High'] } },
        ],
      })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    const mapped = alerts.map((a) => {
      const drain = drainMap.get(a.drain_id);
      return {
        ...a,
        area_name: a.area_name || drain?.area_name || 'Chennai',
        location_name: drain?.location_name || a.area_name,
        category: 'Gas & Sensor Risk',
        recommended_action:
          a.severity === 'Critical'
            ? 'Keep personnel clear; do not enter chamber. Perform onsite atmospheric testing with calibrated detector.'
            : 'Inspect chamber sensor telemetry; verify zero-point calibration before entry.',
      };
    });

    return res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    console.error('GAS INCIDENTS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gas-safety/config
 * Return channel configuration and safety protocol guidelines
 */
router.get('/gas-safety/config', optionalAuth, (req, res) => {
  return res.json({
    success: true,
    config: DEFAULT_GAS_CONFIG,
  });
});

export default router;
