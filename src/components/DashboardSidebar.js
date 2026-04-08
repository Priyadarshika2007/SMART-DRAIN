import React, { useMemo } from "react";

function DashboardSidebar({ activeItem, onNavigate, user }) {
  const currentUser = useMemo(() => {
    if (user) return user;
    try {
      const userJson = localStorage.getItem("user");
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }, [user]);

  const roleValue = String(currentUser?.role || "").trim();
  const role = roleValue.toLowerCase();
  const isAdmin = role === "admin";
  const isOfficer = role === "officer";
  const displayName = currentUser?.name || "Municipal Officer";
  const displayArea = isAdmin
    ? "ALL"
    : currentUser?.area || (Array.isArray(currentUser?.assignedAreas) ? currentUser.assignedAreas[0] : "Not assigned");

  // Define role-based navigation
  const officerNav = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "alerts", label: "Alerts", icon: "🚨" },
    { key: "map", label: "Map View", icon: "🗺️" },
    { key: "reports", label: "Reports", icon: "📋" },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  const supervisorNav = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "alerts", label: "Alerts", icon: "🚨" },
    { key: "map", label: "Map View", icon: "🗺️" },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  const adminNav = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "alerts", label: "Alerts", icon: "🚨" },
    { key: "map", label: "Map View", icon: "🗺️" },
    { key: "analytics", label: "Analytics", icon: "📈" },
    { key: "users", label: "Users", icon: "👥" },
    { key: "drains", label: "Drains", icon: "💧" },
    { key: "reports", label: "Reports", icon: "📋" },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  const navItems = isAdmin ? adminNav : isOfficer ? officerNav : supervisorNav;

  const handleClick = (itemKey) => onNavigate(itemKey);

  return (
    <aside className="gov-sidebar" aria-label="Dashboard navigation">
      <div className="gov-sidebar-brand">UrbanDrainX</div>

      {/* User Section */}
      <section className="gov-sidebar-user" aria-label="User details">
        <div className="user-info">
          <h4>{displayName}</h4>
          <span className="role-badge">{isAdmin ? "ADMIN" : String(currentUser?.role || "User").toUpperCase()}</span>
        </div>
        <p className="gov-sidebar-user-area">Area: {displayArea}</p>
      </section>

      {/* Navigation Menu */}
      <nav className="gov-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`gov-sidebar-link ${activeItem === item.key ? "is-active" : ""}`}
            onClick={() => handleClick(item.key)}
            aria-current={activeItem === item.key ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 16px",
              border: "none",
              backgroundColor: activeItem === item.key ? "rgba(29, 78, 216, 0.1)" : "transparent",
              color: activeItem === item.key ? "#1d4ed8" : "#666",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: activeItem === item.key ? "600" : "500",
              transition: "all 0.2s ease",
              marginBottom: "4px",
            }}
            onMouseEnter={(e) => {
              if (activeItem !== item.key) {
                e.target.style.backgroundColor = "rgba(0,0,0,0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== item.key) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            <span style={{ fontSize: "18px" }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer Section */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "16px",
          borderTop: "1px solid #e5e7eb",
          fontSize: "12px",
          color: "#999",
          textAlign: "center",
        }}
      >
        <p>UrbanDrainX v2.0</p>
        <p>© Municipal Drainage System</p>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
