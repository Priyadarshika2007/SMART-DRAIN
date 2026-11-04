import { getDb, closePool } from '../config/db.js';

async function inspect() {
  const db = await getDb();
  const readingStats = await db.collection('sensor_readings').aggregate([
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        minH2s: { $min: '$h2s_raw_value' },
        maxH2s: { $max: '$h2s_raw_value' },
        avgH2s: { $avg: '$h2s_raw_value' },
        minCh4: { $min: '$methane_raw_value' },
        maxCh4: { $max: '$methane_raw_value' },
        avgCh4: { $avg: '$methane_raw_value' },
        minMq7: { $min: '$mq7_raw_value' },
        maxMq7: { $max: '$mq7_raw_value' },
        avgMq7: { $avg: '$mq7_raw_value' },
        minWater: { $min: '$water_level_cm' },
        maxWater: { $max: '$water_level_cm' },
        minFlow: { $min: '$flow_rate_l_min' },
        maxFlow: { $max: '$flow_rate_l_min' },
      }
    }
  ]).toArray();
  console.log('SENSOR STATS:', JSON.stringify(readingStats, null, 2));

  const alertTypes = await db.collection('alerts').aggregate([
    {
      $group: {
        _id: '$alert_type',
        count: { $sum: 1 },
        severities: { $addToSet: '$severity' }
      }
    }
  ]).toArray();
  console.log('ALERT TYPES:', JSON.stringify(alertTypes, null, 2));

  const devicesSample = await db.collection('devices').find().limit(3).toArray();
  console.log('SAMPLE DEVICES:', JSON.stringify(devicesSample, null, 2));

  const sampleAlerts = await db.collection('alerts').find().limit(3).toArray();
  console.log('SAMPLE ALERTS:', JSON.stringify(sampleAlerts, null, 2));

  await closePool();
}

inspect().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
