import React, { useMemo, useState } from "react";
import { API } from "../config.js";

const isAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "district head";
};

const formatRoleLabel = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "admin") return "System Administrator";
  if (normalized === "district head") return "District Head (Chennai Central)";
  if (normalized === "officer" || normalized === "operator" || normalized === "municipal officer") return "Municipal Officer";
  if (normalized === "worker" || normalized === "maintenance" || normalized === "supervisor") return "Worker / Field Crew";
  if (normalized === "viewer") return "Viewer (Read-Only)";
  return role || "Municipal Staff";
};

function getInitials(name) {
  const safeName = String(name || "").trim();
  if (!safeName) return "UD";

  return safeName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProfilePage({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  const displayName = currentUser?.name || currentUser?.full_name || currentUser?.username || "Municipal Staff";
  const displayEmail = currentUser?.email || "officer@chennai.gov.in";
  const displayRole = currentUser?.role || "Municipal Officer";
  const roleLabel = formatRoleLabel(displayRole);
  const displayArea = isAdminRole(displayRole)
    ? "Greater Chennai Corporation (ALL)"
    : currentUser?.area || (Array.isArray(currentUser?.assignedAreas) ? currentUser.assignedAreas.join(", ") : "Chennai Central");
  const avatarImage = currentUser?.avatarUrl || currentUser?.image || "";
  const username = currentUser?.username || "—";

  const handleEditClick = () => {
    setEditName(displayName);
    setEditEmail(displayEmail);
    setProfileError("");
    setProfileSuccess("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setProfileError("");
    setProfileSuccess("");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!editName.trim()) {
      setProfileError("Full Name is required.");
      return;
    }

    if (!editEmail.trim()) {
      setProfileError("Email address is required.");
      return;
    }

    try {
      setSavingProfile(true);
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const payload = {
        username: currentUser?.username,
        name: editName.trim(),
        email: editEmail.trim(),
      };

      const response = await fetch(`${API}/users/update-profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Failed to update profile");
      }

      const updated = {
        ...currentUser,
        ...(json?.user || payload),
      };

      localStorage.setItem("user", JSON.stringify(updated));
      if (onUpdate) onUpdate(updated);

      setProfileSuccess("✓ Account profile updated successfully.");
      setIsEditing(false);
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (newPassword.length < 5) {
      setPasswordError("New password must be at least 5 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const payload = {
        username: currentUser?.username,
        currentPassword,
        newPassword,
      };

      const response = await fetch(`${API}/users/change-password`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Failed to update password");
      }

      setPasswordSuccess("✓ Password changed successfully. Your account credentials have been updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 5000);
    } catch (err) {
      setPasswordError(err.message || "Unable to update password. Please check your credentials.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Profile picture must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = {
        ...currentUser,
        image: reader.result,
        avatarUrl: reader.result,
      };
      localStorage.setItem("user", JSON.stringify(updated));
      if (onUpdate) onUpdate(updated);
      setProfileSuccess("✓ Profile photo updated.");
      setTimeout(() => setProfileSuccess(""), 3000);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "1500px" }}>
      {/* Overview Header Banner */}
      <div
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem 1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Avatar with ring */}
          <div style={{ position: "relative" }}>
            {avatarImage ? (
              <img
                src={avatarImage}
                alt={displayName}
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #35D6C2",
                  boxShadow: "0 4px 14px rgba(53, 214, 194, 0.25)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "#172638",
                  border: "3px solid #35D6C2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#35D6C2",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  boxShadow: "0 4px 14px rgba(53, 214, 194, 0.25)",
                }}
              >
                {getInitials(displayName)}
              </div>
            )}
            <label
              htmlFor="profile-avatar-input"
              style={{
                position: "absolute",
                bottom: "-4px",
                right: "-4px",
                background: "#35D6C2",
                color: "#0B1220",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              }}
              title="Upload new avatar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <input
                id="profile-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#F4F7FB" }}>
                {displayName}
              </h2>
              <span
                style={{
                  background: "rgba(53, 214, 194, 0.15)",
                  color: "#35D6C2",
                  border: "1px solid rgba(53, 214, 194, 0.35)",
                  borderRadius: "9999px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  textTransform: "uppercase",
                }}
              >
                {roleLabel}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", fontSize: "0.83rem", color: "#8498AE" }}>
              <span>@{username}</span>
              <span>•</span>
              <span style={{ color: "#7AA7FF" }}>Scope: {displayArea}</span>
            </div>
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleEditClick}
            style={{
              background: "#172638",
              border: "1px solid #304256",
              color: "#35D6C2",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      {/* Responsive Two-Column Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem", width: "100%", alignItems: "start" }}>
        {/* Account Details & Profile Edit Section */}
        <article
          style={{
            background: "#14283B",
            border: "1px solid #2A4359",
            borderRadius: "12px",
            padding: "1.5rem 1.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #2A4359", paddingBottom: "0.75rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#F4F7FB" }}>
              Account Information & Jurisdictional Scope
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#8498AE" }}>
              Official administrative details retrieved directly from the MongoDB authentication directory.
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div
            style={{
              background: "rgba(53, 214, 194, 0.12)",
              border: "1px solid #35D6C2",
              color: "#35D6C2",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.25rem",
            }}
          >
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div
            style={{
              background: "rgba(241, 107, 120, 0.12)",
              border: "1px solid #F16B78",
              color: "#F16B78",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.25rem",
            }}
          >
            {profileError}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#B8C5D6", marginBottom: "6px" }}>
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Official Name"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#B8C5D6", marginBottom: "6px" }}>
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="official@chennai.gov.in"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  background: "#35D6C2",
                  color: "#0B1220",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                  cursor: savingProfile ? "not-allowed" : "pointer",
                }}
              >
                {savingProfile ? "Saving to MongoDB..." : "✓ Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingProfile}
                style={{
                  background: "#122536",
                  color: "#B8C5D6",
                  border: "1px solid #304256",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <div style={fieldCardStyle}>
              <span style={fieldLabelStyle}>Official Username</span>
              <span style={fieldValueStyle}>{username}</span>
            </div>

            <div style={fieldCardStyle}>
              <span style={fieldLabelStyle}>Display Name</span>
              <span style={fieldValueStyle}>{displayName}</span>
            </div>

            <div style={fieldCardStyle}>
              <span style={fieldLabelStyle}>Email Address</span>
              <span style={fieldValueStyle}>{displayEmail}</span>
            </div>

            <div style={fieldCardStyle}>
              <span style={fieldLabelStyle}>Security Role</span>
              <span style={{ ...fieldValueStyle, color: "#35D6C2" }}>{roleLabel}</span>
            </div>

            <div style={fieldCardStyle}>
              <span style={fieldLabelStyle}>Monitored Jurisdiction Scope</span>
              <span style={{ ...fieldValueStyle, color: "#7AA7FF" }}>{displayArea}</span>
            </div>

            <div style={fieldCardStyle}>
              <span style={fieldLabelStyle}>Authentication Status</span>
              <span style={{ ...fieldValueStyle, color: "#35D6C2", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#35D6C2" }} />
                Active Verified Personnel
              </span>
            </div>
          </div>
        )}
      </article>

        {/* Security & Password Management Section */}
        <article
          style={{
            background: "#14283B",
            border: "1px solid #2A4359",
            borderRadius: "12px",
            padding: "1.5rem 1.75rem",
          }}
        >
          <div style={{ marginBottom: "1.25rem", borderBottom: "1px solid #2A4359", paddingBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#F4F7FB" }}>
              Security & Credential Management
            </h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#8498AE" }}>
            Change your password. Updates require verifying your current password and are hashed via bcrypt in MongoDB.
          </p>
        </div>

        {passwordSuccess && (
          <div
            style={{
              background: "rgba(53, 214, 194, 0.12)",
              border: "1px solid #35D6C2",
              color: "#35D6C2",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.25rem",
            }}
          >
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div
            style={{
              background: "rgba(241, 107, 120, 0.12)",
              border: "1px solid #F16B78",
              color: "#F16B78",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.25rem",
            }}
          >
            {passwordError}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {/* Current Password */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#B8C5D6", marginBottom: "6px" }}>
                Current Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  style={{ ...inputStyle, paddingRight: "50px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  style={togglePasswordBtnStyle}
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#B8C5D6", marginBottom: "6px" }}>
                New Password (min. 5 chars)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  style={{ ...inputStyle, paddingRight: "50px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  style={togglePasswordBtnStyle}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#B8C5D6", marginBottom: "6px" }}>
                Confirm New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  style={{ ...inputStyle, paddingRight: "50px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  style={togglePasswordBtnStyle}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={changingPassword}
              style={{
                background: "#122536",
                color: "#F4F7FB",
                border: "1px solid #304256",
                borderRadius: "8px",
                padding: "9px 20px",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: changingPassword ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 150ms ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {changingPassword ? "Verifying with MongoDB..." : "Update Security Password"}
            </button>
          </div>
        </form>
        </article>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "8px",
  padding: "9px 12px",
  color: "#F4F7FB",
  fontSize: "0.88rem",
  outline: "none",
};

const fieldCardStyle = {
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "8px",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const fieldLabelStyle = {
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "#8FA5BA",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};

const fieldValueStyle = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "#F4F7FB",
};

const togglePasswordBtnStyle = {
  position: "absolute",
  right: "8px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#35D6C2",
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  padding: "4px 6px",
};

export default ProfilePage;
