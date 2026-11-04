import http from 'http';
import app from '../server.js';
import { connectToDatabase, closePool } from '../config/db.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting UrbanDrainX V2 Full Integration Test Suite');
  console.log('====================================================\n');

  const { db } = await connectToDatabase();

  // Test 1: Verify Collection Counts
  console.log('--- TEST 1: Database Collection Counts & Relationships ---');
  const counts = {
    users: await db.collection('users').countDocuments(),
    drains: await db.collection('drains').countDocuments(),
    devices: await db.collection('devices').countDocuments(),
    sensor_readings: await db.collection('sensor_readings').countDocuments(),
    analytics_results: await db.collection('analytics_results').countDocuments(),
    alerts: await db.collection('alerts').countDocuments(),
  };

  console.table(counts);

  const asserts = [
    { name: 'Users count >= 4', pass: counts.users >= 4 },
    { name: 'Drains count == 100', pass: counts.drains === 100 },
    { name: 'Devices count == 100', pass: counts.devices === 100 },
    { name: 'Sensor readings count >= 1000', pass: counts.sensor_readings >= 1000 },
    { name: 'Analytics results count >= 100', pass: counts.analytics_results >= 100 },
    { name: 'Alerts count >= 61', pass: counts.alerts >= 61 },
  ];

  for (const a of asserts) {
    console.log(`${a.pass ? '✅' : '❌'} ${a.name}`);
    if (!a.pass) throw new Error(`Assertion failed: ${a.name}`);
  }

  // Test 2: Relationships & Chennai Geographic Verification
  console.log('\n--- TEST 2: Foreign Key / ID Relationships & Chennai Boundary ---');
  const sampleDevice = await db.collection('devices').findOne({ device_id: 'DEV001' });
  const sampleDrain = await db.collection('drains').findOne({ drain_id: sampleDevice?.drain_id });
  const sampleReading = await db.collection('sensor_readings').findOne({ device_id: sampleDevice?.device_id });
  const sampleAlert = await db.collection('alerts').findOne({ drain_id: sampleDrain?.drain_id });

  console.log(`Device DEV001 linked to Drain: ${sampleDevice?.drain_id} (Found drain: ${Boolean(sampleDrain)})`);
  console.log(`Reading linked to Device: ${sampleReading?.device_id} (Found reading: ${Boolean(sampleReading)})`);
  console.log(`Alert linked to Drain: ${sampleAlert?.drain_id} (Found alert: ${Boolean(sampleAlert)})`);

  if (!sampleDrain || !sampleReading) {
    throw new Error('Relationship integrity check failed!');
  }

  // Verify sample drain coordinates fall in Greater Chennai region (12.8 - 13.3 lat, 80.0 - 80.4 lng)
  const isChennaiLat = sampleDrain.latitude >= 12.8 && sampleDrain.latitude <= 13.3;
  const isChennaiLng = sampleDrain.longitude >= 80.0 && sampleDrain.longitude <= 80.4;
  console.log(`Drain ${sampleDrain.drain_id} in Chennai region: lat=${sampleDrain.latitude}, lng=${sampleDrain.longitude} (Valid: ${isChennaiLat && isChennaiLng})`);
  if (!isChennaiLat || !isChennaiLng) {
    throw new Error(`Drain coordinates outside Chennai boundary: ${sampleDrain.latitude}, ${sampleDrain.longitude}`);
  }

  // Verify zero old Karur/Kulithalai active records in drains
  const oldDrainCount = await db.collection('drains').countDocuments({
    $or: [{ area_name: /karur|kulithalai/i }, { location_name: /karur|kulithalai/i }]
  });
  console.log(`Zero Karur/Kulithalai drain records: ${oldDrainCount === 0}`);
  if (oldDrainCount > 0) throw new Error(`Found ${oldDrainCount} old Karur/Kulithalai records in drains`);

  console.log('✅ All relationship integrity & Chennai geographic checks passed.');

  // Test 3: API Endpoint Tests
  console.log('\n--- TEST 3: API Endpoints Verification ---');
  const port = process.env.PORT || 5000;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, ok: res.ok, body: json };
  }

  try {
    // 3.1 Root endpoint
    const rootRes = await request('/');
    console.log(`GET /: ${rootRes.status} (Message: ${rootRes.body?.message})`);
    if (rootRes.status !== 200 || !rootRes.body?.message?.includes('MongoDB')) {
      throw new Error('Root endpoint failed or wrong backend banner');
    }

    // 3.2 Health endpoint
    const healthRes = await request('/api/health');
    console.log(`GET /api/health: ${healthRes.status} (Status: ${healthRes.body?.status})`);
    if (healthRes.status !== 200) throw new Error('Health check failed');

    // 3.3 DB test endpoint
    const dbTestRes = await request('/api/db-test');
    console.log(`GET /api/db-test: ${dbTestRes.status} (Connected: ${dbTestRes.body?.connected})`);
    if (dbTestRes.status !== 200 || !dbTestRes.body?.connected) throw new Error('DB test failed');

    // 3.4 DB status endpoint
    const dbStatusRes = await request('/api/db-status');
    console.log(`GET /api/db-status: ${dbStatusRes.status} (DB: ${dbStatusRes.body?.database?.name}, Drains: ${dbStatusRes.body?.database?.collections?.drains})`);
    if (dbStatusRes.status !== 200) throw new Error('DB status failed');

    // 3.5 Login with authoritative user 'priyadarshika'
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'priyadarshika', password: 'Admin@999' }),
    });
    console.log(`POST /api/auth/login (priyadarshika): ${loginRes.status} (Role: ${loginRes.body?.user?.role}, Token present: ${Boolean(loginRes.body?.token)})`);
    if (loginRes.status !== 200 || !loginRes.body?.token) throw new Error('Auth login failed for priyadarshika');
    const authToken = loginRes.body.token;

    // 3.6 Users list
    const usersRes = await request('/api/users', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`GET /api/users: ${usersRes.status} (Count: ${usersRes.body?.data?.length})`);
    if (usersRes.status !== 200 || usersRes.body?.data?.length < 4) throw new Error('Users endpoint failed');

    // 3.7 Drains list
    const drainsRes = await request('/api/drains');
    console.log(`GET /api/drains: ${drainsRes.status} (Count: ${drainsRes.body?.length})`);
    if (drainsRes.status !== 200 || drainsRes.body?.length !== 100) throw new Error('Drains endpoint failed');

    // 3.8 Latest Status
    const statusRes = await request('/api/latest-status');
    console.log(`GET /api/latest-status: ${statusRes.status} (Count: ${statusRes.body?.length})`);
    if (statusRes.status !== 200 || statusRes.body?.length !== 100) throw new Error('Latest status endpoint failed');

    // 3.9 Alerts list
    const alertsRes = await request('/api/alerts');
    console.log(`GET /api/alerts: ${alertsRes.status} (Count: ${alertsRes.body?.length})`);
    if (alertsRes.status !== 200 || alertsRes.body?.length === 0) throw new Error('Alerts endpoint failed');

    // 3.10 Sensor Data Ingestion
    const ingestRes = await request('/api/sensor-data', {
      method: 'POST',
      body: JSON.stringify({
        drain_id: 'DRN001',
        water_level_cm: 25.5,
        flow_rate_l_min: 15.0,
      }),
    });
    console.log(`POST /api/sensor-data (DRN001): ${ingestRes.status} (DHI: ${ingestRes.body?.data?.sensor_reading?.dhi_score}, Status: ${ingestRes.body?.data?.drain_health?.status})`);
    if (ingestRes.status !== 201) throw new Error('Sensor ingestion failed');

    console.log('\n====================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } finally {
    await closePool();
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
