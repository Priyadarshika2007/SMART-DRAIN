import React from "react";

function InputField({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder = "",
  icon = null,
  rightElement = null,
  error = "",
  hint = "",
  required = false,
  disabled = false,
  autoComplete = "off",
  ...props
}) {
  return (
    <div className="udx-form-group">
      {label && (
        <label htmlFor={id} className="udx-label">
          {label} {required && <span style={{ color: "var(--color-critical)" }}>*</span>}
        </label>
      )}

      <div className={`udx-input-shell ${error ? "has-error" : ""}`}>
        {icon && <span className="udx-input-icon" aria-hidden="true">{icon}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className="udx-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {rightElement}
      </div>

      {error ? (
        <span id={`${id}-error`} className="udx-form-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export default InputField;
