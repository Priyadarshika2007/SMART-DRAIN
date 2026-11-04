import React, { useEffect, useMemo, useState } from "react";
import { API } from "../config.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const SENSOR_CHANNELS = [
  {
    key: "h2s_raw_value",
    name: "Hydrogen Sulfide (H₂S) Sensor",
    short: "H₂S Raw",
    color: "#F16B78",
    targetGas: "H₂S (Sulfurous Gas)",
    unit: "Raw Ratio (0–2.0 scale)",
    status: "Uncalibrated Raw Value",
    description: "Toxic sewer gas. Produces rapid olfactory fatigue; toxic at trace concentrations. Raw readings indicate relative sensor excitation.",
    threshold: 1.6,
  },
  {
    key: "methane_raw_value",
    name: "Methane (CH₄) Sensor",
    short: "CH₄ Raw",
    color: "#F5B84B",
    targetGas: "CH₄ (Hydrocarbon Gas)",
    unit: "Raw Ratio (0–5.0 scale)",
    status: "Uncalibrated Raw Value",
    description: "Flammable and asphyxiant sewer gas. Raw sensor voltage indicates relative combustible gas presence without ppm calibration.",
    threshold: 3.2,
  },
  {
    key: "mq7_raw_value",
    name: "MQ-7 Sensor (Carbon Monoxide Sensitive)",
    short: "MQ-7 Raw (CO)",
    color: "#35D6C2",
    targetGas: "CO (Carbon Monoxide Sensitive)",
    unit: "Raw ADC Count (0–1023 scale)",
    status: "Uncalibrated Raw ADC",
    description: "Note: MQ-7 is specifically sensitive to Carbon Monoxide (CO). Output is raw ADC integer; not a verified PPM concentration.",
    threshold: 380.0,
  },
];

function GasSafetyPage({ user, onNavigateToChamber, onNavigateToDevice }) {
  const [summary, setSummary] = useState(null);
  const [chambers, setChambers] = useState([]);
  const [readingsHistory, setReadingsHistory] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannelTab, setActiveChannelTab] = useState("all");
  const [selectedChamber, setSelectedChamber] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGasData() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        };

        const [summaryRes, chambersRes, readingsRes, incidentsRes] = await Promise.all([
          fetch(`${API}/gas-safety/summary`, { headers }),
          fetch(`${API}/gas-safety/chambers`, { headers }),
          fetch(`${API}/gas-safety/readings?limit=150`, { headers }),
          fetch(`${API}/gas-safety/incidents`, { headers }),
        ]);

        if (!summaryRes.ok || !chambersRes.ok) {
          throw new Error("Failed to retrieve gas safety telemetry");
        }

        const [summaryData, chambersData, readingsData, incidentsData] = await Promise.all([
          summaryRes.json(),
          chambersRes.json(),
          readingsRes.ok ? readingsRes.json() : { data: [] },
          incidentsRes.ok ? incidentsRes.json() : { data: [] },
        ]);

        if (!isMounted) return;

        setSummary(summaryData);
        setChambers(chambersData.data || []);
        setReadingsHistory((readingsData.data || []).reverse()); // Oldest to newest for charts
        setIncidents(incidentsData.data || []);
        setError("");
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Failed to load gas safety data");
        setLoading(false);
      }
    }

    loadGasData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Chambers
  const filteredChambers = useMemo(() => {
    return chambers.filter((c) => {
      const matchArea = selectedArea === "all" || c.area_name.toLowerCase() === selectedArea.toLowerCase();
      const matchSeverity = selectedSeverity === "all" || c.risk_severity.toLowerCase() === selectedSeverity.toLowerCase();
      const matchSearch =
        !searchQuery ||
        c.drain_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.area_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.gas_risk_level.toLowerCase().includes(searchQuery.toLowerCase());
      return matchArea && matchSeverity && matchSearch;
    });
  }, [chambers, selectedArea, selectedSeverity, searchQuery]);

  // Unique Areas
  const areas = useMemo(() => {
    const list = [...new Set(chambers.map((c) => c.area_name).filter(Boolean))];
    return list.sort();
  }, [chambers]);

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* MANDATORY CONFINED-SPACE WORKER PROTECTION BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(241, 107, 120, 0.15) 0%, rgba(20, 40, 59, 0.95) 100%)",
          border: "1px solid rgba(241, 107, 120, 0.4)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1.25rem",
          boxShadow: "0 4px 20px rgba(241, 107, 120, 0.1)",
        }}
      >
        <div
          style={{
            background: "#F16B78",
            color: "#0B1220",
            borderRadius: "8px",
            padding: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#F16B78", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              CRITICAL SEWAGE-WORKER SAFETY ADVISORY — CONFINED SPACE PROTOCOL
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                background: "rgba(241, 107, 120, 0.2)",
                color: "#F16B78",
                padding: "2px 8px",
                borderRadius: "9999px",
                border: "1px solid rgba(241, 107, 120, 0.4)",
              }}
            >
              MANDATORY
            </span>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#F4F7FB", lineHeight: 1.5 }}>
            Continuous chamber monitoring supports early hazard awareness but <strong>does not substitute for certified onsite multi-gas testing, mechanical forced ventilation, personal protective equipment (SCBA/respirators), or approved entry permits.</strong>
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "0.78rem", color: "#B8C5D6" }}>
            <span>⚠️ <strong>Entry rule:</strong> Never enter an inspection chamber based solely on absence of a dashboard alarm.</span>
            <span>⚠️ <strong>Fault rule:</strong> Equipment telemetry faults do not certify the atmosphere safe.</span>
          </div>
        </div>
      </div>

      {/* KPI METRIC STRIP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div style={kpiCardStyle}>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA", fontWeight: 700, textTransform: "uppercase" }}>Monitored Chambers</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F4F7FB", margin: "4px 0" }}>
            {summary?.counts?.total_monitored ?? chambers.length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#35D6C2" }}>Continuous Gas Telemetry</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F16B78" }}>
          <div style={{ fontSize: "0.75rem", color: "#F16B78", fontWeight: 700, textTransform: "uppercase" }}>Critical Gas Hazards</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F16B78", margin: "4px 0" }}>
            {summary?.counts?.critical_hazard ?? chambers.filter((c) => c.risk_severity === "Critical").length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Personnel Must Stand Clear</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #F5B84B" }}>
          <div style={{ fontSize: "0.75rem", color: "#F5B84B", fontWeight: 700, textTransform: "uppercase" }}>High / Elevated Risk</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#F5B84B", margin: "4px 0" }}>
            {summary?.counts?.high_risk ?? chambers.filter((c) => c.risk_severity === "High").length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Pre-entry Check Required</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #7AA7FF" }}>
          <div style={{ fontSize: "0.75rem", color: "#7AA7FF", fontWeight: 700, textTransform: "uppercase" }}>Monitoring Unavailable</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#7AA7FF", margin: "4px 0" }}>
            {summary?.counts?.monitoring_unavailable ?? chambers.filter((c) => c.gas_risk_level.includes("Unavailable")).length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Atmosphere Unconfirmed</div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #35D6C2" }}>
          <div style={{ fontSize: "0.75rem", color: "#35D6C2", fontWeight: 700, textTransform: "uppercase" }}>Nominal Baseline</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#35D6C2", margin: "4px 0" }}>
            {summary?.counts?.normal ?? chambers.filter((c) => c.risk_severity === "Normal").length}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>Baseline Raw Range</div>
        </div>
      </div>

      {/* SENSOR CHANNEL OVERVIEW & MULTI-CHANNEL TELEMETRY TRENDS */}
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
              Gas Channel Telemetry Trends (Actual Monitored Signals)
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#8FA5BA" }}>
              Verified Channel Definitions • Raw Signals vs Uncalibrated Concentrations
            </span>
          </div>

          {/* Channel selector buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveChannelTab("all")}
              style={channelTabStyle(activeChannelTab === "all")}
            >
              All 3 Channels
            </button>
            {SENSOR_CHANNELS.map((ch) => (
              <button
                key={ch.key}
                type="button"
                onClick={() => setActiveChannelTab(ch.key)}
                style={channelTabStyle(activeChannelTab === ch.key, ch.color)}
              >
                {ch.short}
              </button>
            ))}
          </div>
        </div>

        {/* Channel Definition Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          {SENSOR_CHANNELS.map((ch) => (
            <div
              key={ch.key}
              style={{
                background: "#1A3045",
                border: `1px solid ${ch.color}40`,
                borderRadius: "8px",
                padding: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: ch.color }}>{ch.name}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: `${ch.color}20`,
                    color: ch.color,
                  }}
                >
                  {ch.status}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#B8C5D6", marginBottom: "6px" }}>
                <strong>Target Gas:</strong> {ch.targetGas} • <strong>Unit:</strong> {ch.unit}
              </div>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#8FA5BA", lineHeight: 1.4 }}>
                {ch.description}
              </p>
            </div>
          ))}
        </div>

        {/* Telemetry Chart */}
        <div style={{ width: "100%", height: "280px" }}>
          {readingsHistory.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8FA5BA" }}>
              No telemetry reading frames available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readingsHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A4359" opacity={0.6} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#8FA5BA"
                  tickFormatter={formatTime}
                  fontSize={11}
                />
                <YAxis stroke="#8FA5BA" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#102235",
                    borderColor: "#2A4359",
                    borderRadius: "8px",
                    color: "#F4F7FB",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#B8C5D6" }} />
                {(activeChannelTab === "all" || activeChannelTab === "h2s_raw_value") && (
                  <Line
                    type="monotone"
                    dataKey="h2s_raw_value"
                    name="H₂S Raw (ratio)"
                    stroke="#F16B78"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {(activeChannelTab === "all" || activeChannelTab === "methane_raw_value") && (
                  <Line
                    type="monotone"
                    dataKey="methane_raw_value"
                    name="Methane Raw (ratio)"
                    stroke="#F5B84B"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {(activeChannelTab === "all" || activeChannelTab === "mq7_raw_value") && (
                  <Line
                    type="monotone"
                    dataKey="mq7_raw_value"
                    name="MQ-7 Raw (ADC count)"
                    stroke="#35D6C2"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* FILTER TOOLBAR & CHAMBER GAS MATRIX */}
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
              Chamber-by-Chamber Gas Telemetry & Risk Assessment
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#8FA5BA" }}>
              Showing {filteredChambers.length} inspection chambers with individual raw gas sensor channels
            </span>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search chamber ID or area..."
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
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Hazards</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium</option>
              <option value="normal">Normal Baseline</option>
            </select>
          </div>
        </div>

        {/* Chambers Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", color: "#F4F7FB" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2A4359", textAlign: "left", color: "#8FA5BA", fontSize: "0.75rem", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 12px" }}>Chamber</th>
                <th style={{ padding: "10px 12px" }}>Area</th>
                <th style={{ padding: "10px 12px" }}>H₂S Raw (ratio)</th>
                <th style={{ padding: "10px 12px" }}>Methane Raw (ratio)</th>
                <th style={{ padding: "10px 12px" }}>MQ-7 Raw (ADC)</th>
                <th style={{ padding: "10px 12px" }}>Data Freshness</th>
                <th style={{ padding: "10px 12px" }}>Risk Status</th>
                <th style={{ padding: "10px 12px" }}>Protective Guidance</th>
                <th style={{ padding: "10px 12px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredChambers.map((c) => {
                const isCritical = c.risk_severity === "Critical";
                const isHigh = c.risk_severity === "High";
                const isMedium = c.risk_severity === "Medium";
                const badgeColor = isCritical ? "#F16B78" : isHigh ? "#F28C45" : isMedium ? "#F5B84B" : "#35D6C2";

                return (
                  <tr
                    key={c.drain_id}
                    style={{
                      borderBottom: "1px solid rgba(42, 67, 89, 0.5)",
                      backgroundColor: isCritical ? "rgba(241, 107, 120, 0.05)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px", fontWeight: 700, color: "#35D6C2" }}>
                      {c.drain_id}
                    </td>
                    <td style={{ padding: "12px", color: "#B8C5D6" }}>
                      {c.area_name}
                    </td>
                    <td style={{ padding: "12px", fontFamily: "var(--font-family-mono)", color: c.channels?.h2s?.is_abnormal ? "#F16B78" : "#F4F7FB" }}>
                      {c.channels?.h2s?.value != null ? c.channels.h2s.value.toFixed(3) : "—"}
                      {c.channels?.h2s?.is_abnormal && <span style={{ marginLeft: "4px", color: "#F16B78" }}>▲</span>}
                    </td>
                    <td style={{ padding: "12px", fontFamily: "var(--font-family-mono)", color: c.channels?.methane?.is_abnormal ? "#F5B84B" : "#F4F7FB" }}>
                      {c.channels?.methane?.value != null ? c.channels.methane.value.toFixed(3) : "—"}
                      {c.channels?.methane?.is_abnormal && <span style={{ marginLeft: "4px", color: "#F5B84B" }}>▲</span>}
                    </td>
                    <td style={{ padding: "12px", fontFamily: "var(--font-family-mono)", color: c.channels?.mq7?.is_abnormal ? "#35D6C2" : "#F4F7FB" }}>
                      {c.channels?.mq7?.value != null ? c.channels.mq7.value.toFixed(1) : "—"}
                      {c.channels?.mq7?.is_abnormal && <span style={{ marginLeft: "4px", color: "#35D6C2" }}>▲</span>}
                    </td>
                    <td style={{ padding: "12px", color: c.data_freshness.includes("Stale") ? "#F5B84B" : "#B8C5D6", fontSize: "0.78rem" }}>
                      {c.data_freshness}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          backgroundColor: `${badgeColor}20`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}40`,
                        }}
                      >
                        {c.gas_risk_level}
                      </span>
                    </td>
                    <td style={{ padding: "12px", maxWidth: "260px", fontSize: "0.76rem", color: "#B8C5D6" }}>
                      {c.recommended_actions?.[0] || "Standard multigas pre-entry test mandatory."}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedChamber(c)}
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
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT GAS & SENSOR HAZARD INCIDENTS */}
      <div
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 700, color: "#F4F7FB" }}>
          Active Gas & Sensor Incident Queue
        </h3>
        {incidents.length === 0 ? (
          <p style={{ color: "#8FA5BA", fontSize: "0.85rem", margin: 0 }}>No active gas incidents recorded.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {incidents.slice(0, 8).map((inc) => (
              <div
                key={inc._id || inc.alert_id}
                style={{
                  background: "#1A3045",
                  border: `1px solid ${inc.severity === "Critical" ? "#F16B78" : "#F5B84B"}40`,
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        backgroundColor: inc.severity === "Critical" ? "rgba(241, 107, 120, 0.2)" : "rgba(245, 184, 75, 0.2)",
                        color: inc.severity === "Critical" ? "#F16B78" : "#F5B84B",
                      }}
                    >
                      {inc.severity || "Hazard"}
                    </span>
                    <strong style={{ color: "#F4F7FB", fontSize: "0.85rem" }}>
                      Chamber {inc.drain_id} ({inc.area_name})
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>
                      • Device {inc.device_id || "Node"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#B8C5D6" }}>
                    {inc.message || inc.alert_message}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#7AA7FF", marginTop: "2px" }}>
                    Action: {inc.recommended_action}
                  </div>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#8FA5BA" }}>
                  {formatTime(inc.created_at || inc.detected_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL / DRAWER FOR SELECTED CHAMBER */}
      {selectedChamber && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(11, 18, 32, 0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setSelectedChamber(null)}
        >
          <div
            style={{
              backgroundColor: "#14283B",
              border: "1px solid #2A4359",
              borderRadius: "12px",
              padding: "1.75rem",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, color: "#F4F7FB", fontSize: "1.2rem" }}>
                  Chamber {selectedChamber.drain_id} Atmospheric Telemetry
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#35D6C2" }}>
                  Area: {selectedChamber.area_name} • Device: {selectedChamber.device_id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChamber(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8FA5BA",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#1A3045", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#8FA5BA", textTransform: "uppercase" }}>Live Risk Assessment</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: selectedChamber.risk_severity === "Critical" ? "#F16B78" : "#35D6C2" }}>
                  {selectedChamber.gas_risk_level}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#B8C5D6", marginTop: "4px" }}>
                  Data Freshness: {selectedChamber.data_freshness} (Last: {formatTime(selectedChamber.timestamp)})
                </div>
              </div>

              {/* Channel Readings */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                <div style={{ background: "#1A3045", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#F16B78", fontWeight: 700 }}>H₂S Raw</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F4F7FB" }}>
                    {selectedChamber.channels?.h2s?.value?.toFixed(3) ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#8FA5BA" }}>Uncalibrated ratio</div>
                </div>

                <div style={{ background: "#1A3045", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#F5B84B", fontWeight: 700 }}>Methane Raw</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F4F7FB" }}>
                    {selectedChamber.channels?.methane?.value?.toFixed(3) ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#8FA5BA" }}>Uncalibrated ratio</div>
                </div>

                <div style={{ background: "#1A3045", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.7rem", color: "#35D6C2", fontWeight: 700 }}>MQ-7 (CO)</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#F4F7FB" }}>
                    {selectedChamber.channels?.mq7?.value?.toFixed(1) ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#8FA5BA" }}>Raw ADC count</div>
                </div>
              </div>

              <div style={{ background: "rgba(241, 107, 120, 0.1)", border: "1px solid rgba(241, 107, 120, 0.3)", padding: "12px", borderRadius: "8px" }}>
                <strong style={{ color: "#F16B78", fontSize: "0.82rem", display: "block", marginBottom: "4px" }}>
                  Mandatory Field Crew Protective Action:
                </strong>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#F4F7FB", lineHeight: 1.4 }}>
                  {selectedChamber.recommended_actions?.[0] || "Perform calibrated multigas atmospheric test prior to opening cover."}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedChamber(null)}
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

const channelTabStyle = (active, color = "#35D6C2") => ({
  background: active ? `${color}20` : "#1A3045",
  border: `1px solid ${active ? color : "#2A4359"}`,
  color: active ? color : "#B8C5D6",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 150ms ease",
});

const inputStyle = {
  background: "#1A3045",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  outline: "none",
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

export default GasSafetyPage;
