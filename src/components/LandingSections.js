import React from "react";

function LandingSections() {
  return (
    <section className="capabilities-section">
      <div className="capabilities-layout">
        <h2 className="capabilities-title">Smart Monitoring Capabilities</h2>
        <p className="capabilities-subtitle">
          Designed for efficient urban drainage monitoring and decision-making
        </p>

        <div className="capabilities-grid">
          <article className="capability-card">
            <span className="capability-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 14l3-3 3 2 4-5" />
              </svg>
            </span>
            <h3>Real-Time Monitoring</h3>
            <p>Track drainage conditions with live system updates</p>
          </article>

          <article className="capability-card">
            <span className="capability-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.3 3.9L1.8 18.2a1.2 1.2 0 0 0 1 1.8h18.4a1.2 1.2 0 0 0 1-1.8L13.7 3.9a1.2 1.2 0 0 0-2.4 0z" />
              </svg>
            </span>
            <h3>Smart Alerts</h3>
            <p>Receive instant notifications for critical situations</p>
          </article>

          <article className="capability-card">
            <span className="capability-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19h16" />
                <path d="M7 16V9" />
                <path d="M12 16V5" />
                <path d="M17 16v-4" />
              </svg>
            </span>
            <h3>Data Insights</h3>
            <p>Analyze trends to improve operational efficiency</p>
          </article>
        </div>
      </div>
    </section>
  );
}

export default LandingSections;
