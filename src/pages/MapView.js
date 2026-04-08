import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { API } from "../config.js";

const CHENNAI_CENTER = [12.9716, 80.2437];
const CHENNAI_BOUNDS = [
  [12.85, 80.1],
  [13.1, 80.35],
];

const CHENNAI_LAT_MIN = 12.85;
const CHENNAI_LAT_MAX = 13.1;
const CHENNAI_LNG_MIN = 80.1;
const CHENNAI_LNG_MAX = 80.3;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (value) => String(value || "Normal").trim().toLowerCase();

const isValidLocation = (lat, lng) => {
  return (
    lat >= CHENNAI_LAT_MIN && lat <= CHENNAI_LAT_MAX &&
    lng >= CHENNAI_LNG_MIN && lng <= CHENNAI_LNG_MAX
  );
};

function getMarkerIcon(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "critical") {
    return L.divIcon({
      className: "drain-marker-icon",
      html: '<div class="critical-marker blink-marker"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -12],
    });
  }

  if (normalized === "moderate") {
    return L.divIcon({
      className: "drain-marker-icon",
      html: '<div class="moderate-marker"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -12],
    });
  }

  return L.divIcon({
    className: "drain-marker-icon",
    html: '<div class="normal-marker"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -12],
  });
}

function getClusterIcon(cluster) {
  const childMarkers = cluster.getAllChildMarkers();
  let hasCritical = false;
  let hasModerate = false;

  childMarkers.forEach((marker) => {
    const markerStatus = normalizeStatus(marker?.options?.status);
    if (markerStatus === "critical") hasCritical = true;
    if (markerStatus === "moderate") hasModerate = true;
  });

  const bg = hasCritical ? "#dc2626" : hasModerate ? "#f97316" : "#16a34a";

  return L.divIcon({
    className: "severity-cluster-icon",
    html: `<div class="severity-cluster" style="background:${bg};">${cluster.getChildCount()}</div>`,
    iconSize: [34, 34],
  });
}

function AutoFocusOnRisk({ rows }) {
  const map = useMap();

  useEffect(() => {
    if (!rows.length) return;

    const criticalPoints = rows
      .filter((row) => normalizeStatus(row.status) === "critical")
      .map((row) => [row.latitude, row.longitude]);

    const points = criticalPoints.length > 0
      ? criticalPoints
      : rows.map((row) => [row.latitude, row.longitude]);

    if (!points.length) return;

    map.fitBounds(points, {
      padding: [26, 26],
      maxZoom: 14,
    });
  }, [map, rows]);

  return null;
}

function MapView() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      navigate("/login");
      return;
    }

    let isMounted = true;

    const fetchMapData = async () => {
      try {
        setLoading(true);
        setError("");

        const [drainsResponse, statusResponse] = await Promise.all([
          fetch(`${API}/drains`, { headers: { Accept: "application/json" } }),
          fetch(`${API}/latest-status`, { headers: { Accept: "application/json" } }),
        ]);

        if (!drainsResponse.ok) {
          throw new Error(`Unable to load drains (${drainsResponse.status})`);
        }

        const drainsPayload = await drainsResponse.json();
        const statusPayload = statusResponse.ok ? await statusResponse.json() : [];

        const drains = Array.isArray(drainsPayload)
          ? drainsPayload
          : Array.isArray(drainsPayload?.data)
            ? drainsPayload.data
            : [];

        const statuses = Array.isArray(statusPayload)
          ? statusPayload
          : Array.isArray(statusPayload?.data)
            ? statusPayload.data
            : [];

        const statusByDrainId = new Map(
          statuses.map((item) => [Number(item?.drain_id), item])
        );

        const mapped = drains
          .map((drain) => {
            const drainId = Number(drain?.drain_id ?? drain?.id);
            const latest = statusByDrainId.get(drainId);

            let latitude = toNumber(drain?.latitude ?? drain?.lat);
            let longitude = toNumber(drain?.longitude ?? drain?.lng);

            if (latitude !== null && longitude !== null) {
              // Correct common payload issues where lat/lng are swapped.
              if (latitude > 90 || longitude < 70) {
                [latitude, longitude] = [longitude, latitude];
              }
            }

            return {
              id: drainId,
              area: String(drain?.area_name || drain?.area || "Unknown Area"),
              latitude,
              longitude,
              waterLevel: toNumber(latest?.water_level_cm ?? drain?.water_level_cm ?? drain?.waterLevel),
              dhi: toNumber(latest?.dhi_score ?? drain?.dhi_score ?? drain?.dhi),
              status: String(latest?.status || drain?.status || "Normal"),
            };
          });

        const invalidDrains = mapped.filter((row) => {
          if (row.latitude === null || row.longitude === null) return true;
          return !isValidLocation(row.latitude, row.longitude);
        });

        console.log("Invalid drains:", invalidDrains);

        const validDrains = mapped.filter((row) => {
          if (row.latitude === null || row.longitude === null) return false;
          return isValidLocation(row.latitude, row.longitude);
        });

        if (!isMounted) return;
        setRows(validDrains);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load map data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMapData();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const visibleRows = useMemo(() => {
    if (filter === "critical") {
      return rows.filter((row) => normalizeStatus(row.status) === "critical");
    }
    return rows;
  }, [rows, filter]);

  const summary = useMemo(() => {
    const critical = rows.filter((row) => normalizeStatus(row.status) === "critical").length;
    const moderate = rows.filter((row) => normalizeStatus(row.status) === "moderate").length;
    const normal = rows.filter((row) => normalizeStatus(row.status) === "normal").length;
    return { critical, moderate, normal };
  }, [rows]);

  return (
    <main className="dashboard-main" style={{ padding: "16px" }}>
      <article className="gov-panel map-view-card">
        <div className="map-view-header">
          <h2>Smart Drain Map Monitoring</h2>
          <div className="map-view-controls">
            <label htmlFor="severityFilter">Filter</label>
            <select
              id="severityFilter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="critical">Critical only</option>
            </select>
          </div>
        </div>

        <div className="map-view-summary">
          <span>Total: {rows.length}</span>
          <span className="summary-critical">Critical: {summary.critical}</span>
          <span className="summary-moderate">Moderate: {summary.moderate}</span>
          <span className="summary-normal">Normal: {summary.normal}</span>
        </div>

        {loading ? <p className="map-state">Loading map data...</p> : null}
        {error ? <p className="map-state map-state-error">{error}</p> : null}

        {!loading && !error && visibleRows.length === 0 ? (
          <p className="map-state">No drains available for selected filter.</p>
        ) : null}

        {!loading && !error && visibleRows.length > 0 ? (
          <div className="drain-map-wrap">
            <MapContainer
              center={CHENNAI_CENTER}
              zoom={11}
              className="drain-map"
              scrollWheelZoom
              maxBounds={CHENNAI_BOUNDS}
              maxBoundsViscosity={1.0}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <AutoFocusOnRisk rows={visibleRows} />

              <MarkerClusterGroup chunkedLoading iconCreateFunction={getClusterIcon}>
                {visibleRows.map((row) => (
                  <Marker
                    key={`${row.id}-${row.latitude}-${row.longitude}`}
                    position={[row.latitude, row.longitude]}
                    icon={getMarkerIcon(row.status)}
                    status={row.status}
                  >
                    <Popup>
                      <div className="map-popup">
                        <h4>Drain #{row.id}</h4>
                        <p><strong>Area:</strong> {row.area}</p>
                        <p><strong>Water Level:</strong> {row.waterLevel ?? "-"}</p>
                        <p><strong>DHI Score:</strong> {row.dhi ?? "-"}</p>
                        <p><strong>Status:</strong> {row.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>

            <div className="map-legend-box">
              <h4>Legend</h4>
              <p><span className="legend-dot critical" /> Critical</p>
              <p><span className="legend-dot moderate" /> Moderate</p>
              <p><span className="legend-dot normal" /> Normal</p>
            </div>
          </div>
        ) : null}
      </article>
    </main>
  );
}

export default MapView;
