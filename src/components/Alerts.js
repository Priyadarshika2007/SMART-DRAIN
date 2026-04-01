import React, { useEffect, useState } from "react";
import API_BASE from "../config/api.js";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!API_BASE) {
        console.error("REACT_APP_BACKEND_URL is undefined. Alerts API calls cannot run.");
        setError("Backend URL is not configured");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE}/api/alerts`);
        if (!response.ok) {
          throw new Error("Failed to fetch alerts");
        }

        const data = await response.json();
        setAlerts(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        setError(err.message || "Unable to load alerts");
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return (
    <section className="alerts-section">
      <div className="container">
        <div className="alerts-card">
          <div className="alerts-header">
            <h2>Recent Alerts</h2>
            <p>Drain health risk notifications from backend monitoring.</p>
          </div>

          {loading ? <p className="alerts-state">Loading...</p> : null}
          {error ? <p className="alerts-state alerts-error">{error}</p> : null}

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
                      <tr key={alert.alert_id}>
                        <td>{alert.drain_id}</td>
                        <td>{alert.alert_type}</td>
                        <td className={String(alert.severity).toLowerCase()}>
                          {alert.severity}
                        </td>
                        <td>{new Date(alert.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="alerts-state">No alerts available.</p>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default Alerts;