import React from "react";

function Guide() {
  return (
    <section className="guide-page">
      <div className="container guide-card">
        <h1>UrbanDrainX - User Guide</h1>

        <h2>What is this system?</h2>
        <p>
          UrbanDrainX is a municipal monitoring platform for observing drain conditions,
          identifying risks, and supporting timely response actions.
        </p>

        <h2>Who can use this?</h2>
        <p>
          This platform is intended for authorized municipal teams responsible for drainage
          operations and emergency response.
        </p>

        <h2>Step-by-step usage</h2>
        <ol>
          <li>Login</li>
          <li>Select Area</li>
          <li>View Dashboard</li>
          <li>Take Action</li>
        </ol>

        <h2>Features overview</h2>
        <ul>
          <li>Real-time monitoring of drain status</li>
          <li>Smart alerts for risk conditions</li>
          <li>Data analytics for planning and review</li>
        </ul>

        <p className="guide-note">🔒 Access is restricted to authorized personnel</p>
      </div>
    </section>
  );
}

export default Guide;
