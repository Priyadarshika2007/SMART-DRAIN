import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../config.js";
import { clearAuthSession, hasStoredAuth, saveAuthSession } from "../utils/auth.js";
import Button from "./common/Button.js";
import InputField from "./common/InputField.js";
import logoImg from "../assets/urbandrainx-logo.png";

const ROLES = [
  {
    id: "Worker",
    label: "Worker",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: "Authority",
    label: "Authority",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "Admin",
    label: "Admin",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1.5" />
      </svg>
    ),
  },
];

function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("Authority");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    if (hasStoredAuth()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const validateForm = () => {
    const errors = {};
    if (!identifier.trim()) {
      errors.identifier = "Email address or username is required";
    }
    if (!password) {
      errors.password = "Password is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");

    if (!validateForm()) return;

    const username = identifier.trim();
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Invalid credentials. Please verify your email and password.");
      }

      if (data.success) {
        const nextUser = data.user || {
          username,
          role: selectedRole,
          area: selectedRole === "Admin" ? "ALL" : (data?.area || "Chennai"),
          assignedAreas: selectedRole === "Admin" ? ["ALL"] : [data?.area || "Chennai"],
        };

        saveAuthSession({
          token: data.token || "",
          user: nextUser,
          role: nextUser.role,
        });

        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("[LOGIN] authentication error:", error);
      clearAuthSession();
      setAuthError(error?.message || "Authentication failed. Unable to reach security gateway.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");

    if (!forgotUsername.trim() || !forgotPassword) {
      setForgotError("Email address or username and new password are required");
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(`${API}/auth/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          newPassword: forgotPassword,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.message || "Unable to update password");
      }

      setForgotMessage("Password updated successfully. You can now sign in.");
      setTimeout(() => {
        setShowForgot(false);
        setForgotUsername("");
        setForgotPassword("");
        setForgotMessage("");
      }, 1500);
    } catch (error) {
      setForgotError(error?.message || "Unable to update password");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="udx-login-page"
      style={{
        minHeight: "calc(100vh - 140px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        position: "relative",
        backgroundColor: "#0B1220",
      }}
    >
      {/* Background glow accent */}
      <div
        style={{
          position: "absolute",
          width: "500px",
          height: "320px",
          background: "radial-gradient(circle, rgba(53, 214, 194, 0.08) 0%, rgba(122, 167, 255, 0.04) 50%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      <div
        className="udx-glass-panel"
        style={{
          width: "100%",
          maxWidth: "430px",
          padding: "2.25rem 2rem",
          position: "relative",
          zIndex: 1,
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "14px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(53, 214, 194, 0.06)",
        }}
      >
        {/* Official URBANDRAINX 2.0 Circular Sewer Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <img
            src={logoImg}
            alt="URBANDRAINX 2.0 Circular Sewer Logo"
            style={{
              width: "78px",
              height: "78px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #35D6C2",
              boxShadow: "0 0 22px rgba(53, 214, 194, 0.35)",
              display: "block",
            }}
          />
        </div>

        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-family-display)",
              fontSize: "1.85rem",
              fontWeight: 800,
              color: "#F4F7FB",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Sign In
          </h1>
        </div>

        {/* Role Selection Segmented Options */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.6rem",
            }}
            role="radiogroup"
            aria-label="User Role Selection"
          >
            {ROLES.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r.id);
                    setAuthError("");
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "0.75rem 0.5rem",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid #35D6C2" : "1px solid #2A4359",
                    background: isSelected ? "rgba(53, 214, 194, 0.14)" : "#102235",
                    color: isSelected ? "#35D6C2" : "#8FA5BA",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 0 16px rgba(53, 214, 194, 0.25)" : "none",
                  }}
                  aria-checked={isSelected}
                  role="radio"
                >
                  <div style={{ color: isSelected ? "#35D6C2" : "#8FA5BA" }}>{r.icon}</div>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: isSelected ? 700 : 500,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {authError && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              backgroundColor: "rgba(241, 107, 120, 0.12)",
              border: "1px solid rgba(241, 107, 120, 0.35)",
              color: "#F16B78",
              fontSize: "0.85rem",
              lineHeight: 1.5,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            role="alert"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{authError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          <InputField
            id="identifier"
            label="Email Address or Username"
            type="text"
            placeholder="Enter your email or username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setFieldErrors((prev) => ({ ...prev, identifier: "" }));
              setAuthError("");
            }}
            error={fieldErrors.identifier}
            required
            autoComplete="username"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            }
          />

          <div style={{ marginTop: "1rem" }}>
            <InputField
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: "" }));
                setAuthError("");
              }}
              error={fieldErrors.password}
              required
              autoComplete="current-password"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              rightElement={
                <button
                  type="button"
                  className="udx-input-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8FA5BA",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />
          </div>

          {/* Forgot Password link */}
          <div style={{ display: "flex", justifyContent: "flex-end", margin: "0.85rem 0 1.5rem" }}>
            <button
              type="button"
              onClick={() => {
                setShowForgot(true);
                setForgotUsername(identifier);
                setForgotError("");
                setForgotMessage("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#7AA7FF",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                padding: "2px 0",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#35D6C2")}
              onMouseLeave={(e) => (e.target.style.color = "#7AA7FF")}
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            style={{
              width: "100%",
              justifyContent: "center",
              fontSize: "1rem",
              fontWeight: 600,
              padding: "0.85rem",
            }}
          >
            {loading ? "Signing In..." : `Sign In as ${selectedRole}`}
          </Button>
        </form>

        {/* Forgot Password Modal */}
        {showForgot && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(5, 10, 18, 0.8)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
              zIndex: 1000,
            }}
          >
            <div
              className="udx-glass-panel"
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "2rem",
                backgroundColor: "#14283B",
                border: "1px solid #2A4359",
                borderRadius: "14px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#F4F7FB", fontSize: "1.3rem", fontWeight: 700 }}>
                Forgot Password
              </h3>
              <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#B8C5D6", lineHeight: 1.5 }}>
                Enter your email address or username and set a new password.
              </p>

              {forgotError && (
                <div
                  style={{
                    color: "#F16B78",
                    backgroundColor: "rgba(241, 107, 120, 0.1)",
                    border: "1px solid rgba(241, 107, 120, 0.3)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                  }}
                >
                  {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div
                  style={{
                    color: "#35D6C2",
                    backgroundColor: "rgba(53, 214, 194, 0.1)",
                    border: "1px solid rgba(53, 214, 194, 0.3)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                  }}
                >
                  {forgotMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <InputField
                  id="forgot-username"
                  label="Email Address or Username"
                  type="text"
                  placeholder="Enter email or username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  required
                />

                <div style={{ marginTop: "1rem" }}>
                  <InputField
                    id="forgot-password"
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    value={forgotPassword}
                    onChange={(e) => setForgotPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <Button type="submit" variant="primary" loading={forgotLoading} style={{ flex: 1, justifyContent: "center" }}>
                    Reset Password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotError("");
                      setForgotMessage("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
