import express from 'express';
import pool from '../config/db.js';
import { handleValidationErrors, validateSensorPayload } from '../middleware/validate.js';

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

router.post('/sensor-data', validateSensorPayload, handleValidationErrors, async (req, res) => {
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

    await client.query('COMMIT');

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
});

export default router;
