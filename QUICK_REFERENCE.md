# Sensor Data API - Visual Quick Reference

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│                    (Dashboard/App)                          │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Server                        │
│                  (Node.js Backend)                          │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                    │
│  • POST   /sensor-data            (Insert)                 │
│  • GET    /sensor-data            (Fetch All)              │
│  • GET    /sensor-data/:drain_id  (Fetch by Drain)         │
├─────────────────────────────────────────────────────────────┤
│  Functions:                                                 │
│  • initializeSensorTable()                                  │
│  • insertSensorReading()           ← (DHI Calculation)     │
│  • getAllSensorReadings()                                   │
│  • getSensorReadingsByDrain()                               │
├─────────────────────────────────────────────────────────────┤
│  Connection Pool: mysql2/promise                            │
│  • 10 concurrent connections                                │
│  • Queue management                                         │
│  • Prepared statements (SQL safe)                           │
│  • SSL enabled                                              │
└────────────────────────────┬────────────────────────────────┘
                             │ TCP:3306
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                Railway MySQL Database                       │
├─────────────────────────────────────────────────────────────┤
│  Table: sensor_readings                                     │
│  ┌──────────┬──────────────┬──────┐                        │
│  │ id (PK)  │ drain_id (FK)│...   │                        │
│  ├──────────┼──────────────┼──────┤                        │
│  │ 1        │ 1            │ ...  │                        │
│  │ 2        │ 2            │ ...  │                        │
│  │ 3        │ 1            │ ...  │                        │
│  └──────────┴──────────────┴──────┘                        │
│                                                             │
│  Indexes: idx_drain_id, idx_timestamp                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints Quick Reference

```
┌─────────────────────────────────────────┐
│         INSERT SENSOR READING            │
├─────────────────────────────────────────┤
│ Method:  POST                           │
│ Endpoint: /sensor-data                  │
│ Content-Type: application/json          │
│                                         │
│ Request Body:                           │
│ {                                       │
│   "drain_id": 1,       (required)       │
│   "water_level": 45.5, (required)       │
│   "flow_rate": 32.0    (required)       │
│ }                                       │
│                                         │
│ Success Response: 201 Created           │
│ Error Response: 400 Bad Request         │
│                         500 Server Error │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        FETCH ALL SENSOR READINGS         │
├─────────────────────────────────────────┤
│ Method:  GET                            │
│ Endpoint: /sensor-data                  │
│ Query Params:                           │
│   limit=100 (optional, 1-1000)          │
│                                         │
│ Example URLs:                           │
│ GET /sensor-data                        │
│ GET /sensor-data?limit=50               │
│ GET /sensor-data?limit=200              │
│                                         │
│ Success Response: 200 OK                │
│ Error Response: 400 Bad Request         │
│                         500 Server Error │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    FETCH BY DRAIN (Latest First)        │
├─────────────────────────────────────────┤
│ Method:  GET                            │
│ Endpoint: /sensor-data/:drain_id        │
│ URL Params:                             │
│   drain_id (required, integer)          │
│ Query Params:                           │
│   limit=50 (optional, 1-500)            │
│                                         │
│ Example URLs:                           │
│ GET /sensor-data/1                      │
│ GET /sensor-data/5?limit=30             │
│                                         │
│ Success Response: 200 OK                │
│ Error Response: 400 Bad Request         │
│                         500 Server Error │
└─────────────────────────────────────────┘
```

---

## 🧮 DHI Score Calculation

```
┌────────────────────────────────────────┐
│     DHI = (WL × 0.6) + (FR × 0.4)     │
├────────────────────────────────────────┤
│                                        │
│ Water Level Contribution:    60%       │
│ Flow Rate Contribution:      40%       │
│                                        │
├────────────────────────────────────────┤
│          SEVERITY LEVELS                │
├────────────────────────────────────────┤
│ LOW:     DHI ≤ 40                      │
│ MEDIUM:  40 < DHI ≤ 70                 │
│ HIGH:    DHI > 70                      │
├────────────────────────────────────────┤
│         EXAMPLE CALCULATIONS            │
├────────────────────────────────────────┤
│ Water: 30cm, Flow: 20L/min              │
│ DHI = (30 × 0.6) + (20 × 0.4) = 26     │
│ Severity: LOW ✓                         │
│                                        │
│ Water: 50cm, Flow: 35L/min              │
│ DHI = (50 × 0.6) + (35 × 0.4) = 44     │
│ Severity: MEDIUM ⚠                     │
│                                        │
│ Water: 75cm, Flow: 60L/min              │
│ DHI = (75 × 0.6) + (60 × 0.4) = 69     │
│ Severity: MEDIUM ⚠                     │
│                                        │
│ Water: 85cm, Flow: 70L/min              │
│ DHI = (85 × 0.6) + (70 × 0.4) = 79     │
│ Severity: HIGH ⛔                      │
└────────────────────────────────────────┘
```

---

## 📊 Database Schema

```
┌────────────────────────────────────────────────────┐
│            sensor_readings Table                   │
├────────────────────────────────────────────────────┤
│ Column         │ Type           │ Constraints      │
├────────────────┼────────────────┼──────────────────┤
│ id             │ INT            │ PRIMARY KEY, AI  │
│ drain_id       │ INT            │ NOT NULL, INDEX  │
│ water_level    │ FLOAT          │ NOT NULL         │
│ flow_rate      │ FLOAT          │ NOT NULL         │
│ dhi_score      │ FLOAT          │ NOT NULL         │
│ timestamp      │ DATETIME       │ DEFAULT NOW()    │
│                │                │ INDEX            │
└────────────────────────────────────────────────────┘

Indexes:
  • idx_drain_id   → Fast lookup by drain
  • idx_timestamp  → Fast ordering/range queries

Example Data:
┌────┬──────────┬──────────┬──────────┬──────────┬─────────────────────┐
│ id │ drain_id │ water_lv │ flow_rt  │ dhi_scr  │ timestamp           │
├────┼──────────┼──────────┼──────────┼──────────┼─────────────────────┤
│ 1  │ 1        │ 45.5     │ 32.0     │ 39.5     │ 2026-03-31 10:30:45 │
│ 2  │ 2        │ 65.0     │ 50.5     │ 59.2     │ 2026-03-31 10:25:30 │
│ 3  │ 1        │ 75.0     │ 60.0     │ 69.0     │ 2026-03-31 10:20:15 │
└────┴──────────┴──────────┴──────────┴──────────┴─────────────────────┘
```

---

## 🔀 Request/Response Flow

```
CLIENT REQUEST
│
├─ POST /sensor-data
│  │
│  ├─ Validate input
│  ├─ Check required fields
│  ├─ Validate data types
│  │
│  ├─ Calculate DHI
│  │  DHI = (water × 0.6) + (flow × 0.4)
│  │
│  ├─ Insert to DB
│  │  INSERT INTO sensor_readings VALUES (...)
│  │
│  └─ Determine Severity
│     IF DHI > 70: HIGH
│     IF DHI > 40: MEDIUM
│     ELSE: LOW
│
└─ RESPONSE 201 + {readingId, dhi_score, severity}

─────────────────────────────────────

CLIENT REQUEST
│
├─ GET /sensor-data?limit=50
│  │
│  ├─ Validate limit (1-1000)
│  │
│  ├─ Query DB
│  │  SELECT * FROM sensor_readings
│  │  ORDER BY timestamp DESC
│  │  LIMIT 50
│  │
│  └─ Return data
│
└─ RESPONSE 200 + {count, data[]}

─────────────────────────────────────

CLIENT REQUEST
│
├─ GET /sensor-data/1?limit=30
│  │
│  ├─ Validate drain_id (numeric)
│  ├─ Validate limit (1-500)
│  │
│  ├─ Query DB
│  │  SELECT * FROM sensor_readings
│  │  WHERE drain_id = 1
│  │  ORDER BY timestamp DESC
│  │  LIMIT 30
│  │
│  └─ Return data
│
└─ RESPONSE 200 + {drain_id, count, data[]}
```

---

## 🛡️ Error Handling Flow

```
REQUEST RECEIVED
│
├─ VALIDATION PHASE
│  ├─ Required fields missing?
│  │  └─ RETURN 400: "Missing required fields"
│  ├─ Invalid data types?
│  │  └─ RETURN 400: "Invalid data types"
│  ├─ Invalid parameters?
│  │  └─ RETURN 400: "Invalid parameter"
│
├─ DATABASE PHASE
│  ├─ Connection available?
│  │  ├─ NO  → RETURN 500: "Failed to connect"
│  │  └─ YES → Execute query
│  ├─ Query executed successfully?
│  │  ├─ NO  → RETURN 500: "Failed to process"
│  │  └─ YES → Continue
│  ├─ Clean up connection
│  │  └─ Release to pool
│
├─ RESPONSE PHASE
│  ├─ Success? → RETURN 200/201 + data
│  └─ Error?   → RETURN 400/500 + error
│
└─ LOG ALL ERRORS
```

---

## 🚀 Deployment Workflow

```
LOCAL DEVELOPMENT
  │
  ├─ Set env vars locally
  ├─ npm run server
  ├─ Test with cURL
  └─ Verify DB connection

              ↓

CODE REVIEW
  │
  ├─ Check error handling
  ├─ Check SQL injection prevention
  ├─ Check input validation
  ├─ Check documentation
  └─ Approve

              ↓

GIT PUSH
  │
  ├─ git add .
  ├─ git commit -m "Add sensor API"
  └─ git push origin main

              ↓

RAILWAY AUTO-DEPLOY
  │
  ├─ Detects code change
  ├─ Builds Node.js app
  ├─ Sets env vars from Railway dashboard
  └─ Starts server

              ↓

PRODUCTION READY
  │
  ├─ Monitor logs
  ├─ Test endpoints
  └─ Integrate with frontend
```

---

## ✅ Pre-Deployment Checklist

```
ENVIRONMENT VARIABLES
  ☐ MYSQLHOST set
  ☐ MYSQLUSER set
  ☐ MYSQLPASSWORD set
  ☐ MYSQLDATABASE set
  ☐ MYSQLPORT set (or uses default 3306)
  ☐ PORT set (or uses default 5000)

CODE QUALITY
  ☐ All functions have error handling
  ☐ All inputs are validated
  ☐ All queries use prepared statements
  ☐ All connections are properly released
  ☐ All endpoints return consistent JSON

DATABASE
  ☐ Table creation function exists
  ☐ Indexes are defined
  ☐ Connection pooling configured
  ☐ Database user has required permissions

DOCUMENTATION
  ☐ API docs created
  ☐ Testing guide created
  ☐ Examples provided
  ☐ Error scenarios documented

TESTING
  ☐ POST /sensor-data works
  ☐ GET /sensor-data works
  ☐ GET /sensor-data/:drain_id works
  ☐ Error handling tested
  ☐ Database persistence verified
```

---

## 🔗 Function Call Hierarchy

```
startServer()
  │
  ├─ initializeDatabase()
  │  │
  │  ├─ Test DB connection
  │  │
  │  ├─ initializeSensorTable()
  │  │  └─ CREATE TABLE sensor_readings IF NOT EXISTS
  │  │
  │  └─ ensureAuthorityAccountsTable()
  │     └─ CREATE TABLE authority_accounts IF NOT EXISTS
  │
  └─ app.listen(PORT)


POST /sensor-data
  │
  ├─ Validate input
  │
  └─ insertSensorReading()
     │
     ├─ Validate parameters
     ├─ Calculate DHI score
     ├─ Get connection from pool
     ├─ Execute INSERT query
     ├─ Release connection to pool
     └─ Return {readingId, dhi_score, timestamp}


GET /sensor-data
  │
  ├─ Validate limit parameter
  │
  └─ getAllSensorReadings()
     │
     ├─ Get connection from pool
     ├─ Execute SELECT ORDER BY timestamp DESC
     ├─ Release connection to pool
     └─ Return rows[]


GET /sensor-data/:drain_id
  │
  ├─ Validate drain_id parameter
  ├─ Validate limit parameter
  │
  └─ getSensorReadingsByDrain()
     │
     ├─ Get connection from pool
     ├─ Execute SELECT WHERE drain_id ORDER BY timestamp DESC
     ├─ Release connection to pool
     └─ Return rows[]
```

---

## 📝 Response Example Gallery

```
═ SUCCESS: Insert (201 Created) ═
{
  "success": true,
  "message": "Sensor reading recorded successfully",
  "data": {
    "readingId": 42,
    "drain_id": 1,
    "water_level": 45.5,
    "flow_rate": 32.0,
    "dhi_score": 39.5,
    "severity": "LOW",
    "timestamp": "2026-03-31T10:30:45.000Z"
  }
}

═ SUCCESS: Fetch All (200 OK) ═
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 42,
      "drain_id": 1,
      "water_level": 45.5,
      "flow_rate": 32.0,
      "dhi_score": 39.5,
      "timestamp": "2026-03-31T10:30:45.000Z"
    },
    { ... },
    { ... }
  ]
}

═ ERROR: Missing Field (400 Bad Request) ═
{
  "success": false,
  "error": "Missing required fields",
  "required": ["drain_id", "water_level", "flow_rate"]
}

═ ERROR: Invalid Type (400 Bad Request) ═
{
  "success": false,
  "error": "Invalid data types. drain_id, water_level, and flow_rate must be numbers"
}

═ ERROR: Server Error (500 Internal Server Error) ═
{
  "success": false,
  "error": "Failed to process sensor data",
  "message": "Database connection failed"
}
```

---

## 🎯 Implementation at a Glance

| Component | Status | Details |
|-----------|--------|---------|
| **MySQL Table** | ✅ Complete | `sensor_readings` with 6 fields + indexes |
| **Insert Function** | ✅ Complete | DHI calculation + validation |
| **GET All Endpoint** | ✅ Complete | Paginated, ordered by timestamp |
| **GET by Drain** | ✅ Complete | Filtered by drain_id, ordered |
| **Error Handling** | ✅ Complete | Validation + database + HTTP errors |
| **Environment Vars** | ✅ Complete | All 6 variables used |
| **Documentation** | ✅ Complete | 5 comprehensive markdown files |
| **Security** | ✅ Complete | Prepared statements, input validation |
| **Performance** | ✅ Complete | Connection pooling, indexes defined |

---

**Your Sensor Data API is Production Ready! ✨**
