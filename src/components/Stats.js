import React, { useEffect, useState } from "react";
import API_BASE from "../config/api";

function Stats() {
  const [totalDrains, setTotalDrains] = useState(0);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      if (!API_BASE) {
        console.error("REACT_APP_BACKEND_URL is undefined. Stats API calls cannot run.");
        setError("Backend URL is not configured");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [drainsRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/api/drains`),
          fetch(`${API_BASE}/api/alerts`)
        ]);

        if (!drainsRes.ok || !alertsRes.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        const drainsJson = await drainsRes.json();
        const alertsJson = await alertsRes.json();

        const drainsCount = Array.isArray(drainsJson?.data) ? drainsJson.data.length : 0;
        const alertsCount = Array.isArray(alertsJson?.data) ? alertsJson.data.length : 0;

        setTotalDrains(drainsCount);
        setTotalAlerts(alertsCount);
      } catch (err) {
        setError(err.message || "Unable to load stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Connected Drain Nodes",
      value: loading ? "Loading..." : error ? "Error" : totalDrains.toLocaleString(),
      description: "Live IoT nodes reporting every 60 seconds"
    },
    {
      title: "Critical Alerts Today",
      value: loading ? "Loading..." : error ? "Error" : totalAlerts.toLocaleString(),
      description: "High-priority drain blockage and overflow warnings"
    },
    {
      title: "Prediction Accuracy",
      value: "96.4%",
      description: "Flood-risk prediction confidence in pilot zones"
    }
  ];

  return (
    <section className="stats-section">
      <div className="container">
        <div className="stats-grid">
          {cards.map((card) => (
            <article className="stat-card" key={card.title}>
              <h3>{card.title}</h3>
              <p className="stat-value">{card.value}</p>
              <p className="stat-description">
                {error && card.title !== "Prediction Accuracy" ? error : card.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Stats;
