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
import { getTrendIndicator, getTopWorstDrains } from "../../utils/dashboardUtils.js";

function DashboardMain({ officerArea, kpis, statusDistribution, dhiBarData, filteredData, formatWaterLevel }) {
  // Get top 5 worst drains for display
  const topWorstDrains = useMemo(() => {
    return getTopWorstDrains(filteredData || [], 5);
  }, [filteredData]);

  // Keep chart data bounded to avoid clutter and heavy rendering.
  const optimizedBarData = useMemo(() => {
    if (!Array.isArray(dhiBarData)) return [];
    return dhiBarData.slice(0, 15);
  }, [dhiBarData]);

  // Match the original dashboard card style with trend indicators.
  const trends = useMemo(() => {
    const criticalTrend = getTrendIndicator(kpis.criticalAlerts, Math.max(1, kpis.criticalAlerts - 2));
    const moderateTrend = getTrendIndicator(kpis.moderate, Math.max(1, kpis.moderate - 1));
    const dhiTrend = getTrendIndicator(kpis.averageDhi || 0, Math.max(1, (kpis.averageDhi || 0) - 5));

    return { criticalTrend, moderateTrend, dhiTrend };
  }, [kpis]);

  const toStatusClass = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "critical") return "critical";
    if (normalized === "moderate") return "moderate";
    return "normal";
  };

  const formatLevelCm = (value) => {
    const level = Number(value);
    if (!Number.isFinite(level)) return "-";
    return `${level} cm`;
  };

  return (
    <>
      {/* Main KPI Section (screenshot style) */}
      <section className="gov-kpi-grid">
        <KPICard
          icon="🧱"
          title="Total Drains"
          value={kpis.totalDrains.toString()}
          description="Monitored in assigned area"
          status="normal"
        />

        <KPICard
          icon="🚨"
          title="Critical Alerts"
          value={kpis.criticalAlerts.toString()}
          description="Immediate action required"
          status={kpis.criticalAlerts > 0 ? "critical" : "moderate"}
          trend={trends.criticalTrend}
        />

        <KPICard
          icon="⚠️"
          title="Moderate Status"
          value={kpis.moderate.toString()}
          description="Scheduled field inspection needed"
          status={kpis.moderate > 0 ? "moderate" : "normal"}
          trend={trends.moderateTrend}
        />

        <KPICard
          icon="✅"
          title="Normal Status"
          value={kpis.normal.toString()}
          description="Operating within safe threshold"
          status="normal"
        />

        <KPICard
          icon="📊"
          title="Average DHI Score"
          value={kpis.averageDhi === null ? "N/A" : kpis.averageDhi.toFixed(2)}
          description="Mean across monitored drains"
          status={kpis.averageDhi > 60 ? "critical" : kpis.averageDhi > 40 ? "moderate" : "normal"}
          trend={kpis.averageDhi ? trends.dhiTrend : null}
        />
      </section>
      {/* Charts Grid */}
      <section className="gov-charts-grid">
        {/* Status Distribution - Donut Chart */}
        <article className="gov-panel">
          <h3>📊 Status Distribution</h3>
          <div className="gov-chart-body">
            {statusDistribution.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: "280px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                No data available
              </div>
            )}
          </div>
        </article>

        {/* Optimized DHI Score by Drain */}
        <article className="gov-panel">
          <h3>📈 DHI Score by Drain (Top 15)</h3>
          <div className="gov-chart-body">
            {optimizedBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={optimizedBarData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="drainLabel" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={60} stroke="#b42318" strokeDasharray="4 4" label="Critical (60)" />
                  <ReferenceLine y={40} stroke="#c2410c" strokeDasharray="4 4" label="Moderate (40)" />
                  <Bar
                    dataKey="dhiScore"
                    name="DHI Score"
                    fill="#1d4ed8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: "280px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                No data available
              </div>
            )}
          </div>
        </article>
      </section>

      {/* Top 5 Worst Drains Section */}
      {topWorstDrains.length > 0 && (
        <article className="gov-panel" style={{ marginTop: "20px" }}>
          <h3>⚠️ Top 5 Highest Risk Drains</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="alerts-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Drain ID</th>
                  <th>Area</th>
                  <th>DHI Score</th>
                  <th>Water Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topWorstDrains.map((drain, index) => (
                  <tr key={drain.drain_id} style={{ backgroundColor: index === 0 ? "#fee2e2" : "transparent" }}>
                    <td style={{ fontWeight: "600", color: "#b42318" }}>#{index + 1}</td>
                    <td>{drain.drain_id}</td>
                    <td>{drain.area_name}</td>
                    <td style={{ fontWeight: "600", color: "#b42318" }}>
                      {drain.dhi_score ? drain.dhi_score.toFixed(2) : "N/A"}
                    </td>
                    <td>{formatLevelCm(drain.dhi_score)}</td>
                    <td>
                      <span
                        className={`gov-status-badge ${String(drain.status || "").toLowerCase()}`}
                        style={{
                          backgroundColor: drain.status === "Critical" ? "#fee2e2" : "#fef3f2",
                          color: drain.status === "Critical" ? "#b42318" : "#c2410c",
                        }}
                      >
                        {drain.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Full Area Drain Status Table */}
      <section className="gov-panel" style={{ marginTop: "20px" }}>
        <h3>🗺️ Area Drain Status ({officerArea})</h3>
        {filteredData.length === 0 ? (
          <p style={{ padding: "24px", color: "#667085" }}>No Data Available</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="alerts-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Drain ID</th>
                  <th>Area</th>
                  <th>Water Level</th>
                  <th>DHI Score</th>
                  <th>Status</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const dhi = parseFloat(item?.dhi_score);
                  const riskLevel = dhi > 60 ? "🔴 Critical" : dhi > 40 ? "🟡 Moderate" : "🟢 Low";

                  return (
                    <tr key={String(item?.drain_id)} className={`row-${toStatusClass(item?.status)}`}>
                      <td style={{ fontWeight: "600" }}>{item?.drain_id ?? "-"}</td>
                      <td>{item?.area_name ?? "-"}</td>
                      <td>{formatLevelCm(item?.dhi_score)}</td>
                      <td style={{ fontWeight: "600" }}>{item?.dhi_score ?? "-"}</td>
                      <td>
                        <span className={`status ${toStatusClass(item?.status)}`}>
                          {item?.status ?? "-"}
                        </span>
                      </td>
                      <td>{riskLevel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default DashboardMain;
