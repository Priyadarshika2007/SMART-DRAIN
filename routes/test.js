import express from 'express';
import { getDb, testConnection, getPoolStatus } from '../config/db.js';
import {
  handleValidationErrors,
  validateDebugFlagQuery,
  validateNoBodyForGet,
} from '../middleware/validate.js';

const router = express.Router();

router.get('/test', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'API WORKING',
  });
});

async function runDbTest(req, res) {
  try {
    console.log('[DB-TEST] Running MongoDB ping test');

    const result = await testConnection();

    if (!result.connected) {
      return res.status(500).json({
        success: false,
        message: result.message || 'Database connection failed',
        error: result.error,
      });
    }

    console.log('[DB-TEST] Database connection successful at', result.timestamp);

    return res.status(200).json({
      success: true,
      connected: true,
      timestamp: result.timestamp,
      database: result.database,
      message: 'MongoDB connected successfully',
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DB-TEST] Database connection test failed:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /api/health
 * Simple health check endpoint
 */
router.get('/health', validateNoBodyForGet, handleValidationErrors, (req, res) => {
  res.status(200).json({
    status: 'Backend working',
    database: 'MongoDB',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/test-db
 * Test database connection
 */
router.get(
  '/test-db',
  [...validateNoBodyForGet, ...validateDebugFlagQuery],
  handleValidationErrors,
  runDbTest
);

router.get(
  '/db-test',
  validateNoBodyForGet,
  handleValidationErrors,
  runDbTest
);

/**
 * GET /api/readings
 * Return latest 50 sensor readings
 */
router.get('/readings', validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const db = await getDb();
    const readings = await db
      .collection('sensor_readings')
      .find({})
      .sort({ timestamp: -1, recorded_at: -1 })
      .limit(50)
      .project({ _id: 0 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error('[READINGS] Failed to fetch readings:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch readings',
      error: error.message,
    });
  }
});

/**
 * GET /api/db-status
 * Check MongoDB connection status and collection statistics
 */
router.get('/db-status', validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    const poolStatus = getPoolStatus();
    const testResult = await testConnection();
    const db = await getDb();

    // Fetch collection counts
    const [usersCount, drainsCount, devicesCount, readingsCount, analyticsCount, alertsCount] = await Promise.all([
      db.collection('users').countDocuments().catch(() => 0),
      db.collection('drains').countDocuments().catch(() => 0),
      db.collection('devices').countDocuments().catch(() => 0),
      db.collection('sensor_readings').countDocuments().catch(() => 0),
      db.collection('analytics_results').countDocuments().catch(() => 0),
      db.collection('alerts').countDocuments().catch(() => 0),
    ]);

    res.status(200).json({
      success: true,
      pool: poolStatus,
      connection: {
        connected: testResult.connected,
        timestamp: testResult.timestamp,
        message: testResult.message,
      },
      database: {
        type: 'MongoDB',
        name: db.databaseName,
        status: 'Connected',
        collections: {
          users: usersCount,
          drains: drainsCount,
          devices: devicesCount,
          sensor_readings: readingsCount,
          analytics_results: analyticsCount,
          alerts: alertsCount,
        },
      },
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DB-STATUS] Status check failed:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

export default router;
