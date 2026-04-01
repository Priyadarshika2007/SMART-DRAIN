# Smart Drain - Improved Supabase PostgreSQL Backend

Production-ready Node.js Express backend with robust error handling, retry logic, and comprehensive logging for Supabase PostgreSQL database.

## 🎯 Improvements Made

### ✅ All 10 Requirements Implemented

1. **Stable Database Connection**
   - SSL configuration enabled (`rejectUnauthorized: false`)
   - Max 10 concurrent connections
   - Connection timeout: 5 seconds
   - Idle timeout: 30 seconds

2. **Enhanced Test Endpoint** (`GET /api/test-db`)
   - Executes `SELECT NOW()` query
   - Returns structured JSON: `{ success, connected, timestamp, message }`
   - Comprehensive error handling

3. **New Pool Status Endpoint** (`GET /api/db-status`)
   - Reports pool statistics (idle, total, waiting)
   - Connection status verification
   - Database type and host information

4. **Structured Error Handling**
   - All endpoints return consistent JSON format
   - `{ success, error, message, serverTime }`
   - Development mode shows detailed error stacks

5. **Enhanced Console Logging**
   - Color-coded status indicators (✓, ❌, ⚠️)
   - Tagged log messages: `[CONFIG]`, `[DB]`, `[POOL]`, `[ERROR]`, etc.
   - Request/response logging with duration
   - Query execution logging

6. **Environment Variable Validation**
   - `DATABASE_URL` validation on startup
   - Fatal error if missing (exits with code 1)
   - Masked output in logs for security

7. **Global Error Handling**
   - 404 route handler with available endpoints list
   - Global error middleware for all exceptions
   - Uncaught exception handler
   - Unhandled promise rejection handler

8. **Retry Logic with Exponential Backoff**
   - 3 connection attempts on startup
   - 2-second delay between retries
   - Graceful failure with helpful error messages
   - Connection test at each retry

9. **Clean Project Structure**
   ```
   smart-drain/
   ├── config/db.js       # Pool, validation, utilities
   ├── routes/test.js     # Endpoints
   ├── server.js          # Express app & startup
   ├── .env              # Configuration (git ignored)
   ├── .env.example      # Example template
   └── package.json      # Dependencies
   ```

10. **Production-Ready Features**
    - Graceful shutdown on SIGTERM/SIGINT
    - Request logging middleware
    - Documentation endpoint (`GET /docs`)
    - Health check endpoint (`GET /api/health`)
    - Pool event listeners

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 16+ (or 18+ for best compatibility)
- PostgreSQL database URL (from Supabase)
- `.env` file with `DATABASE_URL` configured

### 2. Install Dependencies

```bash
cd smart-drain
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your actual Supabase connection string:

```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xyz.supabase.co:5432/postgres
NODE_ENV=development
PORT=5000
```

**How to get your connection string:**

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Settings → Database**
4. Click **Connection pooling** tab
5. Select **PostgreSQL** (if not selected)
6. Copy the connection string
7. Replace `[YOUR-PASSWORD]` with your database password
8. Paste into `.env` as `DATABASE_URL`

### 4. Start the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm run server
```

### Expected Output

```
[CONFIG] Database URL detected (masked): postgresql://***:***@***.co:5432/***
[CONFIG] Pool configuration: { max: 10, idleTimeoutMillis: 30000, ... }
[DB] Attempting connection (1/3)...
✓ [DB] PostgreSQL client connected
✓ [DB] Query executed successfully at: 2026-04-01T19:05:30.123Z
✓ [DB] Connection pool initialized successfully

[SERVER] Starting Express server...

╔════════════════════════════════════════════════╗
║     Smart Drain API - Supabase Backend       ║
╠════════════════════════════════════════════════╣
║  Status:      ✓ Running                       ║
║  Port:        5000                            ║
║  Environment: development                     ║
║  Database:    PostgreSQL (Supabase)           ║
╚════════════════════════════════════════════════╝

📍 Server URLs:
   • Root:       http://localhost:5000
   • Health:     http://localhost:5000/api/health
   • Test DB:    http://localhost:5000/api/test-db
   • Pool Info:  http://localhost:5000/api/db-status
   • Docs:       http://localhost:5000/docs
```

---

## 📋 Endpoints Reference

### 1. Root Endpoint
```http
GET /
```

**Response (200):**
```json
{
  "success": true,
  "message": "Smart Drain API - Supabase PostgreSQL Backend",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "GET /api/health",
    "testDb": "GET /api/test-db",
    "dbStatus": "GET /api/db-status",
    "docs": "GET /docs"
  }
}
```

### 2. Health Check
```http
GET /api/health
```

**Response (200):**
```json
{
  "success": true,
  "status": "OK",
  "uptime": 12.345,
  "timestamp": "2026-04-01T19:05:30.123Z",
  "message": "Server is healthy"
}
```

### 3. Test Database Connection
```http
GET /api/test-db
```

**Response (200 - Success):**
```json
{
  "success": true,
  "connected": true,
  "timestamp": "2026-04-01 19:05:30.123456",
  "message": "Database connected successfully",
  "serverTime": "2026-04-01T19:05:30.123Z"
}
```

**Response (500 - Failure):**
```json
{
  "success": false,
  "connected": false,
  "error": "connect ECONNREFUSED 1.2.3.4:5432",
  "message": "Database connection failed",
  "serverTime": "2026-04-01T19:05:30.123Z"
}
```

### 4. Database Pool Status
```http
GET /api/db-status
```

**Response (200):**
```json
{
  "success": true,
  "pool": {
    "connected": true,
    "status": "Connected",
    "idle": 8,
    "total": 10,
    "waiting": 0,
    "max": 10
  },
  "connection": {
    "connected": true,
    "timestamp": "2026-04-01 19:05:30.123456",
    "message": "Database connected successfully"
  },
  "database": {
    "type": "PostgreSQL (Supabase)",
    "host": "db.kzyokliyydolpmgqlqkr.supabase.co",
    "ssl": "enabled"
  },
  "serverTime": "2026-04-01T19:05:30.123Z"
}
```

### 5. API Documentation
```http
GET /docs
```

**Response (200):** Full API documentation with all endpoints, methods, descriptions, and response formats.

---

## 🧪 Testing

### Test with cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Database connection test
curl http://localhost:5000/api/test-db

# Pool status
curl http://localhost:5000/api/db-status

# Root endpoint
curl http://localhost:5000/

# Docs
curl http://localhost:5000/docs
```

### Test with Postman

1. **Create collection** or import from code
2. **Create new HTTP request:**
   - URL: `http://localhost:5000/api/test-db`
   - Method: `GET`
   - Click **Send**

3. **Expected response:**
   - Status: `200`
   - Body: JSON with `success: true`

### Test with Node.js

```javascript
import fetch from 'node-fetch';

async function testAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/test-db');
    const data = await response.json();
    console.log('Success:', data.success);
    console.log('Message:', data.message);
    console.log('Timestamp:', data.timestamp);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
```

### Test with Bash Script

```bash
#!/bin/bash

echo "Testing Smart Drain API..."
echo ""

endpoints=(
  "http://localhost:5000/"
  "http://localhost:5000/api/health"
  "http://localhost:5000/api/test-db"
  "http://localhost:5000/api/db-status"
  "http://localhost:5000/docs"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing: $endpoint"
  curl -s "$endpoint" | jq . 2>/dev/null || echo "Failed or not JSON"
  echo ""
done
```

---

## 🐛 Troubleshooting

### ❌ Error: `DATABASE_URL is not defined in .env file`

**Problem:** Environment variable is missing
**Solution:**
1. Ensure `.env` file exists in project root
2. Check `.env` contains `DATABASE_URL=...`
3. Restart server

### ❌ Error: `Failed to connect to database after 3 attempts`

**Problem:** Connection failed on all 3 retries
**Possible causes:**
- Wrong connection string
- Database is offline
- IP not whitelisted in Supabase
- Firewall blocking connection

**Solutions:**
1. Verify connection string in `.env` matches Supabase
2. Test with `psql` from terminal:
   ```bash
   psql "postgresql://postgres:password@host:5432/postgres"
   ```
3. Add your IP to Supabase whitelist:
   - Settings → Auth → Authorized domains
   - Or use connection pooling in Supabase
4. Check Supabase project is active and not paused

### ❌ Error: `password authentication failed`

**Problem:** Wrong database password
**Solution:**
1. Reset password in Supabase dashboard
2. Update `.env` with new password
3. Restart server

### ❌ Connection hangs on `/api/test-db`

**Problem:** Pool may be exhausted or stuck
**Solution:**
1. Stop server (`Ctrl+C`)
2. Check active connections in Supabase dashboard
3. Restart server
4. If persistent, increase pool size in `config/db.js`:
   ```javascript
   max: 20, // Increase from 10
   ```

### ⚠️ Many "Connection timeout" messages

**Problem:** Server can't establish connections quickly
**Solution:**
1. Check network latency to Supabase
2. Increase timeout in `config/db.js`:
   ```javascript
   connectionTimeoutMillis: 10000, // Increase from 5000
   ```
3. Check Supabase project performance metrics

---

## 📁 Project Structure Details

### `config/db.js`

**Responsibilities:**
- Environment variable validation
- Connection pool initialization with retry logic
- Pool event listeners
- Utility functions: `getPoolStatus()`, `testConnection()`, `closePool()`

**Key features:**
- 3 retry attempts with 2-second delay
- SSL configuration for Supabase
- Connection test on each retry
- Event listeners for pool operations
- Graceful shutdown support

### `routes/test.js`

**Endpoints:**
1. `GET /api/health` - Simple uptime check
2. `GET /api/test-db` - Connection test with `SELECT NOW()`
3. `GET /api/db-status` - Pool status and diagnostics

**Features:**
- Request logging
- Error handling with structured responses
- Pool statistics reporting
- Connection diagnostics

### `server.js`

**Responsibilities:**
- Express app setup
- Middleware configuration
- Route registration
- Error handlers (404, global)
- Server startup and shutdown

**Features:**
- Environment variable validation
- Request logging middleware
- Graceful shutdown on SIGTERM/SIGINT
- Uncaught exception handling
- 15-second force exit timeout
- Documentation endpoint

---

## 📊 Performance Tuning

### Increase Pool Size

Edit `config/db.js`:

```javascript
const poolConfig = {
  max: 20, // Increase for high-traffic apps
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};
```

### Reduce Connection Timeout

```javascript
connectionTimeoutMillis: 3000, // Fail faster if DB is unreachable
```

### Increase Retry Attempts

```javascript
const MAX_RETRY_ATTEMPTS = 5; // Try more times on startup
const RETRY_DELAY = 3000; // Wait longer between retries
```

---

## 🔐 Security Considerations

### Before Production Deployment

1. **Use non-root database user** (don't use `postgres`)
   - Create dedicated user in Supabase
   - Grant only necessary permissions

2. **Rotate database password regularly**
   - Supabase allows password rotation in database settings

3. **Use environment variables**
   - Never commit `.env` file
   - Use `.env.example` as template
   - Review `.gitignore` includes `.env`

4. **Enable rate limiting**
   - Add middleware like `express-rate-limit`
   - Protect `/api/test-db` from abuse

5. **Use HTTPS in production**
   - Supabase uses SSL connections
   - Deploy behind HTTPS proxy (nginx, Cloudflare)

6. **Monitor connection logs**
   - Watch for failed authentication attempts
   - Alert on unusual query patterns

---

## 🚀 Deployment

### Render.com

```bash
# 1. Push code to GitHub
# 2. Create new Web Service on Render
# 3. Connect GitHub repo
# 4. Environment variables:
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=5000

# 5. Build command: npm install
# 6. Start command: npm run server
```

### Railway

```bash
# 1. Push code to GitHub
# 2. Create new project on Railway
# 3. Connect GitHub repo
# 4. Add DatabaseURL variable from Supabase
# 5. Auto-deploys on push
```

### Vercel (with Serverless)

Not recommended for long-running Express servers. Use Render or Railway instead.

---

## 📚 Common Commands

```bash
# Install dependencies
npm install

# Start development server (auto-reload)
npm run dev

# Start production server
npm run server

# Test API
curl http://localhost:5000/api/test-db

# Check pool status
curl http://localhost:5000/api/db-status

# View documentation
curl http://localhost:5000/docs
```

---

## 📝 Next Steps

1. **Add authentication**
   - JWT token verification
   - Role-based access control

2. **Add API endpoints for sensor data**
   - `POST /api/sensor-data` - Insert reading
   - `GET /api/sensor-data` - Fetch readings
   - `GET /api/sensor-data/:drain_id` - By drain

3. **Add request validation**
   - Use Joi or Zod
   - Validate query parameters
   - Sanitize inputs

4. **Add logging service**
   - Winston or Pino
   - Log to file or external service
   - Better error tracking

5. **Add database migrations**
   - Knex.js or Prisma
   - Version control for schema changes

6. **Add monitoring**
   - Sentry for error tracking
   - DataDog or New Relic for performance
   - Prometheus metrics

---

## ✅ Verification Checklist

Before going to production:

- [ ] Environment variables validated on startup
- [ ] Database connection established successfully
- [ ] Retry logic working (test by going offline)
- [ ] Pool status endpoint returning correct info
- [ ] Error handling returns structured JSON
- [ ] All endpoints tested with curl/Postman
- [ ] Graceful shutdown working (Ctrl+C)
- [ ] Logs are clear and helpful
- [ ] SSL enabled for database connection
- [ ] No hardcoded credentials in code

---

## 📞 Support & Issues

If you encounter issues:

1. Check the console output for detailed error logs
2. Verify `.env` configuration matches Supabase
3. Test database connection directly with `psql`
4. Review Supabase dashboard for connection limits
5. Check network connectivity to database host

---

## 📄 License

ISC

---

**Last Updated:** April 1, 2026  
**Version:** 2.0 (Production-Ready)
