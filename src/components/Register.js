import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../config.js";

const ROLE_FIELD_OFFICER = "Field Officer";
const ROLE_AREA_SUPERVISOR = "Area Supervisor";
const ROLE_DISTRICT_HEAD = "District Head";

const parseRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getAreaName = (row) => String(row.area || row.area_name || "").trim();

function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("idle");
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: ROLE_FIELD_OFFICER,
    assignedAreas: [],
    username: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    let isMounted = true;

    const fetchAreas = async () => {
      if (!API) {
        if (isMounted) {
          setStatusType("error");
          setStatusMessage("Backend URL is not configured.");
          setAreasLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`${API}/drains`).catch(() => null);
        if (!response?.ok) throw new Error("Server not reachable");

        const payload = await response.json();
        const rows = parseRows(payload);
        const uniqueAreas = [...new Set(rows.map(getAreaName).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b)
        );

        if (!isMounted) return;
        setAreas(uniqueAreas);
        setAreasLoading(false);
      } catch (error) {
        if (!isMounted) return;
        setStatusType("error");
        setStatusMessage(error.message || "Server not reachable");
        setAreasLoading(false);
      }
    };

    fetchAreas();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!areas.length) return;

    if (formData.role === ROLE_DISTRICT_HEAD) {
      setFormData((prev) => ({ ...prev, assignedAreas: [...areas] }));
      return;
    }

    if (formData.role === ROLE_FIELD_OFFICER) {
      setFormData((prev) => ({
        ...prev,
        assignedAreas: prev.assignedAreas.length ? [prev.assignedAreas[0]] : [areas[0]]
      }));
      return;
    }

    if (formData.role === ROLE_AREA_SUPERVISOR) {
      setFormData((prev) => {
        const validAreas = prev.assignedAreas.filter((area) => areas.includes(area));
        return { ...prev, assignedAreas: validAreas.length ? validAreas : [areas[0]] };
      });
    }
  }, [areas, formData.role]);

  const roleHelperText = useMemo(() => {
    if (formData.role === ROLE_FIELD_OFFICER) return "Select one assigned area.";
    if (formData.role === ROLE_AREA_SUPERVISOR) return "Select one or more assigned areas.";
    return "District Head is automatically assigned to all areas.";
  }, [formData.role]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSingleAreaChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, assignedAreas: value ? [value] : [] }));
  };

  const handleMultiAreaChange = (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setFormData((prev) => ({ ...prev, assignedAreas: values }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setStatusType("error");
      setStatusMessage("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setStatusType("error");
      setStatusMessage("Password must be at least 6 characters long.");
      return;
    }

    if (!formData.assignedAreas.length) {
      setStatusType("error");
      setStatusMessage("Please choose at least one area.");
      return;
    }

    try {
      const payload = {
        name: formData.fullName,
        email: formData.email,
        role: formData.role,
        area: formData.role === ROLE_DISTRICT_HEAD ? "ALL" : formData.assignedAreas[0] || "",
        assignedAreas: formData.role === ROLE_DISTRICT_HEAD ? ["ALL"] : formData.assignedAreas,
        username: formData.username,
        password: formData.password
      };

      console.log("[REGISTER] request payload", payload);

      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      console.log("[REGISTER] API response", { ok: response.ok, status: response.status, body: json });

      if (!response.ok) {
        throw new Error(json?.message || "Unable to create account.");
      }

      if (json?.token) {
        localStorage.setItem("token", json.token);
      }

      if (json?.user) {
        localStorage.setItem("user", JSON.stringify(json.user));
      }

      setStatusType("success");
      setStatusMessage("Account created successfully. Redirecting to dashboard...");

      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (error) {
      setStatusType("error");
      setStatusMessage(error.message || "Unable to create account.");
    }
  };

  return (
    <section className="form-page container">
      <div className="form-card dark-login-card register-card">
        <h2>Create Authority Account</h2>
        <p>Register official credentials for UrbanDrainX access and role-based operations.</p>

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

          <label htmlFor="role">Role</label>
          <select id="role" name="role" value={formData.role} onChange={handleChange} required>
            <option value={ROLE_FIELD_OFFICER}>{ROLE_FIELD_OFFICER}</option>
            <option value={ROLE_AREA_SUPERVISOR}>{ROLE_AREA_SUPERVISOR}</option>
            <option value={ROLE_DISTRICT_HEAD}>{ROLE_DISTRICT_HEAD}</option>
          </select>

          <label htmlFor="assignedArea">Assigned Area</label>
          {formData.role === ROLE_AREA_SUPERVISOR ? (
            <select
              id="assignedArea"
              multiple
              value={formData.assignedAreas}
              onChange={handleMultiAreaChange}
              disabled={areasLoading || !areas.length}
              required
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          ) : (
            <select
              id="assignedArea"
              value={formData.assignedAreas[0] || ""}
              onChange={handleSingleAreaChange}
              disabled={areasLoading || !areas.length || formData.role === ROLE_DISTRICT_HEAD}
              required
            >
              {formData.role === ROLE_DISTRICT_HEAD ? (
                <option value="ALL">All Areas</option>
              ) : (
                areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))
              )}
            </select>
          )}

          <p className="register-hint">{areasLoading ? "Loading areas..." : roleHelperText}</p>

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
            Create Account
          </button>

          {statusMessage ? (
            <p className={statusType === "success" ? "form-status success" : "form-status error"}>
              {statusMessage}
            </p>
          ) : null}

          <button type="button" className="create-account-btn" onClick={() => navigate("/login")}>
            Back to Login
          </button>
        </form>
      </div>
    </section>
  );
}

export default Register;
