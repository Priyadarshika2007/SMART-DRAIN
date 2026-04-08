import React, { useMemo } from "react";
import { downloadCSV } from "../utils/dashboardUtils.js";

function ReportsPage({ filteredData, apiData, user }) {
  const currentUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  })();

  const role = String(currentUser?.role || "").toLowerCase();
  if (!["admin", "officer"].includes(role)) {
    return <div style={{ padding: "20px", color: "#999" }}>Access Denied</div>;
  }

  const allData = apiData || filteredData || [];

  // Aggregated statistics
  const stats = useMemo(() => {
    const totalDrains = allData.length;
    const critical = allData.filter((d) => d.status === "Critical").length;
    const moderate = allData.filter((d) => d.status === "Moderate").length;
    const normal = allData.filter((d) => d.status === "Normal").length;
    const avgDhi = allData.length > 0
      ? allData.reduce((sum, d) => sum + (parseFloat(d.dhi_score) || 0), 0) / allData.length
      : 0;

    // Area-wise breakdown
    const areaStats = {};
    allData.forEach((d) => {
      if (!areaStats[d.area_name]) {
        areaStats[d.area_name] = { total: 0, critical: 0, moderate: 0, normal: 0, drains: [] };
      }
      areaStats[d.area_name].total += 1;
      areaStats[d.area_name].drains.push(d);
      if (d.status === "Critical") areaStats[d.area_name].critical += 1;
      else if (d.status === "Moderate") areaStats[d.area_name].moderate += 1;
      else areaStats[d.area_name].normal += 1;
    });

    return { totalDrains, critical, moderate, normal, avgDhi, areaStats };
  }, [allData]);

  const handleDownloadFullReport = () => {
    const reportData = allData.map((item) => ({
      "Drain ID": item.drain_id,
      Area: item.area_name,
      "Water Level (cm)": item.water_level_cm,
      "DHI Score": item.dhi_score,
      Status: item.status,
      "Last Reading": item.last_reading_time || new Date().toISOString(),
    }));
    downloadCSV(reportData, "full_drainage_report.csv");
  };

  const handleDownloadAreaReport = () => {
    const areaReportData = Object.entries(stats.areaStats).map(([area, data]) => ({
      Area: area,
      "Total Drains": data.total,
      Critical: data.critical,
      Moderate: data.moderate,
      Normal: data.normal,
      "% Critical": ((data.critical / data.total) * 100).toFixed(2),
      "Avg DHI": (data.drains.reduce((sum, d) => sum + (parseFloat(d.dhi_score) || 0), 0) / data.total).toFixed(2),
    }));
    downloadCSV(areaReportData, "area_wise_report.csv");
  };

  const handleDownloadAlertsReport = () => {
    const alertData = allData
      .filter((d) => d.status !== "Normal")
      .map((item) => ({
        "Drain ID": item.drain_id,
        Area: item.area_name,
        Severity: item.status,
        "DHI Score": item.dhi_score,
        "Water Level": item.water_level_cm,
        Timestamp: item.last_reading_time || new Date().toISOString(),
      }));
    downloadCSV(alertData, "daily_alerts_report.csv");
  };

  const handleDownloadPDF = () => {
    alert("PDF export will be available soon with jsPDF integration");
    // In future: implement with jsPDF
  };

  return (
    <main className="dashboard-main" style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "20px", color: "#111827", fontSize: "20px", fontWeight: "600" }}>
        📋 Reports & Exports
      </h2>

      {/* Export Options Grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Full Report Card */}
        <article
          className="gov-panel"
          style={{
            padding: "16px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)")}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>📊 Full Report</h3>
          <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "14px" }}>
            Download complete drainage system data with all drains and their current status.
          </p>
          <button
            onClick={handleDownloadFullReport}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#1d4ed8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            📥 Download CSV
          </button>
        </article>

        {/* Area-wise Report Card */}
        <article
          className="gov-panel"
          style={{
            padding: "16px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)")}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>🗺️ Area-wise Report</h3>
          <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "14px" }}>
            Aggregated statistics by geographic area, including risk percentages and average DHI scores.
          </p>
          <button
            onClick={handleDownloadAreaReport}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#15803d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            📥 Download CSV
          </button>
        </article>

        {/* Alerts Report Card */}
        <article
          className="gov-panel"
          style={{
            padding: "16px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)")}
        >
          <h3 style={{ margin: "0 0 8px 0" }}>🚨 Daily Alerts</h3>
          <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "14px" }}>
            Export all recent alerts and critical incidents flagged in the system today.
          </p>
          <button
            onClick={handleDownloadAlertsReport}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#b42318",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            📥 Download CSV
          </button>
        </article>
      </section>

      {/* PDF Export Coming Soon */}
      <article className="gov-panel" style={{ padding: "16px", marginBottom: "24px", backgroundColor: "#f3f4f6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0" }}>📄 PDF Export (Coming Soon)</h3>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
              Professional PDF reports with formatting and charts will be available soon.
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled
            style={{
              padding: "10px 16px",
              backgroundColor: "#ddd",
              color: "#999",
              border: "none",
              borderRadius: "4px",
              cursor: "not-allowed",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            📄 PDF
          </button>
        </div>
      </article>

      {/* System Summary */}
      <section className="gov-charts-grid">
        <article className="gov-panel">
          <h3>📊 System Summary</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#666" }}>Total Drains:</span>
              <span style={{ fontWeight: "600", fontSize: "16px" }}>{stats.totalDrains}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#b42318", fontWeight: "600" }}>🔴 Critical:</span>
              <span style={{ fontWeight: "600", fontSize: "16px", color: "#b42318" }}>{stats.critical}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#c2410c", fontWeight: "600" }}>🟡 Moderate:</span>
              <span style={{ fontWeight: "600", fontSize: "16px", color: "#c2410c" }}>{stats.moderate}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
              <span style={{ color: "#15803d", fontWeight: "600" }}>🟢 Normal:</span>
              <span style={{ fontWeight: "600", fontSize: "16px", color: "#15803d" }}>{stats.normal}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px" }}>
              <span style={{ color: "#666", fontWeight: "600" }}>Average DHI:</span>
              <span style={{ fontWeight: "600", fontSize: "16px" }}>{stats.avgDhi.toFixed(2)}</span>
            </div>
          </div>
        </article>

        {/* Area Breakdown */}
        <article className="gov-panel">
          <h3>🗺️ Area Breakdown</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {Object.entries(stats.areaStats)
              .slice(0, 5)
              .map(([area, data]) => (
                <div key={area} style={{ paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>{area}</div>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    Total: {data.total} | 🔴 {data.critical} | 🟡 {data.moderate} | 🟢 {data.normal}
                  </div>
                </div>
              ))}
            {Object.keys(stats.areaStats).length > 5 && (
              <div style={{ paddingTop: "8px", color: "#999", fontSize: "13px" }}>
                ... and {Object.keys(stats.areaStats).length - 5} more areas
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default ReportsPage;
