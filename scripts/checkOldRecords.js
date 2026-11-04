import { connectToDatabase, closePool } from '../config/db.js';

async function fixAndCheckOldRecords() {
  const { db } = await connectToDatabase();

  // Update any test records in analytics_results that inherited older drain names
  const fixRes = await db.collection('analytics_results').updateMany(
    { area_name: { $regex: /karur|kulithalai/i } },
    { $set: { area_name: 'Velachery' } }
  );
  if (fixRes.modifiedCount > 0) {
    console.log(`Updated ${fixRes.modifiedCount} legacy analytics records to 'Velachery'`);
  }

  const colls = ['users', 'drains', 'devices', 'sensor_readings', 'analytics_results', 'alerts'];
  for (const c of colls) {
    const kCount = await db.collection(c).countDocuments({
      $or: [
        { area_name: { $regex: /karur|kulithalai/i } },
        { location_name: { $regex: /karur|kulithalai/i } },
        { district: { $regex: /karur|kulithalai/i } }
      ]
    });
    console.log(`${c} remaining old records: ${kCount}`);
  }
  await closePool();
}

fixAndCheckOldRecords().catch(console.error);
