const axios = require('axios');

const API_BASE_URL = 'https://smart-drain.onrender.com';

/**
 * Test POST /sensor-data endpoint
 */
async function testInsertSensorData() {
  console.log('\n========================================');
  console.log('TEST 1: POST /sensor-data (Insert)');
  console.log('========================================\n');

  try {
    const payload = {
      drain_id: 1,
      water_level: 60,
      flow_rate: 30
    };

    console.log('📤 Sending Request:');
    console.log(`   Endpoint: POST ${API_BASE_URL}/sensor-data`);
    console.log('   Body:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await axios.post(`${API_BASE_URL}/sensor-data`, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response (201 Created):');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.data.data) {
      console.log('📊 Key Values:');
      console.log('   • Reading ID:', response.data.data.readingId);
      console.log('   • Drain ID:', response.data.data.drain_id);
      console.log('   • Water Level:', response.data.data.water_level, 'cm');
      console.log('   • Flow Rate:', response.data.data.flow_rate, 'L/min');
      console.log('   • DHI Score:', response.data.data.dhi_score);
      console.log('   • Severity:', response.data.data.severity);
      console.log('   • Timestamp:', response.data.data.timestamp);
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   URL:', error.response.config.url);
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received');
      console.error('   Request:', error.request);
    } else {
      console.error('   Message:', error.message);
    }
    throw error;
  }
}

/**
 * Test GET /sensor-data endpoint
 */
async function testFetchAllSensorData() {
  console.log('\n========================================');
  console.log('TEST 2: GET /sensor-data (Fetch All)');
  console.log('========================================\n');

  try {
    console.log('📥 Sending Request:');
    console.log(`   Endpoint: GET ${API_BASE_URL}/sensor-data?limit=10`);
    console.log('');

    const response = await axios.get(`${API_BASE_URL}/sensor-data?limit=10`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response (200 OK):');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Count:', response.data.count, 'readings');
    console.log('');

    if (response.data.data && response.data.data.length > 0) {
      console.log('📋 Sensor Readings:');
      console.log('   Total Retrieved:', response.data.data.length);
      console.log('');

      response.data.data.forEach((reading, index) => {
        console.log(`   Reading #${index + 1}:`);
        console.log(`     • ID: ${reading.id}`);
        console.log(`     • Drain ID: ${reading.drain_id}`);
        console.log(`     • Water Level: ${reading.water_level} cm`);
        console.log(`     • Flow Rate: ${reading.flow_rate} L/min`);
        console.log(`     • DHI Score: ${reading.dhi_score}`);
        console.log(`     • Timestamp: ${reading.timestamp}`);
        console.log('');
      });

      console.log('📊 Full Response:');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      console.log('   ℹ No sensor readings found');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   URL:', error.response.config.url);
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received');
      console.error('   Request:', error.request);
    } else {
      console.error('   Message:', error.message);
    }
    throw error;
  }
}

/**
 * Test error handling - invalid data
 */
async function testErrorHandling() {
  console.log('\n========================================');
  console.log('TEST 3: Error Handling (Missing Fields)');
  console.log('========================================\n');

  try {
    console.log('📤 Sending Request with missing field:');
    const invalidPayload = {
      drain_id: 1,
      water_level: 60
      // Missing flow_rate
    };
    console.log('   Body:', JSON.stringify(invalidPayload, null, 2));
    console.log('');

    const response = await axios.post(`${API_BASE_URL}/sensor-data`, invalidPayload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response:', response.data);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Correctly returned 400 Bad Request:');
      console.log('   Status:', error.response.status);
      console.log('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Unexpected error:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Error:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('   Message:', error.message);
      }
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Smart Drain API - Integration Test Suite           ║');
  console.log('║  Testing: https://smart-drain.onrender.com            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Test 1: Insert sensor data
    await testInsertSensorData();

    // Test 2: Fetch all sensor data
    await testFetchAllSensorData();

    // Test 3: Error handling
    await testErrorHandling();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║            ✅ All Tests Completed Successfully!        ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('\n');
  } catch (error) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ❌ Tests Failed - See errors above                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('\n');
    process.exit(1);
  }
}

// Run tests
runAllTests();
