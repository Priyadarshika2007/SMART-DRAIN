import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleHomeClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  const handleAboutClick = () => {
    if (location.pathname === "/") {
      const el = document.getElementById("about");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/about");
    }
  };

  const handleHowItWorksClick = () => {
    if (location.pathname === "/") {
      const el = document.getElementById("how-it-works");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/#how-it-works");
      setTimeout(() => {
        const el = document.getElementById("how-it-works");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <footer
      className="udx-footer"
      style={{
        backgroundColor: "#0B1220",
        borderTop: "1px solid #304256",
        padding: "3.5rem 0 2.5rem",
        color: "#B8C5D6",
      }}
    >
      <div className="udx-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "2.5rem",
            marginBottom: "3rem",
          }}
        >
          {/* Brand Column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "#172638",
                  border: "1px solid #304256",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#35D6C2",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v8" />
                  <path d="M22 22H2" />
                  <path d="m8 22 4-10 4 10" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-family-display)",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#F4F7FB",
                }}
              >
                URBANDRAIN <span style={{ color: "#35D6C2" }}>2.0</span>
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "#B8C5D6", margin: "0 0 0.5rem 0" }}>
              SMART AI-BASED INSPECTION CHAMBER MONITORING FOR URBAN DRAINAGE NETWORKS
            </p>
            <p style={{ fontSize: "0.82rem", lineHeight: 1.5, color: "#8498AE", margin: 0 }}>
              Autonomous observation, anomaly detection, and maintenance planning across Greater Chennai municipal catchments.
            </p>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 style={{ color: "#F4F7FB", fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Platform Navigation
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.9rem" }}>
              <li>
                <button onClick={handleHomeClick} style={footerLinkStyle}>
                  Home
                </button>
              </li>
              <li>
                <button onClick={handleAboutClick} style={footerLinkStyle}>
                  About the Platform
                </button>
              </li>
              <li>
                <button onClick={handleHowItWorksClick} style={footerLinkStyle}>
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/login")} style={footerLinkStyle}>
                  Sign In
                </button>
              </li>
            </ul>
          </div>

          {/* Municipal Administration */}
          <div>
            <h4 style={{ color: "#F4F7FB", fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Municipal Governance
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.9rem" }}>
              <li>
                <span style={{ color: "#B8C5D6" }}>
                  Jurisdiction: Greater Chennai Corporation
                </span>
              </li>
              <li>
                <span style={{ color: "#B8C5D6" }}>
                  Infrastructure: Drainage Inspection Chambers
                </span>
              </li>
              <li>
                <button onClick={() => navigate("/guide")} style={footerLinkStyle}>
                  Operational User Guide
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: "2rem",
            borderTop: "1px solid #304256",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            fontSize: "0.82rem",
            color: "#8498AE",
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} URBANDRAIN 2.0 &bull; All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <span>Chennai Municipal Drainage Network</span>
            <span>Secure Role-Based Access</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const footerLinkStyle = {
  background: "none",
  border: "none",
  color: "#B8C5D6",
  cursor: "pointer",
  padding: 0,
  fontSize: "0.9rem",
  textAlign: "left",
  transition: "color var(--transition-fast)",
};

export default Footer;
