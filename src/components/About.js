import React from "react";

function About({ page }) {
  return (
    <div className={`page ${page === "about" ? "active" : ""}`}>
      <section className="about-hero">
        <div className="container about-hero-content">
          <h1>
            About Urban<span className="about-title-accent">Drain X</span>
          </h1>
          <p>
            Strengthening urban drainage operations through reliable monitoring,
            transparent risk visibility, and proactive response planning.
          </p>
        </div>
      </section>

      <section className="about-page container">
        <div className="about-card">
          <h2>About Us</h2>
          <ul className="about-list">
            <li>Real-time water level and flow monitoring across registered drains.</li>
            <li>Standardized risk scoring to support preventive maintenance.</li>
            <li>Priority alerts for overflow and obstruction conditions.</li>
            <li>Historical reporting for policy planning and service continuity.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default About;
