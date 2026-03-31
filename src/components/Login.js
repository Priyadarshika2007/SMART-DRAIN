import React, { useState } from "react";

function Login({ setPage }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
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
              onChange={(event) => setIdentifier(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
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

          <button type="button" className="create-account-btn" onClick={() => setPage("register")}>
            Create Account
          </button>

          <p className="account-note">
            No account yet? <button type="button" onClick={() => setPage("register")}>Create Account</button>
          </p>
        </form>
      </div>
    </section>
  );
}

export default Login;
