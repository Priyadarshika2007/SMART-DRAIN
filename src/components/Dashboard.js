import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar.js";
import DashboardMain from "./dashboard/DashboardMain.js";
import MapView from "../pages/MapView.js";
import ProfilePage from "./ProfilePage.js";
import EnhancedAlertsPage from "./EnhancedAlertsPage.js";
import AdvancedAnalytics from "./AdvancedAnalytics.js";
import UserManagement from "./UserManagement.js";
import DrainManagement from "./DrainManagement.js";
import ReportsPage from "./ReportsPage.js";
import GasSafetyPage from "./GasSafetyPage.js";
import DeviceHealthPage from "./DeviceHealthPage.js";
import WaterFlowAnalytics from "./WaterFlowAnalytics.js";
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

const normalizeArea = (value) => String(value || "").trim().toLowerCase();
const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const parseTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const NAV_TITLES = {
  dashboard: "Executive Operations Command Centre",
  map: "Drainage Network Geospatial Map",
  drains: "Chamber Monitoring & Asset View",
  hydraulics: "Water Level & Flow Analytics",
  "gas-safety": "Gas Safety & Worker Protection",
  alerts: "Alerts & Incident Management",
  analytics: "Analytics & Anomaly Detection",
  devices: "Device Health & Reliability Workspace",
  reports: "Reports & Telemetry Exports",
  users: "User Access & Permissions",
  profile: "Operator Profile & Account Settings",
};

function Dashboard({ initialTab }) {
  const navigate = useNavigate();
  const fetchInFlightRef = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");
  const effectiveTab = initialTab || queryTab || "dashboard";

  const [activeNav, setActiveNav] = useState(effectiveTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiData, setApiData] = useState([]);
  const [drainMetaData, setDrainMetaData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (initialTab && initialTab !== activeNav) {
      setActiveNav(initialTab);
    } else if (queryTab && queryTab !== activeNav) {
      setActiveNav(queryTab);
    }
  }, [initialTab, queryTab]);

  const handleNavSelect = (tabKey) => {
    setActiveNav(tabKey);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabKey);
      return next;
    });
    setMobileSidebarOpen(false);
  };

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

        const response = await fetch(`${API}/latest-status`, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch latest status (${response.status})`);
        }

        const rawBody = await response.text();
        let json;
        try {
          json = JSON.parse(rawBody);
        } catch {
          throw new Error("Invalid response format from status API.");
        }

        const data = parseRows(json).map((item) => ({
          drain_id: item?.drain_id,
          area_name: String(item?.area_name || "").trim(),
          water_level_cm: safeNumber(item?.water_level_cm),
          dhi_score: safeNumber(item?.dhi_score),
          status: item?.status,
          timestamp: parseTimestamp(item?.timestamp),
        }));

        if (!isMounted) return;
        setApiData(data);
        setError("");
        setLoading(false);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to fetch status data from server");
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
      } catch (err) {
        if (isMounted) {
          setError((prev) => prev || err?.message || "Failed to load dashboard data");
        }
      } finally {
        fetchInFlightRef.current = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAll();
    const intervalId = setInterval(fetchAll, 20000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [navigate]);

  const officerArea = useMemo(() => {
    if (!currentUser) return "Velachery";
    if (typeof currentUser.area === "string" && currentUser.area.trim()) {
      return currentUser.area.trim();
    }
    const assignedAreas = currentUser?.assignedAreas;
    if (Array.isArray(assignedAreas) && assignedAreas.length > 0) {
      return String(assignedAreas[0]).trim() || "Velachery";
    }
    return "Velachery";
  }, [currentUser]);

  const filteredData = useMemo(() => {
    if (normalizeArea(officerArea) === normalizeArea("ALL")) {
      return apiData;
    }
    return apiData.filter(
      (item) => normalizeArea(item.area_name) === normalizeArea(officerArea)
    );
  }, [apiData, officerArea]);

  const kpis = useMemo(() => {
    const totalDrains = filteredData.length;
    const critical = filteredData.filter((d) => normalizeStatus(d?.status) === "critical").length;
    const moderate = filteredData.filter((item) => ["moderate", "warning"].includes(normalizeStatus(item?.status))).length;
    const normal = filteredData.filter((item) => ["normal", "good", "monitoring"].includes(normalizeStatus(item?.status))).length;
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
      { name: "Critical", value: kpis.critical, color: "#F16B78" },
      { name: "Moderate", value: kpis.moderate, color: "#F5B84B" },
      { name: "Normal", value: kpis.normal, color: "#35D6C2" },
    ],
    [kpis]
  );

  const dhiBarData = useMemo(
    () =>
      filteredData.map((item) => ({
        drainLabel: `Chamber ${item?.drain_id ?? "-"}`,
        dhiScore: safeNumber(item?.dhi_score) ?? 0,
      })),
    [filteredData]
  );

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const renderActivePage = () => {
    if (activeNav === "hydraulics") {
      return (
        <WaterFlowAnalytics
          user={currentUser}
          onNavigateToChamber={(drainId) => {
            handleNavSelect("drains");
            setSearchParams({ tab: "drains", drainId });
          }}
        />
      );
    }

    if (activeNav === "gas-safety") {
      return (
        <GasSafetyPage
          user={currentUser}
          onNavigateToChamber={(drainId) => {
            handleNavSelect("drains");
            setSearchParams({ tab: "drains", drainId });
          }}
          onNavigateToDevice={(devId) => {
            handleNavSelect("devices");
            setSearchParams({ tab: "devices", devId });
          }}
        />
      );
    }

    if (activeNav === "devices") {
      return (
        <DeviceHealthPage
          user={currentUser}
          onNavigateToDrain={(drainId) => {
            handleNavSelect("drains");
            setSearchParams({ tab: "drains", drainId });
          }}
        />
      );
    }

    if (activeNav === "alerts") {
      return (
        <EnhancedAlertsPage
          user={currentUser}
          onNavigateToChamber={(drainId) => {
            handleNavSelect("drains");
            setSearchParams({ tab: "drains", drainId });
          }}
          onNavigateToGasSafety={() => handleNavSelect("gas-safety")}
        />
      );
    }

    if (activeNav === "analytics") {
      return (
        <>
          <AdvancedAnalytics filteredData={filteredData} allData={apiData} />
        </>
      );
    }

    if (activeNav === "map") {
      return (
        <MapView
          onSelectDrain={(drainId) => {
            handleNavSelect("drains");
            setSearchParams({ tab: "drains", drainId });
          }}
        />
      );
    }

    if (activeNav === "profile") {
      return <ProfilePage user={currentUser} onUpdate={setCurrentUser} />;
    }

    const rawRole = String(currentUser?.role || "").toLowerCase();
    const isAdmin = rawRole === "admin" || rawRole === "district head";

    if (activeNav === "users") {
      if (!isAdmin) {
        return (
          <div
            style={{
              padding: "2.5rem",
              background: "#14283B",
              border: "1px solid #2A4359",
              borderRadius: "14px",
              color: "#F16B78",
              textAlign: "center",
            }}
          >
            <h3>Access Restricted</h3>
            <p style={{ color: "#B8C5D6" }}>User access management requires Administrator or District Head privileges.</p>
          </div>
        );
      }
      return <UserManagement apiData={apiData} user={currentUser} />;
    }

    if (activeNav === "drains") {
      return <DrainManagement apiData={apiData} user={currentUser} initialDrainId={searchParams.get("drainId")} />;
    }

    if (activeNav === "reports") {
      return <ReportsPage filteredData={filteredData} apiData={apiData} user={currentUser} />;
    }

    return (
      <DashboardMain
        officerArea={officerArea}
        kpis={kpis}
        statusDistribution={statusDistribution}
        dhiBarData={dhiBarData}
        filteredData={filteredData}
        allData={apiData}
        formatWaterLevel={(v) => `${v ?? 0} cm`}
        onNavigate={handleNavSelect}
        onSelectDrain={(drainId) => {
          handleNavSelect("drains");
          setSearchParams({ tab: "drains", drainId });
        }}
      />
    );
  };

  return (
    <div
      className="gov-dashboard-page"
      style={{
        backgroundColor: "#0B1220",
        minHeight: "100vh",
        display: "flex",
      }}
    >
      {/* Sidebar with Navigation */}
      <DashboardSidebar
        activeItem={activeNav}
        onNavigate={handleNavSelect}
        user={currentUser}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        alertCount={kpis.criticalAlerts}
      />

      {/* Main Content Area */}
      <div
        className="gov-dashboard-main"
        style={{
          flex: 1,
          backgroundColor: "#0B1220",
          overflowY: "auto",
          minHeight: "100vh",
        }}
      >
        <div className="gov-dashboard-shell">
          {/* Top Navigation Bar */}
          <header
            className="gov-topbar"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              padding: "0.85rem 1.25rem",
              backgroundColor: "#14283B",
              border: "1px solid #2A4359",
              borderRadius: "12px",
              marginBottom: "1.25rem",
            }}
          >
            {/* Left: Breadcrumbs & Official Title */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "#8FA5BA", marginBottom: "3px" }}>
                <span style={{ fontWeight: 700, color: "#35D6C2" }}>URBANDRAIN 2.0</span>
                <span>/</span>
                <span>Operations</span>
                <span>/</span>
                <span style={{ color: "#F4F7FB", fontWeight: 600 }}>{NAV_TITLES[activeNav] || "Dashboard"}</span>
              </div>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#F4F7FB" }}>
                {NAV_TITLES[activeNav] || "Dashboard Overview"}
              </h2>
              <div style={{ fontSize: "0.68rem", color: "#8FA5BA", fontWeight: 600, letterSpacing: "0.03em", marginTop: "2px" }}>
                SMART AI-BASED INSPECTION CHAMBER MONITORING FOR URBAN DRAINAGE NETWORKS
              </div>
            </div>

            {/* Right: Controls & Profile Menu */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {/* Dataset Calibration Pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  background: "#1A3045",
                  border: "1px solid #2A4359",
                  fontSize: "0.75rem",
                  color: "#7AA7FF",
                  fontWeight: 600,
                }}
              >
                Chennai Catchment Telemetry
              </div>

              {/* Notifications Entry Point (Bell Icon with Alert Count Badge) */}
              <button
                type="button"
                onClick={() => handleNavSelect("alerts")}
                style={{
                  position: "relative",
                  background: "#1A3045",
                  border: "1px solid #2A4359",
                  borderRadius: "8px",
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: kpis.criticalAlerts > 0 ? "#F16B78" : "#B8C5D6",
                  cursor: "pointer",
                }}
                aria-label="View Alerts"
                title={`${kpis.criticalAlerts} critical alerts`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {kpis.criticalAlerts > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      background: "#F16B78",
                      color: "#FFFFFF",
                      borderRadius: "9999px",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      padding: "1px 5px",
                      lineHeight: 1.2,
                    }}
                  >
                    {kpis.criticalAlerts}
                  </span>
                )}
              </button>

              {/* Profile Menu Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#172638",
                    border: "1px solid #304256",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    color: "#F4F7FB",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                  aria-expanded={profileMenuOpen}
                >
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#35D6C2",
                      color: "#0B1220",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                    }}
                  >
                    {String(currentUser?.username || "U")[0].toUpperCase()}
                  </span>
                  <span>{currentUser?.username || "Account"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      width: "210px",
                      backgroundColor: "#172638",
                      border: "1px solid #304256",
                      borderRadius: "8px",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                      zIndex: 100,
                      padding: "0.5rem 0",
                    }}
                  >
                    <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #304256", fontSize: "0.8rem" }}>
                      <div style={{ color: "#F4F7FB", fontWeight: 700 }}>{currentUser?.name || currentUser?.username}</div>
                      <div style={{ color: "#35D6C2", fontSize: "0.72rem", textTransform: "uppercase" }}>{currentUser?.role || "Staff"}</div>
                      <div style={{ color: "#8498AE", fontSize: "0.72rem" }}>Zone: {officerArea}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleNavSelect("profile");
                      }}
                      style={profileMenuItemStyle}
                    >
                      Profile Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleNavSelect("drains");
                      }}
                      style={profileMenuItemStyle}
                    >
                      Drain Asset Management
                    </button>
                    <div style={{ borderTop: "1px solid #304256", margin: "0.25rem 0" }} />
                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{ ...profileMenuItemStyle, color: "#F16B78" }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Loading, Error, or Active Content */}
          {loading ? (
            <div
              style={{
                background: "#172638",
                border: "1px solid #304256",
                borderRadius: "12px",
                padding: "3.5rem",
                textAlign: "center",
                color: "#F4F7FB",
              }}
            >
              <div className="udx-spinner" style={{ margin: "0 auto 1rem" }} />
              <p style={{ margin: 0, color: "#B8C5D6", fontSize: "0.95rem" }}>Synchronizing chamber telemetry from MongoDB...</p>
            </div>
          ) : error ? (
            <div
              style={{
                background: "#172638",
                border: "1px solid rgba(241, 107, 120, 0.4)",
                borderRadius: "12px",
                padding: "2rem",
                color: "#F4F7FB",
              }}
            >
              <h3 style={{ color: "#F16B78", marginTop: 0 }}>Telemetry Retrieval Issue</h3>
              <p style={{ color: "#B8C5D6" }}>{error}</p>
              <button
                type="button"
                className="udx-btn udx-btn-secondary"
                onClick={() => window.location.reload()}
              >
                Retry Synchronization
              </button>
            </div>
          ) : (
            renderActivePage()
          )}
        </div>
      </div>
    </div>
  );
}

const profileMenuItemStyle = {
  display: "block",
  width: "100%",
  padding: "8px 16px",
  background: "none",
  border: "none",
  color: "#B8C5D6",
  fontSize: "0.85rem",
  textAlign: "left",
  cursor: "pointer",
  transition: "all 150ms ease",
};

export default Dashboard;
