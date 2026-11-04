import express from 'express';
import { getDb } from '../config/db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { evaluateDeviceHealth, DIAGNOSTIC_CONFIG } from '../utils/diagnostics.js';

const router = express.Router();

/**
 * Helper to fetch all devices with their recent readings and evaluate diagnostics
 */
async function getEvaluatedDevices(db, areaFilter = null) {
  // Find drains matching area if specified
  let drainFilter = {};
  if (areaFilter && areaFilter !== 'all') {
    const areaRegex = new RegExp(areaFilter, 'i');
    drainFilter = {
      $or: [
        { area_name: { $regex: areaRegex } },
        { location_name: { $regex: areaRegex } },
        { district: { $regex: areaRegex } },
      ],
    };
  }

  const [drains, devices] = await Promise.all([
    db.collection('drains').find(drainFilter).toArray(),
    db.collection('devices').find().toArray(),
  ]);

  const drainMap = new Map(drains.map((d) => [d.drain_id, d]));
  const relevantDevices = areaFilter && areaFilter !== 'all'
    ? devices.filter((dev) => drainMap.has(dev.drain_id))
    : devices;

  const deviceIds = relevantDevices.map((d) => d.device_id);

  // Group readings by device_id (up to 10 most recent per device)
  const readings = await db
    .collection('sensor_readings')
    .aggregate([
      { $match: { device_id: { $in: deviceIds } } },
      { $sort: { timestamp: -1, recorded_at: -1 } },
      {
        $group: {
          _id: '$device_id',
          recent: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          recent: { $slice: ['$recent', 10] },
        },
      },
    ])
    .toArray();

  const readingsMap = new Map(readings.map((r) => [r._id, r.recent]));

  // Reference timestamp: latest timestamp in sensor_readings
  const latestDbReading = await db.collection('sensor_readings').find().sort({ timestamp: -1 }).limit(1).toArray();
  const referenceTime = latestDbReading[0]?.timestamp ? new Date(latestDbReading[0].timestamp) : new Date();

  return relevantDevices.map((dev) => {
    const devReadings = readingsMap.get(dev.device_id) || [];
    const drain = drainMap.get(dev.drain_id) || null;
    const diag = evaluateDeviceHealth(dev, devReadings, referenceTime);

    return {
      ...diag,
      device_name: dev.device_name || `URBANDRAIN Unit ${dev.device_id}`,
      installation_date: dev.installation_date || dev.created_at,
      area_name: drain?.area_name || drain?.location_name || 'Chennai',
      district: drain?.district || 'Chennai',
      latitude: drain?.latitude ?? null,
      longitude: drain?.longitude ?? null,
    };
  });
}

/**
 * GET /api/device-health/overview
 * High-level counts and breakdown of hardware diagnostic states
 */
router.get('/device-health/overview', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const area = req.query.area || null;
    const evaluated = await getEvaluatedDevices(db, area);

    const counts = {
      total: evaluated.length,
      healthy: 0,
      warning: 0,
      suspected_fault: 0,
      stale: 0,
      replacement_recommended: 0,
    };

    for (const d of evaluated) {
      if (d.status === 'Healthy') counts.healthy++;
      else if (d.status === 'Warning — inspection recommended') counts.warning++;
      else if (d.status === 'Suspected sensor fault') counts.suspected_fault++;
      else if (d.status === 'Stale or communication lost') counts.stale++;
      else if (d.status === 'Replacement assessment recommended') counts.replacement_recommended++;
      else counts.warning++;
    }

    // Recent diagnostic events
    const recentEvents = await db
      .collection('device_health_events')
      .find(area && area !== 'all' ? { area_name: new RegExp(area, 'i') } : {})
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    return res.json({
      success: true,
      counts,
      recent_events: recentEvents,
      diagnostic_config: DIAGNOSTIC_CONFIG,
    });
  } catch (err) {
    console.error('DEVICE HEALTH OVERVIEW ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/device-health/devices
 * Filterable device inventory with live health verdict
 */
router.get('/device-health/devices', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const area = req.query.area || null;
    const statusFilter = req.query.status || null;
    const search = String(req.query.search || '').trim().toLowerCase();

    let list = await getEvaluatedDevices(db, area);

    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((item) =>
        item.status.toLowerCase().includes(statusFilter.toLowerCase())
      );
    }

    if (search) {
      list = list.filter(
        (item) =>
          item.device_id.toLowerCase().includes(search) ||
          item.drain_id.toLowerCase().includes(search) ||
          (item.area_name && item.area_name.toLowerCase().includes(search)) ||
          item.status.toLowerCase().includes(search)
      );
    }

    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (err) {
    console.error('DEVICE HEALTH DEVICES ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/device-health/devices/:id
 * Detailed device diagnostic inspection view
 */
router.get('/device-health/devices/:id', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const id = req.params.id;

    const device = await db.collection('devices').findOne({
      $or: [{ device_id: id }, { drain_id: id }],
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const [drain, readings, alerts, maintenanceLogs, events] = await Promise.all([
      db.collection('drains').findOne({ drain_id: device.drain_id }),
      db.collection('sensor_readings').find({ device_id: device.device_id }).sort({ timestamp: -1 }).limit(30).toArray(),
      db.collection('alerts').find({ $or: [{ device_id: device.device_id }, { drain_id: device.drain_id }] }).sort({ created_at: -1 }).limit(10).toArray(),
      db.collection('device_maintenance_logs').find({ device_id: device.device_id }).sort({ logged_at: -1 }).limit(10).toArray(),
      db.collection('device_health_events').find({ device_id: device.device_id }).sort({ created_at: -1 }).limit(10).toArray(),
    ]);

    const latestDbReading = await db.collection('sensor_readings').find().sort({ timestamp: -1 }).limit(1).toArray();
    const referenceTime = latestDbReading[0]?.timestamp ? new Date(latestDbReading[0].timestamp) : new Date();

    const evaluation = evaluateDeviceHealth(device, readings, referenceTime);

    return res.json({
      success: true,
      device: {
        ...device,
        ...evaluation,
        area_name: drain?.area_name || drain?.location_name || 'Chennai',
        district: drain?.district || 'Chennai',
        latitude: drain?.latitude,
        longitude: drain?.longitude,
      },
      drain: drain || null,
      readings,
      alerts,
      maintenance_logs: maintenanceLogs,
      diagnostic_events: events,
    });
  } catch (err) {
    console.error('DEVICE DETAIL ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/device-health/maintenance
 * Record technician maintenance action for a device
 */
router.post('/device-health/maintenance', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const {
      device_id,
      drain_id,
      action_type,
      technician_name,
      notes,
      resolution_status,
      calibrated,
    } = req.body;

    if (!device_id || !action_type) {
      return res.status(400).json({ success: false, message: 'device_id and action_type are required' });
    }

    const logEntry = {
      log_id: `MAINT-${Date.now()}`,
      device_id: String(device_id).trim(),
      drain_id: String(drain_id || '').trim(),
      action_type: String(action_type).trim(),
      technician_name: String(technician_name || req.user?.username || 'Field Technician').trim(),
      notes: String(notes || '').trim(),
      resolution_status: resolution_status || 'Completed',
      calibrated: Boolean(calibrated),
      logged_at: new Date(),
      created_by: req.user?.username || 'Staff',
    };

    await db.collection('device_maintenance_logs').insertOne(logEntry);

    // If marked as resolved/calibrated, also record a device health event
    await db.collection('device_health_events').insertOne({
      event_id: `DHE-${Date.now()}`,
      device_id: logEntry.device_id,
      drain_id: logEntry.drain_id,
      event_type: 'MAINTENANCE_LOGGED',
      status: 'Maintenance Performed',
      severity: 'Info',
      details: `${action_type}: ${notes || 'Action logged by technician'}`,
      created_at: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Maintenance action recorded successfully',
      data: logEntry,
    });
  } catch (err) {
    console.error('LOG MAINTENANCE ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/device-health/run-diagnostics
 * Trigger diagnostic evaluation and persist newly identified anomalies to device_health_events
 */
router.post('/device-health/run-diagnostics', optionalAuth, async (req, res) => {
  try {
    const db = await getDb();
    const evaluated = await getEvaluatedDevices(db);

    let newlyLogged = 0;
    const now = new Date();

    // Persist only non-healthy findings if not logged in past 24 hours
    for (const item of evaluated) {
      if (item.status !== 'Healthy') {
        const recentExisting = await db.collection('device_health_events').findOne({
          device_id: item.device_id,
          status: item.status,
          created_at: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        });

        if (!recentExisting) {
          await db.collection('device_health_events').insertOne({
            event_id: `DHE-${item.device_id}-${Date.now()}`,
            device_id: item.device_id,
            drain_id: item.drain_id,
            area_name: item.area_name,
            event_type: item.status.toUpperCase().replace(/\s+/g, '_'),
            status: item.status,
            severity: item.severity,
            details: item.primary_issue,
            recommendations: item.recommendations,
            created_at: now,
          });
          newlyLogged++;
        }
      }
    }

    return res.json({
      success: true,
      message: `Diagnostic engine evaluated ${evaluated.length} devices. Recorded ${newlyLogged} new diagnostic events.`,
      evaluated_count: evaluated.length,
      newly_logged: newlyLogged,
    });
  } catch (err) {
    console.error('RUN DIAGNOSTICS ERROR:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
