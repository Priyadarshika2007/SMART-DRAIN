import express from 'express';
import pool from '../config/db.js';
import { handleValidationErrors, validateSensorPayload } from '../middleware/validate.js';
import sendAlertEmail from '../utils/emailService.js';

const router = express.Router();

async function insertIntoDrainHealthLog(area, level, status) {
  try {
    await pool.query(
      'INSERT INTO drain_health_log(area, level, status) VALUES($1, $2, $3)',
      [area, level, status]
    );
    return;
  } catch (err) {
    // Keep compatibility with existing schema that stores drain_id + dhi_score + status.
    if (err.code !== '42703' && err.code !== '23502' && err.code !== '42P01') {
      throw err;
    }
  }

  const drainResult = await pool.query(
    `SELECT drain_id
     FROM drain_master
     WHERE LOWER(area_name) = LOWER($1)
     ORDER BY drain_id
     LIMIT 1`,
    [area]
  );

  let resolvedDrainId = drainResult.rows?.[0]?.drain_id;

  if (!resolvedDrainId) {
    const parsedId = Number(String(area || '').match(/\d+/)?.[0]);
    if (Number.isFinite(parsedId) && parsedId > 0) {
      const idResult = await pool.query(
        'SELECT drain_id FROM drain_master WHERE drain_id = $1 LIMIT 1',
        [parsedId]
      );
      resolvedDrainId = idResult.rows?.[0]?.drain_id;
    }
  }

  if (!resolvedDrainId) {
    const fallbackResult = await pool.query(
      'SELECT drain_id FROM drain_master ORDER BY drain_id LIMIT 1'
    );
    resolvedDrainId = fallbackResult.rows?.[0]?.drain_id;
  }

  if (!resolvedDrainId) {
    throw new Error('No drains available in drain_master');
  }

  await pool.query(
    `INSERT INTO drain_health_log(drain_id, dhi_score, status)
     VALUES($1, $2, $3)`,
    [resolvedDrainId, Number(level), status]
  );
}

async function getRecentDrainHealthLogs() {
  try {
    const result = await pool.query(
      'SELECT * FROM drain_health_log ORDER BY created_at DESC LIMIT 10'
    );
    return result.rows;
  } catch (err) {
    if (err.code !== '42703') {
      throw err;
    }

    const result = await pool.query(
      'SELECT * FROM drain_health_log ORDER BY timestamp DESC LIMIT 10'
    );
    return result.rows;
  }
}

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

async function resyncPrimaryKeySequence(client) {
  await client.query(`
    DO $$
    DECLARE
      seq_name text;
      pk_col text;
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sensor_readings' AND column_name = 'reading_id'
      ) THEN
        pk_col := 'reading_id';
      ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sensor_readings' AND column_name = 'id'
      ) THEN
        pk_col := 'id';
      END IF;

      IF pk_col IS NOT NULL THEN
        seq_name := pg_get_serial_sequence('sensor_readings', pk_col);
      END IF;

      IF seq_name IS NOT NULL THEN
        EXECUTE format(
          'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM sensor_readings), 0) + 1, false)',
          seq_name, pk_col
        );
      END IF;
    END $$;
  `);
}

async function processSensorPayload(req, res) {
  const { drain_id, water_level_cm, flow_rate_l_min } = req.body;
  const numericDrainId = Number(drain_id);
  const numericWaterLevel = Number(water_level_cm);
  const numericFlowRate = Number(flow_rate_l_min);

  console.log('[SENSOR] Received sensor payload', {
    drain_id: numericDrainId,
    water_level_cm: numericWaterLevel,
    flow_rate_l_min: numericFlowRate,
  });

  const dhiScore = calculateDhi(numericWaterLevel, numericFlowRate);
  const status = getDrainStatus(dhiScore);
  const alertEmail = process.env.ALERT_EMAIL || process.env.EMAIL_USER;

  console.log(`[SENSOR] Computed DHI=${dhiScore}, status=${status}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT sensor_insert_sp');

    let sensorInsert;
    try {
      sensorInsert = await client.query(
        `INSERT INTO sensor_readings (drain_id, water_level_cm, flow_rate_l_min)
         VALUES ($1, $2, $3)
         RETURNING drain_id, water_level_cm, flow_rate_l_min`,
        [numericDrainId, numericWaterLevel, numericFlowRate]
      );
    } catch (insertError) {
      if (insertError.code === '23505') {
        await client.query('ROLLBACK TO SAVEPOINT sensor_insert_sp');
        console.warn('[SENSOR] Detected PK sequence drift, resyncing sequence and retrying insert...');
        await resyncPrimaryKeySequence(client);
        sensorInsert = await client.query(
          `INSERT INTO sensor_readings (drain_id, water_level_cm, flow_rate_l_min)
           VALUES ($1, $2, $3)
           RETURNING drain_id, water_level_cm, flow_rate_l_min`,
          [numericDrainId, numericWaterLevel, numericFlowRate]
        );
      } else {
        throw insertError;
      }
    }
    await client.query('RELEASE SAVEPOINT sensor_insert_sp');

    const healthInsert = await client.query(
      `INSERT INTO drain_health_log (drain_id, dhi_score, status)
       VALUES ($1, $2, $3)
       RETURNING drain_id, dhi_score, status`,
      [numericDrainId, dhiScore, status]
    );

    let alertRecord = null;
    if (status !== 'Good') {
      const severity = getSeverity(status);
      const alertInsert = await client.query(
        `INSERT INTO alert (drain_id, alert_type, severity)
         VALUES ($1, $2, $3)
         RETURNING drain_id, alert_type, severity`,
        [numericDrainId, 'Drain Issue Detected', severity]
      );

      alertRecord = alertInsert.rows[0];
      console.log('[ALERT] Created alert record', alertRecord);
    }

    let areaName = 'Unknown Area';
    try {
      const areaResult = await client.query(
        'SELECT area_name FROM drain_master WHERE drain_id = $1 LIMIT 1',
        [numericDrainId]
      );
      areaName = areaResult.rows?.[0]?.area_name || areaName;
    } catch (areaError) {
      console.warn('[ALERT] Unable to resolve area for email:', areaError.message);
    }

    await client.query('COMMIT');

    // Send email only for critical alerts. Email failures are logged and ignored.
    if (status === 'Critical' && alertEmail) {
      await sendAlertEmail({
        email: alertEmail,
        drainId: numericDrainId,
        area: areaName,
        dhi: dhiScore,
        status,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        sensor_reading: sensorInsert.rows[0],
        drain_health: healthInsert.rows[0],
        alert: alertRecord,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SENSOR] Failed to process sensor payload:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    client.release();
  }
}

async function insertSimpleReading(client, level) {
  const columnResult = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'sensor_readings'`
  );

  const columns = new Set(columnResult.rows.map((row) => String(row.column_name || '').toLowerCase()));

  if (columns.size === 0) {
    throw new Error('sensor_readings table not found');
  }

  const values = [];
  const selectedColumns = [];

  if (columns.has('drain_id')) {
    let drainId = 1;
    try {
      const drainResult = await client.query('SELECT drain_id FROM drain_master ORDER BY drain_id LIMIT 1');
      if (drainResult.rows.length > 0) {
        drainId = Number(drainResult.rows[0].drain_id) || 1;
      }
    } catch {
      drainId = 1;
    }

    selectedColumns.push('drain_id');
    values.push(drainId);
  }

  if (columns.has('water_level_cm')) {
    selectedColumns.push('water_level_cm');
    values.push(level);
  } else if (columns.has('water_level')) {
    selectedColumns.push('water_level');
    values.push(level);
  } else if (columns.has('level')) {
    selectedColumns.push('level');
    values.push(level);
  } else {
    throw new Error('sensor_readings table does not contain a level/water_level column');
  }

  if (columns.has('flow_rate_l_min')) {
    selectedColumns.push('flow_rate_l_min');
    values.push(0);
  } else if (columns.has('flow_rate')) {
    selectedColumns.push('flow_rate');
    values.push(0);
  }

  if (columns.has('dhi_score')) {
    selectedColumns.push('dhi_score');
    values.push(level);
  }

  const placeholders = selectedColumns.map((_, index) => `$${index + 1}`);

  const insertQuery = `
    INSERT INTO sensor_readings (${selectedColumns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *
  `;

  const insertResult = await client.query(insertQuery, values);
  return insertResult.rows[0] || null;
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

  const client = await pool.connect();
  try {
    const insertedReading = await insertSimpleReading(client, level);

    return res.status(200).json({
      success: true,
      message: 'Reading inserted successfully',
      data: insertedReading,
    });
  } catch (error) {
    console.error('[READINGS-POST] Failed to insert reading:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to insert reading',
      error: error.message,
    });
  } finally {
    client.release();
  }
});

router.post('/send-data', async (req, res) => {
  try {
    const { area, level, status } = req.body;

    console.log('Incoming Data:', req.body);

    await insertIntoDrainHealthLog(area, level, status);

    return res.json({
      success: true,
      message: 'Data stored successfully',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Database error',
    });
  }
});

router.get('/send-data', async (req, res) => {
  try {
    const rows = await getRecentDrainHealthLogs();

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Database error',
    });
  }
});

export default router;
