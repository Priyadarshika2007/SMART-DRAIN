import React from "react";
import Card from "./common/Card.js";
import Badge from "./common/Badge.js";

function Guide() {
  const steps = [
    {
      num: "01",
      title: "Municipal Authentication",
      desc: "Log in with your official municipal credentials or officer username and password.",
    },
    {
      num: "02",
      title: "Select Operational Zone",
      desc: "Officers focus on assigned zones (e.g. Velachery / Tambaram), while administrators observe all Chennai metropolitan chambers.",
    },
    {
      num: "03",
      title: "Monitor Telemetry & Alerts",
      desc: "Review live sensor readings, silt depth classifications, and critical flood hazard notifications.",
    },
    {
      num: "04",
      title: "Dispatch & Resolve Incidents",
      desc: "Assign field cleanup teams, track resolution statuses, and archive historical records.",
    },
  ];

  return (
    <div style={{ padding: "4rem 0 5rem" }}>
      <div className="udx-container">
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 3rem" }}>
          <Badge status="monitoring" className="mb-3">
            System Operational Manual
          </Badge>
          <h1
            style={{
              fontFamily: "var(--font-family-display)",
              fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
              margin: "1rem 0 0.5rem",
            }}
          >
            URBANDRAIN <span style={{ color: "var(--color-aqua)" }}>2.0</span> User Guide
          </h1>
          <h2
            style={{
              fontFamily: "var(--font-family-display)",
              fontSize: "0.95rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--color-aqua)",
              margin: "0 0 1rem",
            }}
          >
            SMART AI-BASED INSPECTION CHAMBER MONITORING FOR URBAN DRAINAGE NETWORKS
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: "1.05rem",
              lineHeight: 1.6,
            }}
          >
            Step-by-step procedures for municipal operators, inspection chamber supervisors, and administrative engineers across Greater Chennai.
          </p>
        </div>

        {/* Steps Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem",
          }}
        >
          {steps.map((step) => (
            <Card key={step.num}>
              <div
                style={{
                  fontFamily: "var(--font-family-display)",
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  color: "var(--color-aqua)",
                  marginBottom: "0.75rem",
                  letterSpacing: "-0.03em",
                }}
              >
                {step.num}
              </div>
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  color: "var(--color-text-secondary)",
                }}
              >
                {step.desc}
              </p>
            </Card>
          ))}
        </div>

        {/* Note */}
        <div
          className="udx-glass-panel"
          style={{
            padding: "1.5rem 2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            borderColor: "rgba(122, 167, 255, 0.2)",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>🔒</span>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
            <strong style={{ color: "#FFFFFF" }}>Security Advisory:</strong> Access is restricted to authorized municipal officers. Telemetry logs and alerts are strictly tracked for Greater Chennai municipal compliance.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Guide;
