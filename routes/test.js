import express from 'express';
import pool from '../config/db.js';
import { testConnection, getPoolStatus } from '../config/db.js';
import {
  handleValidationErrors,
  validateDebugFlagQuery,
  validateNoBodyForGet,
} from '../middleware/validate.js';

const router = express.Router();

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
  async (req, res) => {
  try {
    console.log('[TEST-DB] Database connection test started');
    console.log('[TEST-DB] Running query: SELECT NOW()');

    // Execute query
    const result = await pool.query('SELECT NOW() as timestamp');

    if (!result.rows || result.rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    const timestamp = result.rows[0].timestamp;
    console.log('[TEST-DB] ✓ Query successful at', timestamp);

    res.status(200).json({
      success: true,
      connected: true,
      timestamp: timestamp,
      message: 'Database connected successfully',
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TEST-DB] ✗ Connection test failed:', error.message);

    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
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
