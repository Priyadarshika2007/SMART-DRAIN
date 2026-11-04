import React from "react";

function LoadingSpinner({ label = "Loading data...", size = "md", inline = false }) {
  const sizeMap = {
    sm: "16px",
    md: "24px",
    lg: "36px",
  };

  const spinnerPx = sizeMap[size] || "24px";

  if (inline) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
        <span
          className="udx-spinner"
          style={{ width: spinnerPx, height: spinnerPx }}
          aria-hidden="true"
        />
        {label && <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{label}</span>}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        gap: "1rem",
        color: "var(--color-text-secondary)",
      }}
      role="status"
    >
      <div
        className="udx-spinner"
        style={{ width: spinnerPx, height: spinnerPx, borderTopColor: "var(--color-aqua)" }}
        aria-hidden="true"
      />
      {label && <span style={{ fontSize: "0.9rem", letterSpacing: "0.02em" }}>{label}</span>}
    </div>
  );
}

export default LoadingSpinner;
