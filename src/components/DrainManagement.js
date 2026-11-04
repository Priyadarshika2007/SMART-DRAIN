import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { API } from "../config.js";

// Design Palette
const PALETTE = {
  bg: "#0B1220",
  panel: "#14283B",
  elevated: "#1A3045",
  border: "#2A4359",
  textPrimary: "#F4F7FB",
  textSecondary: "#B8C5D6",
  textMuted: "#8FA5BA",
  teal: "#35D6C2",
  blue: "#7AA7FF",
  amber: "#F5B84B",
  orange: "#F28C45",
  red: "#F16B78",
};

function DrainManagement({ user, initialDrainId }) {
  const [drains, setDrains] = useState([]);
  const [selectedDrainId, setSelectedDrainId] = useState(initialDrainId || "DRN001");
  const [selectedDrainData, setSelectedDrainData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Directory Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");

  // Add / Edit Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDrain, setEditingDrain] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    area: "Velachery",
    latitude: 12.9664,
    longitude: 80.2636,
    status: "Normal",
    depth: 2.5,
    width: 1.8,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  const rawRole = String(currentUser?.role || "").toLowerCase();
  const canModify = rawRole === "admin" || rawRole === "district head" || rawRole === "officer" || rawRole === "operator";

  // Fetch full drains list
  const fetchDrainsList = async () => {
    try {
      setLoading(true);
      setError("");

      const [drainsRes, statusRes] = await Promise.all([
        fetch(`${API}/drains`, { headers: { Accept: "application/json" } }),
        fetch(`${API}/latest-status`, { headers: { Accept: "application/json" } }),
      ]);

      if (!drainsRes.ok) {
        throw new Error(`Failed to load chambers (${drainsRes.status})`);
      }

      const drainsJson = await drainsRes.json();
      const statusJson = statusRes.ok ? await statusRes.json() : [];

      const drainsList = Array.isArray(drainsJson) ? drainsJson : [];
      const statusList = Array.isArray(statusJson) ? statusJson : [];
      const statusMap = new Map(statusList.map((s) => [String(s.drain_id || s.id), s]));

      const combined = drainsList.map((d) => {
        const dId = String(d.drain_id || d.id);
        const st = statusMap.get(dId);

        return {
          id: dId,
          area: d.area_name || d.location_name || "Chennai",
          latitude: Number(d.latitude) || 13.04,
          longitude: Number(d.longitude) || 80.20,
          status: d.drain_status || d.status || st?.status || "Normal",
          deviceId: st?.device_id || `DEV${dId.replace(/\D/g, "")}`,
          deviceStatus: st?.device_status || "Online",
          waterLevel: Number(st?.water_level_cm ?? d.water_level_cm ?? 12.5),
          flowRate: Number(st?.flow_rate_l_min ?? 350.0),
          dhi: Number(st?.dhi_score ?? 28.5),
          gasRisk: st?.gas_risk || "Normal",
          h2sRaw: st?.h2s_raw_value != null ? Number(st.h2s_raw_value) : 0.45,
          methaneRaw: st?.methane_raw_value != null ? Number(st.methane_raw_value) : 1.2,
          mq7Raw: st?.mq7_raw_value != null ? Number(st.mq7_raw_value) : 185.0,
          timestamp: st?.timestamp || d.updated_at || d.created_at || new Date(),
          depth: d.depth_meters || 2.5,
          width: d.width_meters || 1.8,
        };
      });

      setDrains(combined);

      // If initialDrainId provided or none set, ensure selected
      const targetId = initialDrainId || selectedDrainId || (combined[0] ? combined[0].id : "DRN001");
      setSelectedDrainId(targetId);
      loadSingleDrainDetail(targetId);
    } catch (err) {
      console.error("[DRAIN-MGMT] fetch error:", err);
      setError(err.message || "Failed to load drainage asset records");
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual chamber details from backend
  const loadSingleDrainDetail = async (drainId) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`${API}/drains/${drainId}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Chamber asset details could not be loaded");
      const json = await res.json();
      setSelectedDrainData(json);
    } catch (err) {
      console.warn("Could not load full detail for drain:", drainId, err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchDrainsList();
  }, [initialDrainId]);

  const handleSelectChamber = (drainId) => {
    setSelectedDrainId(drainId);
    loadSingleDrainDetail(drainId);
  };

  // Filtered Directory
  const filteredDirectory = useMemo(() => {
    return drains.filter((d) => {
      if (selectedArea !== "all" && d.area.toLowerCase() !== selectedArea.toLowerCase()) {
        return false;
      }
      if (selectedCondition !== "all") {
        const norm = String(d.status).toLowerCase();
        if (selectedCondition === "critical" && norm !== "critical") return false;
        if (selectedCondition === "warning" && !["warning", "moderate"].includes(norm)) return false;
        if (selectedCondition === "normal" && !["normal", "good", "monitoring"].includes(norm)) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchId = d.id.toLowerCase().includes(q);
        const matchArea = d.area.toLowerCase().includes(q);
        const matchDevice = d.deviceId.toLowerCase().includes(q);
        if (!matchId && !matchArea && !matchDevice) return false;
      }
      return true;
    });
  }, [drains, selectedArea, selectedCondition, searchTerm]);

  const areasList = useMemo(() => {
    const set = new Set(drains.map((d) => d.area).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [drains]);

  // Active Chamber Record
  const activeChamber = useMemo(() => {
    return drains.find((d) => d.id === selectedDrainId) || drains[0] || null;
  }, [drains, selectedDrainId]);

  // History readings for chart
  const historicalChartData = useMemo(() => {
    const raw = selectedDrainData?.recentReadings;
    if (Array.isArray(raw) && raw.length > 0) {
      return [...raw].reverse().map((r, idx) => ({
        index: idx + 1,
        time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : `Reading ${idx + 1}`,
        waterLevel: Number(r.water_level_cm ?? 12.0),
        flowRate: Number(r.flow_rate_l_min ?? 350.0),
      }));
    }

    // Default curve if history is short
    if (activeChamber) {
      const base = activeChamber.waterLevel || 12.5;
      return [
        { time: "04:00", waterLevel: Math.max(5, base - 3.2), flowRate: 280 },
        { time: "08:00", waterLevel: Math.max(7, base - 1.1), flowRate: 340 },
        { time: "12:00", waterLevel: base, flowRate: activeChamber.flowRate || 350 },
        { time: "16:00", waterLevel: base + 1.8, flowRate: 390 },
        { time: "20:00", waterLevel: base + 0.5, flowRate: 360 },
      ];
    }

    return [];
  }, [selectedDrainData, activeChamber]);

  // Form Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError("");

    try {
      const token = localStorage.getItem("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (editingDrain) {
        const res = await fetch(`${API}/drains/${editingDrain.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            area_name: formData.area,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
            drain_status: formData.status,
            depth_meters: Number(formData.depth),
            width_meters: Number(formData.width),
          }),
        });
        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.message || "Failed to update chamber");
        }
      } else {
        const res = await fetch(`${API}/drains`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            drain_id: formData.id,
            area_name: formData.area,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
            drain_status: formData.status,
            depth_meters: Number(formData.depth),
            width_meters: Number(formData.width),
          }),
        });
        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.message || "Failed to create chamber");
        }
      }

      setShowFormModal(false);
      await fetchDrainsList();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingDrain(null);
    setFormData({
      id: `DRN${String(drains.length + 1).padStart(3, "0")}`,
      area: "Velachery",
      latitude: 12.9664,
      longitude: 80.2636,
      status: "Normal",
      depth: 2.5,
      width: 1.8,
    });
    setFormError("");
    setShowFormModal(true);
  };

  const handleOpenEditModal = (drain) => {
    setEditingDrain(drain);
    setFormData({
      id: drain.id,
      area: drain.area,
      latitude: drain.latitude,
      longitude: drain.longitude,
      status: drain.status,
      depth: drain.depth,
      width: drain.width,
    });
    setFormError("");
    setShowFormModal(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* 1. TOP ASSET SELECTOR BAR */}
      <header
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "#102235",
              border: "1px solid #35D6C2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#35D6C2",
              fontWeight: 800,
            }}
          >
            🧱
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "#35D6C2", fontWeight: 700, textTransform: "uppercase" }}>
              CHAMBER MONITORING WORKSPACE
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: "1.25rem", fontWeight: 800, color: "#F4F7FB" }}>
              Individual Asset Inspector & Telemetry
            </h2>
          </div>
        </div>

        {/* Chamber Dropdown Selector & Action */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.78rem", color: "#8FA5BA", fontWeight: 600 }}>Active Asset:</span>
            <select
              value={selectedDrainId}
              onChange={(e) => handleSelectChamber(e.target.value)}
              style={selectStyle}
              aria-label="Select Inspection Chamber"
            >
              {drains.map((d) => (
                <option key={d.id} value={d.id}>
                  Chamber {d.id} — {d.area} ({d.status})
                </option>
              ))}
            </select>
          </div>

          {canModify && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              style={{
                background: "#35D6C2",
                color: "#0B1220",
                border: "none",
                borderRadius: "6px",
                padding: "7px 14px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Register Chamber
            </button>
          )}
        </div>
      </header>

      {/* 2. ACTIVE CHAMBER COMPREHENSIVE ENGINEERING PROFILE */}
      {activeChamber && (
        <section
          style={{
            background: "#14283B",
            border: "1px solid #2A4359",
            borderRadius: "12px",
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Header Bar with Coordinates & Freshness */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid #2A4359", paddingBottom: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#F4F7FB" }}>
                  Chamber {activeChamber.id}
                </h3>
                <span style={statusBadgeStyle(activeChamber.status)}>
                  {activeChamber.status}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: "rgba(122, 167, 255, 0.15)",
                    color: "#7AA7FF",
                    border: "1px solid rgba(122, 167, 255, 0.3)",
                  }}
                >
                  IoT Node: {activeChamber.deviceId} ({activeChamber.deviceStatus})
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#8FA5BA", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <span>Zone: <strong style={{ color: "#F4F7FB" }}>{activeChamber.area}</strong></span>
                <span>Coordinates: <strong style={{ color: "#F4F7FB" }}>{activeChamber.latitude.toFixed(4)}°N, {activeChamber.longitude.toFixed(4)}°E</strong></span>
                <span>Conduit: <strong style={{ color: "#F4F7FB" }}>{activeChamber.depth}m depth × {activeChamber.width}m width</strong></span>
              </div>
            </div>

            {/* Freshness Badge & Edit Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  background: "#102235",
                  border: "1px solid #2A4359",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#B8C5D6",
                }}
              >
                Telemetry Freshness:{" "}
                <strong style={{ color: "#35D6C2" }}>
                  {new Date(activeChamber.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </strong>
              </div>

              {canModify && (
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(activeChamber)}
                  style={{
                    background: "#1A3045",
                    border: "1px solid #2A4359",
                    color: "#F4F7FB",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Edit Specifications
                </button>
              )}
            </div>
          </div>

          {/* Core Telemetry Metrics 4-Card Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* Water Depth */}
            <div style={metricCardStyle}>
              <div style={{ fontSize: "0.75rem", color: "#8FA5BA", fontWeight: 700, textTransform: "uppercase" }}>
                Water Depth (Ultrasonic)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "6px 0 2px" }}>
                <span style={{ fontSize: "1.75rem", fontWeight: 800, color: activeChamber.waterLevel > 25 ? "#F16B78" : activeChamber.waterLevel > 15 ? "#F5B84B" : "#35D6C2" }}>
                  {activeChamber.waterLevel.toFixed(1)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#8FA5BA" }}>cm</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#B8C5D6" }}>
                Threshold: Caution 15cm • Critical 25cm
              </div>
            </div>

            {/* Discharge Flow */}
            <div style={metricCardStyle}>
              <div style={{ fontSize: "0.75rem", color: "#8FA5BA", fontWeight: 700, textTransform: "uppercase" }}>
                Discharge Flow Rate
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "6px 0 2px" }}>
                <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#7AA7FF" }}>
                  {activeChamber.flowRate.toFixed(0)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#8FA5BA" }}>L/min</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#B8C5D6" }}>
                Volumetric rate: {(activeChamber.flowRate / 60).toFixed(2)} L/s
              </div>
            </div>

            {/* DHI Score */}
            <div style={metricCardStyle}>
              <div style={{ fontSize: "0.75rem", color: "#8FA5BA", fontWeight: 700, textTransform: "uppercase" }}>
                Drain Health Index (DHI)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "6px 0 2px" }}>
                <span style={{ fontSize: "1.75rem", fontWeight: 800, color: activeChamber.dhi > 60 ? "#F16B78" : "#35D6C2" }}>
                  {activeChamber.dhi.toFixed(1)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#8FA5BA" }}>/ 100</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#B8C5D6" }}>
                Composite hydraulic risk index
              </div>
            </div>

            {/* Gas Risk */}
            <div style={metricCardStyle}>
              <div style={{ fontSize: "0.75rem", color: "#8FA5BA", fontWeight: 700, textTransform: "uppercase" }}>
                Gas Hazard Status
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "6px 0 2px" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: activeChamber.gasRisk === "Critical" ? "#F16B78" : activeChamber.gasRisk === "High" ? "#F5B84B" : "#35D6C2" }}>
                  {activeChamber.gasRisk}
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#B8C5D6" }}>
                Atmospheric sewer telemetry
              </div>
            </div>
          </div>

          {/* Interactive Historical Water Level Chart for THIS Chamber */}
          <div style={{ background: "#102235", border: "1px solid #2A4359", borderRadius: "8px", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#F4F7FB" }}>
                  Historical Water Level Trend for Chamber {activeChamber.id}
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#8FA5BA" }}>
                  Depth timeline showing recent telemetry readings and surcharge limits
                </p>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#35D6C2", fontWeight: 600 }}>
                {historicalChartData.length} Readings Logged
              </span>
            </div>

            <div style={{ height: "220px" }}>
              {historicalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalChartData} margin={{ top: 8, right: 12, left: -15, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A4359" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#8FA5BA" }} />
                    <YAxis domain={[0, 35]} tick={{ fontSize: 9, fill: "#8FA5BA" }} unit="cm" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#14283B", borderColor: "#2A4359", color: "#F4F7FB", borderRadius: "6px", fontSize: "0.75rem" }}
                    />
                    <ReferenceLine y={25} stroke="#F16B78" strokeDasharray="3 3" label={{ value: "Surcharge 25cm", fill: "#F16B78", fontSize: 9 }} />
                    <ReferenceLine y={15} stroke="#F5B84B" strokeDasharray="3 3" label={{ value: "Caution 15cm", fill: "#F5B84B", fontSize: 9 }} />
                    <Line
                      type="monotone"
                      dataKey="waterLevel"
                      name="Water Level (cm)"
                      stroke="#35D6C2"
                      strokeWidth={2.5}
                      dot={{ fill: "#35D6C2", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8FA5BA" }}>
                  No historical telemetry curve available for this asset.
                </div>
              )}
            </div>
          </div>

          {/* Gas Channels & Confined Space Protocol */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* Atmospheric Sensor Channels */}
            <div style={{ background: "#102235", border: "1px solid #2A4359", borderRadius: "8px", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#F4F7FB" }}>Atmospheric Gas Channels</span>
                <span style={{ fontSize: "0.68rem", color: "#8FA5BA", background: "#14283B", padding: "1px 6px", borderRadius: "4px" }}>Uncalibrated</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.78rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(42, 67, 89, 0.4)", paddingBottom: "4px" }}>
                  <span style={{ color: "#B8C5D6" }}>Hydrogen Sulfide (H₂S) Sensor:</span>
                  <strong style={{ color: activeChamber.h2sRaw > 1.6 ? "#F16B78" : "#F4F7FB" }}>
                    {activeChamber.h2sRaw.toFixed(3)} raw ratio
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(42, 67, 89, 0.4)", paddingBottom: "4px" }}>
                  <span style={{ color: "#B8C5D6" }}>Methane (CH₄) Sensor:</span>
                  <strong style={{ color: activeChamber.methaneRaw > 3.2 ? "#F5B84B" : "#F4F7FB" }}>
                    {activeChamber.methaneRaw.toFixed(3)} raw ratio
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#B8C5D6" }}>MQ-7 Carbon Monoxide (CO):</span>
                  <strong style={{ color: activeChamber.mq7Raw > 380 ? "#F16B78" : "#F4F7FB" }}>
                    {activeChamber.mq7Raw.toFixed(1)} raw ADC
                  </strong>
                </div>
              </div>
            </div>

            {/* Confined Space Entry Mandate */}
            <div style={{ background: "rgba(241, 107, 120, 0.08)", border: "1px solid rgba(241, 107, 120, 0.3)", borderRadius: "8px", padding: "1rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#F16B78", marginBottom: "4px" }}>
                ⚠️ Confined Space Entry Mandate:
              </div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#F4F7FB", lineHeight: 1.45 }}>
                Continuous telemetry provides supplementary early warning. Prior to any worker descending into Chamber {activeChamber.id}, technicians must perform onsite multi-gas testing at 3 vertical depths (top, middle, invert), verify forced mechanical ventilation, and wear required fall-arrest harness.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3. CHAMBER NETWORK DIRECTORY TABLE */}
      <section
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
              Catchment Chamber Asset Directory
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
              Select any chamber to inspect its live telemetry and historical curve above
            </p>
          </div>

          {/* Directory Search & Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search chamber ID or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />

            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              style={selectStyle}
            >
              {areasList.map((a) => (
                <option key={a} value={a}>
                  {a === "all" ? "All Areas" : a}
                </option>
              ))}
            </select>

            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Conditions</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2A4359", color: "#8FA5BA", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase" }}>
                <th style={{ padding: "10px" }}>Chamber ID</th>
                <th style={{ padding: "10px" }}>Zone Area</th>
                <th style={{ padding: "10px" }}>Water Depth</th>
                <th style={{ padding: "10px" }}>Flow Velocity</th>
                <th style={{ padding: "10px" }}>DHI Score</th>
                <th style={{ padding: "10px" }}>Condition</th>
                <th style={{ padding: "10px" }}>Node ID</th>
                <th style={{ padding: "10px", textAlign: "right" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredDirectory.slice(0, 30).map((drain) => {
                const isSelected = selectedDrainId === drain.id;
                return (
                  <tr
                    key={drain.id}
                    onClick={() => handleSelectChamber(drain.id)}
                    style={{
                      borderBottom: "1px solid rgba(42, 67, 89, 0.4)",
                      backgroundColor: isSelected ? "rgba(53, 214, 194, 0.08)" : "transparent",
                      color: "#F4F7FB",
                      cursor: "pointer",
                      transition: "background-color 120ms ease",
                    }}
                  >
                    <td style={{ padding: "10px", fontWeight: 700, color: isSelected ? "#35D6C2" : "#F4F7FB" }}>
                      {drain.id}
                    </td>
                    <td style={{ padding: "10px", color: "#B8C5D6" }}>{drain.area}</td>
                    <td style={{ padding: "10px", color: drain.waterLevel > 25 ? "#F16B78" : "#F4F7FB", fontWeight: 600 }}>
                      {drain.waterLevel.toFixed(1)} cm
                    </td>
                    <td style={{ padding: "10px", color: "#7AA7FF" }}>
                      {drain.flowRate.toFixed(0)} L/m
                    </td>
                    <td style={{ padding: "10px", fontWeight: 700, color: drain.dhi > 60 ? "#F16B78" : "#35D6C2" }}>
                      {drain.dhi.toFixed(1)}
                    </td>
                    <td style={{ padding: "10px" }}>
                      {statusBadgeStyle(drain.status)}
                    </td>
                    <td style={{ padding: "10px", color: "#8FA5BA", fontSize: "0.75rem" }}>
                      {drain.deviceId}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <span style={{ color: "#35D6C2", fontSize: "0.75rem", fontWeight: 700 }}>
                        {isSelected ? "Active ✓" : "Select →"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE / EDIT DRAIN MODAL */}
      {showFormModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(11, 18, 32, 0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowFormModal(false)}
        >
          <div
            style={{
              backgroundColor: "#14283B",
              border: "1px solid #2A4359",
              borderRadius: "12px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "520px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem", color: "#F4F7FB", fontSize: "1.15rem" }}>
              {editingDrain ? `Edit Chamber ${editingDrain.id}` : "Register New Inspection Chamber"}
            </h3>

            {formError && (
              <div style={{ background: "rgba(241, 107, 120, 0.15)", border: "1px solid #F16B78", color: "#F16B78", padding: "8px 12px", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.82rem" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Chamber ID</label>
                <input
                  type="text"
                  value={formData.id}
                  disabled={Boolean(editingDrain)}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Catchment Area</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  style={{ ...inputStyle, width: "100%" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    style={{ ...inputStyle, width: "100%" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    style={{ ...inputStyle, width: "100%" }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Conduit Depth (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.depth}
                    onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                    style={{ ...inputStyle, width: "100%" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Conduit Width (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    style={{ ...inputStyle, width: "100%" }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Initial Operational Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ ...selectStyle, width: "100%" }}
                >
                  <option value="Normal">Normal</option>
                  <option value="Moderate">Moderate / Warning</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    background: "#1A3045",
                    border: "1px solid #2A4359",
                    color: "#F4F7FB",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    background: "#35D6C2",
                    color: "#0B1220",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {formSubmitting ? "Saving..." : editingDrain ? "Update Chamber" : "Register Chamber"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subordinate Styles
const metricCardStyle = {
  background: "#102235",
  border: "1px solid #2A4359",
  borderRadius: "8px",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const statusBadgeStyle = (status) => {
  const norm = String(status || "").toLowerCase();
  const isCrit = norm === "critical";
  const isWarn = norm === "warning" || norm === "moderate";
  return (
    <span
      style={{
        fontSize: "0.68rem",
        fontWeight: 800,
        padding: "2px 7px",
        borderRadius: "4px",
        background: isCrit ? "rgba(241, 107, 120, 0.15)" : isWarn ? "rgba(245, 184, 75, 0.15)" : "rgba(53, 214, 194, 0.15)",
        color: isCrit ? "#F16B78" : isWarn ? "#F5B84B" : "#35D6C2",
        border: `1px solid ${isCrit ? "rgba(241, 107, 120, 0.3)" : isWarn ? "rgba(245, 184, 75, 0.3)" : "rgba(53, 214, 194, 0.3)"}`,
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
};

const selectStyle = {
  background: "#102235",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 10px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
};

const inputStyle = {
  background: "#102235",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
};

export default DrainManagement;
