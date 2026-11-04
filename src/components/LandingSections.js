import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "./common/Button.js";

function LandingSections() {
  const navigate = useNavigate();

  const aboutTopics = [
    {
      title: "What is URBANDRAIN 2.0?",
      desc: "URBANDRAIN 2.0 is a specialized municipal telemetry platform engineered to oversee underground drainage inspection chambers and stormwater conduits across urban catchments in Greater Chennai.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#35D6C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      title: "The Urban Drainage Challenge",
      desc: "Urban catchments face severe challenges from debris accumulation, silt deposition, hidden conduit blockages, and sudden surface inundation during heavy monsoon rainfall events.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7AA7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      title: "Inspection Chamber Monitoring",
      desc: "Inspection chambers throughout municipal zones are assigned dedicated telemetry hardware to monitor chamber water levels and culvert flow dynamics from underground locations.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#35D6C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="12 8 8 12 12 16 16 12 12 8" />
        </svg>
      ),
    },
    {
      title: "Anomaly Detection & Rule Evaluation",
      desc: "Ingested sensor readings are evaluated against calibrated hydraulic threshold rules, allowing the system to identify abnormal water level surges and potential drainage restrictions.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7AA7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      title: "Municipal Alert Response",
      desc: "When sensor values exceed normal limits, supported abnormal conditions generate structured alerts, enabling municipal dispatch teams to investigate issues before surface flooding develops.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#35D6C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      title: "Maintenance Planning & Reporting",
      desc: "Historical telemetry records, condition indices, and exportable reports provide engineers and civic administrators with reliable evidence for maintenance prioritization and desilting schedules.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7AA7FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Device Assignment",
      desc: "Drainage inspection chambers are assigned monitoring devices.",
    },
    {
      number: "02",
      title: "Data Collection",
      desc: "Available sensor readings are collected.",
    },
    {
      number: "03",
      title: "Rule Evaluation",
      desc: "The system evaluates readings against configured rules.",
    },
    {
      number: "04",
      title: "Alert Generation",
      desc: "Supported abnormal conditions generate alerts.",
    },
    {
      number: "05",
      title: "Field Inspection & Reporting",
      desc: "Authorised staff inspect incidents, manage maintenance, and review reports.",
    },
  ];

  return (
    <div className="udx-landing-sections" style={{ backgroundColor: "#0B1220" }}>
      {/* =====================================================================
          SECTION 1: ABOUT THE PLATFORM (#about)
          ===================================================================== */}
      <section
        id="about"
        style={{
          padding: "5rem 0 4.5rem",
          scrollMarginTop: "80px",
          borderBottom: "1px solid #304256",
        }}
      >
        <div className="udx-container">
          {/* Section Header */}
          <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 3rem auto" }}>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#35D6C2",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Platform Overview
            </span>
            <h2
              style={{
                fontFamily: "var(--font-family-display)",
                fontSize: "clamp(2rem, 3.2vw, 2.6rem)",
                fontWeight: 800,
                color: "#F4F7FB",
                margin: "0.5rem 0 1rem 0",
              }}
            >
              About the Platform
            </h2>
            <p style={{ color: "#B8C5D6", fontSize: "1.05rem", lineHeight: 1.6, margin: 0 }}>
              URBANDRAIN 2.0 provides municipal authorities with continuous visibility into urban drainage inspection chambers, enabling automated anomaly detection and timely infrastructure maintenance.
            </p>
          </div>

          {/* About Grid Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2.5rem",
            }}
          >
            {aboutTopics.map((topic, idx) => (
              <div
                key={idx}
                className="udx-glass-panel"
                style={{
                  background: "#172638",
                  border: "1px solid #304256",
                  borderRadius: "12px",
                  padding: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#122536",
                    border: "1px solid #304256",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {topic.icon}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: "#F4F7FB",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {topic.title}
                </h3>
                <p style={{ margin: 0, color: "#B8C5D6", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  {topic.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Authorised User Operation Banner */}
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
              gap: "1.5rem",
            }}
          >
            <div style={{ maxWidth: "720px" }}>
              <h3
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#F4F7FB",
                }}
              >
                Authorised Platform Operation
              </h3>
              <p style={{ margin: 0, color: "#B8C5D6", fontSize: "0.92rem", lineHeight: 1.6 }}>
                Authorised municipal staff, including system administrators, field engineers, and area supervisors, access the secure command portal to review active chambers, verify alert thresholds, dispatch crews, and inspect historical trend reports.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate("/login")}
            >
              Sign In to Command Portal
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: HOW IT WORKS (#how-it-works)
          ===================================================================== */}
      <section
        id="how-it-works"
        style={{
          padding: "5rem 0 5.5rem",
          scrollMarginTop: "80px",
          backgroundColor: "#0B1220",
        }}
      >
        <div className="udx-container">
          {/* Section Header */}
          <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 3rem auto" }}>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#7AA7FF",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Operational Workflow
            </span>
            <h2
              style={{
                fontFamily: "var(--font-family-display)",
                fontSize: "clamp(2rem, 3.2vw, 2.6rem)",
                fontWeight: 800,
                color: "#F4F7FB",
                margin: "0.5rem 0 1rem 0",
              }}
            >
              How It Works
            </h2>
            <p style={{ color: "#B8C5D6", fontSize: "1.05rem", lineHeight: 1.6, margin: 0 }}>
              A straightforward five-step process linking underground inspection chambers with municipal response workflows.
            </p>
          </div>

          {/* 5-Step Process Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "1.25rem",
              marginBottom: "3.5rem",
            }}
          >
            {steps.map((st) => (
              <div
                key={st.number}
                className="udx-glass-panel"
                style={{
                  background: "#172638",
                  border: "1px solid #304256",
                  borderRadius: "12px",
                  padding: "1.75rem 1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-family-mono)",
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "#35D6C2",
                    lineHeight: 1,
                  }}
                >
                  {st.number}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "#F4F7FB",
                  }}
                >
                  {st.title}
                </h3>
                <p style={{ margin: 0, color: "#B8C5D6", fontSize: "0.9rem", lineHeight: 1.55 }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Final Call to Action with Sign In Button */}
          <div
            style={{
              background: "#122536",
              border: "1px solid #304256",
              borderRadius: "12px",
              padding: "2.5rem 2rem",
              textAlign: "center",
              maxWidth: "680px",
              margin: "0 auto",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#F4F7FB",
              }}
            >
              Access the URBANDRAIN 2.0 Command Portal
            </h3>
            <p
              style={{
                margin: "0 auto 1.5rem auto",
                color: "#B8C5D6",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                maxWidth: "520px",
              }}
            >
              Municipal personnel with authorized credentials can sign in to inspect chamber status, manage alert rules, and access reports.
            </p>
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
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingSections;
