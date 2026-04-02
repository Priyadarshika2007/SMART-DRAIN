import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

dotenv.config();
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Add it to environment variables before starting the server.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Optional: force SSL even if env fails
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err);
});

// ============================================
// POOL STATUS UTILITY
// ============================================

/**
 * Get current pool status
 * @returns {object} Pool status information
 */
export function getPoolStatus() {
  return {
    connected: true,
    status: 'Connected',
    idle: pool.idleCount,
    total: pool.totalCount,
    waiting: pool.waitingCount,
    max: pool.options.max,
  };
}

/**
 * Test database connection
 * @returns {object} Connection test result
 */
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as timestamp');

    return {
      success: true,
      connected: true,
      timestamp: result.rows[0].timestamp,
      message: 'Database connected successfully',
    };
  } catch (error) {
    console.error('[DB-TEST] Connection test failed:', error.message);
    return {
      success: false,
      connected: false,
      error: error.message,
      message: 'Database connection failed',
    };
  }
}

/**
 * Graceful shutdown
 */
export async function closePool() {
  console.log('[SHUTDOWN] Closing database pool...');
  try {
    await pool.end();
    console.log('✓ [SHUTDOWN] Database pool closed');
  } catch (error) {
    console.error('❌ [SHUTDOWN] Error closing pool:', error.message);
  }
}

export default pool;
