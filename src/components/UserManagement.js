import React, { useState, useMemo, useEffect } from "react";
import { API } from "../config.js";

function UserManagement({ apiData }) {
  const [users, setUsers] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ username: "", name: "", email: "", area: "", role: "Officer" });

  const getRoleLower = (role) => String(role || "").toLowerCase();

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API}/users`);
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.message || "Unable to fetch users");
        }

        if (!isMounted) return;
        setUsers(Array.isArray(json?.data) ? json.data : []);
      } catch (error) {
        console.error("[USERS] fetch failed", error);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const areas = useMemo(() => {
    if (!apiData) return [];
    const uniqueAreas = [...new Set(apiData.map((item) => item.area_name))];
    return ["Velachery", "Triplicane", "Mylapore", ...uniqueAreas].filter((a, i, arr) => arr.indexOf(a) === i);
  }, [apiData]);

  const resetForm = () => {
    setFormData({ username: "", name: "", email: "", area: "", role: "Officer" });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEditClick = (selectedUser) => {
    setFormData(selectedUser);
    setEditingId(selectedUser.id);
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formData.username || !formData.name || !formData.email) {
      alert("Please fill all fields");
      return;
    }

    if (editingId) {
      setUsers(users.map((u) => (u.id === editingId ? { ...formData, id: editingId } : u)));
    } else {
      setUsers([...users, { ...formData, id: Date.now() }]);
    }

    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  return (
    <main className="dashboard-main" style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#111827", fontSize: "20px", fontWeight: "600", margin: 0 }}>👥 User Management</h2>
        <button
          onClick={handleAddClick}
          style={{
            padding: "10px 16px",
            backgroundColor: "#15803d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          ➕ Add User
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <article className="gov-panel" style={{ marginBottom: "20px", padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit User" : "Add New User"}</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Username</label>
              <input
                type="text"
                value={formData.username || ""}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g., officer1"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Name</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Email</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Area</label>
              <select
                value={formData.area || ""}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select Area</option>
                {areas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Role</label>
              <select
                value={formData.role || "Officer"}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              >
                <option value="Officer">Officer</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button
              onClick={handleSave}
              style={{
                padding: "10px 16px",
                backgroundColor: "#15803d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              ✓ Save
            </button>
            <button
              onClick={resetForm}
              style={{
                padding: "10px 16px",
                backgroundColor: "#e5e7eb",
                color: "#374151",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </article>
      )}

      {/* Users Table */}
      <article className="gov-panel">
        <h3>All Users ({users.length})</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="alerts-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Area</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: "600" }}>@{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        backgroundColor: user.area === "ALL" ? "#fef3f2" : "#f3f4f6",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: user.area === "ALL" ? "#c2410c" : "#374151",
                      }}
                    >
                      {user.area === "ALL" ? "🌍 All Areas" : user.area}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const roleLower = getRoleLower(user.role);
                      const isAdmin = roleLower === "admin";
                      const isSupervisor = roleLower === "supervisor";

                      return (
                    <span
                      style={{
                        padding: "4px 8px",
                        backgroundColor: isAdmin ? "#ecfdf5" : "#f0fdf4",
                        color: isAdmin ? "#047857" : "#166534",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {isAdmin ? "🔑" : isSupervisor ? "👨‍💼" : "👷"} {user.role}
                    </span>
                      );
                    })()}
                  </td>
                  <td style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleEditClick(user)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#1d4ed8",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#fee2e2",
                        color: "#b42318",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </main>
  );
}

export default UserManagement;
