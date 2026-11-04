import React from "react";

function Button({
  children,
  variant = "primary",
  size = "md",
  icon = null,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  ...props
}) {
  const variantClass = `udx-btn-${variant}`;
  const sizeClass = size === "sm" ? "udx-btn-sm" : size === "lg" ? "udx-btn-lg" : "";

  return (
    <button
      type={type}
      className={`udx-btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="udx-spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="udx-btn-icon" aria-hidden="true">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export default Button;
