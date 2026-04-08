import React, { useState, useMemo } from "react";

function DrainManagement({ apiData }) {
  // Demo drains from apiData or defaults
  const [drains, setDrains] = useState(() => {
    if (apiData && apiData.length > 0) {
      return apiData.map((item, idx) => ({
        id: item.drain_id,
        area: item.area_name,
        waterLevel: item.water_level_cm,
        dhi: item.dhi_score,
        status: item.status,
      }));
    }
    return [
      { id: "D001", area: "Velachery", waterLevel: 45, dhi: 65.5, status: "Critical" },
      { id: "D002", area: "Triplicane", waterLevel: 30, dhi: 42.3, status: "Moderate" },
      { id: "D003", area: "Mylapore", waterLevel: 15, dhi: 25.1, status: "Normal" },
    ];
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    area: "",
    waterLevel: 0,
    dhi: 0,
    status: "Normal",
  });

  const areas = useMemo(() => {
    const uniqueAreas = [...new Set(drains.map((d) => d.area))];
    return ["Velachery", "Triplicane", "Mylapore", ...uniqueAreas].filter((a, i, arr) => arr.indexOf(a) === i);
  }, [drains]);

  const resetForm = () => {
    setFormData({ id: "", area: "", waterLevel: 0, dhi: 0, status: "Normal" });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEditClick = (drain) => {
    setFormData({
      id: drain.id || "",
      area: drain.area || "",
      waterLevel: Number(drain.waterLevel) || 0,
      dhi: Number(drain.dhi) || 0,
      status: drain.status || "Normal",
    });
    setEditingId(drain.id);
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formData.id || !formData.area) {
      alert("Please fill required fields");
      return;
    }

    if (editingId) {
      setDrains(drains.map((d) => (d.id === editingId ? formData : d)));
    } else {
      if (drains.some((d) => d.id === formData.id)) {
        alert("Drain ID already exists");
        return;
      }
      setDrains([...drains, formData]);
    }

    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this drain?")) {
      setDrains(drains.filter((d) => d.id !== id));
    }
  };

  const getStatusColor = (status) => {
    if (status === "Critical") return { bg: "#fee2e2", text: "#b42318" };
    if (status === "Moderate") return { bg: "#fef3f2", text: "#c2410c" };
    return { bg: "#dcfce7", text: "#15803d" };
  };

  return (
    <main className="dashboard-main" style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#111827", fontSize: "20px", fontWeight: "600", margin: 0 }}>💧 Drain Management</h2>
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
          ➕ Add Drain
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <article className="gov-panel" style={{ marginBottom: "20px", padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Drain" : "Add New Drain"}</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Drain ID *</label>
              <input
                type="text"
                value={formData.id || ""}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g., D001"
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "4px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  backgroundColor: "white",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Area *</label>
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
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Water Level (cm)</label>
              <input
                type="number"
                value={formData.waterLevel ?? 0}
                onChange={(e) => setFormData({ ...formData, waterLevel: Number(e.target.value) })}
                placeholder="0"
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
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>DHI Score</label>
              <input
                type="number"
                value={formData.dhi ?? 0}
                onChange={(e) => setFormData({ ...formData, dhi: Number(e.target.value) })}
                placeholder="0"
                step="0.1"
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
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "600" }}>Status</label>
              <select
                value={formData.status || "Normal"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                <option value="Normal">Normal</option>
                <option value="Moderate">Moderate</option>
                <option value="Critical">Critical</option>
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

      {/* Drains Table */}
      <article className="gov-panel">
        <h3>All Drains ({drains.length})</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="alerts-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Drain ID</th>
                <th>Area</th>
                <th>Water Level (cm)</th>
                <th>DHI Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drains.map((drain) => {
                const colors = getStatusColor(drain.status);
                return (
                  <tr key={drain.id}>
                    <td style={{ fontWeight: "600" }}>{drain.id}</td>
                    <td>{drain.area}</td>
                    <td>{drain.waterLevel} cm</td>
                    <td style={{ fontWeight: "600", color: drain.dhi > 60 ? "#b42318" : drain.dhi > 40 ? "#c2410c" : "#15803d" }}>
                      {drain.dhi.toFixed(2)}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {drain.status === "Critical" ? "🔴" : drain.status === "Moderate" ? "🟡" : "🟢"} {drain.status}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleEditClick(drain)}
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
                        onClick={() => handleDelete(drain.id)}
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
                );
              })}
            </tbody>
          </table>
          {drains.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>No drains found</div>
          )}
        </div>
      </article>
    </main>
  );
}

export default DrainManagement;
