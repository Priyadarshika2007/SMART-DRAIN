/**
 * URBANDRAIN 2.0 - Hardware & Telemetry Diagnostic Engine
 * Evaluates real MongoDB sensor readings and devices to assess device health,
 * detect sensor faults, flag stale telemetry, and generate maintenance guidance.
 */

// Configurable diagnostic thresholds (sensible defaults, transparently documented)
export const DIAGNOSTIC_CONFIG = {
  expectedReportingIntervalMinutes: 120, // 2 hours
  staleThresholdHours: 48,
  minWaterLevelCm: 0,
  maxWaterLevelCm: 250,
  minFlowRateLMin: 0,
  maxFlowRateLMin: 3000,
  minRawGasValue: 0,
  maxRawGasValue: 1023, // 10-bit ADC reference max
  spikeMultiplier: 2.2,
};

/**
 * Classify a device's health state based on its sensor history and metadata.
 *
 * @param {object} device - MongoDB device record
 * @param {Array<object>} recentReadings - Descending ordered readings for this device
 * @param {Date} referenceTime - Current reference time (defaults to newest dataset timestamp or now)
 * @returns {object} Diagnostic evaluation result
 */
export function evaluateDeviceHealth(device, recentReadings = [], referenceTime = new Date()) {
  const deviceId = device.device_id;
  const drainId = device.drain_id;
  const issues = [];
  const recommendations = [];

  // 1. Telemetry Presence Check
  if (!recentReadings || recentReadings.length === 0) {
    return {
      device_id: deviceId,
      drain_id: drainId,
      status: 'Warning — inspection recommended',
      severity: 'Medium',
      primary_issue: 'No sensor telemetry recorded for this device',
      issues: ['Device registered in inventory but has never transmitted valid sensor frames'],
      recommendations: [
        'Inspect power supply and physical wiring at inspection chamber',
        'Verify gateway node provisioning and device registration ID',
      ],
      last_seen: device.last_seen_at || device.created_at || null,
      data_freshness: 'No Data',
      metrics: {
        total_readings: 0,
        reading_gap_hours: null,
      },
    };
  }

  const latestReading = recentReadings[0];
  const latestTimestamp = new Date(latestReading.timestamp || latestReading.recorded_at);
  const refMs = referenceTime instanceof Date ? referenceTime.getTime() : Date.now();
  const readingMs = !isNaN(latestTimestamp.getTime()) ? latestTimestamp.getTime() : refMs;
  const elapsedHours = Math.max(0, (refMs - readingMs) / (1000 * 60 * 60));

  let dataFreshness = 'Fresh (< 2h)';
  if (elapsedHours > 72) {
    dataFreshness = 'Stale (> 72h)';
  } else if (elapsedHours > 24) {
    dataFreshness = 'Stale (> 24h)';
  } else if (elapsedHours > 2) {
    dataFreshness = 'Delayed (> 2h)';
  }

  // 2. Check Stale / Communication Lost
  if (elapsedHours > DIAGNOSTIC_CONFIG.staleThresholdHours) {
    issues.push(`Telemetry inactive for ${Math.round(elapsedHours)} hours (exceeds ${DIAGNOSTIC_CONFIG.staleThresholdHours}h threshold)`);
    recommendations.push('Check communication link and local RF/cellular gateway connectivity');
  }

  // 3. Check Range & Implausible Values in latest reading
  let rangeFault = false;
  const waterLevel = Number(latestReading.water_level_cm);
  const flowRate = Number(latestReading.flow_rate_l_min);
  const h2sRaw = Number(latestReading.h2s_raw_value);
  const ch4Raw = Number(latestReading.methane_raw_value);
  const mq7Raw = Number(latestReading.mq7_raw_value);

  if (isNaN(waterLevel) || waterLevel < DIAGNOSTIC_CONFIG.minWaterLevelCm || waterLevel > DIAGNOSTIC_CONFIG.maxWaterLevelCm) {
    issues.push(`Water level value out of operating bounds: ${waterLevel} cm`);
    recommendations.push('Inspect ultrasonic transducer face for sediment, cobwebs, or moisture condensation');
    rangeFault = true;
  }

  if (isNaN(flowRate) || flowRate < DIAGNOSTIC_CONFIG.minFlowRateLMin || flowRate > DIAGNOSTIC_CONFIG.maxFlowRateLMin) {
    issues.push(`Flow rate value out of operating bounds: ${flowRate} L/min`);
    recommendations.push('Inspect flow meter impeller and clear debris');
    rangeFault = true;
  }

  if (isNaN(h2sRaw) || h2sRaw < DIAGNOSTIC_CONFIG.minRawGasValue) {
    issues.push(`H2S raw channel reports negative or non-numeric reading: ${h2sRaw}`);
    recommendations.push('Check analog ground wiring and gas sensor module supply');
    rangeFault = true;
  }

  if (isNaN(ch4Raw) || ch4Raw < DIAGNOSTIC_CONFIG.minRawGasValue) {
    issues.push(`Methane raw channel reports negative or non-numeric reading: ${ch4Raw}`);
    recommendations.push('Inspect gas sensor daughterboard connector');
    rangeFault = true;
  }

  if (isNaN(mq7Raw) || mq7Raw < DIAGNOSTIC_CONFIG.minRawGasValue) {
    issues.push(`MQ-7 raw channel reports negative or non-numeric reading: ${mq7Raw}`);
    recommendations.push('Inspect MQ-7 heater circuit and analog line');
    rangeFault = true;
  }

  // 4. Trend & Stuck Sensor Check across recent readings (if >= 4 readings available)
  let stuckSensor = false;
  let suddenSpike = false;
  if (recentReadings.length >= 4) {
    const sample = recentReadings.slice(0, 8);
    const waterVals = sample.map((r) => Number(r.water_level_cm)).filter((v) => !isNaN(v));
    const mq7Vals = sample.map((r) => Number(r.mq7_raw_value)).filter((v) => !isNaN(v));

    // Check stuck sensor (zero variance over 6+ readings while other parameters vary)
    if (sample.length >= 6) {
      const allIdenticalWater = waterVals.length >= 6 && waterVals.every((v) => v === waterVals[0] && v > 0);
      const allIdenticalMq7 = mq7Vals.length >= 6 && mq7Vals.every((v) => v === mq7Vals[0] && v > 0);
      if (allIdenticalWater && !allIdenticalMq7) {
        issues.push(`Transducer reporting identical static water level (${waterVals[0]} cm) across consecutive cycles`);
        recommendations.push('Check sensor acoustic cone for mechanical freeze or echo obstruction');
        stuckSensor = true;
      }
    }

    // Check sudden spike (reading > 2.2x moving average of preceding 3 readings)
    if (waterVals.length >= 4) {
      const current = waterVals[0];
      const baseline = (waterVals[1] + waterVals[2] + waterVals[3]) / 3;
      if (baseline > 5 && current > baseline * DIAGNOSTIC_CONFIG.spikeMultiplier) {
        issues.push(`Sharp transient water level spike detected (${current} cm vs baseline ${baseline.toFixed(1)} cm)`);
        recommendations.push('Compare against hydraulic rain gauge to verify whether surge is environmental or sensor noise');
        suddenSpike = true;
      }
    }
  }

  // 5. Repeated Failure History check
  const consecutiveFailures = issues.length;

  // 6. Synthesize Final Classification
  let status = 'Healthy';
  let severity = 'Normal';

  if (rangeFault && consecutiveFailures >= 3) {
    status = 'Replacement assessment recommended';
    severity = 'Critical';
    recommendations.unshift('Conduct formal bench test; assess sensor probe replacement if calibration fails');
  } else if (rangeFault || stuckSensor) {
    status = 'Suspected sensor fault';
    severity = 'High';
  } else if (elapsedHours > DIAGNOSTIC_CONFIG.staleThresholdHours) {
    status = 'Stale or communication lost';
    severity = 'Medium';
  } else if (suddenSpike || issues.length > 0) {
    status = 'Warning — inspection recommended';
    severity = 'Low';
  }

  if (recommendations.length === 0) {
    recommendations.push('Operating nominally within documented parameters; next routine inspection as scheduled');
  }

  return {
    device_id: deviceId,
    drain_id: drainId,
    device_name: device.device_name || `URBANDRAIN Unit ${deviceId}`,
    controller_type: device.controller_type || 'Arduino UNO / Micro',
    firmware_version: device.firmware_version || 'V2.0',
    status,
    severity,
    primary_issue: issues[0] || 'Nominal telemetry transmission',
    issues,
    recommendations,
    last_seen: latestTimestamp,
    elapsed_hours: Math.round(elapsedHours * 10) / 10,
    data_freshness: dataFreshness,
    latest_reading: {
      timestamp: latestTimestamp,
      water_level_cm: waterLevel,
      flow_rate_l_min: flowRate,
      h2s_raw_value: h2sRaw,
      methane_raw_value: ch4Raw,
      mq7_raw_value: mq7Raw,
      dhi_score: latestReading.dhi_score ?? null,
    },
    metrics: {
      total_readings: recentReadings.length,
      reading_gap_hours: Math.round(elapsedHours * 10) / 10,
    },
  };
}
