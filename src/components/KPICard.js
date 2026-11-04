import React from "react";

/**
 * URBANDRAIN 2.0 - High-Precision Operational KPI Card
 * Engineered for industrial telemetry and municipal command centres
 */
function KPICard({
  icon,
  title,
  value,
  unit = "",
  description,
  trend,
  status = "normal",
  onClick,
  sourceLabel = "Telemetry: Live",
  badge,
}) {
  const numericValue = Number(value);
  const isCritical = status === "critical" && (!Number.isFinite(numericValue) || numericValue > 0);
  const isWarning = status === "moderate" || status === "warning";

  const getStatusBorder = () => {
    if (isCritical) return "var(--color-critical, #F16B78)";
    if (isWarning) return "var(--color-warning, #F5B84B)";
    if (status === "good" || status === "normal") return "var(--color-teal, #35D6C2)";
    return "var(--color-border, #2A4359)";
  };

  const getStatusBadge = () => {
    if (badge) return badge;
    if (isCritical) {
      return (
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "2px 7px",
            borderRadius: "4px",
            background: "rgba(241, 107, 120, 0.15)",
            color: "#F16B78",
            border: "1px solid rgba(241, 107, 120, 0.35)",
          }}
        >
          Critical
        </span>
      );
    }
    if (isWarning) {
      return (
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "2px 7px",
            borderRadius: "4px",
            background: "rgba(245, 184, 75, 0.15)",
            color: "#F5B84B",
            border: "1px solid rgba(245, 184, 75, 0.35)",
          }}
        >
          Warning
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          padding: "2px 7px",
          borderRadius: "4px",
          background: "rgba(53, 214, 194, 0.12)",
          color: "#35D6C2",
          border: "1px solid rgba(53, 214, 194, 0.25)",
        }}
      >
        Nominal
      </span>
    );
  };

  return (
    <article
      className={`udx-kpi-card ${isCritical ? "is-critical" : isWarning ? "is-warning" : "is-nominal"}`}
      style={{
        background: "linear-gradient(180deg, #162B40 0%, #112234 100%)",
        border: "1px solid #2A4359",
        borderTop: `3px solid ${getStatusBorder()}`,
        borderRadius: "10px",
        padding: "1rem 1.15rem",
        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
        position: "relative",
        minHeight: "140px",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.5)";
          e.currentTarget.style.borderColor = "#35D6C2";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.35)";
          e.currentTarget.style.borderColor = "#2A4359";
        }
      }}
    >
      {/* Header with Title and Icon/Badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {icon && (
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "#102235",
                border: "1px solid #2A4359",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                color: isCritical ? "#F16B78" : isWarning ? "#F5B84B" : "#35D6C2",
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          )}
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#8FA5BA",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Metric Value */}
      <div style={{ margin: "0.6rem 0 0.3rem 0", display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span
          style={{
            fontFamily: "var(--font-family-display, sans-serif)",
            fontSize: "1.85rem",
            fontWeight: 800,
            lineHeight: 1,
            color: isCritical ? "#F16B78" : isWarning ? "#F5B84B" : "#F4F7FB",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#8FA5BA" }}>
            {unit}
          </span>
        )}
        {trend && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: trend.color || "#8FA5BA",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(16, 34, 53, 0.7)",
              border: "1px solid #2A4359",
            }}
          >
            <span>{trend.direction}</span>
            <span>{trend.value}%</span>
          </span>
        )}
      </div>

      {/* Footer / Description & Source */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(42, 67, 89, 0.5)",
          paddingTop: "6px",
          marginTop: "4px",
          fontSize: "0.72rem",
          color: "#B8C5D6",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {description}
        </span>
        {sourceLabel && (
          <span style={{ color: "#7AA7FF", fontWeight: 600, fontSize: "0.68rem", flexShrink: 0, marginLeft: "6px" }}>
            {sourceLabel}
          </span>
        )}
      </div>
    </article>
  );
}

export default KPICard;
