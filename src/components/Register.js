import React, { useState } from "react";
import API_BASE from "../config/api.js";

function Register({ setPage }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("idle");

  const [formData, setFormData] = useState({
    fullName: "",
    authorityId: "",
    designation: "",
    department: "",
    email: "",
    phone: "",
    zone: "",
    officeAddress: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!API_BASE) {
      console.error("REACT_APP_BACKEND_URL is undefined. Register API calls cannot run.");
      setStatusType("error");
      setStatusMessage("Backend URL is not configured.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setStatusType("error");
      setStatusMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setStatusType("idle");
    setStatusMessage("");

    try {
      const response = await fetch(`${API_BASE}/register-authority`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          authorityId: formData.authorityId,
          designation: formData.designation,
          department: formData.department,
          email: formData.email,
          phone: formData.phone,
          zone: formData.zone,
          officeAddress: formData.officeAddress,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create account.");
      }

      setStatusType("success");
      setStatusMessage("Account created successfully.");
      setFormData({
        fullName: "",
        authorityId: "",
        designation: "",
        department: "",
        email: "",
        phone: "",
        zone: "",
        officeAddress: "",
        username: "",
        password: "",
        confirmPassword: ""
      });
    } catch (error) {
      setStatusType("error");
      setStatusMessage(error.message || "Unable to create account right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="form-page container">
      <div className="form-card dark-login-card register-card">
        <h2>Create Authority Account</h2>
        <p>
          Register official credentials for UrbanDrain X access, monitoring permissions,
          and secure operational reporting.
        </p>

        <form className="login-form register-form" onSubmit={handleSubmit}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Officer full name"
            value={formData.fullName}
            onChange={handleChange}
            required
          />

          <label htmlFor="authorityId">Authority ID</label>
          <input
            id="authorityId"
            name="authorityId"
            type="text"
            placeholder="UDX-AUTH-001"
            value={formData.authorityId}
            onChange={handleChange}
            required
          />

          <label htmlFor="designation">Designation</label>
          <input
            id="designation"
            name="designation"
            type="text"
            placeholder="Senior Drainage Officer"
            value={formData.designation}
            onChange={handleChange}
            required
          />

          <label htmlFor="department">Department</label>
          <input
            id="department"
            name="department"
            type="text"
            placeholder="Municipal Drainage Department"
            value={formData.department}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Official Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="officer@city.gov"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="phone">Contact Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <label htmlFor="zone">Zone / Ward</label>
          <input
            id="zone"
            name="zone"
            type="text"
            placeholder="Central Zone - Ward 12"
            value={formData.zone}
            onChange={handleChange}
            required
          />

          <label htmlFor="officeAddress">Office Address</label>
          <input
            id="officeAddress"
            name="officeAddress"
            type="text"
            placeholder="Municipal HQ, Block A"
            value={formData.officeAddress}
            onChange={handleChange}
            required
          />

          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="urban_officer_01"
            value={formData.username}
            onChange={handleChange}
            required
          />

          <label htmlFor="registerPassword">Password</label>
          <div className="input-shell">
            <span className="input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
            </span>
            <input
              id="registerPassword"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
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

          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="input-shell">
            <span className="input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
            </span>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" className="submit-btn">
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>

          {statusMessage ? (
            <p className={statusType === "success" ? "form-status success" : "form-status error"}>
              {statusMessage}
            </p>
          ) : null}

          <button type="button" className="create-account-btn" onClick={() => setPage("login")}>
            Back to Login
          </button>
        </form>
      </div>
    </section>
  );
}

export default Register;
