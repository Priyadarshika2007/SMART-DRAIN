import React, { useMemo } from "react";
import logoImg from "../assets/urbandrainx-logo.png";

function DashboardSidebar({ activeItem, onNavigate, user, isMobileOpen, onCloseMobile, alertCount = 0 }) {
  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      const userJson = localStorage.getItem("user");
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }, [user]);

  const rawRole = String(currentUser?.role || "").trim().toLowerCase();
  const isAdmin = rawRole === "admin" || rawRole === "district head" || rawRole === "system admin";
  const isDistrictHead = rawRole === "district head";
  const isOfficer = rawRole === "officer" || rawRole === "operator" || rawRole === "municipal officer" || rawRole === "authority";
  const isWorker = rawRole === "worker" || rawRole === "maintenance" || rawRole === "supervisor" || rawRole === "field crew";
  const isViewer = rawRole === "viewer";

  const roleLabel = isAdmin
    ? (isDistrictHead ? "District Head" : "Admin")
    : isOfficer
      ? "Municipal Officer"
      : isWorker
        ? "Field Crew"
        : isViewer
          ? "Viewer"
          : String(currentUser?.role || "Municipal Officer");

  const displayName = currentUser?.name || currentUser?.full_name || currentUser?.username || "Municipal Staff";
  const displayArea = isAdmin
    ? "Greater Chennai (ALL)"
    : currentUser?.area || (Array.isArray(currentUser?.assignedAreas) ? currentUser.assignedAreas.join(", ") : "Chennai");

  // High-precision SVGs
  const icons = {
    dashboard: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
    map: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    drains: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    hydraulics: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        <path d="M2 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        <path d="M2 6c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      </svg>
    ),
    gasSafety: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
    alerts: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    analytics: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    devices: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    ),
    reports: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    users: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    profile: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      </svg>
    ),
  };

  // Structured Sections as requested in Information Architecture
  const sections = useMemo(() => {
    const list = [
      {
        header: "A. OPERATIONS",
        items: [
          { key: "dashboard", label: "Executive Overview", icon: icons.dashboard, desc: "Command Centre Summary" },
          { key: "map", label: "Drainage Network Map", icon: icons.map, desc: "Geospatial Workspace" },
          { key: "drains", label: "Chamber Monitoring", icon: icons.drains, desc: "Individual Asset Inspector" },
        ],
      },
      {
        header: "B. ENVIRONMENT & SAFETY",
        items: [
          { key: "hydraulics", label: "Water Level & Flow", icon: icons.hydraulics, desc: "Hydraulic Telemetry & Trends" },
          { key: "gas-safety", label: "Gas & Worker Safety", icon: icons.gasSafety, desc: "Atmospheric & Confined Space", highlight: true },
          { key: "alerts", label: "Alerts & Incidents", icon: icons.alerts, desc: "Operational Incident Queue", badgeCount: alertCount },
        ],
      },
      {
        header: "C. INTELLIGENCE",
        items: [
          { key: "analytics", label: "Analytics & Anomalies", icon: icons.analytics, desc: "Historical Risk Modeling" },
          { key: "devices", label: "Device Reliability", icon: icons.devices, desc: "Hardware & Maintenance Log" },
        ],
      },
    ];

    // Section D: Administration
    const adminItems = [
      { key: "reports", label: "Reports & Exports", icon: icons.reports, desc: "RFC-4180 CSV & Summaries" },
    ];

    if (isAdmin) {
      adminItems.push({ key: "users", label: "User Management", icon: icons.users, desc: "Access Control & Roles" });
    }

    adminItems.push({ key: "profile", label: "Profile & Settings", icon: icons.profile, desc: "Account Configuration" });

    list.push({
      header: "D. ADMINISTRATION",
      items: adminItems,
    });

    // Role filtering
    if (isWorker) {
      // Field crew view
      return [
        {
          header: "OPERATIONS",
          items: [
            { key: "dashboard", label: "Field Overview", icon: icons.dashboard },
            { key: "map", label: "Catchment Map", icon: icons.map },
            { key: "drains", label: "Chamber Inspections", icon: icons.drains },
          ],
        },
        {
          header: "ENVIRONMENT & SAFETY",
          items: [
            { key: "gas-safety", label: "Gas & Worker Safety", icon: icons.gasSafety, highlight: true },
            { key: "alerts", label: "Field Incidents", icon: icons.alerts },
          ],
        },
        {
          header: "EQUIPMENT & SETTINGS",
          items: [
            { key: "devices", label: "Equipment Status", icon: icons.devices },
            { key: "profile", label: "Profile & Account", icon: icons.profile },
          ],
        },
      ];
    }

    if (isViewer) {
      return [
        {
          header: "OPERATIONS",
          items: [
            { key: "dashboard", label: "Executive Overview", icon: icons.dashboard },
            { key: "map", label: "Drainage Map", icon: icons.map },
          ],
        },
        {
          header: "SAFETY & ALERTS",
          items: [
            { key: "gas-safety", label: "Gas Safety Monitor", icon: icons.gasSafety },
            { key: "alerts", label: "Alerts Log", icon: icons.alerts },
            { key: "profile", label: "Profile & Account", icon: icons.profile },
          ],
        },
      ];
    }

    return list;
  }, [isAdmin, isOfficer, isWorker, isViewer, alertCount]);

  const handleItemClick = (key) => {
    onNavigate(key);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(11, 18, 32, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
          }}
        />
      )}

      <aside
        className={`udx-sidebar-foundation ${isMobileOpen ? "is-mobile-open" : ""}`}
        style={{
          width: "270px",
          backgroundColor: "#102235",
          borderRight: "1px solid #2A4359",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          padding: "1.15rem 0.85rem",
          flexShrink: 0,
          zIndex: 1000,
          transition: "transform 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        aria-label="Operations platform navigation"
      >
        {/* Brand Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 0.4rem 1rem 0.4rem",
            borderBottom: "1px solid #2A4359",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={logoImg}
              alt="URBANDRAINX 2.0 Sewer Telemetry Logo"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #35D6C2",
                boxShadow: "0 0 12px rgba(53, 214, 194, 0.3)",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontFamily: "var(--font-family-display, sans-serif)", fontSize: "1.05rem", fontWeight: 800, color: "#F4F7FB", letterSpacing: "0.02em" }}>
                URBANDRAIN<span style={{ color: "#35D6C2" }}>X 2.0</span>
              </div>
              <div style={{ fontSize: "0.62rem", color: "#7AA7FF", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                INFRASTRUCTURE OPS
              </div>
            </div>
          </div>

          {/* Close button for mobile */}
          {isMobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              style={{
                background: "transparent",
                border: "none",
                color: "#8FA5BA",
                cursor: "pointer",
                padding: "4px",
              }}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* User Scope Card */}
        <div
          style={{
            padding: "0.75rem 0.9rem",
            borderRadius: "8px",
            backgroundColor: "#14283B",
            border: "1px solid #2A4359",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "0.84rem",
                fontWeight: 700,
                color: "#F4F7FB",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "140px",
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: "4px",
                background: isAdmin ? "rgba(241, 107, 120, 0.15)" : "rgba(53, 214, 194, 0.15)",
                color: isAdmin ? "#F16B78" : "#35D6C2",
                border: `1px solid ${isAdmin ? "rgba(241, 107, 120, 0.3)" : "rgba(53, 214, 194, 0.3)"}`,
                textTransform: "uppercase",
              }}
            >
              {roleLabel}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#8FA5BA", display: "flex", alignItems: "center", gap: "4px" }}>
            <span>Zone:</span>
            <span style={{ color: "#7AA7FF", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayArea}
            </span>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            flex: 1,
            overflowY: "auto",
            paddingRight: "2px",
          }}
        >
          {sections.map((section) => (
            <div key={section.header}>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  color: "#72879D",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0 0.5rem 0.35rem 0.5rem",
                }}
              >
                {section.header}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {section.items.map((item) => {
                  const isActive = activeItem === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleItemClick(item.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: isActive ? "rgba(53, 214, 194, 0.12)" : "transparent",
                        color: isActive ? "#35D6C2" : item.highlight ? "#F5B84B" : "#B8C5D6",
                        borderLeft: isActive ? "3px solid #35D6C2" : "3px solid transparent",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: isActive ? 700 : 500,
                        textAlign: "left",
                        transition: "all 140ms ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#14283B";
                          e.currentTarget.style.color = "#F4F7FB";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = item.highlight ? "#F5B84B" : "#B8C5D6";
                        }
                      }}
                    >
                      <span style={{ display: "flex", opacity: isActive ? 1 : 0.85, flexShrink: 0 }}>
                        {item.icon}
                      </span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                      </span>

                      {/* Badge if alerts exist */}
                      {item.badgeCount > 0 && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "9999px",
                            background: "#F16B78",
                            color: "#FFFFFF",
                            lineHeight: 1.2,
                          }}
                        >
                          {item.badgeCount}
                        </span>
                      )}

                      {/* Warning dot if highlight and not active */}
                      {item.highlight && !isActive && !item.badgeCount && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#F5B84B",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div
          style={{
            paddingTop: "0.85rem",
            borderTop: "1px solid #2A4359",
            fontSize: "0.7rem",
            color: "#8FA5BA",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#35D6C2" }} />
            <span>Telemetry Online</span>
          </div>
          <span style={{ color: "#7AA7FF", fontWeight: 600 }}>v2.0.0</span>
        </div>
      </aside>
    </>
  );
}

export default DashboardSidebar;
