import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { API } from "../config.js";

const DEFAULT_CENTER = [13.040, 80.200]; // Greater Chennai Metropolitan Center

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (value) => String(value || "Normal").trim().toLowerCase();

const isValidLocation = (lat, lng) => {
  return (
    typeof lat === "number" &&
    !isNaN(lat) &&
    typeof lng === "number" &&
    !isNaN(lng) &&
    lat >= 12.5 &&
    lat <= 13.5 &&
    lng >= 79.8 &&
    lng <= 80.5
  );
};

// Create custom SVG markers
function getMarkerIcon(status, gasRisk, deviceStatus, isSelected = false) {
  const normStatus = normalizeStatus(status);
  const isGasHazard = gasRisk === "Critical" || gasRisk === "High";

  let mainColor = "#35D6C2";
  if (normStatus === "critical") mainColor = "#F16B78";
  else if (normStatus === "moderate" || normStatus === "warning") mainColor = "#F5B84B";

  const ringColor = isSelected ? "#FFFFFF" : isGasHazard ? "#F16B78" : "rgba(255,255,255,0.7)";
  const size = isSelected ? 26 : 20;

  const gasDot = isGasHazard
    ? `<span style="position:absolute;top:-4px;right:-4px;background:#F16B78;border-radius:50%;width:8px;height:8px;display:block;border:1.5px solid #0B1220;"></span>`
    : "";

  return L.divIcon({
    className: "drain-marker-icon",
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${mainColor};border:2.5px solid ${ringColor};box-shadow:0 0 12px ${mainColor}90;display:flex;align-items:center;justify-content:center;cursor:pointer;">${gasDot}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

function getClusterIcon(cluster) {
  const childMarkers = cluster.getAllChildMarkers();
  let hasCritical = false;
  let hasModerate = false;

  childMarkers.forEach((marker) => {
    const markerStatus = normalizeStatus(marker?.options?.status);
    if (markerStatus === "critical") hasCritical = true;
    if (markerStatus === "moderate" || markerStatus === "warning") hasModerate = true;
  });

  const bg = hasCritical ? "#F16B78" : hasModerate ? "#F5B84B" : "#35D6C2";

  return L.divIcon({
    className: "severity-cluster-icon",
    html: `<div style="background:${bg};color:#0B1220;font-weight:800;font-size:12px;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.6);border:2px solid #FFFFFF;">${cluster.getChildCount()}</div>`,
    iconSize: [34, 34],
  });
}

function AutoFitBounds({ rows }) {
  const map = useMap();

  useEffect(() => {
    if (!rows.length) return;

    const points = rows
      .filter((r) => r.latitude && r.longitude)
      .map((r) => [r.latitude, r.longitude]);

    if (points.length > 0) {
      map.fitBounds(points, {
        padding: [40, 40],
        maxZoom: 13,
      });
    }
  }, [map, rows]);

  return null;
}

function MapView({ onSelectDrain }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterGasRisk, setFilterGasRisk] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Map tile style: CartoDB Dark Matter or Standard OSM
  const [mapTheme, setMapTheme] = useState("dark"); // 'dark' | 'osm'

  // Selected Chamber for Side Inspector Panel
  const [selectedChamber, setSelectedChamber] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMapData = async () => {
      try {
        setLoading(true);
        setError("");

        const [drainsResponse, statusResponse, alertsResponse] = await Promise.all([
          fetch(`${API}/drains`, { headers: { Accept: "application/json" } }),
          fetch(`${API}/latest-status`, { headers: { Accept: "application/json" } }),
          fetch(`${API}/alerts`, { headers: { Accept: "application/json" } }),
        ]);

        if (!drainsResponse.ok) {
          throw new Error(`Unable to load drains (${drainsResponse.status})`);
        }

        const drainsPayload = await drainsResponse.json();
        const statusPayload = statusResponse.ok ? await statusResponse.json() : [];
        const alertsPayload = alertsResponse.ok ? await alertsResponse.json() : [];

        const drains = Array.isArray(drainsPayload) ? drainsPayload : [];
        const statuses = Array.isArray(statusPayload) ? statusPayload : [];
        const alertsList = Array.isArray(alertsPayload) ? alertsPayload : [];

        const statusByDrainId = new Map(
          statuses.map((item) => [String(item?.drain_id ?? item?.id ?? ""), item])
        );

        const alertsByDrainId = new Map();
        alertsList.forEach((alert) => {
          const dId = String(alert?.drain_id ?? alert?.id ?? "");
          if (!alertsByDrainId.has(dId)) {
            alertsByDrainId.set(dId, []);
          }
          alertsByDrainId.get(dId).push(alert);
        });

        const mapped = drains
          .map((drain) => {
            const drainId = String(drain?.drain_id ?? drain?.id ?? "");
            const latest = statusByDrainId.get(drainId);
            const chamberAlerts = alertsByDrainId.get(drainId) || [];

            const latitude = toNumber(drain?.latitude ?? drain?.lat);
            const longitude = toNumber(drain?.longitude ?? drain?.lng);

            return {
              id: drainId,
              area: String(drain?.area_name || drain?.area || drain?.location_name || "Chennai"),
              latitude,
              longitude,
              waterLevel: toNumber(latest?.water_level_cm ?? drain?.water_level_cm) ?? 12.5,
              flowRate: toNumber(latest?.flow_rate_l_min) ?? 350.0,
              dhi: toNumber(latest?.dhi_score ?? drain?.dhi_score) ?? 28.0,
              status: String(latest?.status || drain?.drain_status || drain?.status || "Normal"),
              deviceId: latest?.device_id || `DEV${drainId.replace(/\D/g, "")}`,
              deviceStatus: latest?.device_status || "Online",
              gasRisk: latest?.gas_risk || "Normal",
              h2sRaw: latest?.h2s_raw_value != null ? Number(latest.h2s_raw_value) : 0.45,
              methaneRaw: latest?.methane_raw_value != null ? Number(latest.methane_raw_value) : 1.2,
              mq7Raw: latest?.mq7_raw_value != null ? Number(latest.mq7_raw_value) : 185.0,
              alerts: chamberAlerts,
              timestamp: latest?.timestamp || drain?.updated_at || new Date(),
            };
          })
          .filter((row) => isValidLocation(row.latitude, row.longitude));

        if (!isMounted) return;
        setRows(mapped);

        // Auto select first critical or first chamber if none selected
        if (!selectedChamber && mapped.length > 0) {
          const firstCrit = mapped.find((r) => normalizeStatus(r.status) === "critical") || mapped[0];
          setSelectedChamber(firstCrit);
        }
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load geospatial drainage data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  const areasList = useMemo(() => {
    const set = new Set(rows.map((r) => r.area).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      // Severity filter
      if (filterSeverity !== "all") {
        const norm = normalizeStatus(row.status);
        if (filterSeverity === "critical" && norm !== "critical") return false;
        if (filterSeverity === "moderate" && !["moderate", "warning"].includes(norm)) return false;
        if (filterSeverity === "normal" && !["normal", "good", "monitoring"].includes(norm)) return false;
      }
      // Area filter
      if (filterArea !== "all" && row.area.toLowerCase() !== filterArea.toLowerCase()) {
        return false;
      }
      // Gas risk filter
      if (filterGasRisk !== "all") {
        if (filterGasRisk === "hazard" && !["Critical", "High"].includes(row.gasRisk)) return false;
        if (filterGasRisk === "normal" && row.gasRisk !== "Normal") return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesId = row.id.toLowerCase().includes(q);
        const matchesArea = row.area.toLowerCase().includes(q);
        const matchesDevice = row.deviceId.toLowerCase().includes(q);
        if (!matchesId && !matchesArea && !matchesDevice) return false;
      }
      return true;
    });
  }, [rows, filterSeverity, filterArea, filterGasRisk, searchTerm]);

  const summary = useMemo(() => {
    const critical = rows.filter((r) => normalizeStatus(r.status) === "critical").length;
    const moderate = rows.filter((r) => ["moderate", "warning"].includes(normalizeStatus(r.status))).length;
    const normal = rows.filter((r) => ["normal", "good", "monitoring"].includes(normalizeStatus(r.status))).length;
    const gasHazards = rows.filter((r) => ["Critical", "High"].includes(r.gasRisk)).length;
    return { total: rows.length, critical, moderate, normal, gasHazards };
  }, [rows]);

  const handleSelectAsset = (chamberId) => {
    if (onSelectDrain) onSelectDrain(chamberId);
    else navigate(`/dashboard?tab=drains&drainId=${chamberId}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%" }}>
      {/* GEOSPATIAL SCOPE & WORKER SAFETY NOTICE */}
      <div
        style={{
          background: "linear-gradient(135deg, #14283B 0%, #102235 100%)",
          border: "1px solid #2A4359",
          borderRadius: "10px",
          padding: "0.85rem 1.25rem",
          fontSize: "0.82rem",
          color: "#B8C5D6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#35D6C2", fontWeight: 700 }}>Geospatial Catchment Scope:</span>
          <span>
            100 monitored drainage inspection chambers across Greater Chennai corporation. Coordinates represent field IoT chamber telemetry stations.
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#F16B78", fontWeight: 600 }}>
          ⚠️ Notice: Map displays telemetry monitoring; human entry requires certified multigas test.
        </span>
      </div>

      {/* MAIN MAP WORKSPACE */}
      <article
        style={{
          background: "#14283B",
          border: "1px solid #2A4359",
          borderRadius: "12px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Controls & Search Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#F4F7FB" }}>
              Catchment Inspection Chamber Geospatial Workspace
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#8FA5BA" }}>
              Showing {visibleRows.length} of {rows.length} chambers in Greater Chennai
            </p>
          </div>

          {/* Filter Controls */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Search chamber ID or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
              aria-label="Search map assets"
            />

            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              style={selectStyle}
              aria-label="Filter Area"
            >
              {areasList.map((a) => (
                <option key={a} value={a}>
                  {a === "all" ? "All Areas" : a}
                </option>
              ))}
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              style={selectStyle}
              aria-label="Filter Severity"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Condition</option>
              <option value="moderate">Warning / Moderate</option>
              <option value="normal">Nominal Operation</option>
            </select>

            <select
              value={filterGasRisk}
              onChange={(e) => setFilterGasRisk(e.target.value)}
              style={selectStyle}
              aria-label="Filter Gas Risk"
            >
              <option value="all">All Gas States</option>
              <option value="hazard">Gas Hazards (Critical/High)</option>
              <option value="normal">Gas Nominal</option>
            </select>

            {/* Tile Theme Toggle */}
            <div style={{ display: "inline-flex", background: "#102235", border: "1px solid #2A4359", borderRadius: "6px", padding: "2px" }}>
              <button
                type="button"
                onClick={() => setMapTheme("dark")}
                style={tileThemeBtnStyle(mapTheme === "dark")}
                title="CartoDB Dark Matter Theme"
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setMapTheme("osm")}
                style={tileThemeBtnStyle(mapTheme === "osm")}
                title="Standard OpenStreetMap Theme"
              >
                OSM
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Status Chips */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => { setFilterSeverity("all"); setFilterGasRisk("all"); }}
            style={chipStyle(filterSeverity === "all" && filterGasRisk === "all" ? "#35D6C2" : "#B8C5D6", "#1A3045")}
          >
            Total Monitored: {summary.total}
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("critical")}
            style={chipStyle("#F16B78", filterSeverity === "critical" ? "rgba(241, 107, 120, 0.3)" : "rgba(241, 107, 120, 0.12)")}
          >
            🚨 Critical Hydraulic: {summary.critical}
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("moderate")}
            style={chipStyle("#F5B84B", filterSeverity === "moderate" ? "rgba(245, 184, 75, 0.3)" : "rgba(245, 184, 75, 0.12)")}
          >
            ⚠️ Warning: {summary.moderate}
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("normal")}
            style={chipStyle("#35D6C2", filterSeverity === "normal" ? "rgba(53, 214, 194, 0.3)" : "rgba(53, 214, 194, 0.12)")}
          >
            ✅ Normal: {summary.normal}
          </button>
          <button
            type="button"
            onClick={() => setFilterGasRisk("hazard")}
            style={chipStyle("#F16B78", filterGasRisk === "hazard" ? "rgba(241, 107, 120, 0.3)" : "rgba(241, 107, 120, 0.12)")}
          >
            🛡️ Gas Hazards: {summary.gasHazards}
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#B8C5D6", background: "#102235", borderRadius: "8px" }}>
            Synchronizing geospatial coordinates and telemetry from MongoDB...
          </div>
        )}

        {error && (
          <div style={{ padding: "2rem", color: "#F16B78", textAlign: "center", background: "#102235", borderRadius: "8px" }}>
            {error}
          </div>
        )}

        {/* WORKSPACE LAYOUT: MAP + SELECTED CHAMBER INSPECTOR PANEL */}
        {!loading && !error && visibleRows.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: selectedChamber ? "1fr 340px" : "1fr",
              gap: "1rem",
              minHeight: "560px",
            }}
          >
            {/* The Leaflet Map Container */}
            <div
              style={{
                height: "560px",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #2A4359",
                position: "relative",
              }}
            >
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={12}
                style={{ width: "100%", height: "100%" }}
                scrollWheelZoom
              >
                {/* Dynamically switch Tile Layer based on user preference */}
                {mapTheme === "dark" ? (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  />
                ) : (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                )}

                <AutoFitBounds rows={visibleRows} />

                <MarkerClusterGroup chunkedLoading iconCreateFunction={getClusterIcon}>
                  {visibleRows.map((row) => {
                    const isSelected = selectedChamber?.id === row.id;
                    return (
                      <Marker
                        key={`${row.id}-${row.latitude}-${row.longitude}`}
                        position={[row.latitude, row.longitude]}
                        icon={getMarkerIcon(row.status, row.gasRisk, row.deviceStatus, isSelected)}
                        status={row.status}
                        eventHandlers={{
                          click: () => {
                            setSelectedChamber(row);
                          },
                        }}
                      >
                        <Popup>
                          <div style={{ color: "#0B1220", minWidth: "210px", fontFamily: "sans-serif" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #E2E8F0", paddingBottom: "4px", marginBottom: "6px" }}>
                              <strong style={{ fontSize: "14px", color: "#0F172A" }}>Chamber {row.id}</strong>
                              <span style={{ fontSize: "11px", fontWeight: "bold", color: row.status === "Critical" ? "#DC2626" : row.status === "Moderate" ? "#D97706" : "#059669" }}>
                                {row.status}
                              </span>
                            </div>
                            <p style={{ margin: "2px 0", fontSize: "12px" }}>
                              <strong>Area:</strong> {row.area}
                            </p>
                            <p style={{ margin: "2px 0", fontSize: "12px" }}>
                              <strong>Node:</strong> {row.deviceId} ({row.deviceStatus})
                            </p>
                            <p style={{ margin: "2px 0", fontSize: "12px" }}>
                              <strong>Water Depth:</strong> {row.waterLevel.toFixed(1)} cm
                            </p>
                            <p style={{ margin: "2px 0", fontSize: "12px" }}>
                              <strong>Health Score (DHI):</strong> {row.dhi.toFixed(1)}
                            </p>
                            <div style={{ marginTop: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleSelectAsset(row.id)}
                                style={{
                                  width: "100%",
                                  background: "#0B1220",
                                  color: "#35D6C2",
                                  border: "1px solid #304256",
                                  borderRadius: "4px",
                                  padding: "5px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Open Full Chamber Details →
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MarkerClusterGroup>
              </MapContainer>

              {/* Map Legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  background: "rgba(16, 34, 53, 0.95)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid #2A4359",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  zIndex: 1000,
                  fontSize: "0.72rem",
                  color: "#F4F7FB",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "4px", color: "#35D6C2" }}>Map Legend</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#F16B78" }} />
                    <span>Critical Surcharge / Gas Risk</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#F5B84B" }} />
                    <span>Warning / Elevated Depth</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#35D6C2" }} />
                    <span>Nominal Operation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SELECTED CHAMBER INFORMATION PANEL (Without leaving the map!) */}
            {selectedChamber && (
              <div
                style={{
                  background: "#102235",
                  border: "1px solid #2A4359",
                  borderRadius: "8px",
                  padding: "1.15rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                  overflowY: "auto",
                  maxHeight: "560px",
                }}
              >
                <div>
                  {/* Top Bar with Chamber ID and Close Button */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #2A4359", paddingBottom: "8px", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "0.68rem", color: "#35D6C2", fontWeight: 700, textTransform: "uppercase" }}>
                        CHAMBER INSPECTOR
                      </div>
                      <h4 style={{ margin: "2px 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#F4F7FB" }}>
                        Chamber {selectedChamber.id}
                      </h4>
                      <div style={{ fontSize: "0.75rem", color: "#8FA5BA" }}>
                        {selectedChamber.area} Zone • Node {selectedChamber.deviceId}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: selectedChamber.status === "Critical" ? "rgba(241, 107, 120, 0.15)" : selectedChamber.status === "Moderate" ? "rgba(245, 184, 75, 0.15)" : "rgba(53, 214, 194, 0.15)",
                        color: selectedChamber.status === "Critical" ? "#F16B78" : selectedChamber.status === "Moderate" ? "#F5B84B" : "#35D6C2",
                        border: `1px solid ${selectedChamber.status === "Critical" ? "rgba(241, 107, 120, 0.3)" : selectedChamber.status === "Moderate" ? "rgba(245, 184, 75, 0.3)" : "rgba(53, 214, 194, 0.3)"}`,
                        textTransform: "uppercase",
                      }}
                    >
                      {selectedChamber.status}
                    </span>
                  </div>

                  {/* Water Depth & Surcharge Bar */}
                  <div style={{ background: "#14283B", padding: "10px", borderRadius: "6px", marginBottom: "10px", border: "1px solid #2A4359" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#8FA5BA", marginBottom: "4px" }}>
                      <span>Water Depth</span>
                      <strong style={{ color: selectedChamber.waterLevel > 25 ? "#F16B78" : "#35D6C2" }}>
                        {selectedChamber.waterLevel.toFixed(1)} cm
                      </strong>
                    </div>
                    {/* Visual Depth Bar */}
                    <div style={{ height: "6px", background: "#102235", borderRadius: "9999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, (selectedChamber.waterLevel / 35) * 100)}%`,
                          height: "100%",
                          background: selectedChamber.waterLevel > 25 ? "#F16B78" : selectedChamber.waterLevel > 15 ? "#F5B84B" : "#35D6C2",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#8FA5BA", marginTop: "3px" }}>
                      <span>0 cm</span>
                      <span>Caution 15 cm</span>
                      <span>Critical 25 cm</span>
                    </div>
                  </div>

                  {/* Multi-Sensor Readings */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ background: "#14283B", padding: "8px", borderRadius: "6px", border: "1px solid #2A4359" }}>
                      <div style={{ fontSize: "0.68rem", color: "#8FA5BA" }}>Flow Discharge</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#7AA7FF", margin: "2px 0" }}>
                        {selectedChamber.flowRate ? `${selectedChamber.flowRate.toFixed(0)} L/m` : "—"}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#8FA5BA" }}>Volumetric Flow</div>
                    </div>

                    <div style={{ background: "#14283B", padding: "8px", borderRadius: "6px", border: "1px solid #2A4359" }}>
                      <div style={{ fontSize: "0.68rem", color: "#8FA5BA" }}>Health Index (DHI)</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: selectedChamber.dhi > 60 ? "#F16B78" : "#35D6C2", margin: "2px 0" }}>
                        {selectedChamber.dhi ? selectedChamber.dhi.toFixed(1) : "—"}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#8FA5BA" }}>0–100 Scale</div>
                    </div>
                  </div>

                  {/* Gas Sensor Raw Channels */}
                  <div style={{ background: "#14283B", padding: "10px", borderRadius: "6px", marginBottom: "10px", border: "1px solid #2A4359" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F4F7FB" }}>Gas Sensor Raw Signals</span>
                      <span style={{ fontSize: "0.65rem", color: "#8FA5BA", background: "#102235", padding: "1px 5px", borderRadius: "3px" }}>Uncalibrated</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.72rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#B8C5D6" }}>H₂S Raw Ratio:</span>
                        <strong style={{ color: selectedChamber.h2sRaw > 1.6 ? "#F16B78" : "#F4F7FB" }}>
                          {selectedChamber.h2sRaw.toFixed(3)}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#B8C5D6" }}>CH₄ Methane Raw:</span>
                        <strong style={{ color: selectedChamber.methaneRaw > 3.2 ? "#F5B84B" : "#F4F7FB" }}>
                          {selectedChamber.methaneRaw.toFixed(3)}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#B8C5D6" }}>MQ-7 ADC (CO):</span>
                        <strong style={{ color: selectedChamber.mq7Raw > 380 ? "#F16B78" : "#F4F7FB" }}>
                          {selectedChamber.mq7Raw.toFixed(1)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Active Chamber Alerts */}
                  {selectedChamber.alerts && selectedChamber.alerts.length > 0 && (
                    <div style={{ background: "rgba(241, 107, 120, 0.08)", border: "1px solid rgba(241, 107, 120, 0.3)", padding: "8px", borderRadius: "6px", marginBottom: "10px" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#F16B78", marginBottom: "3px" }}>
                        Active Incidents ({selectedChamber.alerts.length})
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#F4F7FB" }}>
                        {selectedChamber.alerts[0].alert_message || selectedChamber.alerts[0].message}
                      </div>
                    </div>
                  )}

                  {/* Coordinates & Freshness */}
                  <div style={{ fontSize: "0.68rem", color: "#8FA5BA", marginBottom: "12px" }}>
                    <div>Lat/Lng: {selectedChamber.latitude.toFixed(4)}, {selectedChamber.longitude.toFixed(4)}</div>
                    <div>Last Updated: {new Date(selectedChamber.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</div>
                  </div>
                </div>

                {/* Bottom Quick Action */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #2A4359", paddingTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => handleSelectAsset(selectedChamber.id)}
                    style={{
                      background: "#35D6C2",
                      color: "#0B1220",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Open Asset Inspector →
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard?tab=gas-safety`)}
                    style={{
                      background: "#14283B",
                      color: "#B8C5D6",
                      border: "1px solid #2A4359",
                      borderRadius: "6px",
                      padding: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View Gas Safety Protocols
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

// Subordinate Styles
const chipStyle = (color, bg) => ({
  fontSize: "0.75rem",
  fontWeight: 700,
  padding: "3px 10px",
  borderRadius: "9999px",
  background: bg,
  color: color,
  border: `1px solid ${color}40`,
  cursor: "pointer",
});

const inputStyle = {
  background: "#102235",
  border: "1px solid #2A4359",
  borderRadius: "6px",
  padding: "6px 12px",
  color: "#F4F7FB",
  fontSize: "0.82rem",
  width: "210px",
  outline: "none",
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

const tileThemeBtnStyle = (active) => ({
  background: active ? "#35D6C2" : "transparent",
  color: active ? "#0B1220" : "#B8C5D6",
  fontWeight: active ? 800 : 500,
  border: "none",
  borderRadius: "4px",
  padding: "3px 8px",
  fontSize: "0.72rem",
  cursor: "pointer",
  transition: "all 140ms ease",
});

export default MapView;
