import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "./common/Button.js";

function About() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: "#0B1220", padding: "4rem 0 5rem", minHeight: "80vh" }}>
      <div className="udx-container">
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 3.5rem" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 14px",
              borderRadius: "9999px",
              background: "#122536",
              border: "1px solid #304256",
              color: "#35D6C2",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "1rem",
            }}
          >
            Municipal Scope &bull; Greater Chennai
          </div>
          <h1
            style={{
              fontFamily: "var(--font-family-display)",
              fontSize: "clamp(2.2rem, 3.8vw, 3rem)",
              fontWeight: 800,
              color: "#F4F7FB",
              letterSpacing: "-0.02em",
              margin: "0.5rem 0 0.75rem",
            }}
          >
            About URBANDRAIN <span style={{ color: "#35D6C2" }}>2.0</span>
          </h1>
          <h2
            style={{
              fontFamily: "var(--font-family-display)",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "#7AA7FF",
              margin: "0 0 1.25rem",
            }}
          >
            SMART AI-BASED INSPECTION CHAMBER MONITORING FOR URBAN DRAINAGE NETWORKS
          </h2>
          <p
            style={{
              color: "#B8C5D6",
              fontSize: "1.05rem",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            URBANDRAIN 2.0 provides continuous inspection chamber observation, anomaly identification, and structured maintenance workflows across municipal stormwater networks in Chennai.
          </p>
        </div>

        {/* Content Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem",
          }}
        >
          {/* Card 1: Jurisdiction & Coverage */}
          <div
            className="udx-glass-panel"
            style={{
              background: "#172638",
              border: "1px solid #304256",
              borderRadius: "12px",
              padding: "1.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  background: "#122536",
                  border: "1px solid #304256",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#35D6C2",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#F4F7FB" }}>
                Jurisdiction &amp; Coverage
              </h3>
            </div>
            <p style={{ color: "#B8C5D6", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 1rem 0" }}>
              URBANDRAIN 2.0 monitors registered municipal inspection chambers across Greater Chennai operational zones including Velachery, Tambaram, Ambattur, Avadi, Sholinganallur, Perungudi, Madhavaram, Thiruvottiyur, Pallavaram, and Chennai Central.
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#B8C5D6", fontSize: "0.9rem", lineHeight: 1.7 }}>
              <li>100 registered municipal drainage inspection chambers</li>
              <li>10 Greater Chennai metropolitan operational zones</li>
              <li>Coordinates mapped to civic drainage culverts and stormwater basins</li>
            </ul>
          </div>

          {/* Card 2: Monitoring & Anomaly Detection */}
          <div
            className="udx-glass-panel"
            style={{
              background: "#172638",
              border: "1px solid #304256",
              borderRadius: "12px",
              padding: "1.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  background: "#122536",
                  border: "1px solid #304256",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#7AA7FF",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#F4F7FB" }}>
                Inspection Chamber Monitoring
              </h3>
            </div>
            <p style={{ color: "#B8C5D6", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 1rem 0" }}>
              Monitoring nodes evaluate chamber water depths, flow dynamics, and atmospheric gas levels. Telemetry is verified against hydraulic thresholds to detect potential blockages, silt accumulation, and flood hazards.
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#B8C5D6", fontSize: "0.9rem", lineHeight: 1.7 }}>
              <li>Continuous ultrasonic water level depth sensing</li>
              <li>Threshold rule evaluation for anomaly detection</li>
              <li>Prioritized alert generation for maintenance crews</li>
            </ul>
          </div>
        </div>

        {/* Security & Access Notice */}
        <div
          style={{
            background: "#122536",
            border: "1px solid #304256",
            borderRadius: "12px",
            padding: "1.75rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}
        >
          <div>
            <h4 style={{ margin: "0 0 0.4rem 0", color: "#F4F7FB", fontSize: "1.05rem", fontWeight: 700 }}>
              Authorised Municipal Gateway
            </h4>
            <p style={{ margin: 0, color: "#B8C5D6", fontSize: "0.9rem" }}>
              Operational inspection chamber data and control controls are reserved for authenticated municipal personnel.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button variant="secondary" size="md" onClick={() => navigate("/")}>
              Back to Home
            </Button>
            <Button variant="primary" size="md" onClick={() => navigate("/login")}>
              Sign In to Command Portal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
