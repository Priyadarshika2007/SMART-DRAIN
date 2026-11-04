import React from "react";

function Badge({ status = "normal", children, className = "" }) {
  const normalized = String(status || "normal").trim().toLowerCase();
  let statusClass = "udx-badge-normal";

  if (normalized === "critical" || normalized === "emergency") {
    statusClass = "udx-badge-critical";
  } else if (normalized === "high") {
    statusClass = "udx-badge-high";
  } else if (normalized === "warning" || normalized === "moderate") {
    statusClass = "udx-badge-warning";
  } else if (normalized === "monitoring") {
    statusClass = "udx-badge-monitoring";
  }

  return (
    <span className={`udx-badge ${statusClass} ${className}`}>
      {children || status}
    </span>
  );
}

export default Badge;
