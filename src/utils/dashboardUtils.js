/**
 * Dashboard utility functions for data processing and analytics
 */

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Get top N drains by DHI score (worst performing)
 */
export const getTopWorstDrains = (data, limit = 5) => {
  return [...data]
    .sort((a, b) => safeNumber(b?.dhi_score) - safeNumber(a?.dhi_score))
    .slice(0, limit)
    .map((item) => ({
      drain_id: item.drain_id,
      area_name: item.area_name,
      dhi_score: safeNumber(item.dhi_score),
      status: item.status,
    }));
};

/**
 * Group drains by area and get statistics
 */
export const getAreaStats = (data) => {
  const stats = {};
  
  data.forEach((item) => {
    const area = item.area_name || "Unknown";
    if (!stats[area]) {
      stats[area] = {
        area: area,
        total: 0,
        critical: 0,
        moderate: 0,
        normal: 0,
        avgDhi: 0,
        totalDhi: 0,
      };
    }
    stats[area].total++;
    if (item.status === "Critical") stats[area].critical++;
    if (item.status === "Moderate") stats[area].moderate++;
    if (item.status === "Normal") stats[area].normal++;
    
    const dhi = safeNumber(item.dhi_score);
    if (dhi !== null) {
      stats[area].totalDhi += dhi;
    }
  });

  // Calculate averages
  Object.values(stats).forEach((stat) => {
    stat.avgDhi = stat.total > 0 ? (stat.totalDhi / stat.total).toFixed(2) : 0;
    stat.riskPercentage = stat.total > 0 ? ((stat.critical + stat.moderate) / stat.total * 100).toFixed(1) : 0;
  });

  return Object.values(stats).sort((a, b) => b.critical - a.critical);
};

/**
 * Get high-risk drains (DHI > 60)
 */
export const getHighRiskDrains = (data) => {
  return data.filter((item) => safeNumber(item.dhi_score) > 60).length;
};

/**
 * Get status distribution chart data
 */
export const getStatusDistribution = (data) => [
  { name: "Critical", value: data.filter((d) => d.status === "Critical").length, color: "#b42318" },
  { name: "Moderate", value: data.filter((d) => d.status === "Moderate").length, color: "#c2410c" },
  { name: "Normal", value: data.filter((d) => d.status === "Normal").length, color: "#15803d" },
];

/**
 * Reduce data points for charts (show top N + aggregated)
 */
export const reduceChartData = (data, maxPoints = 15) => {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  const reduced = [];
  
  for (let i = 0; i < data.length; i += step) {
    reduced.push(data[i]);
  }
  
  return reduced.slice(0, maxPoints);
};

/**
 * Get trend comparison (today vs yesterday or similar)
 */
export const getTrendIndicator = (current, previous) => {
  if (!previous || previous === 0) return { direction: "→", value: 0, isUp: false };
  
  const change = ((current - previous) / previous) * 100;
  const isUp = current > previous;
  
  return {
    direction: isUp ? "↑" : "↓",
    value: Math.abs(change).toFixed(1),
    isUp,
    color: isUp ? "#b42318" : "#15803d",
  };
};

/**
 * Format timestamp to readable time
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/**
 * Format timestamp to readable date
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

/**
 * Get sensor status text
 */
export const getSensorStatusText = (waterLevel, mode = "SIMULATION") => {
  const level = safeNumber(waterLevel);
  if (level === null || level <= 0) {
    return mode === "LIVE" ? "Sensor Offline" : "Simulated Data";
  }
  return mode === "SIMULATION" ? `${level} cm (Simulated)` : `${level} cm`;
};

/**
 * Export data to CSV
 */
export const downloadCSV = (data, filename = "drains.csv") => {
  if (!Array.isArray(data) || data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        return typeof value === "string" && value.includes(",") ? `"${value}"` : value;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default {
  getTopWorstDrains,
  getAreaStats,
  getHighRiskDrains,
  getStatusDistribution,
  reduceChartData,
  getTrendIndicator,
  formatTime,
  formatDate,
  getSensorStatusText,
  downloadCSV,
};
