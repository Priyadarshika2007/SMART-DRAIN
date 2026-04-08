import React from "react";

function MapPage({ mapRows }) {
  return (
    <>
      <section className="gov-panel gov-map-panel">
        <h3>Map View Placeholder</h3>
        <div className="gov-map-placeholder" role="img" aria-label="Drain location map placeholder" />
        <div className="gov-map-legend">
          <span><i style={{ background: "#b42318" }} /> Critical</span>
          <span><i style={{ background: "#c2410c" }} /> Moderate</span>
          <span><i style={{ background: "#15803d" }} /> Normal</span>
        </div>
      </section>

      <section className="gov-panel">
        <h3>Drain Coordinates</h3>
        {mapRows.length === 0 ? (
          <p style={{ padding: "24px", color: "#667085" }}>No location data available for this area.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="alerts-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Drain ID</th>
                  <th>Area</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mapRows.map((row) => (
                  <tr key={String(row.drain_id)}>
                    <td>{row.drain_id}</td>
                    <td>{row.area_name || "-"}</td>
                    <td>{row.latitude ?? "-"}</td>
                    <td>{row.longitude ?? "-"}</td>
                    <td>
                      <span className={`gov-status-badge ${String(row.status || "").toLowerCase()}`}>
                        {row.status || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default MapPage;
