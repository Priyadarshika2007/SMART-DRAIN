import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectToDatabase, closePool } from '../config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

/**
 * Robust CSV parser that handles quoted commas and newlines
 */
function parseCsv(content) {
  const lines = [];
  let currentField = '';
  let insideQuotes = false;
  let currentRecord = [];

  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRecord.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRecord.push(currentField.trim());
      currentField = '';
      if (currentRecord.some((f) => f.length > 0)) {
        lines.push(currentRecord);
      }
      currentRecord = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.some((f) => f.length > 0)) {
      lines.push(currentRecord);
    }
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const row = {};
    const values = lines[i];
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = values[h] !== undefined ? values[h] : '';
    }
    rows.push(row);
  }

  return rows;
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseNum(val, fallback = 0) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function parseIntNum(val, fallback = 0) {
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Extract clean area name from drain location
 * e.g. "Velachery Chamber 001" -> "Velachery"
 */
function extractAreaName(locationName) {
  if (!locationName) return 'Chennai';
  const clean = locationName.replace(/\s*(?:Drain|Chamber)\s*\d+.*$/i, '').trim();
  return clean || 'Chennai';
}

export async function importAllDatasets() {
  console.log('====================================================');
  console.log('🚀 Starting URBANDRAIN 2.0 MongoDB Repeatable Import');
  console.log(`📁 Source directory: ${DATA_DIR}`);
  console.log('====================================================\n');

  const { db } = await connectToDatabase();

  const collections = {
    users: db.collection('users'),
    drains: db.collection('drains'),
    devices: db.collection('devices'),
    sensor_readings: db.collection('sensor_readings'),
    analytics_results: db.collection('analytics_results'),
    alerts: db.collection('alerts'),
  };

  // 1. CREATE INDEXES
  console.log('📌 Ensuring indexes on all collections...');
  await collections.users.createIndex({ username: 1 }, { unique: true });
  await collections.users.createIndex({ user_id: 1 }, { unique: true });
  await collections.users.createIndex({ email: 1 });

  await collections.drains.createIndex({ drain_id: 1 }, { unique: true });
  await collections.drains.createIndex({ area_name: 1 });
  await collections.drains.createIndex({ drain_status: 1 });
  await collections.drains.createIndex({ latitude: 1, longitude: 1 });

  await collections.devices.createIndex({ device_id: 1 }, { unique: true });
  await collections.devices.createIndex({ drain_id: 1 });

  await collections.sensor_readings.createIndex({ reading_id: 1 }, { unique: true });
  await collections.sensor_readings.createIndex({ device_id: 1, timestamp: -1 });
  await collections.sensor_readings.createIndex({ drain_id: 1, timestamp: -1 });
  await collections.sensor_readings.createIndex({ timestamp: -1 });

  await collections.analytics_results.createIndex({ analysis_id: 1 }, { unique: true });
  await collections.analytics_results.createIndex({ drain_id: 1 });
  await collections.analytics_results.createIndex({ analysis_created_at: -1 });

  await collections.alerts.createIndex({ alert_id: 1 }, { unique: true });
  await collections.alerts.createIndex({ drain_id: 1, created_at: -1 });
  await collections.alerts.createIndex({ severity: 1 });
  await collections.alerts.createIndex({ alert_status: 1 });
  await collections.alerts.createIndex({ created_at: -1 });
  console.log('✓ Indexes verified.\n');

  const results = {};

  // 2. IMPORT USERS (4 records)
  const usersCsvPath = path.join(DATA_DIR, 'users.csv');
  if (fs.existsSync(usersCsvPath)) {
    const rawUsers = parseCsv(fs.readFileSync(usersCsvPath, 'utf8'));
    console.log(`👤 Importing users (${rawUsers.length} records)...`);

    // Pre-computed bcrypt hashes for known users
    // Admin password: Admin@999
    // Operator/maintenance/viewer passwords: password123
    const adminHash = await bcrypt.hash('Admin@999', 10);
    const standardHash = await bcrypt.hash('12345', 10);

    const userOperations = rawUsers.map((row) => {
      const username = String(row.username || '').trim().toLowerCase();
      const isAdmin = String(row.role || '').toLowerCase().includes('admin');
      const passwordHash = isAdmin ? adminHash : standardHash;

      const area = String(row.area_name || '').trim();
      const assignedAreas = isAdmin ? ['ALL'] : (area ? [area] : []);

      const userDoc = {
        user_id: parseIntNum(row.user_id),
        full_name: String(row.full_name || '').trim(),
        name: String(row.full_name || '').trim(),
        username,
        email: String(row.email || '').trim().toLowerCase(),
        password_hash: passwordHash,
        password: passwordHash, // alias
        role: isAdmin ? 'Admin' : (String(row.role || '').charAt(0).toUpperCase() + String(row.role || '').slice(1)),
        raw_role: String(row.role || '').trim(),
        area_name: area,
        area: isAdmin ? 'ALL' : area,
        assigned_areas: assignedAreas,
        assignedAreas: assignedAreas,
        is_active: String(row.is_active).toLowerCase() === 'true',
        created_at: parseDate(row.created_at) || new Date(),
        updated_at: parseDate(row.updated_at) || new Date(),
      };

      return {
        updateOne: {
          filter: { username },
          update: { $set: userDoc },
          upsert: true,
        },
      };
    });

    if (userOperations.length > 0) {
      await collections.users.bulkWrite(userOperations, { ordered: false });
    }
    const count = await collections.users.countDocuments();
    results.users = count;
    console.log(`✓ users imported. Total in collection: ${count}`);
  }

  // 3. IMPORT DRAINS (100 records)
  const drainsCsvPath = path.join(DATA_DIR, 'drains.csv');
  let drainMap = new Map();
  if (fs.existsSync(drainsCsvPath)) {
    const rawDrains = parseCsv(fs.readFileSync(drainsCsvPath, 'utf8'));
    console.log(`💧 Importing drains (${rawDrains.length} records)...`);

    const drainOperations = rawDrains.map((row) => {
      const drainId = String(row.drain_id || '').trim();
      const location = String(row.location_name || '').trim();
      const area = extractAreaName(location);
      const district = 'Chennai';

      const drainDoc = {
        drain_id: drainId,
        id: drainId,
        location_name: location,
        area_name: area,
        district,
        latitude: parseNum(row.latitude),
        longitude: parseNum(row.longitude),
        installation_date: parseDate(row.installation_date) || new Date(),
        drain_status: String(row.drain_status || 'Normal').trim(),
        status: String(row.drain_status || 'Normal').trim(),
        created_at: parseDate(row.created_at) || new Date(),
        updated_at: parseDate(row.updated_at) || new Date(),
      };

      drainMap.set(drainId, drainDoc);

      return {
        updateOne: {
          filter: { drain_id: drainId },
          update: { $set: drainDoc },
          upsert: true,
        },
      };
    });

    if (drainOperations.length > 0) {
      await collections.drains.bulkWrite(drainOperations, { ordered: false });
    }
    const count = await collections.drains.countDocuments();
    results.drains = count;
    console.log(`✓ drains imported. Total in collection: ${count}`);
  }

  // 4. IMPORT DEVICES (100 records)
  const devicesCsvPath = path.join(DATA_DIR, 'devices.csv');
  let deviceToDrainMap = new Map();
  if (fs.existsSync(devicesCsvPath)) {
    const rawDevices = parseCsv(fs.readFileSync(devicesCsvPath, 'utf8'));
    console.log(`📟 Importing devices (${rawDevices.length} records)...`);

    const deviceOperations = rawDevices.map((row) => {
      const deviceId = String(row.device_id || '').trim();
      const drainId = String(row.drain_id || '').trim();
      deviceToDrainMap.set(deviceId, drainId);

      const deviceDoc = {
        device_id: deviceId,
        drain_id: drainId,
        controller_type: String(row.controller_type || 'Arduino UNO').trim(),
        device_name: String(row.device_name || '').trim(),
        firmware_version: String(row.firmware_version || 'V2.0').trim(),
        installation_date: parseDate(row.installation_date) || new Date(),
        device_status: String(row.device_status || 'Online').trim(),
        status: String(row.device_status || 'Online').trim(),
        last_seen_at: parseDate(row.last_seen_at) || new Date(),
        created_at: parseDate(row.created_at) || new Date(),
      };

      return {
        updateOne: {
          filter: { device_id: deviceId },
          update: { $set: deviceDoc },
          upsert: true,
        },
      };
    });

    if (deviceOperations.length > 0) {
      await collections.devices.bulkWrite(deviceOperations, { ordered: false });
    }
    const count = await collections.devices.countDocuments();
    results.devices = count;
    console.log(`✓ devices imported. Total in collection: ${count}`);
  }

  // 5. IMPORT SENSOR READINGS (1,000 records)
  const readingsCsvPath = path.join(DATA_DIR, 'sensor_readings.csv');
  if (fs.existsSync(readingsCsvPath)) {
    const rawReadings = parseCsv(fs.readFileSync(readingsCsvPath, 'utf8'));
    console.log(`📊 Importing sensor readings (${rawReadings.length} records)...`);

    const readingOperations = rawReadings.map((row) => {
      const readingId = parseIntNum(row.reading_id);
      const deviceId = String(row.device_id || '').trim();
      const drainId = deviceToDrainMap.get(deviceId) || deviceId.replace('DEV', 'DRN');
      const recordedAt = parseDate(row.recorded_at) || new Date();
      const waterLevelCm = parseNum(row.water_level_cm);
      const flowRateLps = parseNum(row.flow_rate_lps);
      const flowRateLMin = Math.round(flowRateLps * 60 * 100) / 100;
      const dhiScore = Math.round((waterLevelCm * 0.6 + flowRateLMin * 0.4) * 100) / 100;

      const readingDoc = {
        reading_id: readingId,
        device_id: deviceId,
        drain_id: drainId,
        recorded_at: recordedAt,
        timestamp: recordedAt, // compatibility alias
        water_level_cm: waterLevelCm,
        flow_rate_lps: flowRateLps,
        flow_rate_l_min: flowRateLMin, // compatibility alias
        dhi_score: dhiScore,
        mq7_raw_value: parseNum(row.mq7_raw_value),
        h2s_raw_value: parseNum(row.h2s_raw_value),
        methane_raw_value: parseNum(row.methane_raw_value),
        temperature_c: parseNum(row.temperature_c),
        humidity_percent: parseNum(row.humidity_percent),
      };

      return {
        updateOne: {
          filter: { reading_id: readingId },
          update: { $set: readingDoc },
          upsert: true,
        },
      };
    });

    if (readingOperations.length > 0) {
      await collections.sensor_readings.bulkWrite(readingOperations, { ordered: false });
    }
    const count = await collections.sensor_readings.countDocuments();
    results.sensor_readings = count;
    console.log(`✓ sensor_readings imported. Total in collection: ${count}`);
  }

  // 6. IMPORT ANALYTICS RESULTS (100 records)
  const analyticsCsvPath = path.join(DATA_DIR, 'analytics_results.csv');
  if (fs.existsSync(analyticsCsvPath)) {
    const rawAnalytics = parseCsv(fs.readFileSync(analyticsCsvPath, 'utf8'));
    console.log(`📈 Importing analytics results (${rawAnalytics.length} records)...`);

    const analyticsOperations = rawAnalytics.map((row) => {
      const analysisId = parseIntNum(row.analysis_id);
      const drainId = String(row.drain_id || '').trim();
      const drainInfo = drainMap.get(drainId);
      const condition = String(row.drain_condition || 'Normal').trim();

      const analysisDoc = {
        analysis_id: analysisId,
        drain_id: drainId,
        area_name: drainInfo ? drainInfo.area_name : 'Unknown',
        analysis_start: parseDate(row.analysis_start),
        analysis_end: parseDate(row.analysis_end),
        avg_water_level_cm: parseNum(row.avg_water_level_cm),
        max_water_level_cm: parseNum(row.max_water_level_cm),
        min_water_level_cm: parseNum(row.min_water_level_cm),
        avg_mq7_value: parseNum(row.avg_mq7_value),
        avg_temperature_c: parseNum(row.avg_temperature_c),
        avg_humidity_percent: parseNum(row.avg_humidity_percent),
        abnormal_reading_count: parseIntNum(row.abnormal_reading_count),
        drain_condition: condition,
        status: condition,
        analysis_created_at: parseDate(row.analysis_created_at) || new Date(),
        created_at: parseDate(row.analysis_created_at) || new Date(),
      };

      return {
        updateOne: {
          filter: { analysis_id: analysisId },
          update: { $set: analysisDoc },
          upsert: true,
        },
      };
    });

    if (analyticsOperations.length > 0) {
      await collections.analytics_results.bulkWrite(analyticsOperations, { ordered: false });
    }
    const count = await collections.analytics_results.countDocuments();
    results.analytics_results = count;
    console.log(`✓ analytics_results imported. Total in collection: ${count}`);
  }

  // 7. IMPORT ALERTS (61 records)
  const alertsCsvPath = path.join(DATA_DIR, 'alerts.csv');
  if (fs.existsSync(alertsCsvPath)) {
    const rawAlerts = parseCsv(fs.readFileSync(alertsCsvPath, 'utf8'));
    console.log(`🚨 Importing alerts (${rawAlerts.length} records)...`);

    const alertOperations = rawAlerts.map((row) => {
      const alertId = parseIntNum(row.alert_id);
      const drainId = String(row.drain_id || '').trim();
      const drainInfo = drainMap.get(drainId);
      const detectedAt = parseDate(row.detected_at) || new Date();
      const createdAt = parseDate(row.created_at) || detectedAt;

      const alertDoc = {
        alert_id: alertId,
        id: alertId,
        drain_id: drainId,
        device_id: String(row.device_id || '').trim(),
        reading_id: row.reading_id ? parseIntNum(row.reading_id) : null,
        area_name: drainInfo ? drainInfo.area_name : 'Unknown',
        alert_type: String(row.alert_type || '').trim(),
        severity: String(row.severity || 'Medium').trim(),
        alert_message: String(row.alert_message || '').trim(),
        message: String(row.alert_message || '').trim(), // alias
        detected_at: detectedAt,
        alert_status: String(row.alert_status || 'Open').trim(),
        status: String(row.alert_status || 'Open').trim(),
        resolved_at: parseDate(row.resolved_at),
        created_at: createdAt,
        alert_time: detectedAt, // compatibility alias
      };

      return {
        updateOne: {
          filter: { alert_id: alertId },
          update: { $set: alertDoc },
          upsert: true,
        },
      };
    });

    if (alertOperations.length > 0) {
      await collections.alerts.bulkWrite(alertOperations, { ordered: false });
    }
    const count = await collections.alerts.countDocuments();
    results.alerts = count;
    console.log(`✓ alerts imported. Total in collection: ${count}`);
  }

  console.log('\n====================================================');
  console.log('🎉 Data Import Completed Successfully!');
  console.log('Collection Summary:');
  console.table(results);
  console.log('====================================================\n');

  return results;
}

// If run directly via CLI
if (process.argv[1] && process.argv[1].endsWith('importData.js')) {
  importAllDatasets()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Migration failed:', err);
      await closePool();
      process.exit(1);
    });
}
