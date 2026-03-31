import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function Dashboard() {
  const [sensorData, setSensorData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [sensorResponse, alertsResponse] = await Promise.all([
          fetch("/sensor-data"),
          fetch("/alerts")
        ]);

        if (!sensorResponse.ok || !alertsResponse.ok) {
          throw new Error("Unable to fetch dashboard data");
        }

        const sensorJson = await sensorResponse.json();
        const alertsJson = await alertsResponse.json();

        setSensorData(Array.isArray(sensorJson?.data) ? sensorJson.data : []);
        setAlerts(Array.isArray(alertsJson?.data) ? alertsJson.data : []);
      } catch (err) {
        setError(err.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const kpi = useMemo(() => {
    const uniqueDrains = new Set(sensorData.map((row) => row.drain_id)).size;
    const totalAlerts = alerts.length;
    const highRiskAlerts = alerts.filter(
      (row) => String(row.severity || "").toUpperCase() === "HIGH"
    ).length;

    const avgDhi = sensorData.length
      ? sensorData.reduce((sum, row) => sum + Number(row.dhi_score || 0), 0) /
        sensorData.length
      : 0;

    return {
      totalDrains: uniqueDrains,
      totalAlerts,
      highRiskAlerts,
      averageDhi: avgDhi
    };
  }, [sensorData, alerts]);

  const lineData = useMemo(
    () =>
      sensorData
        .slice(0, 20)
        .reverse()
        .map((row) => ({
          timestamp: row.timestamp,
          timeLabel: new Date(row.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),
          dhi_score: Number(row.dhi_score || 0)
        })),
    [sensorData]
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

  const topRiskDrains = useMemo(() => {
    const grouped = sensorData.reduce((acc, row) => {
      const id = row.drain_id;
      if (!acc[id]) {
        acc[id] = { drain_id: id, sum: 0, count: 0 };
      }

      acc[id].sum += Number(row.dhi_score || 0);
      acc[id].count += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((item) => ({
        drain_id: String(item.drain_id),
        avg_dhi: Number((item.sum / item.count).toFixed(2))
      }))
      .sort((a, b) => b.avg_dhi - a.avg_dhi)
      .slice(0, 5);
  }, [sensorData]);

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

  if (!sensorData.length && !alerts.length) {
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
            <h3>DHI Trend Over Time</h3>
            <p className="chart-subtitle">Tracks how Drain Health Index changes across recent readings.</p>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="dhiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c6ff" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00c6ff" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#d8e5f4" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="timeLabel"
                    label={{ value: "Time", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    label={{ value: "DHI Score", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="dhi_score"
                    stroke="none"
                    fill="url(#dhiGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="dhi_score"
                    stroke="#0f7dd9"
                    strokeWidth={3}
                    dot={false}
                    activeDot={false}
                  />
                </AreaChart>
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
            <h3>Top Risk Drains (Based on Average DHI Score)</h3>
            <p className="chart-subtitle">Identifies highest-risk drains by average DHI score.</p>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRiskDrains} barCategoryGap="28%">
                  <CartesianGrid stroke="#d8e5f4" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="drain_id"
                    label={{ value: "Drain ID", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    label={{ value: "Average DHI Score", angle: -90, position: "insideLeft" }}
                  />
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
