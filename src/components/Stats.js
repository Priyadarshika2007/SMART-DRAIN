import React, { useEffect, useState } from "react";
import { API } from "../config.js";

// Format time to HH:MM:SS AM/PM
const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div style={{ padding: "20px", textAlign: "center" }}>
    <div className="spinner"></div>
  </div>
);

function Stats() {
  const [totalDrains, setTotalDrains] = useState(0);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    let isMounted = true;
    let refreshInterval;

    const fetchStats = async () => {
      if (!API) {
        if (isMounted) {
          setError("Backend URL is not configured");
          setLoading(false);
        }
        return;
      }

      try {
        setError("");

        const [drainsRes, alertsRes] = await Promise.all([
          fetch(`${API}/drains`).catch(() => null),
          fetch(`${API}/alerts`).catch(() => null)
        ]);

        if (!drainsRes?.ok || !alertsRes?.ok) {
          throw new Error("Server not reachable");
        }

        const drainsJson = await drainsRes.json();
        const alertsJson = await alertsRes.json();
        console.log("Stats API:", API);
        console.log("Stats drains data:", drainsJson);
        console.log("Stats alerts data:", alertsJson);

        if (!isMounted) return;

        const drainsRows = Array.isArray(drainsJson)
          ? drainsJson
          : Array.isArray(drainsJson?.data)
          ? drainsJson.data
          : [];
        const alertsRows = Array.isArray(alertsJson)
          ? alertsJson
          : Array.isArray(alertsJson?.data)
          ? alertsJson.data
          : [];

        setTotalDrains(drainsRows.length);
        setTotalAlerts(alertsRows.length);
        setLastUpdated(formatTime());
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          setError("Server not reachable");
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchStats();

    // Set up auto-refresh interval (5 seconds)
    refreshInterval = setInterval(fetchStats, 5000);

    return () => {
      isMounted = false;
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const cards = [
    {
      title: "📍 Connected Drain Nodes",
      value: loading ? "..." : error ? "Error" : totalDrains.toLocaleString(),
      description: "Live IoT nodes reporting every 60 seconds",
      color: "#0f7dd9"
    },
    {
      title: "🚨 Critical Alerts Today",
      value: loading ? "..." : error ? "Error" : totalAlerts.toLocaleString(),
      description: "High-priority drain blockage and overflow warnings",
      color: totalAlerts > 0 ? "#ef4444" : "#22c55e"
    },
    {
      title: "📊 Prediction Accuracy",
      value: "96.4%",
      description: "Flood-risk prediction confidence in pilot zones",
      color: "#22c55e"
    }
  ];

  return (
    <section className="stats-section">
      <div className="container">
        {lastUpdated && !loading && !error && (
          <div className="last-updated-bar">
            🔄 Last updated: <strong>{lastUpdated}</strong>
          </div>
        )}

        <div className="stats-grid">
          {cards.map((card) => (
            <article
              className="stat-card"
              key={card.title}
              style={{ borderLeft: `4px solid ${card.color}` }}
            >
              <h3 style={{ margin: 0, color: card.color, fontSize: "1rem" }}>{card.title}</h3>
              <p className="stat-value" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="stat-description">{card.description}</p>
              {loading && <LoadingSpinner />}
              {error && card.title.includes("Connected") && (
                <p style={{ color: "#b3261e", fontSize: "0.85rem", margin: 0 }}>{error}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Stats;
