import React from "react";

function Hero({ setPage }) {
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
        <button className="hero-button" onClick={() => setPage("about")}>
          Learn About Our Project
        </button>
      </div>
    </section>
  );
}

export default Hero;
