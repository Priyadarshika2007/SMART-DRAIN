import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar.js";

function Profile() {
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      const userJson = localStorage.getItem("user");
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user) {
        navigate("/login");
        return;
      }
      setProfileUser(user);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  if (!profileUser) {
    return null;
  }

  const displayRole = profileUser?.role || "—";
  const displayArea = String(displayRole || "").toLowerCase() === "admin"
    ? "ALL"
    : profileUser?.area || (Array.isArray(profileUser?.assignedAreas) ? profileUser.assignedAreas.join(", ") : "—");

  const handlePasswordUpdate = (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentPassword) {
      setErrorMessage("Current password is required.");
      return;
    }

    if (currentPassword !== profileUser.password) {
      setErrorMessage("Current password is incorrect.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    try {
      const updatedUser = { ...profileUser, password: newPassword };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setProfileUser(updatedUser);
      setSuccessMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMessage("Unable to update password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <section className="gov-dashboard-page">
      <div className="gov-dashboard-layout">
        <DashboardSidebar activeItem="profile" onNavigate={() => navigate("/dashboard")} />

        <div className="gov-dashboard-main">
          <div className="gov-dashboard-shell">
            <header className="gov-topbar">
              <div>
                <h2>Profile</h2>
                <p>Manage your account details and password settings.</p>
              </div>
              <div className="gov-topbar-controls">
                <button type="button" className="gov-logout-btn" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
                <button type="button" className="gov-logout-btn" onClick={handleLogout}>Logout</button>
              </div>
            </header>

            <section className="gov-profile-card">
              <h3>User Information</h3>
              <div className="gov-profile-grid">
                <p><strong>Name:</strong> {profileUser.name || "—"}</p>
                <p><strong>Email:</strong> {profileUser.email || "—"}</p>
                <p><strong>Role:</strong> {displayRole}</p>
                <p><strong>Assigned Areas:</strong> {displayArea || "—"}</p>
                <p><strong>Username:</strong> {profileUser.username || "—"}</p>
              </div>
            </section>

            <section className="gov-profile-card">
              <h3>Change Password</h3>
              <form className="gov-password-form" onSubmit={handlePasswordUpdate}>
                <label>
                  <span>Current Password</span>
                  <div className="gov-password-field">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                    <button type="button" className="gov-toggle-btn" onClick={() => setShowCurrentPassword((value) => !value)}>
                      {showCurrentPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <label>
                  <span>New Password</span>
                  <div className="gov-password-field">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <button type="button" className="gov-toggle-btn" onClick={() => setShowNewPassword((value) => !value)}>
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <label>
                  <span>Confirm Password</span>
                  <div className="gov-password-field">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter new password"
                      required
                    />
                    <button type="button" className="gov-toggle-btn" onClick={() => setShowConfirmPassword((value) => !value)}>
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                {errorMessage && <p className="gov-message gov-message-error">{errorMessage}</p>}
                {successMessage && <p className="gov-message gov-message-success">{successMessage}</p>}

                <button type="submit" className="gov-password-submit">Update Password</button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Profile;
