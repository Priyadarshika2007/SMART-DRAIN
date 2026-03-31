# Sensor Data API Documentation

## Database Schema

### sensor_readings Table

```sql
CREATE TABLE IF NOT EXISTS sensor_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drain_id INT NOT NULL,
  water_level FLOAT NOT NULL,
  flow_rate FLOAT NOT NULL,
  dhi_score FLOAT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_drain_id (drain_id),
  INDEX idx_timestamp (timestamp)
)
```

**Field Descriptions:**
- `id`: Auto-incrementing primary key
- `drain_id`: Drain identifier (foreign key reference)
- `water_level`: Water level reading (in cm)
- `flow_rate`: Flow rate reading (in L/min)
- `dhi_score`: Drain Health Index score (calculated: 60% water_level + 40% flow_rate)
- `timestamp`: Reading timestamp (auto-generated on insert)

**Indexes:**
- `idx_drain_id`: For fast filtering by drain
- `idx_timestamp`: For fast sorting by latest readings

---

## API Endpoints

### 1. POST /sensor-data
Insert a new sensor reading into the database.

**Request Body:**
```json
{
  "drain_id": 1,
  "water_level": 45.5,
  "flow_rate": 32.0
}
```

**Parameters:**
- `drain_id` (required, integer): Drain identifier
- `water_level` (required, number): Water level in cm
- `flow_rate` (required, number): Flow rate in L/min

**Success Response (201):**
```json
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
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid data types. drain_id, water_level, and flow_rate must be numbers",
  "message": "..."
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to process sensor data",
  "message": "..."
}
```

**Severity Levels:**
- `LOW`: DHI score ≤ 40
- `MEDIUM`: DHI score 40 < score ≤ 70
- `HIGH`: DHI score > 70

---

### 2. GET /sensor-data
Fetch all sensor readings ordered by latest timestamp.

**Query Parameters:**
- `limit` (optional, integer, default: 100): Maximum number of records to return (1-1000)

**Examples:**
```
GET /sensor-data
GET /sensor-data?limit=50
GET /sensor-data?limit=200
```

**Success Response (200):**
```json
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
    {
      "id": 41,
      "drain_id": 2,
      "water_level": 65.0,
      "flow_rate": 50.5,
      "dhi_score": 59.2,
      "timestamp": "2026-03-31T10:25:30.000Z"
    },
    {
      "id": 40,
      "drain_id": 1,
      "water_level": 30.0,
      "flow_rate": 25.0,
      "dhi_score": 22.0,
      "timestamp": "2026-03-31T10:20:15.000Z"
    }
  ]
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid limit parameter. Must be between 1 and 1000"
}
```

---

### 3. GET /sensor-data/:drain_id
Fetch sensor readings for a specific drain, ordered by latest timestamp.

**URL Parameters:**
- `drain_id` (required, integer): Drain identifier

**Query Parameters:**
- `limit` (optional, integer, default: 50): Maximum number of records (1-500)

**Examples:**
```
GET /sensor-data/1
GET /sensor-data/5?limit=20
GET /sensor-data/3?limit=100
```

**Success Response (200):**
```json
{
  "success": true,
  "drain_id": 1,
  "count": 2,
  "data": [
    {
      "id": 42,
      "drain_id": 1,
      "water_level": 45.5,
      "flow_rate": 32.0,
      "dhi_score": 39.5,
      "timestamp": "2026-03-31T10:30:45.000Z"
    },
    {
      "id": 40,
      "drain_id": 1,
      "water_level": 30.0,
      "flow_rate": 25.0,
      "dhi_score": 22.0,
      "timestamp": "2026-03-31T10:20:15.000Z"
    }
  ]
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid drain_id. Must be a number"
}
```

---

## Helper Functions in server.js

### initializeSensorTable()
Initialize the `sensor_readings` table on server startup if it doesn't exist.

```javascript
await initializeSensorTable();
```

---

### insertSensorReading(drain_id, water_level, flow_rate)
Insert a sensor reading with automatic DHI score calculation.

**Parameters:**
- `drain_id` (number): Drain identifier
- `water_level` (number): Water level in cm
- `flow_rate` (number): Flow rate in L/min

**Returns:** Promise with result object containing `readingId`, `dhi_score`, and `timestamp`

**Example:**
```javascript
const result = await insertSensorReading(1, 45.5, 32.0);
console.log(`Reading inserted with ID: ${result.readingId}`);
console.log(`DHI Score: ${result.dhi_score}`);
```

---

### getAllSensorReadings(limit)
Fetch all sensor readings ordered by latest timestamp.

**Parameters:**
- `limit` (number, default: 100): Maximum records to return

**Returns:** Promise with array of sensor readings

**Example:**
```javascript
const readings = await getAllSensorReadings(50);
console.log(`Fetched ${readings.length} readings`);
```

---

### getSensorReadingsByDrain(drain_id, limit)
Fetch sensor readings for a specific drain.

**Parameters:**
- `drain_id` (number): Drain identifier
- `limit` (number, default: 50): Maximum records to return

**Returns:** Promise with array of sensor readings

**Example:**
```javascript
const readings = await getSensorReadingsByDrain(1, 30);
console.log(`Fetched ${readings.length} readings for drain 1`);
```

---

## Environment Variables

The following environment variables must be set for database connectivity:

```bash
MYSQLHOST=your-railway-host.railway.app
MYSQLUSER=your-username
MYSQLPASSWORD=your-password
MYSQLDATABASE=your-database-name
MYSQLPORT=3306 (default)
PORT=5000 (server port, default)
```

---

## Error Handling

All database operations include comprehensive error handling:
- Connection validation on startup
- Input validation (type and range checks)
- Try-catch blocks with detailed error messages
- Connection resource cleanup (always released)
- Graceful degradation if database unavailable

---

## Example Usage

### Insert Sensor Data from Device
```javascript
const response = await fetch('http://localhost:5000/sensor-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    drain_id: 1,
    water_level: 45.5,
    flow_rate: 32.0
  })
});

const result = await response.json();
console.log(`DHI Score: ${result.data.dhi_score}`);
console.log(`Severity: ${result.data.severity}`);
```

### Fetch Recent Sensor Data
```javascript
const response = await fetch('http://localhost:5000/sensor-data?limit=50');
const result = await response.json();

result.data.forEach(reading => {
  console.log(`Drain ${reading.drain_id}: Water Level ${reading.water_level}cm, DHI ${reading.dhi_score}`);
});
```

### Fetch Data for Specific Drain
```javascript
const response = await fetch('http://localhost:5000/sensor-data/1?limit=30');
const result = await response.json();

console.log(`Latest readings for Drain ${result.drain_id}:`);
result.data.forEach(reading => {
  console.log(`${reading.timestamp}: DHI ${reading.dhi_score}`);
});
```

---

## DHI Score Calculation

The Drain Health Index (DHI) score is calculated as:

```
DHI Score = (water_level × 0.6) + (flow_rate × 0.4)
```

**Examples:**
- Water Level: 50cm, Flow Rate: 30L/min → DHI = (50 × 0.6) + (30 × 0.4) = 42
- Water Level: 75cm, Flow Rate: 45L/min → DHI = (75 × 0.6) + (45 × 0.4) = 63

---

## Notes

- All timestamps are stored in UTC
- Connection pooling is used for optimal performance
- Indexes on `drain_id` and `timestamp` for fast queries
- Default limit of 100 for safety; adjust as needed
- All queries use prepared statements to prevent SQL injection
