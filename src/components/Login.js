import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const apiBaseUrl = String(process.env.REACT_APP_API_URL || "").trim().replace(/\/+$/, "");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const username = identifier.trim();
    console.log("[LOGIN] request payload", { username, password });
    localStorage.removeItem("user");

    if (!apiBaseUrl) {
      setAuthError("API URL is not configured. Please set REACT_APP_API_URL.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
        })
      });

      const data = await response.json();
      console.log("[LOGIN] API response", { ok: response.ok, status: response.status, body: data });

      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Invalid username or password");
      }

      if (data.success) {
        localStorage.setItem("token", "dummy-token");
        localStorage.setItem("role", data.role);

        navigate("/dashboard");
      }
    } catch (error) {
      console.error("[LOGIN] failed", error);
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setAuthError(error?.message || "Invalid username or password");
      return;
    }

    setAuthError("");
  };

  const handleResetPassword = async () => {
    setForgotError("");
    setForgotMessage("");

    if (!forgotUsername || !forgotPassword) {
      setForgotError("Username and new password are required");
      return;
    }

    if (!apiBaseUrl) {
      setForgotError("API URL is not configured. Please set REACT_APP_API_URL.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: forgotUsername,
          newPassword: forgotPassword,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Unable to update password");
      }

      setForgotMessage("Password updated");
      setTimeout(() => {
        setShowForgot(false);
        setForgotUsername("");
        setForgotPassword("");
        setForgotMessage("");
        navigate("/login");
      }, 1000);
    } catch (error) {
      setForgotError(error?.message || "Unable to update password");
    }
  };

  return (
    <section className="form-page container">
      <div className="form-card dark-login-card">
        <h2>Welcome Back</h2>
        <p>Sign in to monitor drains, alerts, and daily field activity.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="identifier">Username / Email</label>
          <div className="input-shell">
            <span className="input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input
              id="identifier"
              type="text"
              placeholder="Enter username or email"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setAuthError("");
              }}
              required
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="input-shell">
            <span className="input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setAuthError("");
              }}
              required
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" className="submit-btn">
            Sign In
          </button>

          {authError ? <p className="form-status error">{authError}</p> : null}

          <button
            type="button"
            className="forgot-password-btn"
            onClick={() => {
              setShowForgot(true);
              setForgotError("");
              setForgotMessage("");
            }}
          >
            Forgot Password?
          </button>

          <button type="button" className="create-account-btn" onClick={() => navigate("/register")}>
            Create Account
          </button>

          <p className="account-note">
            No account yet? <button type="button" onClick={() => navigate("/register")}>Create Account</button>
          </p>
        </form>

        {showForgot && (
          <section className="forgot-panel" aria-label="Reset password">
            <h3>Reset Password</h3>
            <input
              type="text"
              placeholder="Username"
              value={forgotUsername}
              onChange={(event) => setForgotUsername(event.target.value)}
            />
            <input
              type="password"
              placeholder="New Password"
              value={forgotPassword}
              onChange={(event) => setForgotPassword(event.target.value)}
            />
            <div className="forgot-actions">
              <button type="button" className="submit-btn" onClick={handleResetPassword}>
                Update Password
              </button>
              <button
                type="button"
                className="create-account-btn"
                onClick={() => {
                  setShowForgot(false);
                  setForgotError("");
                  setForgotMessage("");
                }}
              >
                Cancel
              </button>
            </div>
            {forgotError ? <p className="form-status error">{forgotError}</p> : null}
            {forgotMessage ? <p className="form-status success">{forgotMessage}</p> : null}
          </section>
        )}
      </div>
    </section>
  );
}

export default Login;
