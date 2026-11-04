import React, { useEffect, useMemo, useState } from "react";
import { API } from "../config.js";

function DeviceHealthPage({ user, onNavigateToDrain }) {
  const [overview, setOverview] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceDetail, setDeviceDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Maintenance log modal state
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceAction, setMaintenanceAction] = useState("Inspect wiring and power supply");
  const [technicianName, setTechnicianName] = useState(user?.name || user?.username || "Field Technician");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);

  // Load overview and device list
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        };

        const [overviewRes, devicesRes] = await Promise.all([
          fetch(`${API}/device-health/overview`, { headers }),
          fetch(`${API}/device-health/devices`, { headers }),
        ]);

        if (!overviewRes.ok || !devicesRes.ok) {
          throw new Error("Failed to load device health records");
        }

        const [overviewData, devicesData] = await Promise.all([
          overviewRes.json(),
          devicesRes.json(),
        ]);

        if (!isMounted) return;

        setOverview(overviewData);
        setDevices(devicesData.data || []);
        setError("");
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load device health");
        setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load single device detail when selected
  useEffect(() => {
    if (!selectedDevice) {
      setDeviceDetail(null);
      return;
    }

    let isMounted = true;
    async function loadDetail() {
      try {
        setLoadingDetail(true);
        const token = localStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        };

        const res = await fetch(`${API}/device-health/devices/${selectedDevice.device_id}`, { headers });
        if (!res.ok) throw new Error("Failed to load device diagnostic details");
        const data = await res.json();

        if (!isMounted) return;
        setDeviceDetail(data);
        setLoadingDetail(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message);
        setLoadingDetail(false);
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedDevice]);

  // Trigger diagnostic engine evaluation
  const handleRunDiagnostics = async () => {
    try {
      setActionSuccess("Running telemetry diagnostics on MongoDB sensor records...");
      const token = localStorage.getItem("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const res = await fetch(`${API}/device-health/run-diagnostics`, {
        method: "POST",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Diagnostics failed");

      setActionSuccess(`✓ ${data.message}`);

      // Refresh data
      const [overviewRes, devicesRes] = await Promise.all([
        fetch(`${API}/device-health/overview`, { headers }),
        fetch(`${API}/device-health/devices`, { headers }),
      ]);
      const [ovData, devData] = await Promise.all([overviewRes.json(), devicesRes.json()]);
      setOverview(ovData);
      setDevices(devData.data || []);

      setTimeout(() => setActionSuccess(""), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Submit maintenance action
  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;

    try {
      setSubmittingMaintenance(true);
      const token = localStorage.getItem("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const res = await fetch(`${API}/device-health/maintenance`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          device_id: selectedDevice.device_id,
          drain_id: selectedDevice.drain_id,
          action_type: maintenanceAction,
          technician_name: technicianName,
          notes: maintenanceNotes,
          calibrated: isCalibrated,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to record maintenance");

      setActionSuccess(`✓ Maintenance logged for Device ${selectedDevice.device_id}`);
      setMaintenanceModalOpen(false);
      setMaintenanceNotes("");
      setIsCalibrated(false);

      // Reload device detail
      const detailRes = await fetch(`${API}/device-health/devices/${selectedDevice.device_id}`, { headers });
      if (detailRes.ok) {
        const d = await detailRes.json();
        setDeviceDetail(d);
      }

      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingMaintenance(false);
    }
  };

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchArea = selectedArea === "all" || (d.area_name && d.area_name.toLowerCase() === selectedArea.toLowerCase());
      const matchStatus = selectedStatus === "all" || d.status.toLowerCase().includes(selectedStatus.toLowerCase());
      const matchSearch =
        !searchQuery ||
        d.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.drain_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.area_name && d.area_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        d.status.toLowerCase().includes(searchQuery.toLowerCase());
      return matchArea && matchStatus && matchSearch;
    });
  }, [devices, selectedArea, selectedStatus, searchQuery]);

  // Unique areas
  const areas = useMemo(() => {
    const list = [...new Set(devices.map((d) => d.area_name).filter(Boolean))];
    return list.sort();
  }, [devices]);

  const counts = overview?.counts || {
    total: devices.length,
    healthy: devices.filter((d) => d.status === "Healthy").length,
    warning: devices.filter((d) => d.status.includes("Warning")).length,
    suspected_fault: devices.filter((d) => d.status.includes("Suspected")).length,
    stale: devices.filter((d) => d.status.includes("Stale")).length,
    replacement_recommended: devices.filter((d) => d.status.includes("Replacement")).length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* SUCCESS / ERROR ALERTS */}
      {actionSuccess && (
        <div style={{ background: "rgba(53, 214, 194, 0.15)", border: "1px solid #35D6C2", color: "#35D6C2", padding: "10px 16px", borderRadius: "8px", fontSize: "0.85rem" }}>
          {actionSuccess}
        </div>
      )}
      {error && (
        <div style={{ background: "rgba(241, 107, 120, 0.15)", border: "1px solid #F16B78", color: "#F16B78", padding: "10px 16px", borderRadius: "8px", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* TOP HEADER CONTROLS */}
      <div
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 800, color: "#F4F7FB" }}>
            Hardware Diagnostics & Maintenance Control
          </h2>
          <span style={{ fontSize: "0.8rem", color: "#8FA5BA" }}>
            Automated sensor plausibility evaluation, telemetry freshness monitoring & technician maintenance logs
          </span>
        </div>

        <button
          type="button"
          onClick={handleRunDiagnostics}
          style={{
            background: "linear-gradient(135deg, #35D6C2 0%, #1A3045 100%)",
            border: "1px solid #35D6C2",
            color: "#0B1220",
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Run Diagnostic Scan
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA", fontWeight: 700, textTransform: "uppercase" }}>Total Inventory</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F4F7FB", margin: "4px 0" }}>{counts.total}</div>
          <div style={{ fontSize: "0.75rem", color: "#7AA7FF" }}>Active Telemetry Nodes</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #35D6C2" }}>
          <div style={{ fontSize: "0.75rem", color: "#35D6C2", fontWeight: 700, textTransform: "uppercase" }}>Healthy Devices</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#35D6C2", margin: "4px 0" }}>{counts.healthy}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Nominal Telemetry</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F5B84B" }}>
          <div style={{ fontSize: "0.75rem", color: "#F5B84B", fontWeight: 700, textTransform: "uppercase" }}>Inspection Recommended</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F5B84B", margin: "4px 0" }}>{counts.warning}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Minor Anomaly / Spikes</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F28C45" }}>
          <div style={{ fontSize: "0.75rem", color: "#F28C45", fontWeight: 700, textTransform: "uppercase" }}>Suspected Sensor Faults</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F28C45", margin: "4px 0" }}>{counts.suspected_fault}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Out-of-Bounds / Stuck</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #7AA7FF" }}>
          <div style={{ fontSize: "0.75rem", color: "#7AA7FF", fontWeight: 700, textTransform: "uppercase" }}>Stale / Offline</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#7AA7FF", margin: "4px 0" }}>{counts.stale}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Comm Delay &gt; 48h</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F16B78" }}>
          <div style={{ fontSize: "0.75rem", color: "#F16B78", fontWeight: 700, textTransform: "uppercase" }}>Replacement Assessment</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F16B78", margin: "4px 0" }}>{counts.replacement_recommended}</div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Repeated Out-of-Range</div>
        </div>
      </div>

      {/* FILTER TOOLBAR & DEVICE INVENTORY TABLE */}
      <div
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "#F4F7FB" }}>
              Device Inventory & Telemetry Health Status
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#8FA5BA" }}>
              Showing {filteredDevices.length} devices with verified hardware diagnostics
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search device, chamber ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={inputStyle}
            />

            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Areas</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Health Statuses</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Inspection Recommended</option>
              <option value="suspected">Suspected Fault</option>
              <option value="stale">Stale / Offline</option>
              <option value="replacement">Replacement Assessment</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "#F4F7FB" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2A4359", textAlign: "left", color: "#8FA5BA", fontSize: "0.75rem", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 12px" }}>Device ID</th>
                <th style={{ padding: "10px 12px" }}>Chamber</th>
                <th style={{ padding: "10px 12px" }}>Area</th>
                <th style={{ padding: "10px 12px" }}>Controller & Firmware</th>
                <th style={{ padding: "10px 12px" }}>Diagnostic Status</th>
                <th style={{ padding: "10px 12px" }}>Primary Diagnostic Finding</th>
                <th style={{ padding: "10px 12px" }}>Data Freshness</th>
                <th style={{ padding: "10px 12px" }}>Recommended Maintenance</th>
                <th style={{ padding: "10px 12px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((dev) => {
                const statusColor = dev.status === "Healthy"
                  ? "#35D6C2"
                  : dev.status.includes("Warning")
                  ? "#F5B84B"
                  : dev.status.includes("Stale")
                  ? "#7AA7FF"
                  : dev.status.includes("Suspected")
                  ? "#F28C45"
                  : "#F16B78";

                return (
                  <tr
                    key={dev.device_id}
                    style={{
                      borderBottom: "1px solid rgba(42, 67, 89, 0.5)",
                    }}
                  >
                    <td style={{ padding: "12px", fontWeight: 700, color: "#35D6C2" }}>
                      {dev.device_id}
                    </td>
                    <td style={{ padding: "12px", fontWeight: 600, color: "#7AA7FF" }}>
                      {dev.drain_id}
                    </td>
                    <td style={{ padding: "12px", color: "#B8C5D6" }}>
                      {dev.area_name || "Chennai"}
                    </td>
                    <td style={{ padding: "12px", color: "#8FA5BA", fontSize: "0.78rem" }}>
                      {dev.controller_type || "Arduino UNO"} • {dev.firmware_version || "V2.0"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          backgroundColor: `${statusColor}20`,
                          color: statusColor,
                          border: `1px solid ${statusColor}40`,
                        }}
                      >
                        {dev.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", maxWidth: "240px", fontSize: "0.78rem", color: "#B8C5D6" }}>
                      {dev.primary_issue}
                    </td>
                    <td style={{ padding: "12px", fontSize: "0.78rem", color: dev.data_freshness.includes("Stale") ? "#F5B84B" : "#B8C5D6" }}>
                      {dev.data_freshness}
                    </td>
                    <td style={{ padding: "12px", maxWidth: "240px", fontSize: "0.75rem", color: "#8FA5BA" }}>
                      {dev.recommendations?.[0] || "Routine check"}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDevice(dev)}
                        style={{
                          background: "#1A3045",
                          border: "1px solid #2A4359",
                          borderRadius: "6px",
                          color: "#35D6C2",
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Diagnostics
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEVICE DIAGNOSTIC INSPECTION MODAL */}
      {selectedDevice && (
        <div
          style={{
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
          }}
          onClick={() => setSelectedDevice(null)}
        >
          <div
            style={{
              backgroundColor: "#14283B",
              border: "1px solid #2A4359",
              borderRadius: "12px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "760px",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #2A4359", paddingBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: "0 0 4px", color: "#F4F7FB", fontSize: "1.25rem" }}>
                  Hardware Diagnostics: {selectedDevice.device_id}
                </h3>
                <span style={{ fontSize: "0.82rem", color: "#35D6C2" }}>
                  Inspection Chamber: {selectedDevice.drain_id} • Area: {selectedDevice.area_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDevice(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8FA5BA",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#B8C5D6" }}>
                Loading hardware telemetry and maintenance history...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Health Verdict Box */}
                <div style={{ background: "#1A3045", padding: "1rem", borderRadius: "8px", border: "1px solid #2A4359" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#8FA5BA", textTransform: "uppercase", fontWeight: 700 }}>
                      Diagnostic Classification
                    </span>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        backgroundColor: "rgba(53, 214, 194, 0.15)",
                        color: "#35D6C2",
                      }}
                    >
                      {selectedDevice.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#F4F7FB", marginBottom: "8px" }}>
                    <strong>Primary Diagnostic Finding:</strong> {selectedDevice.primary_issue}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#B8C5D6" }}>
                    Telemetry gap: {selectedDevice.elapsed_hours}h • Data Freshness: {selectedDevice.data_freshness}
                  </div>
                </div>

                {/* Specific Recommendations */}
                <div style={{ background: "rgba(245, 184, 75, 0.08)", border: "1px solid rgba(245, 184, 75, 0.3)", padding: "1rem", borderRadius: "8px" }}>
                  <strong style={{ color: "#F5B84B", fontSize: "0.82rem", display: "block", marginBottom: "6px" }}>
                    Field Maintenance Guidance:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "#F4F7FB", lineHeight: 1.5 }}>
                    {selectedDevice.recommendations?.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>

                {/* Latest Reading Telemetry */}
                {selectedDevice.latest_reading && (
                  <div style={{ background: "#1A3045", padding: "1rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#8FA5BA", marginBottom: "8px", textTransform: "uppercase" }}>
                      Latest Sensor Transmissions
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
                      <div style={{ background: "#14283B", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.7rem", color: "#8FA5BA" }}>Water Level</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                          {selectedDevice.latest_reading.water_level_cm} cm
                        </div>
                      </div>
                      <div style={{ background: "#14283B", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.7rem", color: "#8FA5BA" }}>Flow Rate</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                          {selectedDevice.latest_reading.flow_rate_l_min} L/min
                        </div>
                      </div>
                      <div style={{ background: "#14283B", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.7rem", color: "#F16B78" }}>H₂S Raw</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                          {selectedDevice.latest_reading.h2s_raw_value}
                        </div>
                      </div>
                      <div style={{ background: "#14283B", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.7rem", color: "#F5B84B" }}>Methane Raw</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                          {selectedDevice.latest_reading.methane_raw_value}
                        </div>
                      </div>
                      <div style={{ background: "#14283B", padding: "8px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.7rem", color: "#35D6C2" }}>MQ-7 Raw (CO)</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#F4F7FB" }}>
                          {selectedDevice.latest_reading.mq7_raw_value}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Maintenance Log History */}
                <div style={{ background: "#1A3045", padding: "1rem", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#8FA5BA", textTransform: "uppercase" }}>
                      Maintenance & Inspection Records ({deviceDetail?.maintenance_logs?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={() => setMaintenanceModalOpen(true)}
                      style={{
                        background: "#35D6C2",
                        border: "none",
                        color: "#0B1220",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      + Log Maintenance Action
                    </button>
                  </div>

                  {(!deviceDetail?.maintenance_logs || deviceDetail.maintenance_logs.length === 0) ? (
                    <div style={{ fontSize: "0.78rem", color: "#8FA5BA" }}>No technician maintenance events recorded yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {deviceDetail.maintenance_logs.map((log) => (
                        <div key={log._id || log.log_id} style={{ background: "#14283B", padding: "8px 12px", borderRadius: "6px", fontSize: "0.78rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#F4F7FB" }}>
                            <strong>{log.action_type}</strong>
                            <span style={{ color: "#8FA5BA" }}>{new Date(log.logged_at).toLocaleDateString()}</span>
                          </div>
                          <div style={{ color: "#B8C5D6", marginTop: "2px" }}>
                            Technician: {log.technician_name} {log.notes && `• Notes: ${log.notes}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    style={{
                      background: "#1A3045",
                      border: "1px solid #2A4359",
                      color: "#F4F7FB",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECORD MAINTENANCE ACTION SUB-MODAL */}
      {maintenanceModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(11, 18, 32, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "1rem",
          }}
          onClick={() => setMaintenanceModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#14283B",
              border: "1px solid #35D6C2",
              borderRadius: "12px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "500px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem", color: "#F4F7FB", fontSize: "1.15rem" }}>
              Record Field Maintenance: Device {selectedDevice?.device_id}
            </h3>

            <form onSubmit={handleSaveMaintenance} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Action Performed</label>
                <select
                  value={maintenanceAction}
                  onChange={(e) => setMaintenanceAction(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="Inspect wiring and power supply">Inspect wiring and power supply</option>
                  <option value="Clean transducer acoustic cone">Clean transducer acoustic cone</option>
                  <option value="Check wireless communication link">Check wireless communication link</option>
                  <option value="Perform sensor calibration check">Perform sensor calibration check</option>
                  <option value="Compare against portable reference meter">Compare against portable reference meter</option>
                  <option value="Bench test sensor daughterboard">Bench test sensor daughterboard</option>
                  <option value="Assess sensor probe replacement">Assess sensor probe replacement</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Technician Name</label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#8FA5BA", marginBottom: "4px" }}>Inspection Notes</label>
                <textarea
                  rows={3}
                  value={maintenanceNotes}
                  onChange={(e) => setMaintenanceNotes(e.target.value)}
                  placeholder="Describe findings, wiring conditions, sensor response..."
                  style={{ ...inputStyle, width: "100%", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="calibrated"
                  checked={isCalibrated}
                  onChange={(e) => setIsCalibrated(e.target.checked)}
                />
                <label htmlFor="calibrated" style={{ fontSize: "0.8rem", color: "#F4F7FB" }}>
                  Sensor calibration verified during this inspection
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setMaintenanceModalOpen(false)}
                  style={{
                    background: "#1A3045",
                    border: "1px solid #2A4359",
                    color: "#F4F7FB",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMaintenance}
                  style={{
                    background: "#35D6C2",
                    border: "none",
                    color: "#0B1220",
                    fontWeight: 700,
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {submittingMaintenance ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const kpiCardStyle = {
  background: "#14283B",
  border: "1px solid #2A4359",
  borderRadius: "10px",
  padding: "1rem 1.25rem",
};

const inputStyle = {
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = {
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
};

export default DeviceHealthPage;
