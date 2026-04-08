import React, { useState, useMemo, useEffect } from "react";

/**
 * ChartFilterPanel - Reusable filter component for charts
 * Provides time range, area, and status filters
 */
function ChartFilterPanel({
  data,
  onFilter,
  showAreaFilter = true,
  showStatusFilter = false,
  showTimeFilter = true,
}) {
  const [timeRange, setTimeRange] = useState("24h"); // "24h", "7d", "30d", "all"
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Extract unique areas
  const areas = useMemo(() => {
    if (!data) return [];
    const uniqueAreas = [...new Set(data.map((item) => item.area_name))];
    return ["ALL", ...uniqueAreas.sort()];
  }, [data]);

  // Apply filters whenever selections change
  useEffect(() => {
    if (!onFilter || !data) return;

    let filtered = [...data];

    // Area filter
    if (selectedArea !== "ALL") {
      filtered = filtered.filter((item) => item.area_name === selectedArea);
    }

    // Status filter (if applicable)
    if (showStatusFilter && selectedStatus !== "ALL") {
      filtered = filtered.filter((item) => item.status === selectedStatus);
    }

    // Time range filter
    if (showTimeFilter && timeRange !== "all") {
      const now = new Date();
      const rangeMs =
        timeRange === "24h"
          ? 24 * 60 * 60 * 1000
          : timeRange === "7d"
            ? 7 * 24 * 60 * 60 * 1000
            : timeRange === "30d"
              ? 30 * 24 * 60 * 60 * 1000
              : Infinity;

      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.last_reading_time || item.timestamp);
        return now - itemDate <= rangeMs;
      });
    }

    onFilter(filtered);
  }, [timeRange, selectedArea, selectedStatus, data, onFilter, showStatusFilter, showTimeFilter]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px",
        padding: "12px",
        backgroundColor: "#f3f4f6",
        borderRadius: "6px",
        marginBottom: "16px",
      }}
    >
      {/* Time Range Filter */}
      {showTimeFilter && (
        <div>
          <label style={{ fontSize: "12px", color: "#666", fontWeight: "600" }}>📅 Time Period:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "13px",
              marginTop: "4px",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      )}

      {/* Area Filter */}
      {showAreaFilter && (
        <div>
          <label style={{ fontSize: "12px", color: "#666", fontWeight: "600" }}>📍 Area:</label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "13px",
              marginTop: "4px",
              backgroundColor: "#ffffff",
            }}
          >
            {areas.map((area) => (
              <option key={area} value={area}>
                {area === "ALL" ? "All Areas" : area}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Filter */}
      {showStatusFilter && (
        <div>
          <label style={{ fontSize: "12px", color: "#666", fontWeight: "600" }}>🏷️ Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "13px",
              marginTop: "4px",
              backgroundColor: "#ffffff",
            }}
          >
            <option value="ALL">All Status</option>
            <option value="Operational">Operational</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Offline">Offline</option>
          </select>
        </div>
      )}
    </div>
  );
}

export default ChartFilterPanel;
