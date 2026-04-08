import React from "react";

/**
 * Enhanced KPI Card with trend indicators and status colors
 */
function KPICard({ icon, title, value, description, trend, status = "normal", onClick }) {
  const numericValue = Number(value);
  const shouldBlinkCritical = status === "critical" && Number.isFinite(numericValue) && numericValue > 0;

  const getStatusColor = () => {
    switch (status) {
      case "critical":
        return { bg: "#fff1f0", border: "#f5d1ce", text: "#b42318" };
      case "moderate":
        return { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" };
      case "normal":
        return { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" };
      default:
        return { bg: "#f8fafc", border: "#e6eaf0", text: "#111827" };
    }
  };

  const colors = getStatusColor();

  return (
    <article
      className={`gov-kpi-card ${status === "critical" ? "is-critical" : status === "moderate" ? "is-moderate" : "is-normal"}`}
      style={{
        background: `linear-gradient(180deg, #ffffff 0%, ${colors.bg} 100%)`,
        borderColor: colors.border,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div className="gov-kpi-head">
        <span className="gov-kpi-icon">{icon}</span>
        <p>{title}</p>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "10px" }}>
        <h3
          className={`gov-kpi-value ${shouldBlinkCritical ? "blink-critical-kpi" : ""}`}
          style={{ color: colors.text, margin: 0 }}
        >
          {value}
        </h3>
        {trend && (
          <span
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: trend.color,
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <span>{trend.direction}</span>
            <span>{trend.value}%</span>
          </span>
        )}
      </div>

      <small style={{ color: "#6b7280", marginTop: "8px", display: "block" }}>
        {description}
      </small>

      {status !== "normal" && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            fontWeight: "600",
            color: colors.text,
            padding: "4px 8px",
            borderRadius: "4px",
            backgroundColor: colors.bg,
            display: "inline-block",
          }}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      )}
    </article>
  );
}

export default KPICard;
