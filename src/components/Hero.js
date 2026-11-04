import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "./common/Button.js";
import smartSewerImg from "../assets/smart-sewer-monitoring.png";
import logoImg from "../assets/urbandrainx-logo.png";

function Hero() {
  const navigate = useNavigate();

  const handleAboutClick = () => {
    const el = document.getElementById("about");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/about");
    }
  };

  return (
    <section
      className="udx-hero-section"
      style={{
        position: "relative",
        padding: "4.5rem 0 4rem",
        backgroundColor: "#0B1220",
        borderBottom: "1px solid #304256",
      }}
    >
      <div className="udx-container">
        <div className="udx-hero-grid" style={{ alignItems: "center" }}>
          {/* Left Column: Simplified Hero Copy */}
          <div className="udx-hero-copy">
            {/* Project Logo and Chennai drainage monitoring label */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 16px 6px 8px",
                borderRadius: "var(--radius-full)",
                background: "#122536",
                border: "1px solid rgba(53, 214, 194, 0.4)",
                marginBottom: "1.25rem",
                boxShadow: "0 0 16px rgba(53, 214, 194, 0.15)",
              }}
            >
              <img
                src={logoImg}
                alt="URBANDRAINX 2.0 Sewer Telemetry Logo"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1.5px solid #35D6C2",
                }}
              />
              <span
                style={{
                  color: "#35D6C2",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Chennai Smart Drainage Telemetry &bull; URBANDRAINX 2.0
              </span>
            </div>

            {/* Main title */}
            <h1
              style={{
                fontFamily: "var(--font-family-display)",
                fontSize: "clamp(2.4rem, 4.8vw, 3.6rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                color: "#F4F7FB",
                letterSpacing: "-0.03em",
                margin: "0 0 1rem 0",
              }}
            >
              URBANDRAIN<span style={{ color: "#35D6C2" }}>X 2.0</span>
            </h1>

            {/* Exact official subtitle */}
            <h2
              style={{
                fontFamily: "var(--font-family-display)",
                fontSize: "clamp(1rem, 2vw, 1.25rem)",
                fontWeight: 700,
                lineHeight: 1.4,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "#7AA7FF",
                margin: "0 0 1.25rem 0",
              }}
            >
              SMART AI-BASED INSPECTION CHAMBER MONITORING FOR URBAN DRAINAGE NETWORKS
            </h2>

            {/* Concise two-line explanation */}
            <p
              style={{
                fontSize: "1.05rem",
                lineHeight: 1.6,
                color: "#B8C5D6",
                maxWidth: "540px",
                margin: "0 0 2rem 0",
              }}
            >
              Intelligent observation and anomaly detection across municipal drainage chambers in Greater Chennai.
              Empowering municipal authorities with automated threshold surveillance and proactive maintenance dispatch.
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/login")}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                }
              >
                Sign In
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={handleAboutClick}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                }
              >
                About the Platform
              </Button>
            </div>
          </div>

          {/* Right Column: Smart Sewer Monitoring Real-World Visual */}
          <div className="udx-hero-visual">
            <div
              className="udx-glass-panel"
              style={{
                background: "#172638",
                border: "1px solid #304256",
                borderRadius: "14px",
                padding: "1.25rem",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(53, 214, 194, 0.08)",
                overflow: "hidden",
              }}
            >
              {/* Header: Schematic Tag / Caption */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "0.85rem",
                  borderBottom: "1px solid #304256",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#35D6C2",
                      boxShadow: "0 0 8px #35D6C2",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "#F4F7FB",
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    Smart Sewer Monitoring in Action
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#7AA7FF",
                    background: "#122536",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid #304256",
                  }}
                >
                  Live Field Telemetry
                </span>
              </div>

              {/* Real-World Sewer Monitoring Image Container */}
              <div
                style={{
                  position: "relative",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid #304256",
                  backgroundColor: "#0B1220",
                  lineHeight: 0,
                  boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.4)",
                }}
              >
                <img
                  src={smartSewerImg}
                  alt="Smart Sewer Monitoring in Action - Real-world IoT inspection chamber telemetry transmission to municipal monitoring center and mobile field crew"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                    borderRadius: "9px",
                  }}
                  loading="eager"
                />
              </div>

              {/* Bottom Info Bar / Caption */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "0.85rem",
                  marginTop: "0.85rem",
                  borderTop: "1px solid #304256",
                  fontSize: "0.74rem",
                  color: "#B8C5D6",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#35D6C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  IoT Chamber Sensor Node &bull; Telemetry Transmission
                </span>
                <span style={{ color: "#7AA7FF", fontWeight: 600 }}>Greater Chennai</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
