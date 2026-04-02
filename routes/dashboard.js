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

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function mapLatestStatusRow(row) {
  return {
    log_id: row.log_id,
    drain_id: row.drain_id,
    area_name: row.area_name,
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    installation_date: row.installation_date,
    dhi_score: normalizeNumber(row.dhi_score),
    status: row.status,
    timestamp: row.timestamp,
  };
}

function mapAlertRow(row) {
  return {
    alert_id: row.alert_id,
    drain_id: row.drain_id,
    area_name: row.area_name,
    alert_type: row.alert_type,
    severity: row.severity,
    timestamp: row.created_at || row.alert_time || row.timestamp || null,
  };
}

function mapDrainRow(row) {
  return {
    drain_id: row.drain_id,
    area_name: row.area_name,
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    installation_date: row.installation_date,
  };
}

/**
 * GET /api/latest-status
 * Returns the most recent drain health record for each drain.
 */
router.get(
  '/latest-status',
  validateNoBodyForGet,
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT ON (dhl.drain_id)
          dhl.log_id,
          dhl.drain_id,
          dm.area_name,
          dm.latitude,
          dm.longitude,
          dm.installation_date,
          dhl.dhi_score,
          dhl.status,
          dhl.timestamp
        FROM drain_health_log dhl
        LEFT JOIN drain_master dm
          ON dm.drain_id = dhl.drain_id
        ORDER BY dhl.drain_id, dhl.timestamp DESC NULLS LAST, dhl.log_id DESC
      `);

      const data = result.rows.map(mapLatestStatusRow);
      const summary = {
        totalDrains: data.length,
        healthy: data.filter((row) => String(row.status).toLowerCase() === 'good').length,
        moderate: data.filter((row) => String(row.status).toLowerCase() === 'moderate').length,
        critical: data.filter((row) => String(row.status).toLowerCase() === 'critical').length,
        averageDhi: data.length
          ? Number((data.reduce((sum, row) => sum + Number(row.dhi_score || 0), 0) / data.length).toFixed(2))
          : 0,
      };

      safeLog('[DASHBOARD] latest-status loaded', {
        count: data.length,
      });

      return res.status(200).json({
        success: true,
        data,
        summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DASHBOARD] Failed to load latest status:', error.message);

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/alerts
 * Returns the latest alerts for the dashboard.
 */
router.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM alerts LIMIT 10');
    return res.json(result.rows);
  } catch (error) {
    console.error('ALERTS ERROR:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
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
      SELECT
        dm.drain_id,
        dm.area_name,
        dm.latitude,
        dm.longitude,
        dm.installation_date,
        latest.dhi_score,
        latest.status,
        latest.timestamp AS latest_timestamp
      FROM drain_master dm
      LEFT JOIN LATERAL (
        SELECT
          dhl.dhi_score,
          dhl.status,
          dhl.timestamp
        FROM drain_health_log dhl
        WHERE dhl.drain_id = dm.drain_id
        ORDER BY dhl.timestamp DESC NULLS LAST, dhl.log_id DESC
        LIMIT 1
      ) latest ON TRUE
      ORDER BY dm.drain_id ASC
    `);

    const data = result.rows.map((row) => ({
      ...mapDrainRow(row),
      dhi_score: normalizeNumber(row.dhi_score),
      status: row.status,
      latest_timestamp: row.latest_timestamp,
    }));

    safeLog('[DASHBOARD] drains loaded', {
      count: data.length,
    });

    return res.status(200).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DASHBOARD] Failed to load drains:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;