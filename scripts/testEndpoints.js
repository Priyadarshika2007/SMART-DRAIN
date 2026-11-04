import axios from 'axios';

async function runTests() {
  const baseURL = 'http://localhost:5000';
  console.log('--- TESTING API ENDPOINTS ---');

  // Test 1: Spark Results
  try {
    const res = await axios.get(`${baseURL}/api/analytics/spark-results`);
    console.log('✅ /api/analytics/spark-results SUCCESS:');
    console.log('  Success:', res.data.success);
    console.log('  Chambers Analyzed:', res.data.chambersAnalyzed);
    console.log('  Records Processed:', res.data.totalRecordsProcessed);
    console.log('  Summary count:', res.data.chamberSummaries?.length);
    console.log('  Water trends count:', res.data.waterTrends?.length);
    console.log('  Gas trends count:', res.data.gasTrends?.length);
  } catch (err) {
    console.error('❌ /api/analytics/spark-results FAILED:', err.response?.data || err.message);
  }

  // Test 2: Role login tests
  const testCases = [
    { username: 'worker1', password: '12345', role: 'Worker', expectSuccess: true, label: 'Worker login as Worker' },
    { username: 'worker1', password: '12345', role: 'Authority', expectSuccess: false, label: 'Worker login as Authority (mismatch)' },
    { username: 'worker1', password: '12345', role: 'Admin', expectSuccess: false, label: 'Worker login as Admin (mismatch)' },
    { username: 'authority1', password: '12345', role: 'Authority', expectSuccess: true, label: 'Authority login as Authority' },
    { username: 'admin1', password: 'Admin@999', role: 'Admin', expectSuccess: true, label: 'Admin login as Admin' },
    { username: 'admin1', password: 'Admin@999', role: 'Worker', expectSuccess: false, label: 'Admin login as Worker (mismatch)' }
  ];

  for (const tc of testCases) {
    try {
      const res = await axios.post(`${baseURL}/api/auth/login`, {
        username: tc.username,
        password: tc.password,
        role: tc.role
      });
      if (tc.expectSuccess) {
        console.log(`✅ [PASS] ${tc.label} -> Token received, user role: ${res.data.user?.role}`);
      } else {
        console.error(`❌ [FAIL] ${tc.label} -> Expected failure but succeeded!`);
      }
    } catch (err) {
      if (!tc.expectSuccess) {
        console.log(`✅ [PASS] ${tc.label} -> Correctly rejected with status ${err.response?.status}: ${err.response?.data?.message || err.response?.data?.error}`);
      } else {
        console.error(`❌ [FAIL] ${tc.label} -> Expected success but failed with status ${err.response?.status}:`, err.response?.data);
      }
    }
  }
}

runTests();
