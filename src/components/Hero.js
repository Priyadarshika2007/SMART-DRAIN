import React from "react";
import { useNavigate } from "react-router-dom";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-overlay" />
      <div className="hero-content container">
        <img className="hero-logo" src="/logo.jpg" alt="UrbanDrainX logo" />
        <h1 className="hero-title">
          UrbanDrain <span className="hero-title-accent">X</span>
        </h1>
        <p className="hero-tagline">
          Smart Drainage Monitoring for a Cleaner Tomorrow
        </p>
        <div className="hero-actions">
          <button className="hero-button" onClick={() => navigate("/login")}>
            Open Dashboard
          </button>
          <button
            className="hero-button hero-button-secondary"
            onClick={() => navigate("/guide")}
          >
            New User Guide
          </button>
        </div>
        <p className="authority-notice">🔒 Access restricted to authorized municipal authorities</p>
      </div>
    </section>
  );
}

export default Hero;
