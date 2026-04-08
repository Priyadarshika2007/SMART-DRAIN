import express from 'express';
import pool from '../config/db.js';
import { handleValidationErrors, validateNoBodyForGet } from '../middleware/validate.js';
import { safeLog } from '../middleware/security.js';
import { enforceAreaAccess, getUserAreaScope, optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

function normalizeArea(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveAreaFilter(req, explicitArea) {
  const requestedArea = normalizeArea(explicitArea || req.query.area);
  const scope = getUserAreaScope(req.user);

  return {
    requestedArea,
    scope,
  };
}

function buildAreaPredicate(params, requestedArea, scope, alias = 'dm') {
  const conditions = [];

  if (requestedArea) {
    params.push(requestedArea);
    conditions.push(`LOWER(${alias}.area_name) = $${params.length}`);
  }

  if (scope && !scope.all) {
    params.push(scope.areas);
    conditions.push(`LOWER(${alias}.area_name) = ANY($${params.length})`);
  }

  if (conditions.length === 0) return '';
  return `WHERE ${conditions.join(' AND ')}`;
}

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
router.get('/latest-status', optionalAuth, validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const params = [];
    const { requestedArea, scope } = resolveAreaFilter(req);
    const areaWhere = buildAreaPredicate(params, requestedArea, scope);

    const result = await pool.query(`
      SELECT DISTINCT ON (dhl.drain_id)
        dhl.drain_id,
        dhl.dhi_score,
        dhl.status,
        dhl.timestamp,
        dm.area_name
      FROM drain_health_log dhl
      JOIN drain_master dm ON dm.drain_id = dhl.drain_id
      ${areaWhere}
      ORDER BY dhl.drain_id, dhl.timestamp DESC
    `, params);

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
router.get('/alerts', optionalAuth, validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const params = [];
    const { requestedArea, scope } = resolveAreaFilter(req);
    const areaWhere = buildAreaPredicate(params, requestedArea, scope);

    const result = await pool.query(`
      SELECT
        a.*, dm.area_name
      FROM alert a
      JOIN drain_master dm ON dm.drain_id = a.drain_id
      ${areaWhere}
      ORDER BY alert_time DESC
      LIMIT 20
    `, params);

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
router.get('/drains', optionalAuth, validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const params = [];
    const { requestedArea, scope } = resolveAreaFilter(req);
    const areaWhere = buildAreaPredicate(params, requestedArea, scope);

    const result = await pool.query(`
      SELECT dm.*
      FROM drain_master dm
      ${areaWhere}
      ORDER BY dm.drain_id
      LIMIT 200
    `, params);

    return res.json(result.rows);
  } catch (err) {
    console.error('DRAINS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/readings', optionalAuth, validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const params = [];
    const { requestedArea, scope } = resolveAreaFilter(req);
    const areaWhere = buildAreaPredicate(params, requestedArea, scope);

    const result = await pool.query(`
      SELECT
        sr.*, dm.area_name
      FROM sensor_readings sr
      JOIN drain_master dm ON dm.drain_id = sr.drain_id
      ${areaWhere}
      ORDER BY sr.timestamp DESC
      LIMIT 500
    `, params);

    return res.json(result.rows);
  } catch (err) {
    console.error('READINGS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/latest-readings', optionalAuth, validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const params = [];
    const { requestedArea, scope } = resolveAreaFilter(req);
    const areaWhere = buildAreaPredicate(params, requestedArea, scope);

    const result = await pool.query(`
      SELECT DISTINCT ON (sr.drain_id)
        sr.drain_id,
        sr.water_level_cm,
        sr.flow_rate_l_min,
        sr.timestamp,
        dm.area_name
      FROM sensor_readings sr
      JOIN drain_master dm ON dm.drain_id = sr.drain_id
      ${areaWhere}
      ORDER BY sr.drain_id, sr.timestamp DESC
    `, params);

    return res.json(result.rows);
  } catch (err) {
    console.error('LATEST READINGS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/latest-health', optionalAuth, validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const params = [];
    const { requestedArea, scope } = resolveAreaFilter(req);
    const areaWhere = buildAreaPredicate(params, requestedArea, scope);

    const result = await pool.query(`
      SELECT DISTINCT ON (dhl.drain_id)
        dhl.drain_id,
        dhl.dhi_score,
        dhl.status,
        dhl.timestamp,
        dm.area_name
      FROM drain_health_log dhl
      JOIN drain_master dm ON dm.drain_id = dhl.drain_id
      ${areaWhere}
      ORDER BY dhl.drain_id, dhl.timestamp DESC
    `, params);

    return res.json(result.rows);
  } catch (err) {
    console.error('LATEST HEALTH ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/dashboard/:area', requireAuth, enforceAreaAccess, validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  const area = req.params.area;

  try {
    const drainsPromise = pool.query(
      `SELECT *
       FROM drain_master
       WHERE LOWER(area_name) = LOWER($1)
       ORDER BY drain_id`,
      [area]
    );

    const latestReadingsPromise = pool.query(
      `SELECT DISTINCT ON (sr.drain_id)
          sr.drain_id,
          sr.water_level_cm,
          sr.flow_rate_l_min,
          sr.timestamp,
          dm.area_name
       FROM sensor_readings sr
       JOIN drain_master dm ON dm.drain_id = sr.drain_id
       WHERE LOWER(dm.area_name) = LOWER($1)
       ORDER BY sr.drain_id, sr.timestamp DESC`,
      [area]
    );

    const latestHealthPromise = pool.query(
      `SELECT DISTINCT ON (dhl.drain_id)
          dhl.drain_id,
          dhl.dhi_score,
          dhl.status,
          dhl.timestamp,
          dm.area_name
       FROM drain_health_log dhl
       JOIN drain_master dm ON dm.drain_id = dhl.drain_id
       WHERE LOWER(dm.area_name) = LOWER($1)
       ORDER BY dhl.drain_id, dhl.timestamp DESC`,
      [area]
    );

    const alertsPromise = pool.query(
      `SELECT a.*, dm.area_name
       FROM alert a
       JOIN drain_master dm ON dm.drain_id = a.drain_id
       WHERE LOWER(dm.area_name) = LOWER($1)
       ORDER BY a.alert_time DESC
       LIMIT 50`,
      [area]
    );

    const [drainsResult, readingsResult, healthResult, alertsResult] = await Promise.all([
      drainsPromise,
      latestReadingsPromise,
      latestHealthPromise,
      alertsPromise,
    ]);

    const summary = {
      drains: drainsResult.rowCount,
      activeAlerts: alertsResult.rowCount,
      critical: healthResult.rows.filter((h) => String(h.status).toLowerCase() === 'critical').length,
      moderate: healthResult.rows.filter((h) => String(h.status).toLowerCase() === 'moderate').length,
      good: healthResult.rows.filter((h) => String(h.status).toLowerCase() === 'good').length,
    };

    return res.json({
      success: true,
      area,
      summary,
      drains: drainsResult.rows,
      latestReadings: readingsResult.rows,
      latestHealth: healthResult.rows,
      alerts: alertsResult.rows,
    });
  } catch (err) {
    console.error('DASHBOARD AREA ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;