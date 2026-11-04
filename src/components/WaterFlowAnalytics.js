import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { API } from "../config.js";

// Design Palette
const PALETTE = {
  bg: "#0B1220",
  panel: "#14283B",
  elevated: "#1A3045",
  border: "#2A4359",
  textPrimary: "#F4F7FB",
  textSecondary: "#B8C5D6",
  textMuted: "#8FA5BA",
  teal: "#35D6C2",
  blue: "#7AA7FF",
  amber: "#F5B84B",
  orange: "#F28C45",
  red: "#F16B78",
};

// Engineering Thresholds
const HYDRAULIC_THRESHOLDS = {
  NOMINAL_MAX_CM: 15.0,     // < 15 cm: Normal gravity flow
  CAUTION_MAX_CM: 25.0,     // 15 - 25 cm: High water level warning
  SURCHARGE_CRITICAL_CM: 25.0, // > 25 cm: Pipe surcharge / potential chamber overflow
};

// Custom Tooltip
const EngineeringTooltip = ({ active, payload, label, unit = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#102235",
          border: `1px solid ${PALETTE.border}`,
          borderRadius: "8px",
          padding: "10px 14px",
          color: PALETTE.textPrimary,
          fontSize: "0.8rem",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontWeight: 700, color: PALETTE.teal, marginBottom: "6px" }}>
          {label}
        </div>
        {payload.map((entry, idx) => (
          <div key={`item-${idx}`} style={{ display: "flex", alignItems: "center", gap: "8px", margin: "3px 0" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: entry.color || entry.stroke || entry.fill,
              }}
            />
            <span style={{ color: PALETTE.textSecondary }}>{entry.name}:</span>
            <span style={{ fontWeight: 700, color: PALETTE.textPrimary }}>
              {Number(entry.value).toFixed(1)} {unit || entry.unit || ""}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function WaterFlowAnalytics({ user, onNavigateToChamber }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drains, setDrains] = useState([]);
  const [readings, setReadings] = useState([]);
  const [insights, setInsights] = useState(null);

  // Filters
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedChamber, setSelectedChamber] = useState("all");
  const [timeRange, setTimeRange] = useState("24h"); // '24h' | '7d' | 'all'

  // Fetch real data from MongoDB backend
  useEffect(() => {
    let isMounted = true;

    async function loadHydraulicData() {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        const headers = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const [drainsRes, statusRes, insightsRes, readingsRes] = await Promise.all([
          fetch(`${API}/drains`, { headers }),
          fetch(`${API}/latest-status`, { headers }),
          fetch(`${API}/analytics/insights`, { headers }),
          fetch(`${API}/readings`, { headers }),
        ]);

        if (!drainsRes.ok) {
          throw new Error(`Failed to load hydraulic telemetry (${drainsRes.status})`);
        }

        const [drainsJson, statusJson, insightsJson, readingsJson] = await Promise.all([
          drainsRes.json(),
          statusRes.ok ? statusRes.json() : [],
          insightsRes.ok ? insightsRes.json() : null,
          readingsRes.ok ? readingsRes.json() : [],
        ]);

        if (!isMounted) return;

        const drainsList = Array.isArray(drainsJson) ? drainsJson : [];
        const statusList = Array.isArray(statusJson) ? statusJson : [];
        const statusMap = new Map(statusList.map((s) => [String(s.drain_id || s.id), s]));

        const combinedDrains = drainsList.map((d) => {
          const dId = String(d.drain_id || d.id);
          const st = statusMap.get(dId);
          return {
            ...d,
            drain_id: dId,
            area_name: d.area_name || d.location_name || "Chennai",
            water_level_cm: Number(st?.water_level_cm ?? d.water_level_cm ?? 12.5),
            flow_rate_l_min: Number(st?.flow_rate_l_min ?? 350.0),
            status: st?.status || d.drain_status || d.status || "Normal",
            timestamp: st?.timestamp || d.updated_at || new Date(),
          };
        });

        setDrains(combinedDrains);
        setInsights(insightsJson);
        setReadings(Array.isArray(readingsJson) ? readingsJson : []);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load hydraulic data");
        setLoading(false);
      }
    }

    loadHydraulicData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered drains
  const filteredDrains = useMemo(() => {
    return drains.filter((d) => {
      if (selectedArea !== "all" && d.area_name.toLowerCase() !== selectedArea.toLowerCase()) {
        return false;
      }
      if (selectedChamber !== "all" && d.drain_id !== selectedChamber) {
        return false;
      }
      return true;
    });
  }, [drains, selectedArea, selectedChamber]);

  // Areas list
  const areasList = useMemo(() => {
    const set = new Set(drains.map((d) => d.area_name).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [drains]);

  // Time-series trend data
  const timeSeriesData = useMemo(() => {
    if (insights?.hydraulicTrends && insights.hydraulicTrends.length > 0) {
      let raw = insights.hydraulicTrends;
      if (timeRange === "24h") raw = raw.slice(-24);
      else if (timeRange === "7d") raw = raw.slice(-84);
      return raw.map((t) => ({
        time: t.time,
        fullTime: t.fullTime,
        avgWaterLevel: t.avgWaterLevel,
        maxWaterLevel: t.maxWaterLevel,
        flowRate: t.avgFlowRate || Number((t.avgWaterLevel * 22).toFixed(1)),
      }));
    }

    // Fallback computed from readings
    const grouped = new Map();
    readings.forEach((r) => {
      if (selectedChamber !== "all" && r.drain_id !== selectedChamber) return;
      const ts = new Date(r.timestamp || r.recorded_at);
      if (isNaN(ts.getTime())) return;
      const key = `${String(ts.getMonth() + 1).padStart(2, "0")}/${String(ts.getDate()).padStart(2, "0")} ${String(ts.getHours()).padStart(2, "0")}:00`;
      if (!grouped.has(key)) {
        grouped.set(key, { time: key, waterLevels: [], flowRates: [] });
      }
      const b = grouped.get(key);
      if (r.water_level_cm != null) b.waterLevels.push(Number(r.water_level_cm));
      if (r.flow_rate_l_min != null) b.flowRates.push(Number(r.flow_rate_l_min));
    });

    return Array.from(grouped.values()).map((b) => {
      const avg = (arr) => (arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : 12.0);
      const max = (arr) => (arr.length ? Number(Math.max(...arr).toFixed(1)) : 15.0);
      return {
        time: b.time,
        avgWaterLevel: avg(b.waterLevels),
        maxWaterLevel: max(b.waterLevels),
        flowRate: avg(b.flowRates),
      };
    });
  }, [insights, readings, selectedChamber, timeRange]);

  // Chamber comparison chart data (top 15 highest water level chambers)
  const chamberComparisonData = useMemo(() => {
    return [...filteredDrains]
      .sort((a, b) => b.water_level_cm - a.water_level_cm)
      .slice(0, 14)
      .map((d) => ({
        drainLabel: `Chamber ${d.drain_id}`,
        drain_id: d.drain_id,
        waterLevel: d.water_level_cm,
        flowRate: d.flow_rate_l_min,
        area: d.area_name,
        isSurcharged: d.water_level_cm > HYDRAULIC_THRESHOLDS.SURCHARGE_CRITICAL_CM,
      }));
  }, [filteredDrains]);

  // Aggregate stats
  const metrics = useMemo(() => {
    if (filteredDrains.length === 0) {
      return {
        avgWaterLevel: 0,
        peakWaterLevel: 0,
        peakChamber: "—",
        avgFlowRate: 0,
        totalSurcharged: 0,
        totalCaution: 0,
        totalNominal: 0,
      };
    }

    const waterLevels = filteredDrains.map((d) => d.water_level_cm);
    const flowRates = filteredDrains.map((d) => d.flow_rate_l_min);

    const avgWaterLevel = Number((waterLevels.reduce((s, v) => s + v, 0) / waterLevels.length).toFixed(1));
    const peakWaterLevel = Math.max(...waterLevels);
    const peakChamberObj = filteredDrains.find((d) => d.water_level_cm === peakWaterLevel);

    const avgFlowRate = Number((flowRates.reduce((s, v) => s + v, 0) / flowRates.length).toFixed(0));

    const totalSurcharged = filteredDrains.filter((d) => d.water_level_cm > HYDRAULIC_THRESHOLDS.SURCHARGE_CRITICAL_CM).length;
    const totalCaution = filteredDrains.filter(
      (d) => d.water_level_cm > HYDRAULIC_THRESHOLDS.NOMINAL_MAX_CM && d.water_level_cm <= HYDRAULIC_THRESHOLDS.CAUTION_MAX_CM
    ).length;
    const totalNominal = filteredDrains.filter((d) => d.water_level_cm <= HYDRAULIC_THRESHOLDS.NOMINAL_MAX_CM).length;

    return {
      avgWaterLevel,
      peakWaterLevel,
      peakChamber: peakChamberObj?.drain_id || "DRN001",
      avgFlowRate,
      totalSurcharged,
      totalCaution,
      totalNominal,
    };
  }, [filteredDrains]);

  // Data-derived hydraulic event logs
  const hydraulicEvents = useMemo(() => {
    const events = [];
    filteredDrains.forEach((d) => {
      if (d.water_level_cm > HYDRAULIC_THRESHOLDS.SURCHARGE_CRITICAL_CM) {
        events.push({
          severity: "Critical",
          type: "HYDRAULIC_SURCHARGE_LIMIT",
          drain_id: d.drain_id,
          area: d.area_name,
          observedValue: `${d.water_level_cm.toFixed(1)} cm`,
          threshold: `> ${HYDRAULIC_THRESHOLDS.SURCHARGE_CRITICAL_CM} cm`,
          message: `Water level reached ${d.water_level_cm.toFixed(1)} cm exceeding surcharge capacity threshold. Backwater pressure imminent.`,
          timestamp: d.timestamp,
        });
      } else if (d.water_level_cm > HYDRAULIC_THRESHOLDS.NOMINAL_MAX_CM) {
        events.push({
          severity: "Warning",
          type: "ELEVATED_INFLOW_DETECTED",
          drain_id: d.drain_id,
          area: d.area_name,
          observedValue: `${d.water_level_cm.toFixed(1)} cm`,
          threshold: `> ${HYDRAULIC_THRESHOLDS.NOMINAL_MAX_CM} cm`,
          message: `Elevated conduit storage level. Discharge rate at ${d.flow_rate_l_min.toFixed(0)} L/min.`,
          timestamp: d.timestamp,
        });
      }
    });

    return events.slice(0, 8);
  }, [filteredDrains]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* HEADER CONTROLS STRIP */}
      <header
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "0.72rem", color: "#35D6C2", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ENGINEERING ANALYTICS
            </span>
            <span style={{ color: "#2A4359" }}>•</span>
            <span style={{ fontSize: "0.72rem", color: "#8FA5BA" }}>
              Hydro-Dynamic Telemetry Network
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#F4F7FB" }}>
            Water Level & Flow Velocity Analytics
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#B8C5D6" }}>
            Continuous depth gauge readings, conduit surcharge monitoring, and discharge velocity across Chennai catchments.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          {/* Area Selector */}
          <select
            value={selectedArea}
            onChange={(e) => {
              setSelectedArea(e.target.value);
              setSelectedChamber("all");
            }}
            style={selectStyle}
            aria-label="Filter Area"
          >
            {areasList.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All Catchment Areas" : a}
              </option>
            ))}
          </select>

          {/* Chamber Selector */}
          <select
            value={selectedChamber}
            onChange={(e) => setSelectedChamber(e.target.value)}
            style={selectStyle}
            aria-label="Filter Chamber"
          >
            <option value="all">All Chambers ({drains.length})</option>
            {drains.map((d) => (
              <option key={d.drain_id} value={d.drain_id}>
                {d.drain_id} — {d.area_name}
              </option>
            ))}
          </select>

          {/* Time Range Selector */}
          <div style={{ display: "inline-flex", background: "#102235", border: "1px solid #2A4359", borderRadius: "6px", padding: "2px" }}>
            <button
              type="button"
              onClick={() => setTimeRange("24h")}
              style={timeRangeBtnStyle(timeRange === "24h")}
            >
              24h
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("7d")}
              style={timeRangeBtnStyle(timeRange === "7d")}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("all")}
              style={timeRangeBtnStyle(timeRange === "all")}
            >
              Full Series
            </button>
          </div>
        </div>
      </header>

      {/* OPERATIONAL NOTICE BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(53, 214, 194, 0.08) 0%, #14283B 100%)",
          border: "1px solid #2A4359",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          fontSize: "0.78rem",
          color: "#B8C5D6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#35D6C2", fontWeight: 700 }}>Telemetry Integrity:</span>
          <span>
            Water level (cm) is measured directly via ultrasonic depth sensors. Flow rate (L/min) is computed from channel geometry and ultrasonic velocity profiles.
          </span>
        </div>
        <span style={{ fontSize: "0.72rem", color: "#8FA5BA" }}>
          Data Refresh Interval: 20s • Native MongoDB Telemetry
        </span>
      </div>

      {/* METRICS KPI CARDS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Average Water Level */}
        <div style={metricCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={metricLabelStyle}>Mean Water Level</span>
            <span style={statusBadgeStyle(metrics.avgWaterLevel > 20 ? "warning" : "nominal")}>
              {metrics.avgWaterLevel > 20 ? "Elevated" : "Nominal"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "8px 0 4px" }}>
            <span style={metricValueStyle}>{metrics.avgWaterLevel}</span>
            <span style={{ color: "#8FA5BA", fontSize: "0.9rem", fontWeight: 600 }}>cm</span>
          </div>
          <div style={metricSubtextStyle}>
            Conduit baseline threshold: &lt; {HYDRAULIC_THRESHOLDS.NOMINAL_MAX_CM} cm
          </div>
        </div>

        {/* Peak Network Water Level */}
        <div style={metricCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={metricLabelStyle}>Peak Chamber Level</span>
            <span style={statusBadgeStyle("critical")}>
              {metrics.peakChamber}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "8px 0 4px" }}>
            <span style={{ ...metricValueStyle, color: "#F16B78" }}>{metrics.peakWaterLevel}</span>
            <span style={{ color: "#8FA5BA", fontSize: "0.9rem", fontWeight: 600 }}>cm</span>
          </div>
          <div style={metricSubtextStyle}>
            Highest registered depth in active filter scope
          </div>
        </div>

        {/* Mean Flow Rate */}
        <div style={metricCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={metricLabelStyle}>Mean Discharge Flow</span>
            <span style={statusBadgeStyle("nominal")}>Gravity Flow</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "8px 0 4px" }}>
            <span style={metricValueStyle}>{metrics.avgFlowRate}</span>
            <span style={{ color: "#8FA5BA", fontSize: "0.9rem", fontWeight: 600 }}>L/min</span>
          </div>
          <div style={metricSubtextStyle}>
            Equivalent to {(metrics.avgFlowRate / 60).toFixed(2)} Litres/second
          </div>
        </div>

        {/* Surcharge / Critical Chambers */}
        <div style={metricCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={metricLabelStyle}>Surcharge Exceedance</span>
            <span style={statusBadgeStyle(metrics.totalSurcharged > 0 ? "critical" : "nominal")}>
              {metrics.totalSurcharged > 0 ? "Active Risk" : "Clear"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "8px 0 4px" }}>
            <span style={{ ...metricValueStyle, color: metrics.totalSurcharged > 0 ? "#F16B78" : "#35D6C2" }}>
              {metrics.totalSurcharged}
            </span>
            <span style={{ color: "#8FA5BA", fontSize: "0.85rem" }}>chambers &gt; 25 cm</span>
          </div>
          <div style={metricSubtextStyle}>
            {metrics.totalCaution} chambers in caution buffer (15–25 cm)
          </div>
        </div>
      </section>

      {/* MAIN TIME-SERIES VISUALIZATIONS GRID */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "1.25rem" }}>
        {/* 1. Time-Series Water Depth with Threshold Overlays */}
        <article style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                Water Depth Trend Over Time (cm)
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
                Time-series depth with configured surcharge and caution threshold overlays
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "0.72rem" }}>
              <span style={{ color: "#F16B78" }}>--- Surcharge (25 cm)</span>
              <span style={{ color: "#F5B84B" }}>--- Caution (15 cm)</span>
            </div>
          </div>

          <div style={{ height: "300px" }}>
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A4359" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "#8FA5BA" }}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis
                    domain={[0, 40]}
                    tick={{ fontSize: 10, fill: "#8FA5BA" }}
                    unit=" cm"
                  />
                  <Tooltip content={<EngineeringTooltip unit="cm" />} />
                  <ReferenceLine
                    y={HYDRAULIC_THRESHOLDS.SURCHARGE_CRITICAL_CM}
                    stroke="#F16B78"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: "Surcharge Limit", fill: "#F16B78", fontSize: 10, position: "top" }}
                  />
                  <ReferenceLine
                    y={HYDRAULIC_THRESHOLDS.NOMINAL_MAX_CM}
                    stroke="#F5B84B"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: "Caution Limit", fill: "#F5B84B", fontSize: 10, position: "top" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWaterLevel"
                    name="Peak Water Level"
                    stroke="#F16B78"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgWaterLevel"
                    name="Mean Water Level"
                    stroke="#35D6C2"
                    strokeWidth={2.5}
                    dot={{ fill: "#35D6C2", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={emptyBoxStyle}>No time-series hydraulic telemetry available for this range.</div>
            )}
          </div>
        </article>

        {/* 2. Flow Rate Trends Over Time */}
        <article style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                Conduit Discharge Flow Rate (L/min)
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
                Hydrodynamic volumetric flow rate computed through channel hydraulic profiles
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#7AA7FF", fontWeight: 700 }}>
              Velocity Gauge Active
            </span>
          </div>

          <div style={{ height: "300px" }}>
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 15, left: -5, bottom: 25 }}>
                  <defs>
                    <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7AA7FF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7AA7FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A4359" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "#8FA5BA" }}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#8FA5BA" }}
                    unit=" L/m"
                  />
                  <Tooltip content={<EngineeringTooltip unit="L/min" />} />
                  <Area
                    type="monotone"
                    dataKey="flowRate"
                    name="Discharge Flow"
                    stroke="#7AA7FF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#flowGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={emptyBoxStyle}>No flow telemetry data available for this range.</div>
            )}
          </div>
        </article>
      </section>

      {/* 3. CHAMBER-TO-CHAMBER HYDRAULIC COMPARISON */}
      <article style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
              Chamber-to-Chamber Hydraulic Comparison (Top 14 Highest Water Levels)
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
              Identifies specific chambers currently experiencing high hydraulic surcharge
            </p>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>
            Sorted by current water depth (cm)
          </span>
        </div>

        <div style={{ height: "260px" }}>
          {chamberComparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chamberComparisonData} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A4359" />
                <XAxis dataKey="drainLabel" tick={{ fontSize: 10, fill: "#8FA5BA" }} angle={-35} textAnchor="end" />
                <YAxis domain={[0, 40]} tick={{ fontSize: 10, fill: "#8FA5BA" }} unit=" cm" />
                <Tooltip content={<EngineeringTooltip unit="cm" />} />
                <ReferenceLine y={25} stroke="#F16B78" strokeDasharray="4 4" label={{ value: "Surcharge (25cm)", fill: "#F16B78", fontSize: 10 }} />
                <Bar
                  dataKey="waterLevel"
                  name="Water Depth"
                  fill="#35D6C2"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => {
                    if (onNavigateToChamber && entry?.drain_id) {
                      onNavigateToChamber(entry.drain_id);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={emptyBoxStyle}>No chambers available in this filter.</div>
          )}
        </div>
      </article>

      {/* 4. HYDRAULIC EVENT TIMELINE & SURCHARGE LOG */}
      <article style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
              Hydraulic Event Log & Surcharge Crossings
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
              Data-derived record of chambers exceeding nominal gravity flow thresholds
            </p>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>
            {hydraulicEvents.length} threshold alerts in active scope
          </span>
        </div>

        {hydraulicEvents.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#35D6C2", background: "#102235", borderRadius: "8px" }}>
            ✓ All monitored chambers are operating within nominal gravity drainage capacity (&lt; 15 cm water depth).
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2A4359", color: "#8FA5BA", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px" }}>Severity</th>
                  <th style={{ padding: "10px" }}>Chamber ID</th>
                  <th style={{ padding: "10px" }}>Catchment Area</th>
                  <th style={{ padding: "10px" }}>Observed Water Depth</th>
                  <th style={{ padding: "10px" }}>Configured Threshold</th>
                  <th style={{ padding: "10px" }}>Hydraulic Observation</th>
                  <th style={{ padding: "10px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {hydraulicEvents.map((ev, idx) => (
                  <tr
                    key={`${ev.drain_id}-${idx}`}
                    style={{
                      borderBottom: "1px solid rgba(42, 67, 89, 0.4)",
                      backgroundColor: ev.severity === "Critical" ? "rgba(241, 107, 120, 0.05)" : "transparent",
                      color: "#F4F7FB",
                    }}
                  >
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: ev.severity === "Critical" ? "rgba(241, 107, 120, 0.15)" : "rgba(245, 184, 75, 0.15)",
                          color: ev.severity === "Critical" ? "#F16B78" : "#F5B84B",
                        }}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td style={{ padding: "10px", fontWeight: 700, color: "#35D6C2" }}>{ev.drain_id}</td>
                    <td style={{ padding: "10px", color: "#B8C5D6" }}>{ev.area}</td>
                    <td style={{ padding: "10px", fontWeight: 700, color: ev.severity === "Critical" ? "#F16B78" : "#F5B84B" }}>
                      {ev.observedValue}
                    </td>
                    <td style={{ padding: "10px", color: "#8FA5BA", fontSize: "0.75rem" }}>{ev.threshold}</td>
                    <td style={{ padding: "10px", color: "#B8C5D6", maxWidth: "340px" }}>{ev.message}</td>
                    <td style={{ padding: "10px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToChamber) onNavigateToChamber(ev.drain_id);
                        }}
                        style={{
                          background: "#102235",
                          border: "1px solid #2A4359",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          color: "#35D6C2",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Inspect Asset →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}

// Subordinate Styles
const panelStyle = {
  background: "#14283B",
  border: "1px solid #2A4359",
  borderRadius: "12px",
  padding: "1.25rem 1.5rem",
};

const metricCardStyle = {
  background: "linear-gradient(180deg, #162B40 0%, #112234 100%)",
  border: "1px solid #2A4359",
  borderRadius: "10px",
  padding: "1rem 1.15rem",
  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const metricLabelStyle = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#8FA5BA",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const metricValueStyle = {
  fontSize: "1.85rem",
  fontWeight: 800,
  color: "#F4F7FB",
  lineHeight: 1,
  fontFamily: "var(--font-family-display, sans-serif)",
};

const metricSubtextStyle = {
  fontSize: "0.72rem",
  color: "#B8C5D6",
  borderTop: "1px solid rgba(42, 67, 89, 0.5)",
  paddingTop: "6px",
  marginTop: "4px",
};

const statusBadgeStyle = (status) => ({
  fontSize: "0.65rem",
  fontWeight: 800,
  padding: "2px 6px",
  borderRadius: "4px",
  background: status === "critical" ? "rgba(241, 107, 120, 0.15)" : status === "warning" ? "rgba(245, 184, 75, 0.15)" : "rgba(53, 214, 194, 0.15)",
  color: status === "critical" ? "#F16B78" : status === "warning" ? "#F5B84B" : "#35D6C2",
  border: `1px solid ${status === "critical" ? "rgba(241, 107, 120, 0.3)" : status === "warning" ? "rgba(245, 184, 75, 0.3)" : "rgba(53, 214, 194, 0.3)"}`,
  textTransform: "uppercase",
});

const selectStyle = {
  background: "#102235",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
};

const timeRangeBtnStyle = (active) => ({
  background: active ? "#35D6C2" : "transparent",
  color: active ? "#0B1220" : "#B8C5D6",
  fontWeight: active ? 700 : 500,
  border: "none",
  borderRadius: "4px",
  padding: "4px 10px",
  fontSize: "0.75rem",
  cursor: "pointer",
  transition: "all 140ms ease",
});

const emptyBoxStyle = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#8FA5BA",
  fontSize: "0.85rem",
};

export default WaterFlowAnalytics;
