import React, { useMemo } from "react";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import KPICard from "../KPICard.js";

function DashboardMain({
  officerArea,
  kpis,
  statusDistribution,
  dhiBarData,
  filteredData,
  allData,
  formatWaterLevel,
  onNavigate,
  onSelectDrain,
}) {
  // Gas Risk Metrics
  const gasMetrics = useMemo(() => {
    const list = filteredData || [];
    let criticalGasCount = 0;
    let highGasCount = 0;
    let normalGasCount = 0;

    for (const item of list) {
      const risk = String(item.gas_risk || "").toLowerCase();
      if (risk === "critical") criticalGasCount++;
      else if (risk === "high") highGasCount++;
      else normalGasCount++;
    }

    return {
      criticalGasCount,
      highGasCount,
      normalGasCount,
      hasGasEmergency: criticalGasCount > 0,
    };
  }, [filteredData]);

  // Priority inspection queue (top worst condition chambers)
  const priorityChambers = useMemo(() => {
    const list = [...(filteredData || [])];
    return list
      .map((item) => {
        const dhi = Number(item.dhi_score ?? 0);
        const water = Number(item.water_level_cm ?? 0);
        const isCriticalStatus = String(item.status || "").toLowerCase() === "critical";
        const isGasCritical = String(item.gas_risk || "").toLowerCase() === "critical";
        const priorityScore = (isGasCritical ? 50 : 0) + (isCriticalStatus ? 40 : 0) + dhi;

        return {
          ...item,
          priorityScore,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 6);
  }, [filteredData]);

  // Telemetry reporting coverage
  const reportingCoverage = useMemo(() => {
    const total = filteredData?.length || 0;
    if (total === 0) return { percent: 100, activeCount: 0 };
    // Chambers reporting within realistic thresholds
    const activeCount = filteredData.filter((d) => d.timestamp != null).length;
    const percent = Math.min(100, Math.round((activeCount / Math.max(1, total)) * 100));
    return { percent, activeCount };
  }, [filteredData]);

  // Highest surcharge water level
  const highestWaterLevel = useMemo(() => {
    const list = filteredData || [];
    if (list.length === 0) return { depth: 0, chamber: "—" };
    let max = 0;
    let chamber = "—";
    list.forEach((item) => {
      const lvl = Number(item.water_level_cm || 0);
      if (lvl > max) {
        max = lvl;
        chamber = item.drain_id;
      }
    });
    return { depth: max.toFixed(1), chamber };
  }, [filteredData]);

  // Bar chart subset for DHI
  const barChartSubset = useMemo(() => {
    if (!Array.isArray(dhiBarData)) return [];
    return dhiBarData.slice(0, 10);
  }, [dhiBarData]);

  const handleNav = (tabKey) => {
    if (onNavigate) onNavigate(tabKey);
  };

  const handleChamberClick = (drainId) => {
    if (onSelectDrain) onSelectDrain(drainId);
    else if (onNavigate) onNavigate("drains");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* 1. OPERATIONAL COMMAND STATUS HEADER */}
      <section
        style={{
          background: "linear-gradient(135deg, #14283B 0%, #102235 100%)",
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
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#35D6C2",
                boxShadow: "0 0 8px #35D6C2",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "0.72rem", color: "#35D6C2", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              COMMAND CENTRE ACTIVE
            </span>
            <span style={{ color: "#2A4359" }}>•</span>
            <span style={{ fontSize: "0.72rem", color: "#8FA5BA" }}>
              Greater Chennai Drainage Monitoring Network
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#F4F7FB" }}>
            Catchment Operations Summary: {officerArea}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#B8C5D6" }}>
            Real-time multi-sensor telemetry synthesized from {kpis.totalDrains} monitored inspection chambers.
          </p>
        </div>

        {/* Quick Operational Jump Buttons */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => handleNav("map")}
            style={quickNavBtnStyle}
          >
            🗺️ Geospatial Map
          </button>
          <button
            type="button"
            onClick={() => handleNav("hydraulics")}
            style={quickNavBtnStyle}
          >
            🌊 Water & Flow
          </button>
          <button
            type="button"
            onClick={() => handleNav("gas-safety")}
            style={{
              ...quickNavBtnStyle,
              borderColor: gasMetrics.hasGasEmergency ? "#F16B78" : "#2A4359",
              color: gasMetrics.hasGasEmergency ? "#F16B78" : "#F5B84B",
            }}
          >
            🛡️ Gas Safety {gasMetrics.criticalGasCount > 0 && `(${gasMetrics.criticalGasCount})`}
          </button>
          <button
            type="button"
            onClick={() => handleNav("alerts")}
            style={{
              ...quickNavBtnStyle,
              borderColor: kpis.criticalAlerts > 0 ? "#F16B78" : "#2A4359",
              color: kpis.criticalAlerts > 0 ? "#F16B78" : "#F4F7FB",
            }}
          >
            🚨 Incidents {kpis.criticalAlerts > 0 && `(${kpis.criticalAlerts})`}
          </button>
        </div>
      </section>

      {/* 2. CONFINED SPACE SAFETY PROTOCOL BANNER */}
      <div
        style={{
          background: gasMetrics.hasGasEmergency
            ? "linear-gradient(135deg, rgba(241, 107, 120, 0.15) 0%, #14283B 100%)"
            : "linear-gradient(135deg, rgba(53, 214, 194, 0.08) 0%, #14283B 100%)",
          border: `1px solid ${gasMetrics.hasGasEmergency ? "#F16B78" : "#2A4359"}`,
          borderRadius: "10px",
          padding: "0.85rem 1.15rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              background: gasMetrics.hasGasEmergency ? "#F16B78" : "#35D6C2",
              color: "#0B1220",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1rem",
              flexShrink: 0,
            }}
          >
            {gasMetrics.hasGasEmergency ? "⚠️" : "🛡️"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "0.88rem", color: gasMetrics.hasGasEmergency ? "#F16B78" : "#F4F7FB" }}>
                {gasMetrics.hasGasEmergency ? "ACTIVE ATMOSPHERIC GAS HAZARD DETECTED" : "SEWER-WORKER SAFETY: NOMINAL PROTOCOL ACTIVE"}
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: gasMetrics.hasGasEmergency ? "rgba(241, 107, 120, 0.2)" : "rgba(53, 214, 194, 0.2)",
                  color: gasMetrics.hasGasEmergency ? "#F16B78" : "#35D6C2",
                }}
              >
                {gasMetrics.hasGasEmergency ? `${gasMetrics.criticalGasCount} ELEVATED CHAMBERS` : "FIELD SENSORS NOMINAL"}
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#B8C5D6" }}>
              Mandatory Confined Space Policy: Continuous telemetry provides supplementary network intelligence. <strong>Never authorize human entry without onsite multigas calibrated verification and forced ventilation.</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleNav("gas-safety")}
          style={{
            background: "#102235",
            border: "1px solid #2A4359",
            color: "#35D6C2",
            padding: "5px 10px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          View Gas Telemetry →
        </button>
      </div>

      {/* 3. CORE OPERATIONAL KPIS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
        }}
      >
        <KPICard
          icon="🧱"
          title="Monitored Chambers"
          value={kpis.totalDrains.toString()}
          unit="assets"
          description={`Scope: ${officerArea} catchments`}
          status="normal"
          sourceLabel="MongoDB drains"
          onClick={() => handleNav("drains")}
        />

        <KPICard
          icon="📡"
          title="Telemetry Coverage"
          value={`${reportingCoverage.percent}%`}
          description={`${reportingCoverage.activeCount} chambers reporting telemetry`}
          status={reportingCoverage.percent >= 90 ? "normal" : "moderate"}
          sourceLabel="Coverage: Active"
          onClick={() => handleNav("devices")}
        />

        <KPICard
          icon="🚨"
          title="Critical Unresolved"
          value={kpis.criticalAlerts.toString()}
          unit="incidents"
          description="Immediate inspection required"
          status={kpis.criticalAlerts > 0 ? "critical" : "normal"}
          sourceLabel="Active Queue"
          onClick={() => handleNav("alerts")}
        />

        <KPICard
          icon="🌊"
          title="Peak Water Depth"
          value={highestWaterLevel.depth}
          unit="cm"
          description={`Observed at Chamber ${highestWaterLevel.chamber}`}
          status={Number(highestWaterLevel.depth) > 25 ? "critical" : Number(highestWaterLevel.depth) > 15 ? "moderate" : "normal"}
          sourceLabel="Ultrasonic Depth"
          onClick={() => handleNav("hydraulics")}
        />

        <KPICard
          icon="📊"
          title="Average Health Index"
          value={kpis.averageDhi === null ? "—" : kpis.averageDhi.toFixed(1)}
          unit="/ 100"
          description="Dynamic Health Index (DHI)"
          status={kpis.averageDhi > 60 ? "critical" : kpis.averageDhi > 40 ? "moderate" : "normal"}
          sourceLabel="Hydraulic Baseline"
          onClick={() => handleNav("analytics")}
        />
      </section>

      {/* 4. CHARTS: NETWORK DISTRIBUTION & DHI RANKINGS */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
        {/* Status Distribution Donut Chart */}
        <article
          style={{
            background: "#14283B",
            border: "1px solid #2A4359",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                Network Hydraulic Condition Breakdown
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
                Current operational states across {kpis.totalDrains} monitored chambers
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNav("hydraulics")}
              style={cardActionLinkStyle}
            >
              Analyze Flow →
            </button>
          </div>

          <div style={{ height: "240px" }}>
            {statusDistribution.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="#14283B" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#102235", borderColor: "#2A4359", color: "#F4F7FB", borderRadius: "6px" }}
                    itemStyle={{ color: "#F4F7FB" }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ color: "#B8C5D6", fontSize: "0.8rem" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={emptyBoxStyle}>No status distribution data available</div>
            )}
          </div>
        </article>

        {/* Highest Risk Chambers DHI Bar Chart */}
        <article
          style={{
            background: "#14283B",
            border: "1px solid #2A4359",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                High-Risk Chambers (Top DHI Scores)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
                Combined index of water depth and hydraulic discharge limits
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNav("drains")}
              style={cardActionLinkStyle}
            >
              Asset Inspector →
            </button>
          </div>

          <div style={{ height: "240px" }}>
            {barChartSubset.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartSubset} margin={{ top: 8, right: 12, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A4359" />
                  <XAxis dataKey="drainLabel" tick={{ fontSize: 9, fill: "#8FA5BA" }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: "#8FA5BA" }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#102235", borderColor: "#2A4359", color: "#F4F7FB", borderRadius: "6px" }}
                  />
                  <ReferenceLine y={60} stroke="#F16B78" strokeDasharray="3 3" label={{ value: "Critical (60)", fill: "#F16B78", fontSize: 9 }} />
                  <ReferenceLine y={40} stroke="#F5B84B" strokeDasharray="3 3" label={{ value: "Warning (40)", fill: "#F5B84B", fontSize: 9 }} />
                  <Bar
                    dataKey="dhiScore"
                    name="DHI Score"
                    fill="#35D6C2"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={emptyBoxStyle}>No telemetry readings available</div>
            )}
          </div>
        </article>
      </section>

      {/* 5. PRIORITIZED INSPECTION QUEUE */}
      <article
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
              ⚠️ Prioritized Field Inspection Queue
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
              Ranked by composite risk: active gas hazards, surcharge levels, and anomaly frequency
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleNav("drains")}
            style={cardActionLinkStyle}
          >
            All Chambers ({filteredData.length}) →
          </button>
        </div>

        {priorityChambers.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#35D6C2", background: "#102235", borderRadius: "8px" }}>
            ✓ All monitored chambers are currently operating within nominal parameters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2A4359", color: "#8FA5BA", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px" }}>Priority</th>
                  <th style={{ padding: "10px" }}>Chamber ID</th>
                  <th style={{ padding: "10px" }}>Catchment Zone</th>
                  <th style={{ padding: "10px" }}>Water Depth</th>
                  <th style={{ padding: "10px" }}>DHI Score</th>
                  <th style={{ padding: "10px" }}>Hydraulic Condition</th>
                  <th style={{ padding: "10px" }}>Gas Hazard Status</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {priorityChambers.map((drain, index) => {
                  const isCrit = String(drain.status).toLowerCase() === "critical";
                  const isWarn = String(drain.status).toLowerCase() === "moderate" || String(drain.status).toLowerCase() === "warning";
                  return (
                    <tr
                      key={drain.drain_id}
                      style={{
                        borderBottom: "1px solid rgba(42, 67, 89, 0.4)",
                        backgroundColor: index === 0 ? "rgba(241, 107, 120, 0.06)" : "transparent",
                        color: "#F4F7FB",
                      }}
                    >
                      <td style={{ padding: "10px", fontWeight: 800, color: index === 0 ? "#F16B78" : index === 1 ? "#F5B84B" : "#B8C5D6" }}>
                        #{index + 1}
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#35D6C2" }}>
                        {drain.drain_id}
                      </td>
                      <td style={{ padding: "10px", color: "#B8C5D6" }}>{drain.area_name}</td>
                      <td style={{ padding: "10px", color: "#F4F7FB", fontWeight: 600 }}>
                        {drain.water_level_cm != null ? `${Number(drain.water_level_cm).toFixed(1)} cm` : "—"}
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700, color: isCrit ? "#F16B78" : isWarn ? "#F5B84B" : "#35D6C2" }}>
                        {drain.dhi_score ? Number(drain.dhi_score).toFixed(1) : "—"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: isCrit ? "rgba(241, 107, 120, 0.15)" : isWarn ? "rgba(245, 184, 75, 0.15)" : "rgba(53, 214, 194, 0.15)",
                            color: isCrit ? "#F16B78" : isWarn ? "#F5B84B" : "#35D6C2",
                            border: `1px solid ${isCrit ? "rgba(241, 107, 120, 0.3)" : isWarn ? "rgba(245, 184, 75, 0.3)" : "rgba(53, 214, 194, 0.3)"}`,
                            textTransform: "uppercase",
                          }}
                        >
                          {drain.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: drain.gas_risk === "Critical" ? "#F16B78" : drain.gas_risk === "High" ? "#F5B84B" : "#35D6C2",
                          }}
                        >
                          {drain.gas_risk || "Normal"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleChamberClick(drain.drain_id)}
                          style={{
                            background: "#102235",
                            border: "1px solid #2A4359",
                            borderRadius: "4px",
                            padding: "4px 10px",
                            color: "#35D6C2",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Inspect Asset →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}

// Subordinate Styles
const quickNavBtnStyle = {
  background: "#102235",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#B8C5D6",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 140ms ease",
};

const cardActionLinkStyle = {
  background: "none",
  border: "none",
  color: "#35D6C2",
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

const emptyBoxStyle = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#8FA5BA",
  fontSize: "0.85rem",
};

export default DashboardMain;
