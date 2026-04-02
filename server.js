import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import testRoutes from './routes/test.js';
import sensorRoutes from './routes/sensor.js';
import dashboardRoutes from './routes/dashboard.js';
import { closePool } from './config/db.js';
import { apiRateLimiter, secureHeaders, safeLog } from './middleware/security.js';

// Load environment variables
dotenv.config();

// ============================================
// ENVIRONMENT VALIDATION
// ============================================

const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

console.log('[CONFIG] Environment variables validated ✓\n');

// ============================================
// EXPRESS APP SETUP
// ============================================

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, 'frontend');
const frontendPath = fs.existsSync(frontendDir)
  ? frontendDir
  : path.join(__dirname, 'build');

// Middleware
app.use(secureHeaders);
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use('/api', apiRateLimiter);

// Debug middleware to confirm routing path for every request
app.use((req, res, next) => {
  console.log('👉 Incoming request:', req.method, req.url);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '❌' : '✓';
    safeLog(`${statusColor} [REQ]`, {
      method: req.method,
      route: req.path,
      status: res.statusCode,
      durationMs: duration,
      time: new Date().toISOString(),
    });
  });

  next();
});

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Drain API - Supabase PostgreSQL Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      dbTest: 'GET /api/db-test',
      testDb: 'GET /api/test-db',
      readings: 'GET /api/readings',
      dbStatus: 'GET /api/db-status',
      docs: 'GET /docs',
    },
  });
});

// API Routes
app.use('/api', dashboardRoutes);
app.use('/api', sensorRoutes);
app.use('/api', testRoutes);
app.use('/', dashboardRoutes);

app.get('/api/test', (req, res) => {
  console.log('✅ API TEST HIT');
  res.send('API WORKING');
});

// Explicit API pass-through guard before frontend middleware
app.use('/api', (req, res, next) => next());

// Documentation endpoint
app.get('/docs', (req, res) => {
  res.status(200).json({
    title: 'Smart Drain API Documentation',
    version: '1.0.0',
    baseUrl: `http://localhost:${process.env.PORT || 5000}`,
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        description: 'Simple health check',
        response: { status: 'OK', uptime: 'number', timestamp: 'ISO string' },
      },
      {
        method: 'GET',
        path: '/api/test',
        description: 'Basic API health check',
        response: { success: 'boolean', message: 'string' },
      },
      {
        method: 'GET',
        path: '/api/db-test',
        description: 'Test database connection with SELECT NOW()',
        response: { success: 'boolean', timestamp: 'datetime', message: 'string' },
      },
      {
        method: 'GET',
        path: '/api/test-db',
        description: 'Test database connection with SELECT NOW()',
        response: { success: 'boolean', timestamp: 'datetime', message: 'string' },
      },
      {
        method: 'GET',
        path: '/api/readings',
        description: 'Get the latest 50 sensor readings',
        response: { success: 'boolean', count: 'number', data: 'array' },
      },
      {
        method: 'GET',
        path: '/api/db-status',
        description: 'Get pool status and connection details',
        response: { success: 'boolean', pool: 'object', connection: 'object' },
      },
      {
        method: 'POST',
        path: '/api/sensor-data',
        description: 'Ingest real-time sensor data, compute DHI and create alerts',
        requestBody: {
          drain_id: 'number',
          water_level_cm: 'number',
          flow_rate_l_min: 'number',
        },
      },
      {
        method: 'GET',
        path: '/api/latest-status',
        description: 'Get the latest DHI/status snapshot for each drain',
        response: { success: 'boolean', data: 'array', summary: 'object' },
      },
      {
        method: 'GET',
        path: '/api/alerts',
        description: 'Get recent alerts for the dashboard',
        response: { success: 'boolean', data: 'array' },
      },
      {
        method: 'GET',
        path: '/api/drains',
        description: 'Get drain master records with the latest health snapshot',
        response: { success: 'boolean', data: 'array' },
      },
    ],
  });
});

// Frontend assets and SPA fallback must come after API routes
app.use(express.static(frontendPath));

// Safe SPA fallback for non-API routes only
app.get(/^\/(?!api).*/, (req, res) => {
  return res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global error handling middleware (must be last)
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error('[ERROR]', err.message);

  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR-STACK]', err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal server error' : err.message,
  });
});

// API 404 handler must stay after all API routes
app.use('/api', (req, res) => {
  console.warn(`[404] ${req.method} ${req.path} not found`);
  return res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Final fallback for non-API methods/routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'Endpoint not found',
    });
  }

  return res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

async function startServer() {
  try {
    console.log('[SERVER] Starting Express server...\n');

    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║     Smart Drain API - Supabase Backend       ║
╠════════════════════════════════════════════════╣
║  Status:      ✓ Running                       ║
║  Port:        ${PORT}                                   ║
║  Environment: ${NODE_ENV}                       ║
║  Database:    PostgreSQL (Supabase)           ║
╚════════════════════════════════════════════════╝
      `);

      console.log('📍 Server URLs:');
      console.log(`   • Root:       http://localhost:${PORT}`);
      console.log(`   • API Test:   http://localhost:${PORT}/api/test`);
      console.log(`   • DB Test:    http://localhost:${PORT}/api/db-test`);
      console.log(`   • Health:     http://localhost:${PORT}/api/health`);
      console.log(`   • Readings:   http://localhost:${PORT}/api/readings`);
      console.log(`   • Pool Info:  http://localhost:${PORT}/api/db-status`);
      console.log(`   • Dashboard:  http://localhost:${PORT}/api/latest-status`);
      console.log(`   • Docs:       http://localhost:${PORT}/docs\n`);

      console.log('💡 Tip: Use curl or Postman to test endpoints\n');
    });
  } catch (error) {
    console.error('❌ [STARTUP] Failed to start server:', error.message);
    process.exit(1);
  }
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

/**
 * Handle graceful shutdown on signals
 */
async function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] ${signal} received. Starting graceful shutdown...\n`);

  if (server) {
    server.close(async () => {
      console.log('[SHUTDOWN] HTTP server closed');

      // Close database pool
      await closePool();

      console.log('✓ [SHUTDOWN] Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit after 15 seconds
    setTimeout(() => {
      console.error('❌ [SHUTDOWN] Forced exit due to timeout');
      process.exit(1);
    }, 15000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ [UNCAUGHT] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [UNHANDLED] Unhandled rejection at:', promise, 'reason:', reason);
});

// ============================================
// START SERVER
// ============================================

startServer();

export default app;

