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
  <div className="loading-container" style={{ padding: "40px", textAlign: "center" }}>
    <div className="spinner"></div>
    <p>Loading alerts...</p>
  </div>
);

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    let isMounted = true;
    let refreshInterval;

    const fetchAlerts = async () => {
      if (!API) {
        if (isMounted) {
          setError("Backend URL is not configured");
          setLoading(false);
        }
        return;
      }

      try {
        setError("");

        const response = await fetch(`${API}/alerts`).catch(() => null);
        if (!response?.ok) {
          throw new Error("Server not reachable");
        }

        const data = await response.json();
        console.log("Alerts API:", API);
        console.log("Alerts data:", data);

        if (!isMounted) return;

        setAlerts(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
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
    fetchAlerts();

    // Set up auto-refresh interval (5 seconds)
    refreshInterval = setInterval(fetchAlerts, 5000);

    return () => {
      isMounted = false;
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  // Determine severity badge color
  const getSeverityColor = (severity) => {
    const level = String(severity || "").toUpperCase();
    if (level === "HIGH") return "#ef4444";
    if (level === "MEDIUM") return "#f97316";
    return "#22c55e";
  };

  const getSeverityLabel = (severity) => {
    const level = String(severity || "").toUpperCase();
    if (level === "HIGH") return "🔴 HIGH";
    if (level === "MEDIUM") return "🟠 MEDIUM";
    return "🟢 LOW";
  };

  return (
    <section className="alerts-section">
      <div className="container">
        <div className="alerts-card">
          <div className="alerts-header">
            <h2>🔔 Recent Alerts</h2>
            <p>Drain health risk notifications from backend monitoring.</p>
            {lastUpdated && (
              <p className="last-updated-time">
                🔄 Last updated: <strong>{lastUpdated}</strong>
              </p>
            )}
          </div>

          {loading ? <LoadingSpinner /> : null}
          {error ? (
            <p className="alerts-state alerts-error">
              ⚠️ {error}
            </p>
          ) : null}

          {!loading && !error ? (
            alerts.length > 0 ? (
              <div className="alerts-table-wrap">
                <table className="alerts-table">
                  <thead>
                    <tr>
                      <th>Drain ID</th>
                      <th>Alert Type</th>
                      <th>Severity</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 100).map((alert) => (
                      <tr key={alert.alert_id} className="alert-row">
                        <td>
                          <strong>#{alert.drain_id}</strong>
                        </td>
                        <td>{alert.alert_type}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              backgroundColor: getSeverityColor(alert.severity),
                              color: "#fff",
                              padding: "4px 12px",
                              borderRadius: "20px",
                              fontWeight: "bold",
                              fontSize: "0.85rem"
                            }}
                          >
                            {getSeverityLabel(alert.severity)}
                          </span>
                        </td>
                        <td className="timestamp-cell">
                          {new Date(alert.alert_time || alert.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="alerts-state">✅ No alerts available. System operating normally!</p>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default Alerts;
