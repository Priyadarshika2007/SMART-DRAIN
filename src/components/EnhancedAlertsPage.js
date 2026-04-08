import React, { useMemo, useState } from "react";
import { formatTime, formatDate } from "../utils/dashboardUtils.js";

function normalizeAlertStatus(rawStatus, dhiScore) {
  const normalized = String(rawStatus || "").trim().toLowerCase();

  if (normalized === "critical" || normalized === "high") return "Critical";
  if (normalized === "moderate" || normalized === "warning" || normalized === "medium") return "Moderate";
  if (normalized === "normal" || normalized === "good" || normalized === "low") return "Normal";

  if (dhiScore > 60) return "Critical";
  if (dhiScore > 40) return "Moderate";
  return "Normal";
}

function EnhancedAlertsPage({ apiData }) {
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [dateRange, setDateRange] = useState("7d"); // "24h", "7d", "30d", "all"
  const [resolvedFilter, setResolvedFilter] = useState(false);

  // Extract unique areas
  const areas = useMemo(() => {
    if (!apiData) return [];
    const uniqueAreas = [...new Set(apiData.map((item) => item.area_name))];
    return ["ALL", ...uniqueAreas.sort()];
  }, [apiData]);

  // Filter alerts based on criteria
  const filteredAlerts = useMemo(() => {
    if (!apiData || apiData.length === 0) return [];

    let alerts = apiData
      .filter((item) => {
        const dhi = parseFloat(item.dhi_score);
        if (filterCriticalOnly && dhi <= 60) return false; // Only >= 60 is critical
        if (selectedArea !== "ALL" && item.area_name !== selectedArea) return false;
        return true;
      })
      .map((item) => ({
        ...item,
        dhi_score: parseFloat(item.dhi_score),
        dhi: parseFloat(item.dhi_score),
        status: normalizeAlertStatus(item?.status, parseFloat(item.dhi_score)),
        timestamp: item.last_reading_time || new Date().toISOString(),
        resolved: false,
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply date range filter
    const now = new Date();
    const rangeMs =
      dateRange === "24h" ? 24 * 60 * 60 * 1000 : dateRange === "7d" ? 7 * 24 * 60 * 60 * 1000 : dateRange === "30d" ? 30 * 24 * 60 * 60 * 1000 : Infinity;

    alerts = alerts.filter((alert) => {
      const alertDate = new Date(alert.timestamp);
      return now - alertDate <= rangeMs;
    });

    // Filter by resolved status
    return alerts.filter((alert) => resolvedFilter === false);
  }, [apiData, filterCriticalOnly, selectedArea, dateRange, resolvedFilter]);

  const sortedAlerts = useMemo(() => {
    const priority = {
      Critical: 1,
      Moderate: 2,
      Normal: 3,
    };

    return [...filteredAlerts].sort((a, b) => {
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }

      return (Number(b.dhi_score) || 0) - (Number(a.dhi_score) || 0);
    });
  }, [filteredAlerts]);

  const getPriorityColor = (status) => {
    return status === "Critical" ? "#b42318" : status === "Moderate" ? "#c2410c" : "#15803d";
  };

  const handleMarkResolved = (index) => {
    // In a real app, this would update backend
    alert(`Alert ${index} marked as resolved (demo)`);
  };

  return (
    <main className="dashboard-main" style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "20px", color: "#111827", fontSize: "20px", fontWeight: "600" }}>
        Alerts & Incidents
      </h2>

      {/* Filter Controls */}
      <article className="gov-panel" style={{ marginBottom: "20px", padding: "16px" }}>
        <h3 style={{ fontSize: "15px", margin: "0 0 12px 0" }}>🔍 Filter Alerts</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
          }}
        >
          {/* Critical Only Toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={filterCriticalOnly}
              onChange={(e) => setFilterCriticalOnly(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: "14px" }}>🔴 Critical Only</span>
          </label>

          {/* Area Dropdown */}
          <div>
            <label style={{ fontSize: "13px", color: "#666" }}>Area:</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area === "ALL" ? "All Areas" : area}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div>
            <label style={{ fontSize: "13px", color: "#666" }}>Time Period:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </article>

      {/* Alerts Count Summary */}
      <div className="gov-kpi-grid" style={{ marginBottom: "20px" }}>
        <article className="gov-kpi-card" style={{ background: "linear-gradient(180deg, #fff5f5 0%, #fee2e2 100%)" }}>
          <h3 style={{ fontSize: "12px", color: "#7c2d12", margin: "0 0 8px 0" }}>CRITICAL ALERTS</h3>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#b42318",
            }}
          >
            {sortedAlerts.filter((a) => a.status === "Critical").length}
          </div>
        </article>

        <article className="gov-kpi-card" style={{ background: "linear-gradient(180deg, #fef3f2 0%, #fecaca 100%)" }}>
          <h3 style={{ fontSize: "12px", color: "#7c2d12", margin: "0 0 8px 0" }}>MODERATE ALERTS</h3>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#c2410c",
            }}
          >
            {sortedAlerts.filter((a) => a.status === "Moderate").length}
          </div>
        </article>

        <article className="gov-kpi-card" style={{ background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)" }}>
          <h3 style={{ fontSize: "12px", color: "#166534", margin: "0 0 8px 0" }}>LOW PRIORITY</h3>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#15803d",
            }}
          >
            {sortedAlerts.filter((a) => a.status === "Normal").length}
          </div>
        </article>
      </div>

      {/* Alerts Timeline */}
      <article className="gov-panel">
        <h3>📋 Alert Timeline</h3>
        <div
          style={{
            overflowY: "auto",
            maxHeight: "500px",
          }}
        >
          {sortedAlerts.length > 0 ? (
            <div>
              {sortedAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={
                    alert.status === "Critical"
                      ? "alert-item-critical"
                      : alert.status === "Moderate"
                        ? "alert-item-moderate"
                        : "alert-item-normal"
                  }
                  style={{
                    padding: "12px",
                    marginBottom: "8px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "#111827" }}>
                      Drain {alert.drain_id} - {alert.area_name}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                      DHI: <span style={{ fontWeight: "600", color: getPriorityColor(alert.status) }}>{alert.dhi.toFixed(2)}</span> |{" "}
                      <span
                        className={
                          alert.status === "Critical"
                            ? "alert-critical"
                            : alert.status === "Moderate"
                              ? "alert-moderate"
                              : ""
                        }
                        style={alert.status === "Normal" ? { color: getPriorityColor(alert.status), fontWeight: "600" } : undefined}
                      >
                        {alert.status}
                      </span>{" "}|{" "}
                      {formatDate(alert.timestamp)} {formatTime(alert.timestamp)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkResolved(idx)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#e5e7eb",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#374151",
                      marginLeft: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✓ Resolve
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
              No alerts match your filters
            </div>
          )}
        </div>
      </article>
    </main>
  );
}

export default EnhancedAlertsPage;
