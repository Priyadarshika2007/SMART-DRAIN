import React, { useState, useMemo, useEffect } from "react";
import { API } from "../config.js";

function UserManagement({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    role: "Officer",
    area: "Velachery",
    password: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Details Modal State
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      const userJson = localStorage.getItem("user");
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }, [user]);

  const rawRole = String(currentUser?.role || "").toLowerCase();
  const isAdmin = rawRole === "admin" || rawRole === "district head";

  const fetchUsersList = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/users`, { headers: { Accept: "application/json" } });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Failed to load users from database");
      }

      setUsers(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      console.error("[USER-MGMT] fetch error:", err);
      setError(err.message || "Failed to load user records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const areasList = useMemo(() => {
    const defaultChennaiAreas = [
      "ALL", "Chennai", "Velachery", "Tambaram", "Ambattur", "Avadi",
      "Sholinganallur", "Perungudi", "Madhavaram", "Thiruvottiyur", "Pallavaram"
    ];
    const userAreas = users.map((u) => u.area).filter(Boolean);
    const combined = ["all", ...defaultChennaiAreas, ...userAreas];
    return Array.from(new Set(combined));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (selectedRole !== "all") {
        const r = String(u.role || "").toLowerCase();
        if (selectedRole === "admin" && r !== "admin" && r !== "district head") return false;
        if (selectedRole === "officer" && r !== "officer" && r !== "operator") return false;
        if (selectedRole === "worker" && r !== "worker" && r !== "maintenance" && r !== "supervisor") return false;
        if (selectedRole === "viewer" && r !== "viewer") return false;
      }
      // Area filter
      if (selectedArea !== "all") {
        const a = String(u.area || "").toLowerCase();
        if (a !== selectedArea.toLowerCase()) return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchUser = (u.username || "").toLowerCase().includes(q);
        const matchName = (u.name || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        if (!matchUser && !matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [users, selectedRole, selectedArea, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      name: "",
      email: "",
      role: "Officer",
      area: "Velachery",
      password: "Password@123",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      name: u.name || u.fullName || "",
      email: u.email || "",
      role: u.role || "Officer",
      area: u.area || "Velachery",
      password: "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError("");

    try {
      if (!formData.username.trim() || !formData.name.trim()) {
        throw new Error("Username and Display Name are required.");
      }

      if (editingUser) {
        // PUT update
        const res = await fetch(`${API}/users/${editingUser.id || editingUser.username}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            area: formData.role === "Admin" ? "ALL" : formData.area,
            ...(formData.password ? { password: formData.password } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to update user.");
      } else {
        // POST create
        const res = await fetch(`${API}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            area: formData.role === "Admin" ? "ALL" : formData.area,
            password: formData.password || "Password@123",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to create user.");
      }

      setShowModal(false);
      await fetchUsersList();
    } catch (err) {
      setFormError(err.message || "Operation failed.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (userItem) => {
    const isCurrentlyActive = userItem.is_active !== false;
    const actionText = isCurrentlyActive ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${actionText} user account ${userItem.username}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/users/${userItem.id || userItem.username}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isCurrentlyActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Status toggle failed");
      await fetchUsersList();
    } catch (err) {
      alert(err.message || "Failed to toggle status");
    }
  };

  if (!isAdmin) {
    return (
      <div
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "14px",
          padding: "3rem 2rem",
          textAlign: "center",
          color: "#F4F7FB",
        }}
      >
        <h3 style={{ color: "#F16B78", marginTop: 0 }}>Access Restricted</h3>
        <p style={{ color: "#B8C5D6", maxWidth: "480px", margin: "0 auto" }}>
          User access management is restricted to authorized Municipal Administrators and District Heads.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header Panel */}
      <article
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "14px",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#F4F7FB" }}>
              Municipal User Access &amp; Governance
            </h3>
            <p style={{ margin: "3px 0 0 0", color: "#8FA5BA", fontSize: "0.85rem" }}>
              Manage municipal operator roles, regional scopes, and access credentials in MongoDB.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#35D6C2",
              color: "#0B1220",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span>+</span>
            <span>Create New User</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Search username, name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: "#0B1220",
              border: "1px solid #2A4359",
              borderRadius: "6px",
              padding: "7px 12px",
              color: "#F4F7FB",
              fontSize: "0.85rem",
              width: "250px",
              outline: "none",
            }}
          />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              background: "#0B1220",
              border: "1px solid #2A4359",
              borderRadius: "6px",
              padding: "7px 12px",
              color: "#F4F7FB",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator / District Head</option>
            <option value="officer">Municipal Officer / Operator</option>
            <option value="worker">Worker / Maintenance</option>
            <option value="viewer">Viewer (Read-Only)</option>
          </select>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            style={{
              background: "#0B1220",
              border: "1px solid #2A4359",
              borderRadius: "6px",
              padding: "7px 12px",
              color: "#F4F7FB",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            {areasList.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All Municipal Areas" : a}
              </option>
            ))}
          </select>
        </div>

        {/* Users Table */}
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#B8C5D6" }}>
            Loading municipal accounts from MongoDB...
          </div>
        ) : error ? (
          <div style={{ padding: "2rem", color: "#F16B78", textAlign: "center" }}>
            {error}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2A4359", color: "#8FA5BA", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Username</th>
                  <th style={{ padding: "10px" }}>Display Name</th>
                  <th style={{ padding: "10px" }}>Email</th>
                  <th style={{ padding: "10px" }}>Role</th>
                  <th style={{ padding: "10px" }}>Assigned Zone</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isActive = u.is_active !== false;
                  return (
                    <tr
                      key={u.id || u.username}
                      style={{ borderBottom: "1px solid #2A4359", color: "#F4F7FB" }}
                    >
                      <td style={{ padding: "10px", fontWeight: 700, color: "#35D6C2" }}>
                        {u.username}
                      </td>
                      <td style={{ padding: "10px", color: "#F4F7FB" }}>
                        {u.name || u.fullName || u.username}
                      </td>
                      <td style={{ padding: "10px", color: "#B8C5D6" }}>
                        {u.email || "—"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: u.role === "Admin" ? "rgba(241, 107, 120, 0.15)" : "rgba(122, 167, 255, 0.15)",
                            color: u.role === "Admin" ? "#F16B78" : "#7AA7FF",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            border: `1px solid ${u.role === "Admin" ? "#F16B78" : "#7AA7FF"}40`,
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "#B8C5D6" }}>
                        {u.area || "Chennai"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            background: isActive ? "rgba(53, 214, 194, 0.15)" : "rgba(132, 152, 174, 0.15)",
                            color: isActive ? "#35D6C2" : "#8498AE",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                          }}
                        >
                          {isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedUserDetails(u)}
                          style={userActionBtnStyle("#7AA7FF")}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(u)}
                          style={userActionBtnStyle("#35D6C2")}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          style={userActionBtnStyle(isActive ? "#F16B78" : "#F5B84B")}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* User Details Modal */}
      {selectedUserDetails && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalDialogStyle, maxWidth: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #304256", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "#F4F7FB" }}>
                User Account Overview
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUserDetails(null)}
                style={{ background: "none", border: "none", color: "#8498AE", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Username:</span>
                <span style={{ color: "#35D6C2", fontWeight: 700 }}>{selectedUserDetails.username}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Display Name:</span>
                <span style={{ color: "#F4F7FB" }}>{selectedUserDetails.name || selectedUserDetails.fullName}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Email:</span>
                <span style={{ color: "#B8C5D6" }}>{selectedUserDetails.email || "No email assigned"}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Role:</span>
                <span style={{ color: "#7AA7FF", fontWeight: 700 }}>{selectedUserDetails.role}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Municipal Zone Scope:</span>
                <span style={{ color: "#F4F7FB" }}>{selectedUserDetails.area || "Chennai"}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Account Status:</span>
                <span style={{ color: selectedUserDetails.is_active !== false ? "#35D6C2" : "#8498AE", fontWeight: 700 }}>
                  {selectedUserDetails.is_active !== false ? "Active" : "Deactivated"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                type="button"
                className="udx-btn udx-btn-secondary"
                onClick={() => setSelectedUserDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showModal && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalDialogStyle, maxWidth: "480px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#F4F7FB" }}>
              {editingUser ? `Edit Account: ${editingUser.username}` : "Create Municipal Account"}
            </h3>

            {formError && (
              <div style={{ padding: "8px 12px", background: "rgba(241, 107, 120, 0.15)", border: "1px solid #F16B78", borderRadius: "6px", color: "#F16B78", fontSize: "0.82rem", marginBottom: "12px" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveUser} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {!editingUser && (
                <div>
                  <label style={formLabelStyle}>Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. officer_tambaram"
                    style={formInputStyle}
                    required
                  />
                </div>
              )}

              <div>
                <label style={formLabelStyle}>Full Name / Display Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                  style={formInputStyle}
                  required
                />
              </div>

              <div>
                <label style={formLabelStyle}>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. rajesh@urbandrain.local"
                  style={formInputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={formLabelStyle}>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={formInputStyle}
                  >
                    <option value="Admin">Admin (System Administrator)</option>
                    <option value="Authority">Authority (Monitoring & Operations)</option>
                    <option value="Worker">Worker (Inspection & Maintenance)</option>
                  </select>
                </div>

                <div>
                  <label style={formLabelStyle}>Assigned Catchment Zone</label>
                  <input
                    type="text"
                    value={formData.role === "Admin" ? "ALL" : formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    disabled={formData.role === "Admin"}
                    style={{ ...formInputStyle, opacity: formData.role === "Admin" ? 0.6 : 1 }}
                  />
                </div>
              </div>

              <div>
                <label style={formLabelStyle}>
                  {editingUser ? "Reset Password (leave empty to keep unchanged)" : "Initial Password *"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "••••••••" : "Minimum 6 characters"}
                  style={formInputStyle}
                  required={!editingUser}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="udx-btn udx-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="udx-btn udx-btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Persisting..." : editingUser ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const userActionBtnStyle = (color) => ({
  background: "none",
  border: `1px solid ${color}50`,
  color: color,
  borderRadius: "4px",
  padding: "4px 8px",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  marginLeft: "6px",
});

const modalBackdropStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(11, 18, 32, 0.85)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "1rem",
};

const modalDialogStyle = {
  background: "#14283B",
  border: "1px solid #2A4359",
  borderRadius: "14px",
  padding: "1.75rem",
  width: "100%",
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
};

const detailRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 12px",
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  fontSize: "0.85rem",
};

const detailKeyStyle = {
  color: "#8FA5BA",
};

const formLabelStyle = {
  display: "block",
  fontSize: "0.78rem",
  color: "#B8C5D6",
  marginBottom: "4px",
  fontWeight: 600,
};

const formInputStyle = {
  width: "100%",
  padding: "8px 12px",
  background: "#0B1220",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  color: "#F4F7FB",
  fontSize: "0.85rem",
  outline: "none",
  boxSizing: "border-box",
};

export default UserManagement;
