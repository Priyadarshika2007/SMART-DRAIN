import React, { useEffect, useMemo, useState } from "react";
import { API } from "../config.js";

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

const toDisplayTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const getStatusStyle = (status) => {
  if (status === "CRITICAL") {
    return { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" };
  }

  if (status === "MODERATE") {
    return { background: "#fef9c3", color: "#a16207", border: "1px solid #fde68a" };
  }

  return { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
};

function AlertHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API}/alerts`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Unable to fetch alerts (${response.status})`);
        }

        const payload = await response.json();
        const alerts = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        if (!isMounted) return;
        setRows(alerts);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load alerts");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAlerts();

    return () => {
      isMounted = false;
    };
  }, []);

  const tableRows = useMemo(
    () => rows.map((row) => {
      const status = normalizeStatus(row?.status || row?.severity || row?.alert_type || "NORMAL");

      return {
        time: row?.created_at || row?.alert_time || row?.timestamp,
        drainId: row?.drain_id ?? "-",
        status,
        district: row?.district || row?.area_name || "-",
      };
    }),
    [rows]
  );

  return (
    <section className="gov-dashboard-page" style={{ padding: "16px" }}>
      <div className="gov-dashboard-shell">
        <header className="gov-topbar" style={{ marginBottom: "16px" }}>
          <div>
            <h2>Alert History</h2>
            <p>Latest drain alerts from the database.</p>
          </div>
        </header>

        {loading ? <p>Loading alerts...</p> : null}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

        {!loading && !error ? (
          <div style={{ overflowX: "auto" }}>
            <table className="gov-table" style={{ width: "100%", minWidth: "640px" }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Drain ID</th>
                  <th>Status</th>
                  <th>District</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#666" }}>
                      No alerts found
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, index) => (
                    <tr key={`${row.drainId}-${row.time}-${index}`}>
                      <td>{toDisplayTime(row.time)}</td>
                      <td>{row.drainId}</td>
                      <td>
                        <span
                          style={{
                            ...getStatusStyle(row.status),
                            borderRadius: "999px",
                            padding: "4px 10px",
                            fontWeight: 700,
                            fontSize: "12px",
                            display: "inline-block",
                            minWidth: "90px",
                            textAlign: "center",
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>{row.district}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default AlertHistory;