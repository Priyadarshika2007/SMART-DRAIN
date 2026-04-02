import express from 'express';
import pool from '../config/db.js';
import { testConnection, getPoolStatus } from '../config/db.js';
import {
  handleValidationErrors,
  validateDebugFlagQuery,
  validateNoBodyForGet,
} from '../middleware/validate.js';

const router = express.Router();

async function runDbTest(req, res) {
  try {
    console.log('[DB-TEST] Running query: SELECT NOW()');

    const result = await pool.query('SELECT NOW() as timestamp');
    const timestamp = result.rows?.[0]?.timestamp;

    if (!timestamp) {
      return res.status(500).json({
        success: false,
        message: 'Database query did not return a timestamp',
      });
    }

    console.log('[DB-TEST] Database connection successful at', timestamp);

    return res.status(200).json({
      success: true,
      connected: true,
      timestamp,
      message: 'Database connected successfully',
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DB-TEST] Database connection failed:', error.message);

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
 * Returns: { status: string, uptime: number, timestamp: string }
 */
router.get('/health', validateNoBodyForGet, handleValidationErrors, (req, res) => {
  console.log('[HEALTH] Health check requested');

  res.status(200).json({
    status: 'Backend working',
  });
});

/**
 * GET /api/test-db
 * Test database connection with SELECT NOW()
 * Returns: { success: boolean, timestamp: string, message: string }
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
 * GET /api/db-status
 * Check pool connection status and statistics
 * Returns: { success: boolean, pool: object, status: object }
 */
router.get('/db-status', validateNoBodyForGet, handleValidationErrors, async (req, res) => {
  try {
    console.log('[DB-STATUS] Pool status requested');

    // Get pool status
    const poolStatus = getPoolStatus();

    // Test connection
    const testResult = await testConnection();

    res.status(200).json({
      success: true,
      pool: poolStatus,
      connection: {
        connected: testResult.connected,
        timestamp: testResult.timestamp,
        message: testResult.message,
      },
      database: {
        type: 'PostgreSQL (Supabase)',
        host: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'unknown',
        ssl: 'enabled',
      },
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DB-STATUS] Status check failed:', error.message);

    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
