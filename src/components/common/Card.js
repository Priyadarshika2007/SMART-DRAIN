import React from "react";

function Card({
  title,
  subtitle,
  icon,
  badge,
  actions,
  children,
  className = "",
  style = {},
  ...props
}) {
  return (
    <article className={`udx-glass-panel ${className}`} style={{ padding: "1.5rem", ...style }} {...props}>
      {(title || subtitle || icon || badge || actions) && (
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: subtitle ? "0.75rem" : "0",
            borderBottom: subtitle ? "1px solid var(--color-border-subtle)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {icon && <span style={{ color: "var(--color-aqua)", display: "flex" }}>{icon}</span>}
            <div>
              {title && (
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {badge}
            {actions}
          </div>
        </header>
      )}
      <div>{children}</div>
    </article>
  );
}

export default Card;
