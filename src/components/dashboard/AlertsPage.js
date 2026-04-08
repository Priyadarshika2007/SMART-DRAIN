import React from "react";

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AlertsPage({ alerts }) {
  return (
    <section className="gov-panel">
      <h3>Alert History</h3>
      <p style={{ marginTop: "8px", color: "#475467", fontSize: "13px" }}>
        Priority order: Critical alerts first (immediate field response), then Moderate alerts
        (close monitoring and scheduled inspection).
      </p>
      {alerts.length === 0 ? (
        <p style={{ padding: "24px", color: "#667085" }}>No active alerts in the selected area.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="alerts-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Drain ID</th>
                <th>Message</th>
                <th>Time</th>
                <th>Severity</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className={
                    alert.severity === "Critical" ? "gov-alert-row-critical" : "gov-alert-row-moderate"
                  }
                >
                  <td>{alert.drain_id}</td>
                  <td>{alert.message}</td>
                  <td>{formatTimestamp(alert.timestamp)}</td>
                  <td>
                    <span
                      className={`gov-alert-pill ${String(alert.severity || "").toLowerCase()} ${
                        String(alert.severity || "").toUpperCase() === "CRITICAL" ? "alert-critical" : ""
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td>{alert.severity === "Critical" ? "P1 - Immediate" : "P2 - Monitor"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AlertsPage;
