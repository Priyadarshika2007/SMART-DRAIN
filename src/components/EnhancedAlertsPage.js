import React, { useEffect, useMemo, useState } from "react";
import { API } from "../config.js";

function EnhancedAlertsPage({ user, onNavigateToChamber, onNavigateToGasSafety }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters
  const [activeCategory, setActiveCategory] = useState("all"); // 'all', 'gas', 'water', 'hardware'
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Incident Detail & Workflow Drawer
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [updatingAlert, setUpdatingAlert] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState("");
  const [workflowNotes, setWorkflowNotes] = useState("");
  const [workflowAssignee, setWorkflowAssignee] = useState("");

  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  // Fetch real alerts from backend
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/json",
      };

      const res = await fetch(`${API}/alerts`, { headers });
      if (!res.ok) throw new Error("Failed to load alerts from backend");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Update alert status (Acknowledge, Investigate, Resolve)
  const handleUpdateStatus = async (alertId, newStatus) => {
    try {
      setUpdatingAlert(true);
      const token = localStorage.getItem("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const res = await fetch(`${API}/alerts/${alertId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: newStatus,
          resolution_notes: workflowNotes || `Status updated to ${newStatus}`,
          assigned_to: workflowAssignee || currentUser?.username || "Staff",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update alert");

      setActionSuccess(`✓ Alert ${alertId} updated to ${newStatus}`);
      if (selectedAlert) {
        setSelectedAlert({
          ...selectedAlert,
          status: newStatus,
          alert_status: newStatus,
          resolution_notes: workflowNotes,
        });
      }

      await fetchAlerts();
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingAlert(false);
    }
  };

  // Unique areas
  const areas = useMemo(() => {
    const list = [...new Set(alerts.map((a) => a.area_name).filter(Boolean))];
    return list.sort();
  }, [alerts]);

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // Category filter
      if (activeCategory === "gas") {
        const isGas = a.alert_type === "ABNORMAL_SENSOR_RESPONSE" || /gas|h2s|methane|mq-?7/i.test(a.message || a.alert_message || "");
        if (!isGas) return false;
      } else if (activeCategory === "water") {
        const isWater = a.alert_type === "HIGH_WATER_LEVEL" || /water|overflow|flood/i.test(a.message || a.alert_message || "");
        if (!isWater) return false;
      } else if (activeCategory === "hardware") {
        const isHw = /sensor|device|comm|hardware|offline|stale/i.test(a.alert_type || a.message || "");
        if (!isHw) return false;
      }

      // Severity filter
      if (selectedSeverity !== "all") {
        if (String(a.severity).toLowerCase() !== selectedSeverity.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        const s = String(a.status || a.alert_status || "Open").toLowerCase();
        if (s !== selectedStatus.toLowerCase()) return false;
      }

      // Area filter
      if (selectedArea !== "all") {
        if (String(a.area_name).toLowerCase() !== selectedArea.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchId = String(a.drain_id || a.id || "").toLowerCase().includes(q);
        const matchMsg = String(a.message || a.alert_message || "").toLowerCase().includes(q);
        const matchArea = String(a.area_name || "").toLowerCase().includes(q);
        if (!matchId && !matchMsg && !matchArea) return false;
      }

      return true;
    });
  }, [alerts, activeCategory, selectedSeverity, selectedStatus, selectedArea, searchQuery]);

  // Summary counts
  const summary = useMemo(() => {
    const critical = alerts.filter((a) => String(a.severity).toLowerCase() === "critical").length;
    const high = alerts.filter((a) => String(a.severity).toLowerCase() === "high").length;
    const gasCount = alerts.filter((a) => a.alert_type === "ABNORMAL_SENSOR_RESPONSE" || /gas|h2s|methane/i.test(a.message || "")).length;
    const openCount = alerts.filter((a) => String(a.status || "Open").toLowerCase() === "open").length;
    return { total: alerts.length, critical, high, gasCount, openCount };
  }, [alerts]);

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* Toast Feedback */}
      {actionSuccess && (
        <div style={{ background: "rgba(53, 214, 194, 0.15)", border: "1px solid #35D6C2", color: "#35D6C2", padding: "10px 16px", borderRadius: "8px", fontSize: "0.85rem" }}>
          {actionSuccess}
        </div>
      )}
      {error && (
        <div style={{ background: "rgba(241, 107, 120, 0.15)", border: "1px solid #F16B78", color: "#F16B78", padding: "10px 16px", borderRadius: "8px", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* TOP SEVERITY SUMMARY STRIP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "0.74rem", color: "#8FA5BA", fontWeight: 700, textTransform: "uppercase" }}>Total Logged Incidents</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F4F7FB", margin: "4px 0" }}>{summary.total}</div>
          <div style={{ fontSize: "0.75rem", color: "#7AA7FF" }}>Active Telemetry Logs</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F16B78" }}>
          <div style={{ fontSize: "0.74rem", color: "#F16B78", fontWeight: 700, textTransform: "uppercase" }}>Critical Severity</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F16B78", margin: "4px 0" }}>{summary.critical}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Immediate Field Response Required</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F28C45" }}>
          <div style={{ fontSize: "0.74rem", color: "#F28C45", fontWeight: 700, textTransform: "uppercase" }}>High Priority</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F28C45", margin: "4px 0" }}>{summary.high}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Inspection Queue Active</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F5B84B" }}>
          <div style={{ fontSize: "0.74rem", color: "#F5B84B", fontWeight: 700, textTransform: "uppercase" }}>Gas & Worker Hazards</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F5B84B", margin: "4px 0" }}>{summary.gasCount}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Atmospheric Safety Priority</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #35D6C2" }}>
          <div style={{ fontSize: "0.74rem", color: "#35D6C2", fontWeight: 700, textTransform: "uppercase" }}>Open Status</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#35D6C2", margin: "4px 0" }}>{summary.openCount}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Awaiting Resolution</div>
        </div>
      </div>

      {/* CATEGORY SELECTOR TABS */}
      <div
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            style={categoryTabStyle(activeCategory === "all")}
          >
            All Incidents ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("gas")}
            style={categoryTabStyle(activeCategory === "gas", "#F16B78")}
          >
            🛡️ Gas Safety & Atmospheric Hazards ({summary.gasCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("water")}
            style={categoryTabStyle(activeCategory === "water", "#7AA7FF")}
          >
            🌊 Water & Hydraulic Flooding
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("hardware")}
            style={categoryTabStyle(activeCategory === "hardware", "#F5B84B")}
          >
            ⚙️ Hardware & Sensor Faults
          </button>
        </div>

        <span style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>
          * Hardware faults do not silence separate gas hazards
        </span>
      </div>

      {/* MAIN INCIDENT QUEUE TABLE CARD */}
      <article
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
        }}
      >
        {/* Filters Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search chamber, message, device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle}
            />

            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <span style={{ fontSize: "0.78rem", color: "#8FA5BA" }}>
            Showing {filteredAlerts.length} matching incident records
          </span>
        </div>

        {/* Incidents Table */}
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#B8C5D6" }}>
            Loading incidents from MongoDB...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#8FA5BA" }}>
            No incidents found matching current filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "#F4F7FB" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2A4359", color: "#8FA5BA", textAlign: "left", fontSize: "0.74rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px" }}>Severity</th>
                  <th style={{ padding: "10px" }}>Chamber</th>
                  <th style={{ padding: "10px" }}>Catchment Area</th>
                  <th style={{ padding: "10px" }}>Category</th>
                  <th style={{ padding: "10px" }}>Incident Diagnostic Message</th>
                  <th style={{ padding: "10px" }}>Recommended Action</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Detected At</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const isCrit = String(alert.severity).toLowerCase() === "critical";
                  const isHigh = String(alert.severity).toLowerCase() === "high";
                  const sevColor = isCrit ? "#F16B78" : isHigh ? "#F28C45" : "#F5B84B";
                  const statusLabel = alert.status || alert.alert_status || "Open";

                  return (
                    <tr
                      key={alert._id || alert.alert_id}
                      style={{
                        borderBottom: "1px solid rgba(42, 67, 89, 0.4)",
                        backgroundColor: isCrit ? "rgba(241, 107, 120, 0.05)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: `${sevColor}20`,
                            color: sevColor,
                            border: `1px solid ${sevColor}40`,
                          }}
                        >
                          {alert.severity || "Warning"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#35D6C2" }}>
                        {alert.drain_id}
                      </td>
                      <td style={{ padding: "10px", color: "#B8C5D6" }}>
                        {alert.area_name}
                      </td>
                      <td style={{ padding: "10px", fontSize: "0.75rem", color: "#7AA7FF" }}>
                        {alert.category || alert.alert_type}
                      </td>
                      <td style={{ padding: "10px", maxWidth: "260px", fontSize: "0.8rem", color: "#F4F7FB" }}>
                        {alert.message || alert.alert_message}
                      </td>
                      <td style={{ padding: "10px", maxWidth: "240px", fontSize: "0.75rem", color: "#8FA5BA" }}>
                        {alert.recommended_action || "Investigate telemetry"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            background: statusLabel === "Resolved" ? "rgba(53, 214, 194, 0.15)" : "rgba(245, 184, 75, 0.15)",
                            color: statusLabel === "Resolved" ? "#35D6C2" : "#F5B84B",
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "10px", fontSize: "0.75rem", color: "#8FA5BA" }}>
                        {formatTimestamp(alert.detected_at || alert.created_at)}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setWorkflowStatus(alert.status || alert.alert_status || "Open");
                            setWorkflowNotes(alert.resolution_notes || "");
                            setWorkflowAssignee(alert.assigned_to || currentUser?.username || "");
                          }}
                          style={{
                            background: "#1A3045",
                            border: "1px solid #2A4359",
                            color: "#35D6C2",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Respond →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* INCIDENT DETAIL & DISPATCH DRAWER */}
      {selectedAlert && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(11, 18, 32, 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setSelectedAlert(null)}
        >
          <div
            style={{
              backgroundColor: "#14283B",
              border: "1px solid #2A4359",
              borderRadius: "12px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #2A4359", paddingBottom: "10px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", color: "#F4F7FB", fontSize: "1.2rem" }}>
                  Incident Response: {selectedAlert.alert_id || selectedAlert.id}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#35D6C2" }}>
                  Chamber {selectedAlert.drain_id} • Area: {selectedAlert.area_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                style={{ background: "none", border: "none", color: "#8FA5BA", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#1A3045", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#8FA5BA", textTransform: "uppercase", fontWeight: 700 }}>
                  Diagnostic Evidence & Sensor Warning
                </div>
                <div style={{ fontSize: "0.95rem", color: "#F4F7FB", margin: "4px 0", fontWeight: 600 }}>
                  {selectedAlert.message || selectedAlert.alert_message}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#7AA7FF" }}>
                  Alert Type: {selectedAlert.alert_type} • Device: {selectedAlert.device_id || "Chamber Node"}
                </div>
              </div>

              <div style={{ background: "rgba(241, 107, 120, 0.1)", border: "1px solid rgba(241, 107, 120, 0.3)", padding: "12px", borderRadius: "8px" }}>
                <span style={{ color: "#F16B78", fontSize: "0.78rem", fontWeight: 700, display: "block" }}>
                  Mandatory Action Directive:
                </span>
                <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#F4F7FB", lineHeight: 1.4 }}>
                  {selectedAlert.recommended_action || "Keep personnel clear; deploy calibrated multigas meter prior to entry."}
                </p>
              </div>

              {/* Status Update Form */}
              <div style={{ background: "#1A3045", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.78rem", color: "#8FA5BA", textTransform: "uppercase", fontWeight: 700, marginBottom: "8px" }}>
                  Update Incident Status (Persists to MongoDB)
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {["Acknowledged", "Investigating", "Resolved"].map((statusOption) => (
                    <button
                      key={statusOption}
                      type="button"
                      disabled={updatingAlert}
                      onClick={() => handleUpdateStatus(selectedAlert.alert_id || selectedAlert.id, statusOption)}
                      style={{
                        background: selectedAlert.status === statusOption ? "#35D6C2" : "#14283B",
                        color: selectedAlert.status === statusOption ? "#0B1220" : "#F4F7FB",
                        border: "1px solid #2A4359",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Mark as {statusOption}
                    </button>
                  ))}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#8FA5BA", marginBottom: "4px" }}>Assignee</label>
                  <input
                    type="text"
                    value={workflowAssignee}
                    onChange={(e) => setWorkflowAssignee(e.target.value)}
                    style={{ ...inputStyle, width: "100%", marginBottom: "8px" }}
                  />
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#8FA5BA", marginBottom: "4px" }}>Field Response Notes</label>
                  <textarea
                    rows={2}
                    value={workflowNotes}
                    onChange={(e) => setWorkflowNotes(e.target.value)}
                    placeholder="Log technician verification or dispatch notes..."
                    style={{ ...inputStyle, width: "100%", resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  {onNavigateToChamber && selectedAlert?.drain_id && (
                    <button
                      type="button"
                      onClick={() => onNavigateToChamber(selectedAlert.drain_id)}
                      style={{
                        background: "#102235",
                        border: "1px solid #35D6C2",
                        color: "#35D6C2",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Inspect Chamber {selectedAlert.drain_id} →
                    </button>
                  )}
                  {onNavigateToGasSafety && (
                    <button
                      type="button"
                      onClick={() => onNavigateToGasSafety()}
                      style={{
                        background: "#102235",
                        border: "1px solid #F5B84B",
                        color: "#F5B84B",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Gas Protocols →
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  style={{
                    background: "#1A3045",
                    border: "1px solid #2A4359",
                    color: "#F4F7FB",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const kpiCardStyle = {
  background: "#14283B",
  border: "1px solid #2A4359",
  borderRadius: "10px",
  padding: "1rem 1.25rem",
};

const categoryTabStyle = (active, color = "#35D6C2") => ({
  background: active ? `${color}20` : "#1A3045",
  border: `1px solid ${active ? color : "#2A4359"}`,
  color: active ? color : "#B8C5D6",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 150ms ease",
});

const inputStyle = {
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = {
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
};

export default EnhancedAlertsPage;
