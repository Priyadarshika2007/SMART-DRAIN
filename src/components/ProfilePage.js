import React, { useMemo, useState } from "react";
import { API } from "../config.js";

const isAdminRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "district head";
};

function getInitials(name) {
  const safeName = String(name || "").trim();
  if (!safeName) return "U";

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
  const [newPassword, setNewPassword] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  const displayName = currentUser?.name || "Municipal Officer";
  const displayEmail = currentUser?.email || "-";
  const displayRole = currentUser?.role || "Field Officer";
  const displayArea = isAdminRole(displayRole)
    ? "ALL"
    : currentUser?.area || (Array.isArray(currentUser?.assignedAreas) ? currentUser.assignedAreas[0] : "Not assigned");
  const avatarImage = currentUser?.avatarUrl || currentUser?.image || "";

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedUser = {
        ...currentUser,
        image: reader.result,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (onUpdate) onUpdate(updatedUser);
      setSaveMessage("✓ Profile image updated successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    };

    reader.readAsDataURL(file);
  };

  const handleEditClick = () => {
    setEditName(displayName);
    setEditEmail(displayEmail);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (!currentUser?.username) {
        setSaveMessage("Username missing. Please login again.");
        return;
      }

      const formData = {
        username: currentUser.username,
        name: editName,
        email: editEmail,
      };

      const response = await fetch(`${API}/users/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Unable to update profile");
      }

      const updatedUser = {
        ...currentUser,
        ...(json?.user || formData),
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (onUpdate) onUpdate(updatedUser);

      setSaveMessage("✓ Profile updated successfully");
      setIsEditing(false);
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage(error?.message || "Unable to update profile");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveMessage("");
  };

  const handlePasswordUpdate = async () => {
    try {
      if (!currentUser?.id) {
        setPasswordMessage("User id missing. Please login again.");
        return;
      }

      if (!newPassword.trim()) {
        setPasswordMessage("Enter a new password.");
        return;
      }

      const response = await fetch(`${API}/update-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          password: newPassword,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Unable to update password");
      }

      if (json?.user) {
        const updatedUser = { ...currentUser, ...json.user };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
      }

      setNewPassword("");
      setPasswordMessage("✓ Password updated successfully");
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch (error) {
      setPasswordMessage(error.message || "Unable to update password");
    }
  };

  return (
    <main className="dashboard-main" style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "20px", color: "#111827", fontSize: "20px", fontWeight: "600" }}>
        👤 Profile
      </h2>

      <article className="gov-panel profile-card" style={{ maxWidth: "760px", padding: "24px" }}>
        <div className="profile-top">
          <div className="profile-user">
            {avatarImage ? (
              <img src={avatarImage} alt={displayName} className="avatar" />
            ) : (
              <div className="avatar avatar-circle">{getInitials(displayName)}</div>
            )}
            <div>
              <h3 style={{ margin: 0, color: "#111827" }}>{displayName}</h3>
              <p style={{ margin: "4px 0 0", color: "#6b7280" }}>{displayRole}</p>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={handleEditClick}
              style={{
                padding: "8px 16px",
                backgroundColor: "#1d4ed8",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {saveMessage && <div className="profile-message success">{saveMessage}</div>}
        {passwordMessage && <div className="profile-message">{passwordMessage}</div>}

        <div className="profile-grid">
          <div className="profile-field">
            <label>Name</label>
            {isEditing ? (
              <input value={editName || ""} onChange={(e) => setEditName(e.target.value)} />
            ) : (
              <p>{displayName}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Email</label>
            {isEditing ? (
              <input type="email" value={editEmail || ""} onChange={(e) => setEditEmail(e.target.value)} />
            ) : (
              <p>{displayEmail}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Role</label>
            <p>{displayRole}</p>
          </div>

          <div className="profile-field">
            <label>Area</label>
            <p>{displayArea}</p>
          </div>
        </div>

        <div className="password-card">
          <h3>Profile Image</h3>
          <div className="password-row">
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>
        </div>

        {isEditing && (
          <div className="profile-actions">
            <button onClick={handleSave} className="profile-btn primary">
              ✓ Save Changes
            </button>
            <button onClick={handleCancel} className="profile-btn secondary">
              ✕ Cancel
            </button>
          </div>
        )}

        <div className="password-card">
          <h3>Change Password</h3>
          <div className="password-row">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button onClick={handlePasswordUpdate} className="profile-btn primary">
              Update Password
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}

export default ProfilePage;
