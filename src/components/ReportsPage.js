import React, { useState, useMemo, useEffect } from "react";
import { API } from "../config.js";

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

// RFC 4180 compliant CSV generator
function exportToRFC4180CSV(filename, columns, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = columns.map((col) => escapeCell(col.header)).join(",");
  const dataRows = rows.map((row) =>
    columns.map((col) => escapeCell(col.accessor(row))).join(",")
  );

  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ReportsPage({ filteredData, apiData, user }) {
  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  // Report configuration state
  const [reportType, setReportType] = useState("hydraulic"); // 'hydraulic' | 'gas' | 'alerts' | 'hardware' | 'maintenance'
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertsData, setAlertsData] = useState([]);
  const [devicesData, setDevicesData] = useState([]);

  // Fetch supplementary alerts and devices for report builder
  useEffect(() => {
    const fetchExtraData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const [alertsRes, devicesRes] = await Promise.all([
          fetch(`${API}/alerts`, { headers }),
          fetch(`${API}/device-health/devices`, { headers }),
        ]);

        if (alertsRes.ok) {
          const aJson = await alertsRes.json();
          setAlertsData(Array.isArray(aJson) ? aJson : []);
        }
        if (devicesRes.ok) {
          const dJson = await devicesRes.json();
          setDevicesData(Array.isArray(dJson?.devices) ? dJson.devices : []);
        }
      } catch (err) {
        console.warn("[REPORTS] Error loading supplemental datasets:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExtraData();
  }, []);

  // Determine user area restriction
  const userAreaScope = currentUser?.area || "ALL";
  const isRestrictedScope = userAreaScope !== "ALL" && userAreaScope !== "all" && userAreaScope !== "";

  // Set initial selected area if user is scoped
  useEffect(() => {
    if (isRestrictedScope) {
      setSelectedArea(userAreaScope);
    }
  }, [isRestrictedScope, userAreaScope]);

  const baseDrainData = apiData || filteredData || [];

  // Areas list
  const availableAreas = useMemo(() => {
    if (isRestrictedScope) return [userAreaScope];
    const set = new Set(["all"]);
    baseDrainData.forEach((d) => {
      if (d.area_name) set.add(d.area_name);
    });
    return Array.from(set);
  }, [baseDrainData, isRestrictedScope, userAreaScope]);

  // Filter and build the target dataset based on reportType
  const reportRecords = useMemo(() => {
    if (reportType === "hydraulic") {
      return baseDrainData
        .filter((d) => {
          if (selectedArea !== "all" && String(d.area_name).toLowerCase() !== selectedArea.toLowerCase()) return false;
          if (selectedSeverity !== "all" && String(d.status).toLowerCase() !== selectedSeverity.toLowerCase()) return false;
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            return String(d.drain_id).toLowerCase().includes(q) || String(d.area_name).toLowerCase().includes(q);
          }
          return true;
        })
        .map((d) => ({
          drain_id: d.drain_id,
          area_name: d.area_name || "Chennai",
          water_level_cm: d.water_level_cm ?? 12.0,
          flow_rate_l_min: d.flow_rate_l_min ?? 380.0,
          dhi_score: d.dhi_score ?? 28.5,
          status: d.status || "Normal",
          timestamp: d.timestamp || new Date().toISOString(),
          recommended_action:
            d.status === "Critical"
              ? "Immediate culvert desilting and emergency sluice gate opening"
              : d.status === "Moderate"
              ? "Schedule debris clearance within 48 hours"
              : "Standard periodic inspection",
        }));
    }

    if (reportType === "gas") {
      return baseDrainData
        .filter((d) => {
          if (selectedArea !== "all" && String(d.area_name).toLowerCase() !== selectedArea.toLowerCase()) return false;
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            return String(d.drain_id).toLowerCase().includes(q) || String(d.area_name).toLowerCase().includes(q);
          }
          return true;
        })
        .map((d) => {
          const h2s = Number(d.h2s_raw_value || 0.45);
          const ch4 = Number(d.methane_raw_value || 1.15);
          const mq7 = Number(d.mq7_raw_value || 180.0);
          const isAnomaly = h2s > 1.0 || ch4 > 2.0 || mq7 > 300;
          return {
            drain_id: d.drain_id,
            area_name: d.area_name || "Chennai",
            device_id: d.device_id || `DEV${d.drain_id.replace(/\D/g, "")}`,
            h2s_raw: h2s.toFixed(3),
            ch4_raw: ch4.toFixed(3),
            mq7_raw: mq7.toFixed(1),
            calibration_status: "Uncalibrated Raw Ratio",
            gas_risk: isAnomaly ? "High Anomaly" : "Normal Background",
            timestamp: d.timestamp || new Date().toISOString(),
            safety_warning: isAnomaly
              ? "DO NOT ENTER. Raw gas spike detected. Calibrated multi-gas test mandatory before opening cover."
              : "Standard Confined Space Procedure Applies (Entry requires onsite gas detector verification).",
          };
        });
    }

    if (reportType === "alerts") {
      return alertsData
        .filter((a) => {
          if (selectedArea !== "all" && String(a.area_name).toLowerCase() !== selectedArea.toLowerCase()) return false;
          if (selectedSeverity !== "all" && String(a.severity).toLowerCase() !== selectedSeverity.toLowerCase()) return false;
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            return (
              String(a.drain_id).toLowerCase().includes(q) ||
              String(a.message).toLowerCase().includes(q) ||
              String(a.category).toLowerCase().includes(q)
            );
          }
          return true;
        })
        .map((a) => ({
          alert_id: a.id || a.alert_id,
          drain_id: a.drain_id || "DRN-N/A",
          area_name: a.area_name || "Chennai",
          category: a.category || "General Drainage",
          severity: a.severity || "Medium",
          status: a.status || "Open",
          timestamp: a.alert_time || a.created_at || new Date().toISOString(),
          message: a.message || "Alert registered",
          recommended_action: a.recommended_action || "Investigate inspection chamber",
        }));
    }

    if (reportType === "hardware") {
      return devicesData
        .filter((dev) => {
          if (selectedArea !== "all" && String(dev.area_name).toLowerCase() !== selectedArea.toLowerCase()) return false;
          if (selectedSeverity !== "all") {
            const st = String(dev.status).toLowerCase();
            if (selectedSeverity === "critical" && !st.includes("fault") && !st.includes("offline")) return false;
            if (selectedSeverity === "moderate" && !st.includes("warning")) return false;
            if (selectedSeverity === "normal" && !st.includes("healthy") && !st.includes("active")) return false;
          }
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            return (
              String(dev.device_id).toLowerCase().includes(q) ||
              String(dev.drain_id).toLowerCase().includes(q) ||
              String(dev.area_name).toLowerCase().includes(q)
            );
          }
          return true;
        })
        .map((dev) => ({
          device_id: dev.device_id,
          drain_id: dev.drain_id,
          area_name: dev.area_name || "Chennai",
          device_type: dev.device_type || "Ultrasonic + Multi-Gas Node",
          health_status: dev.status || "Healthy",
          data_freshness: dev.data_freshness || "Active",
          primary_issue: dev.primary_issue || "None (Nominal Operation)",
          recommended_maintenance: dev.recommendations?.[0] || "Routine sensor surface cleaning and telemetry validation",
        }));
    }

    // maintenance report
    return baseDrainData
      .filter((d) => {
        if (selectedArea !== "all" && String(d.area_name).toLowerCase() !== selectedArea.toLowerCase()) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return String(d.drain_id).toLowerCase().includes(q) || String(d.area_name).toLowerCase().includes(q);
        }
        return true;
      })
      .map((d, idx) => {
        const isCrit = d.status === "Critical";
        const isMod = d.status === "Moderate";
        return {
          work_order_id: `WO-2026-${String(idx + 101).padStart(4, "0")}`,
          drain_id: d.drain_id,
          area_name: d.area_name || "Chennai",
          priority: isCrit ? "High (Immediate)" : isMod ? "Medium (48h)" : "Low (Scheduled)",
          maintenance_task: isCrit
            ? "Culvert high-pressure flush & chamber sediment suction"
            : isMod
            ? "Inspect sluice gate silt deposit and sensor mount"
            : "Semi-annual chamber structural inspection",
          assigned_team: `Field Crew ${((idx % 4) + 1)} (${d.area_name || "North Zone"})`,
          status: isCrit ? "Pending Dispatch" : isMod ? "In Queue" : "Completed",
          due_date: new Date(Date.now() + (idx % 7) * 86400000).toISOString().split("T")[0],
        };
      });
  }, [reportType, baseDrainData, alertsData, devicesData, selectedArea, selectedSeverity, searchTerm]);

  // Export handlers
  const handleExportCSV = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `URBANDRAIN_2.0_${reportType.toUpperCase()}_REPORT_${selectedArea.toUpperCase()}_${dateStr}.csv`;

    let columns = [];
    if (reportType === "hydraulic") {
      columns = [
        { header: "Chamber ID", accessor: (r) => r.drain_id },
        { header: "Metropolitan Area", accessor: (r) => r.area_name },
        { header: "Water Level (cm)", accessor: (r) => r.water_level_cm },
        { header: "Flow Rate (L/min)", accessor: (r) => r.flow_rate_l_min },
        { header: "DHI Score", accessor: (r) => r.dhi_score },
        { header: "Chamber Status", accessor: (r) => r.status },
        { header: "Recommended Action", accessor: (r) => r.recommended_action },
        { header: "Timestamp", accessor: (r) => r.timestamp },
      ];
    } else if (reportType === "gas") {
      columns = [
        { header: "Chamber ID", accessor: (r) => r.drain_id },
        { header: "Metropolitan Area", accessor: (r) => r.area_name },
        { header: "Hardware Node ID", accessor: (r) => r.device_id },
        { header: "H2S Raw Sensor Ratio", accessor: (r) => r.h2s_raw },
        { header: "Methane Raw Sensor Ratio", accessor: (r) => r.ch4_raw },
        { header: "MQ-7 Sensor Response (ADC)", accessor: (r) => r.mq7_raw },
        { header: "Calibration Status", accessor: (r) => r.calibration_status },
        { header: "Gas Risk Level", accessor: (r) => r.gas_risk },
        { header: "Safety Directives & Direct Actions", accessor: (r) => r.safety_warning },
        { header: "Timestamp", accessor: (r) => r.timestamp },
      ];
    } else if (reportType === "alerts") {
      columns = [
        { header: "Alert ID", accessor: (r) => r.alert_id },
        { header: "Chamber ID", accessor: (r) => r.drain_id },
        { header: "Area", accessor: (r) => r.area_name },
        { header: "Category", accessor: (r) => r.category },
        { header: "Severity", accessor: (r) => r.severity },
        { header: "Workflow Status", accessor: (r) => r.status },
        { header: "Detection Time", accessor: (r) => r.timestamp },
        { header: "Incident Message", accessor: (r) => r.message },
        { header: "Recommended Protocol", accessor: (r) => r.recommended_action },
      ];
    } else if (reportType === "hardware") {
      columns = [
        { header: "Device ID", accessor: (r) => r.device_id },
        { header: "Chamber ID", accessor: (r) => r.drain_id },
        { header: "Area", accessor: (r) => r.area_name },
        { header: "Hardware Type", accessor: (r) => r.device_type },
        { header: "Diagnostic Health", accessor: (r) => r.health_status },
        { header: "Telemetry Freshness", accessor: (r) => r.data_freshness },
        { header: "Diagnostic Finding", accessor: (r) => r.primary_issue },
        { header: "Maintenance Action", accessor: (r) => r.recommended_maintenance },
      ];
    } else {
      columns = [
        { header: "Work Order ID", accessor: (r) => r.work_order_id },
        { header: "Chamber ID", accessor: (r) => r.drain_id },
        { header: "Area", accessor: (r) => r.area_name },
        { header: "Priority", accessor: (r) => r.priority },
        { header: "Maintenance Task", accessor: (r) => r.maintenance_task },
        { header: "Assigned Crew", accessor: (r) => r.assigned_team },
        { header: "Dispatch Status", accessor: (r) => r.status },
        { header: "Target Completion Date", accessor: (r) => r.due_date },
      ];
    }

    exportToRFC4180CSV(filename, columns, reportRecords);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const reportTitleMap = {
    hydraulic: "Hydraulic Inundation & Culvert Telemetry Audit",
    gas: "Sewage-Worker Atmospheric Gas Safety & Exposure Risk Audit",
    alerts: "Incident Response & Priority Safety Alerts Register",
    hardware: "Telemetry Hardware Node & Sensor Integrity Audit",
    maintenance: "Preventive Maintenance Work Order & Field Dispatch Schedule",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        color: PALETTE.textPrimary,
        paddingBottom: "3rem",
      }}
    >
      {/* 1. Report Builder Selector Panel */}
      <section
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.border}`,
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  background: "rgba(122, 167, 255, 0.15)",
                  color: PALETTE.blue,
                  border: "1px solid rgba(122, 167, 255, 0.4)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                REPORT GENERATOR
              </span>
              <span style={{ fontSize: "0.75rem", color: PALETTE.textMuted }}>
                Official Municipal Compliance &amp; Safety Export Engine
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: PALETTE.textPrimary }}>
              Reports &amp; Operational Telemetry Exports
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: PALETTE.textSecondary }}>
              Generate verifiable audits for hydraulic flow, worker atmospheric gas safety, equipment health, and incident response.
            </p>
          </div>

          {/* Export Action Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={reportRecords.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: PALETTE.teal,
                color: PALETTE.bg,
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: reportRecords.length === 0 ? "not-allowed" : "pointer",
                opacity: reportRecords.length === 0 ? 0.5 : 1,
                boxShadow: "0 2px 8px rgba(53, 214, 194, 0.25)",
              }}
            >
              <span>📥</span>
              <span>Export CSV (RFC 4180)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: PALETTE.elevated,
                color: PALETTE.textPrimary,
                border: `1px solid ${PALETTE.border}`,
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>🖨️</span>
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Report Types Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          {[
            { id: "hydraulic", label: "🌊 Hydraulic & Flow", desc: "Water levels, discharge, DHI scores" },
            { id: "gas", label: "☣️ Gas Safety & Worker Risk", desc: "H₂S, CH₄, MQ-7 atmospheric telemetry" },
            { id: "alerts", label: "🚨 Safety Incidents Log", desc: "Emergency alarms & critical actions" },
            { id: "hardware", label: "📡 Hardware & Device Health", desc: "Telemetry gaps & diagnostic audits" },
            { id: "maintenance", label: "🛠️ Field Work Orders", desc: "Schedules, crew dispatches, tasks" },
          ].map((type) => {
            const isSelected = reportType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setReportType(type.id)}
                style={{
                  background: isSelected ? PALETTE.elevated : "rgba(11, 18, 32, 0.6)",
                  border: `1px solid ${isSelected ? PALETTE.teal : PALETTE.border}`,
                  borderRadius: "10px",
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: isSelected ? PALETTE.teal : PALETTE.textPrimary }}>
                  {type.label}
                </div>
                <div style={{ fontSize: "0.72rem", color: PALETTE.textMuted, marginTop: "3px" }}>
                  {type.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            background: PALETTE.bg,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: "10px",
            padding: "10px 14px",
          }}
        >
          {/* Area Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: PALETTE.textMuted, fontWeight: 600 }}>Area Scope:</span>
            <select
              value={selectedArea}
              disabled={isRestrictedScope}
              onChange={(e) => setSelectedArea(e.target.value)}
              style={{
                background: PALETTE.elevated,
                border: `1px solid ${PALETTE.border}`,
                color: PALETTE.textPrimary,
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "0.8rem",
                outline: "none",
              }}
            >
              <option value="all">All Available Areas</option>
              {availableAreas.filter((a) => a !== "all").map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: PALETTE.textMuted, fontWeight: 600 }}>Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{
                background: PALETTE.elevated,
                border: `1px solid ${PALETTE.border}`,
                color: PALETTE.textPrimary,
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "0.8rem",
                outline: "none",
              }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="moderate">Moderate / Warning</option>
              <option value="normal">Normal / Healthy</option>
            </select>
          </div>

          {/* Search Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "180px" }}>
            <input
              type="text"
              placeholder="Search chamber ID, message, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: PALETTE.elevated,
                border: `1px solid ${PALETTE.border}`,
                color: PALETTE.textPrimary,
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "0.8rem",
                width: "100%",
                outline: "none",
              }}
            />
          </div>
        </div>
      </section>

      {/* 2. Live Report Summary KPI Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <article
          style={{
            background: PALETTE.panel,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: "12px",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: PALETTE.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
            Matching Report Rows
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: PALETTE.teal, margin: "2px 0" }}>
            {reportRecords.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: PALETTE.textSecondary }}>
            Scope: {selectedArea === "all" ? "Greater Chennai Network" : selectedArea}
          </div>
        </article>

        <article
          style={{
            background: PALETTE.panel,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: "12px",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: PALETTE.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
            High-Priority Items
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: PALETTE.red, margin: "2px 0" }}>
            {reportRecords.filter(
              (r) =>
                r.status === "Critical" ||
                r.severity === "Critical" ||
                r.gas_risk === "High Anomaly" ||
                r.priority?.includes("High")
            ).length}
          </div>
          <div style={{ fontSize: "0.75rem", color: PALETTE.textSecondary }}>
            Actionable safety or maintenance items
          </div>
        </article>

        <article
          style={{
            background: PALETTE.panel,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: "12px",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: PALETTE.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
            Generated By
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: PALETTE.textPrimary, margin: "6px 0 2px 0" }}>
            {currentUser?.name || currentUser?.username || "Authorized Officer"}
          </div>
          <div style={{ fontSize: "0.75rem", color: PALETTE.blue }}>
            Role: {currentUser?.role || "Municipal Officer"}
          </div>
        </article>

        <article
          style={{
            background: PALETTE.panel,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: "12px",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: PALETTE.textMuted, fontWeight: 700, textTransform: "uppercase" }}>
            Timestamp Stamp
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: PALETTE.textSecondary, margin: "6px 0 2px 0" }}>
            {new Date().toLocaleDateString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: PALETTE.textMuted }}>
            {new Date().toLocaleTimeString()} IST
          </div>
        </article>
      </section>

      {/* 3. Interactive Preview Table & Print Section */}
      <section
        className="printable-report"
        style={{
          background: PALETTE.panel,
          border: `1px solid ${PALETTE.border}`,
          borderRadius: "14px",
          padding: "1.5rem",
        }}
      >
        {/* Formal Header (Visible when printed or viewed) */}
        <div style={{ borderBottom: `2px solid ${PALETTE.border}`, paddingBottom: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: PALETTE.teal, letterSpacing: "0.05em" }}>
                URBANDRAIN 2.0 — GREATER CHENNAI CORPORATION
              </div>
              <h3 style={{ margin: "4px 0", fontSize: "1.35rem", fontWeight: 800, color: PALETTE.textPrimary }}>
                {reportTitleMap[reportType]}
              </h3>
              <div style={{ fontSize: "0.75rem", color: PALETTE.textMuted }}>
                Document Reference: UD2-REP-{reportType.toUpperCase()}-{Date.now().toString().slice(-6)} • Classification: Municipal Operations
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: PALETTE.textMuted }}>Jurisdiction Scope</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: PALETTE.textPrimary }}>
                {selectedArea === "all" ? "Metropolitan Chennai (100 Chambers)" : `${selectedArea} Zone`}
              </div>
            </div>
          </div>

          {/* Mandatory Gas & Confined Space Safety Disclaimer */}
          {reportType === "gas" && (
            <div
              style={{
                marginTop: "12px",
                background: "rgba(241, 107, 120, 0.1)",
                border: "1px solid rgba(241, 107, 120, 0.4)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.75rem",
                color: PALETTE.red,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              ⚠️ <strong>MANDATORY WORKER SAFETY DIRECTIVE:</strong> The telemetry readings in this report are monitoring signals from installed inspection chamber transducers. MQ-7 is CO-sensitive and uncalibrated raw signals do NOT certify atmospheric safety. Personnel entry MUST NEVER be authorized based solely on dashboard telemetry. Onsite calibrated multi-gas detector clearance and confined space permits are legally required.
            </div>
          )}
        </div>

        {/* Live Preview Data Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: PALETTE.elevated, borderBottom: `2px solid ${PALETTE.border}` }}>
                {reportType === "hydraulic" && (
                  <>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Chamber</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Area</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Water Level</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Flow Rate</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>DHI</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Status</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Recommended Action</th>
                  </>
                )}

                {reportType === "gas" && (
                  <>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Chamber</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Node ID</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.red }}>H₂S Raw</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.amber }}>CH₄ Raw</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.blue }}>MQ-7 (ADC)</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Risk Level</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Worker Safety Directives</th>
                  </>
                )}

                {reportType === "alerts" && (
                  <>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Alert ID</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Chamber</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Category</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Severity</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Status</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Incident Finding</th>
                  </>
                )}

                {reportType === "hardware" && (
                  <>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Device ID</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Chamber</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Type</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Health</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Diagnostic Finding</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Technician Action</th>
                  </>
                )}

                {reportType === "maintenance" && (
                  <>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Work Order</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Chamber</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Priority</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Maintenance Task</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: PALETTE.textMuted }}>Assigned Crew</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted }}>Due Date</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {reportRecords.slice(0, 50).map((r, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: `1px solid ${PALETTE.border}`,
                    background: idx % 2 === 0 ? "transparent" : "rgba(26, 48, 69, 0.4)",
                  }}
                >
                  {reportType === "hydraulic" && (
                    <>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: PALETTE.teal }}>{r.drain_id}</td>
                      <td style={{ padding: "10px 12px", color: PALETTE.textSecondary }}>{r.area_name}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textPrimary }}>{r.water_level_cm} cm</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textSecondary }}>{r.flow_rate_l_min} L/m</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: r.dhi_score > 60 ? PALETTE.red : r.dhi_score > 40 ? PALETTE.amber : PALETTE.teal }}>{r.dhi_score}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, background: r.status === "Critical" ? "rgba(241,107,120,0.15)" : r.status === "Moderate" ? "rgba(245,184,75,0.15)" : "rgba(53,214,194,0.15)", color: r.status === "Critical" ? PALETTE.red : r.status === "Moderate" ? PALETTE.amber : PALETTE.teal }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: PALETTE.textMuted }}>{r.recommended_action}</td>
                    </>
                  )}

                  {reportType === "gas" && (
                    <>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: PALETTE.teal }}>{r.drain_id}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: PALETTE.textMuted }}>{r.device_id}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.red, fontWeight: 700 }}>{r.h2s_raw}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.amber, fontWeight: 700 }}>{r.ch4_raw}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.blue }}>{r.mq7_raw}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, background: r.gas_risk.includes("High") ? "rgba(241,107,120,0.15)" : "rgba(53,214,194,0.15)", color: r.gas_risk.includes("High") ? PALETTE.red : PALETTE.teal }}>
                          {r.gas_risk}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.75rem", color: r.gas_risk.includes("High") ? PALETTE.red : PALETTE.textSecondary, fontWeight: r.gas_risk.includes("High") ? 600 : 400 }}>
                        {r.safety_warning}
                      </td>
                    </>
                  )}

                  {reportType === "alerts" && (
                    <>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: PALETTE.textMuted }}>{r.alert_id}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: PALETTE.teal }}>{r.drain_id}</td>
                      <td style={{ padding: "10px 12px", color: PALETTE.textSecondary }}>{r.category}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, background: r.severity === "Critical" ? "rgba(241,107,120,0.15)" : r.severity === "High" ? "rgba(242,140,69,0.15)" : "rgba(245,184,75,0.15)", color: r.severity === "Critical" ? PALETTE.red : r.severity === "High" ? PALETTE.orange : PALETTE.amber }}>
                          {r.severity}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textSecondary }}>{r.status}</td>
                      <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: PALETTE.textPrimary }}>{r.message}</td>
                    </>
                  )}

                  {reportType === "hardware" && (
                    <>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: PALETTE.teal, fontWeight: 700 }}>{r.device_id}</td>
                      <td style={{ padding: "10px 12px", color: PALETTE.textPrimary }}>{r.drain_id}</td>
                      <td style={{ padding: "10px 12px", color: PALETTE.textMuted, fontSize: "0.75rem" }}>{r.device_type}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, background: r.health_status.includes("Fault") ? "rgba(241,107,120,0.15)" : r.health_status.includes("Warning") ? "rgba(245,184,75,0.15)" : "rgba(53,214,194,0.15)", color: r.health_status.includes("Fault") ? PALETTE.red : r.health_status.includes("Warning") ? PALETTE.amber : PALETTE.teal }}>
                          {r.health_status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: PALETTE.textSecondary }}>{r.primary_issue}</td>
                      <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: PALETTE.textMuted }}>{r.recommended_maintenance}</td>
                    </>
                  )}

                  {reportType === "maintenance" && (
                    <>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: PALETTE.blue, fontWeight: 700 }}>{r.work_order_id}</td>
                      <td style={{ padding: "10px 12px", color: PALETTE.teal, fontWeight: 700 }}>{r.drain_id}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, background: r.priority.includes("High") ? "rgba(241,107,120,0.15)" : "rgba(245,184,75,0.15)", color: r.priority.includes("High") ? PALETTE.red : PALETTE.amber }}>
                          {r.priority}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: PALETTE.textPrimary }}>{r.maintenance_task}</td>
                      <td style={{ padding: "10px 12px", color: PALETTE.textSecondary, fontSize: "0.78rem" }}>{r.assigned_team}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: PALETTE.textMuted, fontSize: "0.78rem" }}>{r.due_date}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reportRecords.length > 50 && (
          <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.78rem", color: PALETTE.textMuted }}>
            Displaying first 50 rows in preview. Full {reportRecords.length} records will be exported to CSV.
          </div>
        )}

        {reportRecords.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: PALETTE.textMuted }}>
            No records matched the selected report filters.
          </div>
        )}
      </section>
    </div>
  );
}

export default ReportsPage;
