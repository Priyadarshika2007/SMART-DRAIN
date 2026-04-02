import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import API_BASE from "../config.js";

function Dashboard() {
  const [latestStatus, setLatestStatus] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [drains, setDrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      if (!API_BASE) {
        console.error("REACT_APP_BACKEND_URL is undefined. Dashboard API calls cannot run.");
        setError("Backend URL is not configured");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [latestResponse, alertsResponse, drainsResponse] = await Promise.all([
          fetch(`${API_BASE}/latest-status`),
          fetch(`${API_BASE}/alerts`),
          fetch(`${API_BASE}/drains`)
        ]);

        if (!latestResponse.ok || !alertsResponse.ok || !drainsResponse.ok) {
          throw new Error("Unable to fetch dashboard data");
        }

        const [latestJson, alertsJson, drainsJson] = await Promise.all([
          latestResponse.json(),
          alertsResponse.json(),
          drainsResponse.json()
        ]);

        if (!isMounted) {
          return;
        }

        setLatestStatus(Array.isArray(latestJson?.data) ? latestJson.data : []);
        setAlerts(Array.isArray(alertsJson?.data) ? alertsJson.data : []);
        setDrains(Array.isArray(drainsJson?.data) ? drainsJson.data : []);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const drainChartData = useMemo(
    () =>
      latestStatus
        .map((row) => ({
          drain_id: String(row.drain_id),
          label: row.area_name ? `${row.area_name} (${row.drain_id})` : `Drain ${row.drain_id}`,
          dhi_score: Number(row.dhi_score || 0),
          status: row.status || "Unknown",
          timestamp: row.timestamp || null
        }))
        .sort((a, b) => Number(a.drain_id) - Number(b.drain_id))
        .slice(0, 20),
    [latestStatus]
  );

  const pieData = useMemo(() => {
    const severityMap = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    alerts.forEach((row) => {
      const key = String(row.severity || "").toUpperCase();
      if (severityMap[key] !== undefined) {
        severityMap[key] += 1;
      }
    });

    return [
      { name: "HIGH", value: severityMap.HIGH, color: "#e53935" },
      { name: "MEDIUM", value: severityMap.MEDIUM, color: "#fb8c00" },
      { name: "LOW", value: severityMap.LOW, color: "#43a047" }
    ];
  }, [alerts]);

  const topRiskDrains = useMemo(
    () =>
      [...drainChartData]
        .sort((a, b) => b.dhi_score - a.dhi_score)
        .slice(0, 5)
        .map((row) => ({
          drain_id: row.label,
          avg_dhi: Number(row.dhi_score.toFixed(2))
        })),
    [drainChartData]
  );

  const drainSnapshot = useMemo(
    () =>
      drains.slice(0, 8).map((row) => {
        const latest = latestStatus.find(
          (statusRow) => String(statusRow.drain_id) === String(row.drain_id)
        );

        return {
          drain_id: row.drain_id,
          area_name: row.area_name,
          dhi_score: latest ? Number(latest.dhi_score || 0) : null,
          status: latest?.status || "Unknown",
          latest_timestamp: latest?.timestamp || row.latest_timestamp || null
        };
      }),
    [drains, latestStatus]
  );

  const kpi = useMemo(() => {
    const uniqueDrains = drains.length || new Set(latestStatus.map((row) => row.drain_id)).size;
    const totalAlerts = alerts.length;
    const highRiskAlerts = alerts.filter(
      (row) => String(row.severity || "").toUpperCase() === "HIGH"
    ).length;

    const avgDhi = latestStatus.length
      ? latestStatus.reduce((sum, row) => sum + Number(row.dhi_score || 0), 0) /
        latestStatus.length
      : 0;

    return {
      totalDrains: uniqueDrains,
      totalAlerts,
      highRiskAlerts,
      averageDhi: avgDhi
    };
  }, [drains, latestStatus, alerts]);

  if (loading) {
    return (
      <section className="stats-section">
        <div className="container">
          <div className="dashboard-state-card">Loading dashboard...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="stats-section">
        <div className="container">
          <div className="dashboard-state-card dashboard-state-error">{error}</div>
        </div>
      </section>
    );
  }

  if (!latestStatus.length && !alerts.length && !drains.length) {
    return (
      <section className="stats-section">
        <div className="container">
          <div className="dashboard-state-card">No dashboard data available.</div>
        </div>
      </section>
    );
  }

  const kpiCards = [
    {
      title: "Total Drains",
      value: kpi.totalDrains,
      description: "Unique monitored drain nodes"
    },
    {
      title: "Total Alerts",
      value: kpi.totalAlerts,
      description: "All alert records from backend"
    },
    {
      title: "High Risk Alerts",
      value: kpi.highRiskAlerts,
      description: "Alerts with HIGH severity"
    },
    {
      title: "Average DHI Score",
      value: kpi.averageDhi.toFixed(2),
      description: "Average Drain Health Index"
    }
  ];

  return (
    <section className="stats-section">
      <div className="container">
        <div className="stats-grid">
          {kpiCards.map((card) => (
            <article className="stat-card kpi-card" key={card.title}>
              <h3 className="kpi-label">{card.title}</h3>
              <p className="kpi-number">{card.value}</p>
              <p className="kpi-meta">{card.description}</p>
            </article>
          ))}
        </div>

        <div className="dashboard-charts-grid">
          <article className="dashboard-chart-card">
            <h3>Latest DHI by Drain</h3>
            <p className="chart-subtitle">Shows the latest Drain Health Index snapshot for each drain.</p>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drainChartData} barCategoryGap="28%">
                  <CartesianGrid stroke="#d8e5f4" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    label={{ value: "Drain", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis label={{ value: "DHI Score", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="dhi_score" fill="#0f7dd9" radius={[8, 8, 0, 0]} maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="dashboard-chart-card">
            <h3>Alert Severity Distribution</h3>
            <p className="chart-subtitle">Shows proportion of HIGH, MEDIUM, and LOW alerts.</p>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="dashboard-chart-card dashboard-chart-wide">
            <h3>Drain Snapshot</h3>
            <p className="chart-subtitle">Latest monitored drains with their current status.</p>
            <div className="chart-area">
              {drainSnapshot.length > 0 ? (
                <div className="alerts-table-wrap">
                  <table className="alerts-table">
                    <thead>
                      <tr>
                        <th>Drain</th>
                        <th>Area</th>
                        <th>DHI</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drainSnapshot.map((row) => (
                        <tr key={row.drain_id}>
                          <td>{row.drain_id}</td>
                          <td>{row.area_name || "Unknown"}</td>
                          <td>{row.dhi_score !== null ? row.dhi_score.toFixed(2) : "-"}</td>
                          <td>{row.status}</td>
                          <td>
                            {row.latest_timestamp
                              ? new Date(row.latest_timestamp).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="dashboard-state-card">No drain snapshot available.</p>
              )}
            </div>
          </article>

          <article className="dashboard-chart-card dashboard-chart-wide">
            <h3>Highest Risk Drains</h3>
            <p className="chart-subtitle">Identifies the drains with the highest latest DHI score.</p>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRiskDrains} barCategoryGap="28%">
                  <CartesianGrid stroke="#d8e5f4" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="drain_id"
                    label={{ value: "Drain", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis label={{ value: "Latest DHI Score", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="avg_dhi" fill="#1f68ad" radius={[8, 8, 0, 0]} maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
