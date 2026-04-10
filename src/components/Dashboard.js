import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar.js";
import AlertsPage from "./dashboard/AlertsPage.js";
import AnalyticsPage from "./dashboard/AnalyticsPage.js";
import DashboardMain from "./dashboard/DashboardMain.js";
import MapView from "../pages/MapView.js";
import ProfilePage from "./ProfilePage.js";
import EnhancedAlertsPage from "./EnhancedAlertsPage.js";
import AdvancedAnalytics from "./AdvancedAnalytics.js";
import UserManagement from "./UserManagement.js";
import DrainManagement from "./DrainManagement.js";
import ReportsPage from "./ReportsPage.js";
import { API } from "../config.js";
import { clearAuthSession } from "../utils/auth.js";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const DATA_MODE = "SIMULATION";

const normalizeArea = (value) => String(value || "").trim().toLowerCase();
const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const parseTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const buildAlertMessage = (severity) => {
  if (severity === "Critical") return "High flood risk detected";
  if (severity === "Moderate") return "Rising water level detected";
  return "Normal";
};

const NAV_TITLES = {
  dashboard: "Dashboard Overview",
  alerts: "Alerts Monitoring",
  analytics: "Analytics Insights",
  map: "Map View",
  profile: "Profile",
  users: "👥 User Management",
  drains: "💧 Drain Management",
  reports: "📋 Reports & Exports",
};

function Dashboard() {
  const navigate = useNavigate();
  const fetchInFlightRef = useRef(false);

  const [activeNav, setActiveNav] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiData, setApiData] = useState([]);
  const [drainMetaData, setDrainMetaData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userJson);
      setCurrentUser(parsedUser);
    } catch {
      navigate("/login");
      return;
    }

    let isMounted = true;

    const fetchLatestStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        };

        const response = await fetch(`${API}/latest-status`, {
          headers,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch latest status (${response.status})`);
        }

        const rawBody = await response.text();
        let json;

        try {
          json = JSON.parse(rawBody);
        } catch {
          console.error("JSON parse failed. Raw response:", rawBody.slice(0, 500));
          throw new Error("Invalid JSON response. Check frontend URL/port and API endpoint.");
        }

        const data = parseRows(json).map((item) => ({
          drain_id: item?.drain_id,
          area_name: String(item?.area_name || "").trim(),
          water_level_cm: safeNumber(item?.water_level_cm),
          dhi_score: safeNumber(item?.dhi_score),
          status: item?.status,
          timestamp: parseTimestamp(item?.timestamp),
        }));

        console.log("DATA FROM API:", data);

        if (!isMounted) return;
        setApiData(data);
        setError("");
        setLoading(false);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to fetch data from server");
        setLoading(false);
      }
    };

    const fetchDrainMetaData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        };

        const response = await fetch(`${API}/drains`, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch drains (${response.status})`);
        }

        const json = await response.json();
        const rows = parseRows(json).map((item) => ({
          drain_id: item?.drain_id,
          area_name: String(item?.area_name || "").trim(),
          latitude: safeNumber(item?.latitude),
          longitude: safeNumber(item?.longitude),
        }));

        if (!isMounted) return;
        setDrainMetaData(rows);
      } catch {
        if (!isMounted) return;
        setDrainMetaData([]);
      }
    };

    const fetchAll = async () => {
      if (fetchInFlightRef.current) return;

      fetchInFlightRef.current = true;

      try {
        await Promise.all([fetchLatestStatus(), fetchDrainMetaData()]);
      } finally {
        fetchInFlightRef.current = false;
      }
    };

    fetchAll();
    const intervalId = setInterval(fetchAll, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [navigate]);

  const officerArea = useMemo(() => {
    if (!currentUser) return "Velachery";

    // Check currentUser.area first (for admin with area: "ALL")
    if (typeof currentUser.area === "string" && currentUser.area.trim()) {
      return currentUser.area.trim();
    }

    const assignedAreas = currentUser?.assignedAreas;
    if (Array.isArray(assignedAreas) && assignedAreas.length > 0) {
      return String(assignedAreas[0]).trim() || "Velachery";
    }

    if (typeof assignedAreas === "string" && assignedAreas.trim()) {
      return assignedAreas.trim();
    }

    return "Velachery";
  }, [currentUser]);

  const filteredData = useMemo(() => {
    // If area is "ALL", return all data (for admin)
    if (normalizeArea(officerArea) === normalizeArea("ALL")) {
      return apiData;
    }
    // Otherwise filter by specific area
    return apiData.filter(
      (item) => normalizeArea(item.area_name) === normalizeArea(officerArea)
    );
  }, [apiData, officerArea]);

  const kpis = useMemo(() => {
    const totalDrains = filteredData.length;
    const critical = filteredData.filter((d) => normalizeStatus(d?.status) === "critical").length;
    const moderate = filteredData.filter((item) => normalizeStatus(item?.status) === "moderate").length;
    const normal = filteredData.filter((item) => normalizeStatus(item?.status) === "normal").length;
    const validDhiScores = filteredData
      .map((item) => safeNumber(item?.dhi_score))
      .filter((value) => value !== null);
    const averageDhi =
      validDhiScores.length > 0
        ? validDhiScores.reduce((sum, value) => sum + value, 0) / validDhiScores.length
        : null;

    return {
      totalDrains,
      criticalAlerts: critical,
      critical,
      moderate,
      normal,
      averageDhi,
    };
  }, [filteredData]);

  const statusDistribution = useMemo(
    () => [
      { name: "Critical", value: kpis.criticalAlerts, color: "#b42318" },
      { name: "Moderate", value: kpis.moderate, color: "#c2410c" },
      { name: "Normal", value: kpis.normal, color: "#15803d" },
    ],
    [kpis]
  );

  const dhiBarData = useMemo(
    () =>
      filteredData.map((item) => ({
        drainLabel: `Drain ${item?.drain_id ?? "-"}`,
        dhiScore: safeNumber(item?.dhi_score) ?? 0,
      })),
    [filteredData]
  );

  const generatedAlerts = useMemo(
    () => {
      const priorityOrder = {
        Critical: 1,
        Moderate: 2,
        Normal: 3,
      };

      return filteredData
        .filter((item) => item?.status !== "Normal")
        .map((item, index) => ({
          id: `${item?.drain_id}-${item?.timestamp || index}`,
          drain_id: item?.drain_id ?? "-",
          severity: item?.status,
          message: buildAlertMessage(item?.status),
          timestamp: item?.timestamp,
        }))
        .sort((a, b) => {
          const severityDiff =
            (priorityOrder[a.severity] ?? 99) - (priorityOrder[b.severity] ?? 99);
          if (severityDiff !== 0) return severityDiff;

          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
    },
    [filteredData]
  );

  const mapRows = useMemo(() => {
    const statusByDrain = new Map(filteredData.map((item) => [item.drain_id, item]));

    return drainMetaData
      .filter((row) => normalizeArea(row?.area_name) === normalizeArea(officerArea))
      .map((row) => {
        const statusSnapshot = statusByDrain.get(row.drain_id);

        return {
          ...row,
          status: statusSnapshot?.status || "Unknown",
        };
      });
  }, [drainMetaData, filteredData, officerArea]);

  const formatWaterLevel = (value) => {
    const parsedValue = safeNumber(value);
    if (parsedValue === null || parsedValue <= 0) {
      return DATA_MODE === "LIVE" ? "Sensor Offline" : "Simulated Data";
    }

    if (DATA_MODE === "SIMULATION") {
      return `${parsedValue} cm (Simulated)`;
    }

    return `${parsedValue} cm`;
  };

  const modeLabel = DATA_MODE === "SIMULATION" ? "Simulation Mode" : "Live Mode";

  useEffect(() => {
    console.log("API Data:", apiData);
    console.log("Filtered Data:", filteredData);
  }, [apiData, filteredData]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const renderActivePage = () => {
    if (activeNav === "alerts") {
      return <EnhancedAlertsPage apiData={filteredData} />;
    }

    if (activeNav === "analytics") {
      return (
        <>
          <AnalyticsPage filteredData={filteredData} />
          <AdvancedAnalytics filteredData={filteredData} allData={apiData} />
        </>
      );
    }

    if (activeNav === "map") {
      return <MapView />;
    }

    if (activeNav === "profile") {
      return <ProfilePage user={currentUser} onUpdate={setCurrentUser} />;
    }

    // Admin-only pages
    const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";

    if (activeNav === "users") {
      if (!isAdmin) {
        return <div style={{ padding: "20px", color: "#999" }}>Access Denied. Admin only.</div>;
      }
      return <UserManagement apiData={apiData} />;
    }

    if (activeNav === "drains") {
      if (!isAdmin) {
        return <div style={{ padding: "20px", color: "#999" }}>Access Denied. Admin only.</div>;
      }
      return <DrainManagement apiData={apiData} />;
    }

    if (activeNav === "reports") {
      const role = String(currentUser?.role || "").toLowerCase();
      if (!["admin", "officer"].includes(role)) {
        return <div style={{ padding: "20px", color: "#999" }}>Access Denied. Admin only.</div>;
      }
      return <ReportsPage filteredData={filteredData} apiData={apiData} user={currentUser} />;
    }

    return (
      <DashboardMain
        officerArea={officerArea}
        kpis={kpis}
        statusDistribution={statusDistribution}
        dhiBarData={dhiBarData}
        filteredData={filteredData}
        formatWaterLevel={formatWaterLevel}
      />
    );
  };

  if (loading) {
    return (
      <section className="gov-dashboard-page">
        <div className="gov-dashboard-layout">
          <DashboardSidebar activeItem={activeNav} onNavigate={setActiveNav} user={currentUser} />
          <div className="gov-dashboard-main">
            <div className="gov-dashboard-shell">
              <div className="gov-state-card">Loading dashboard data...</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="gov-dashboard-page">
        <div className="gov-dashboard-layout">
          <DashboardSidebar activeItem={activeNav} onNavigate={setActiveNav} user={currentUser} />
          <div className="gov-dashboard-main">
            <div className="gov-dashboard-shell">
              <div className="gov-state-card gov-state-error">{error}</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="gov-dashboard-page">
      <div className="gov-dashboard-layout">
        <DashboardSidebar activeItem={activeNav} onNavigate={setActiveNav} user={currentUser} />

        <div className="gov-dashboard-main">
          <div className="gov-dashboard-shell">
            <header className="gov-topbar">
              <div>
                <h2>{NAV_TITLES[activeNav] || "Dashboard"}</h2>
                <p>Assigned Area: {officerArea}</p>
              </div>
              <div className="gov-topbar-controls">
                <span className="gov-mode-badge">Mode: {modeLabel}</span>
                <button type="button" className="gov-logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </header>
            {renderActivePage()}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
