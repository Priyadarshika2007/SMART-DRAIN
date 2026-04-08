import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getAreaStats, getTopWorstDrains, getTrendIndicator, reduceChartData } from "../utils/dashboardUtils.js";

function AdvancedAnalytics({ filteredData, allData }) {
  const areaStats = useMemo(() => getAreaStats(filteredData || []), [filteredData]);
  const topWorstDrains = useMemo(() => getTopWorstDrains(filteredData || [], 5), [filteredData]);
  
  // Prepare top worst drains chart data
  const worstDrainsData = useMemo(() => {
    return topWorstDrains.map((drain) => ({
      name: `Drain ${drain.drain_id}`,
      dhi: Number(drain.dhi_score),
      area: drain.area_name,
      status: drain.status,
    }));
  }, [topWorstDrains]);

  // Prepare area comparison data
  const areaComparisonData = useMemo(() => {
    return areaStats.map((stat) => ({
      area: stat.area,
      critical: stat.critical,
      moderate: stat.moderate,
      normal: stat.normal,
    }));
  }, [areaStats]);

  return (
    <section style={{ marginTop: "20px" }}>
      <h2 style={{ marginBottom: "20px", color: "#111827", fontSize: "20px", fontWeight: "600" }}>
        Advanced Analytics
      </h2>

      <section className="gov-charts-grid">
        {/* Top 5 Worst Drains */}
        <article className="gov-panel">
          <h3>⚠️ Top 5 Worst Drains (Highest DHI)</h3>
          <div className="gov-chart-body">
            {worstDrainsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={worstDrainsData}
                  layout="vertical"
                  margin={{ top: 8, right: 20, left: 80, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" width={70} type="category" />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", backgroundColor: "#ffffff", border: "1px solid #ddd" }}
                    formatter={(value) => [`${value.toFixed(2)}`, "DHI Score"]}
                  />
                  <Bar dataKey="dhi" fill="#b42318" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                No data available
              </div>
            )}
          </div>
        </article>

        {/* Area-wise Comparison */}
        <article className="gov-panel">
          <h3>📊 Area-wise Status Distribution</h3>
          <div className="gov-chart-body">
            {areaComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={areaComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="area" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="critical" stackId="status" fill="#b42318" name="Critical" />
                  <Bar dataKey="moderate" stackId="status" fill="#c2410c" name="Moderate" />
                  <Bar dataKey="normal" stackId="status" fill="#15803d" name="Normal" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "280px", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                No data available
              </div>
            )}
          </div>
        </article>
      </section>

      {/* Area Risk Summary Table */}
      <article className="gov-panel" style={{ marginTop: "20px" }}>
        <h3>🗺️ Area Risk Summary</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="alerts-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Area</th>
                <th>Total Drains</th>
                <th>Critical</th>
                <th>Moderate</th>
                <th>Normal</th>
                <th>Avg DHI</th>
                <th>Risk %</th>
              </tr>
            </thead>
            <tbody>
              {areaStats.map((stat) => (
                <tr key={stat.area}>
                  <td style={{ fontWeight: "600" }}>{stat.area}</td>
                  <td>{stat.total}</td>
                  <td style={{ color: "#b42318", fontWeight: "600" }}>{stat.critical}</td>
                  <td style={{ color: "#c2410c", fontWeight: "600" }}>{stat.moderate}</td>
                  <td style={{ color: "#15803d", fontWeight: "600" }}>{stat.normal}</td>
                  <td>{stat.avgDhi}</td>
                  <td style={{ fontWeight: "600", color: stat.riskPercentage > 50 ? "#b42318" : "#15803d" }}>
                    {stat.riskPercentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export default AdvancedAnalytics;
