# Smart Drain - Supabase PostgreSQL Backend

Node.js Express backend connected to Supabase PostgreSQL database for the Smart Drain urban drain monitoring system.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `pg` - PostgreSQL client (node-postgres)
- `dotenv` - Environment variable management
- `cors` - Cross-Origin Resource Sharing

### 2. Configure Database Connection

Edit `.env` file and add your Supabase connection string:

```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.supabase.co:5432/postgres
NODE_ENV=development
PORT=5000
```

**How to get your Supabase connection string:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Copy the connection string under "URI" or "Connection pooling"
5. Replace `[YOUR-PASSWORD]` with your database password
6. Paste into the `DATABASE_URL` in `.env`

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run server
```

**Expected output:**
```
╔════════════════════════════════════════════╗
║   Smart Drain API - Supabase Backend      ║
║   Port: 5000                                ║
║   Environment: development                 ║
║   Database: PostgreSQL (Supabase)          ║
╚════════════════════════════════════════════╝

✓ Server running on http://localhost:5000
✓ Test endpoint: http://localhost:5000/api/test-db
✓ Health check: http://localhost:5000/api/health
```

## 📋 Available Endpoints

### Health Check
```http
GET /api/health
```

**Response (200):**
```json
{
  "status": "OK",
  "uptime": 12.345,
  "timestamp": "2026-04-01T19:05:30.000Z"
}
```

### Test Database Connection
```http
GET /api/test-db
```

**Response (200):**
```json
{
  "success": true,
  "message": "Database connection successful",
  "timestamp": "2026-04-01 19:05:30.123456",
  "serverTime": "2026-04-01T19:05:30.000Z"
}
```

**Error response (500):**
```json
{
  "success": false,
  "message": "Database connection failed",
  "error": "connect ECONNREFUSED 192.0.2.1:5432",
  "serverTime": "2026-04-01T19:05:30.000Z"
}
```

### Root Endpoint
```http
GET /
```

**Response (200):**
```json
{
  "message": "Smart Drain API - Supabase PostgreSQL Backend",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /api/health",
    "testDb": "GET /api/test-db"
  }
}
```

## 📁 Project Structure

```
smart-drain/
├── config/
│   └── db.js              # Database pool configuration
├── routes/
│   └── test.js            # Test & health endpoints
├── server.js              # Main Express server
├── .env                   # Environment variables (git ignored)
├── .env.example           # Example environment file
├── package.json           # Dependencies
└── README_SUPABASE.md     # This file
```

## 🔧 File Details

### `config/db.js`
Creates and exports a PostgreSQL connection pool using `pg.Pool`:

```javascript
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Features:**
- Max 10 concurrent connections
- 30-second idle timeout
- 2-second connection timeout
- Error handling for idle clients

### `routes/test.js`
Defines two test endpoints:

- `GET /api/test-db` - Tests database connectivity with `SELECT NOW();`
- `GET /api/health` - Simple health check

### `server.js`
Main Express application:

- Loads environment variables via `dotenv`
- Middleware: `express.json()`, `cors()`
- Routes: imports from `routes/test.js`
- Error handling middleware
- Graceful shutdown on SIGTERM

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | Web framework |
| `pg` | ^8.11.3 | PostgreSQL client |
| `dotenv` | ^16.4.5 | Environment management |
| `cors` | ^2.8.6 | CORS middleware |

## ✅ Testing

### Test with cURL
```bash
# Health check
curl http://localhost:5000/api/health

# Database connection test
curl http://localhost:5000/api/test-db

# Root endpoint
curl http://localhost:5000/
```

### Test with Postman

1. **Import Collection:**
   - New → HTTP Request
   - URL: `http://localhost:5000/api/test-db`
   - Method: GET
   - Click **Send**

2. **Expected Success (200):**
   ```json
   {
     "success": true,
     "message": "Database connection successful",
     "timestamp": "2026-04-01 19:05:30.123456",
     "serverTime": "2026-04-01T19:05:30.000Z"
   }
   ```

3. **Expected Failure (500):**
   ```json
   {
     "success": false,
     "message": "Database connection failed",
     "error": "ECONNREFUSED"
   }
   ```

### Test with JavaScript/Node.js
```javascript
import fetch from 'node-fetch';

async function testAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/test-db');
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
```

## 🔧 Troubleshooting

### Error: `connect ECONNREFUSED`
**Problem:** Cannot connect to database
**Solution:**
1. Verify `DATABASE_URL` in `.env` is correct
2. Check Supabase project is active and running
3. Ensure your IP is whitelisted in Supabase

### Error: `ENOTFOUND db.supabase.co`
**Problem:** DNS resolution failed
**Solution:**
1. Check internet connection
2. Verify database host in connection string
3. Check for firewall/proxy blocking

### Error: `password authentication failed`
**Problem:** Wrong database password
**Solution:**
1. Get connection string from Supabase dashboard
2. Verify password in `.env` matches
3. Reset password if needed in Supabase

### Error: `Role "postgres" does not exist`
**Problem:** Invalid database user
**Solution:**
1. Use correct PostgreSQL user from Supabase
2. Usually `postgres` for Supabase
3. Verify in connection string format

### Server starts but `/api/test-db` hangs
**Problem:** Connection pool is full or stuck
**Solution:**
1. Restart server: `Ctrl+C` then restart
2. Check Supabase connection limits
3. Increase pool size in `config/db.js`

## 📝 ES Modules Note

This backend uses ES Modules (`import`/`export`) instead of CommonJS (`require`):

```javascript
// ✓ ES Modules (used here)
import express from 'express';
import pool from './config/db.js';

// ✗ CommonJS (not used)
const express = require('express');
const pool = require('./config/db.js');
```

`package.json` has `"type": "module"` to enable this.

## 🚀 Deployment

### Render.com
1. Push code to GitHub
2. Connect Render to GitHub repo
3. Set environment variables: `DATABASE_URL`, `NODE_ENV`, `PORT`
4. Deploy

### Railway.app
1. Connect GitHub repo
2. Add `DATABASE_URL` variable
3. Auto-deploys on push

### Vercel
1. Not recommended for long-running Node.js servers
2. Better to use Render or Railway

## 📚 Next Steps

1. **Add sensor data routes:** Create `/routes/sensor.js` for sensor readings
2. **Add authentication:** Implement JWT or session-based auth
3. **Add database migrations:** Use a migration tool like Knex.js
4. **Add logging:** Use Winston or Pino for better logging
5. **Add validation:** Use Joi or Zod for request validation

## 📄 License

ISC

## 👤 Author

Smart Drain Team
