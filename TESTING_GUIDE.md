# Quick Testing & cURL Examples

## Setup & Prerequisites

1. **Ensure Environment Variables are Set:**
   ```bash
   MYSQLHOST=your-railway-host
   MYSQLUSER=your-username
   MYSQLPASSWORD=your-password
   MYSQLDATABASE=your-database
   MYSQLPORT=3306
   ```

2. **Start the Server:**
   ```bash
   npm run server
   # or: node server.js
   ```

3. **Verify Health Check:**
   ```bash
   curl http://localhost:5000/api/health
   ```
   Expected: `API is running`

---

## cURL Examples

### 1. Insert Single Sensor Reading

```bash
curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "drain_id": 1,
    "water_level": 45.5,
    "flow_rate": 32.0
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor reading recorded successfully",
  "data": {
    "readingId": 1,
    "drain_id": 1,
    "water_level": 45.5,
    "flow_rate": 32.0,
    "dhi_score": 39.5,
    "severity": "LOW",
    "timestamp": "2026-03-31T10:30:45.000Z"
  }
}
```

---

### 2. Insert Multiple Sensor Readings (Batch)

```bash
# Reading 1
curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"drain_id": 1, "water_level": 50, "flow_rate": 35}'

# Reading 2
curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"drain_id": 2, "water_level": 65, "flow_rate": 50}'

# Reading 3
curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"drain_id": 1, "water_level": 75, "flow_rate": 60}'
```

---

### 3. Fetch All Sensor Readings

```bash
# Get default 100 records
curl http://localhost:5000/sensor-data

# Get last 50 readings
curl http://localhost:5000/sensor-data?limit=50

# Get last 200 readings
curl http://localhost:5000/sensor-data?limit=200
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 3,
      "drain_id": 1,
      "water_level": 75,
      "flow_rate": 60,
      "dhi_score": 69,
      "timestamp": "2026-03-31T10:35:20.000Z"
    },
    {
      "id": 2,
      "drain_id": 2,
      "water_level": 65,
      "flow_rate": 50,
      "dhi_score": 59,
      "timestamp": "2026-03-31T10:32:10.000Z"
    },
    {
      "id": 1,
      "drain_id": 1,
      "water_level": 50,
      "flow_rate": 35,
      "dhi_score": 44,
      "timestamp": "2026-03-31T10:30:45.000Z"
    }
  ]
}
```

---

### 4. Fetch Readings for Specific Drain

```bash
# Get last 50 readings for drain 1
curl http://localhost:5000/sensor-data/1

# Get last 30 readings for drain 2
curl http://localhost:5000/sensor-data/2?limit=30

# Get last 100 readings for drain 1
curl http://localhost:5000/sensor-data/1?limit=100
```

**Response:**
```json
{
  "success": true,
  "drain_id": 1,
  "count": 2,
  "data": [
    {
      "id": 3,
      "drain_id": 1,
      "water_level": 75,
      "flow_rate": 60,
      "dhi_score": 69,
      "timestamp": "2026-03-31T10:35:20.000Z"
    },
    {
      "id": 1,
      "drain_id": 1,
      "water_level": 50,
      "flow_rate": 35,
      "dhi_score": 44,
      "timestamp": "2026-03-31T10:30:45.000Z"
    }
  ]
}
```

---

## Error Testing

### Missing Required Fields

```bash
curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"drain_id": 1, "water_level": 45}'
```

**Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields",
  "required": ["drain_id", "water_level", "flow_rate"]
}
```

---

### Invalid Data Type

```bash
curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"drain_id": "abc", "water_level": 45, "flow_rate": 30}'
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid data types. drain_id, water_level, and flow_rate must be numbers"
}
```

---

### Invalid Drain ID Parameter

```bash
curl http://localhost:5000/sensor-data/invalid
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid drain_id. Must be a number"
}
```

---

### Invalid Limit Parameter

```bash
curl http://localhost:5000/sensor-data?limit=2000
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid limit parameter. Must be between 1 and 1000"
}
```

---

## Performance Testing with GNU parallel

Insert 1000 sensor readings in parallel:

```bash
# Make sure you have gnu parallel installed
# Linux/Mac: brew install parallel
# Windows: Download from https://ftp.gnu.org/gnu/parallel/

parallel -j 20 'curl -X POST http://localhost:5000/sensor-data \
  -H "Content-Type: application/json" \
  -d "{\"drain_id\": $((RANDOM % 10 + 1)), \"water_level\": $((RANDOM % 100)), \"flow_rate\": $((RANDOM % 80))}"' ::: {1..1000}
```

---

## Performance Testing with ab (Apache Bench)

Test read performance:

```bash
# Warm up
ab -n 10 -c 1 http://localhost:5000/sensor-data

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:5000/sensor-data

# Test with 1000 requests, 50 concurrent
ab -n 1000 -c 50 http://localhost:5000/sensor-data
```

Test write performance:

```bash
# Create a file: post-data.txt
cat > post-data.txt << 'EOF'
{"drain_id": 1, "water_level": 45.5, "flow_rate": 32.0}
EOF

# Test with 100 POST requests
ab -n 100 -c 10 -p post-data.txt -T application/json http://localhost:5000/sensor-data
```

---

## Testing with Postman

1. **Create New Request:**
   - Type: `POST`
   - URL: `http://localhost:5000/sensor-data`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "drain_id": 1,
       "water_level": 45.5,
       "flow_rate": 32.0
     }
     ```

2. **Create GET Requests:**
   - Get all: `GET http://localhost:5000/sensor-data`
   - Get drain: `GET http://localhost:5000/sensor-data/1`
   - With limit: `GET http://localhost:5000/sensor-data?limit=50`

---

## Testing with Node.js

Create `test-sensor-api.js`:

```javascript
const http = require('http');

// Test Insert
async function testInsert() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      drain_id: 1,
      water_level: 45.5,
      flow_rate: 32.0
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/sensor-data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('INSERT Response:', JSON.parse(body));
        resolve(JSON.parse(body));
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test Get All
async function testGetAll() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/sensor-data?limit=10',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('GET ALL Response:', JSON.parse(body));
        resolve(JSON.parse(body));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test Get by Drain
async function testGetByDrain() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/sensor-data/1?limit=5',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('GET BY DRAIN Response:', JSON.parse(body));
        resolve(JSON.parse(body));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run tests
(async () => {
  console.log('Testing Sensor API...\n');
  await testInsert();
  await new Promise(r => setTimeout(r, 500));
  await testGetAll();
  await new Promise(r => setTimeout(r, 500));
  await testGetByDrain();
  console.log('\nDone!');
})();
```

Run:
```bash
node test-sensor-api.js
```

---

## Monitoring Tips

### Check Database Connection Status
```bash
curl http://localhost:5000/api/health
```

### Monitor Logs
```bash
npm run server 2>&1 | tee server.log
tail -f server.log  # Follow logs in real-time
```

### Check Disk Usage
```sql
-- From MySQL client
SELECT 
  COUNT(*) as total_readings,
  MIN(timestamp) as oldest_reading,
  MAX(timestamp) as latest_reading
FROM sensor_readings;
```

---

## Troubleshooting

**Connection Refused?**
- Check if server is running: `netstat -an | grep 5000`
- Check environment variables are set
- Check database credentials

**No Data Returned?**
- Ensure data was inserted first
- Check drain_id exists
- Check timestamp format

**High Latency?**
- Check database connection pool settings
- Monitor database server load
- Add LIMIT to queries
- Check network latency to Railway
