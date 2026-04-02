import express from 'express';
import pool from '../config/db.js';
import { handleValidationErrors, validateNoBodyForGet } from '../middleware/validate.js';
import { safeLog } from '../middleware/security.js';

const router = express.Router();

router.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    safeLog('[DASHBOARD]', {
      method: req.method,
      route: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

/**
 * GET /api/latest-status
 * Returns the most recent drain health record for each drain.
 */
router.get('/latest-status', validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM drain_health_log
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error('STATUS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/alerts
 * Returns the latest alerts for the dashboard.
 */
router.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM alert
      ORDER BY alert_time DESC
      LIMIT 20
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error('ALERTS ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/drains
 * Returns the monitored drains and their latest health snapshot.
 */
router.get('/drains', validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM drain_master
      LIMIT 50
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error('DRAINS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/readings', validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM sensor_readings
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    return res.json(result.rows);
  } catch (err) {
    console.error('READINGS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;