import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function AnalyticsPage({ filteredData }) {
  const analytics = useMemo(() => {
    const validScores = filteredData
      .map((item) => safeNumber(item?.dhi_score))
      .filter((score) => score !== null);

    const highRiskDrains = validScores.filter((score) => score > 60).length;
    const averageDhi =
      validScores.length > 0
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : null;

    const trendData = filteredData.map((item) => ({
      drainLabel: `Drain ${item?.drain_id ?? "-"}`,
      dhiScore: safeNumber(item?.dhi_score) ?? 0,
    }));

    return {
      highRiskDrains,
      averageDhi,
      trendData,
    };
  }, [filteredData]);

  return (
    <>
      <section className="gov-kpi-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <article className="gov-kpi-card gov-kpi-critical">
          <div className="gov-kpi-head">
            <span className="gov-kpi-icon">🚨</span>
            <p>High-Risk Drains</p>
          </div>
          <h3 className="gov-kpi-value gov-kpi-value-critical">{analytics.highRiskDrains}</h3>
          <small>DHI score above 60</small>
        </article>

        <article className="gov-kpi-card">
          <div className="gov-kpi-head">
            <span className="gov-kpi-icon">📈</span>
            <p>Average DHI</p>
          </div>
          <h3 className="gov-kpi-value">
            {analytics.averageDhi === null ? "N/A" : analytics.averageDhi.toFixed(2)}
          </h3>
          <small>Overall area health index</small>
        </article>

        <article className="gov-kpi-card">
          <div className="gov-kpi-head">
            <span className="gov-kpi-icon">🧱</span>
            <p>Total Samples</p>
          </div>
          <h3 className="gov-kpi-value">{filteredData.length}</h3>
          <small>Active monitored drains in area</small>
        </article>
      </section>

      <section className="gov-charts-grid">
        <article className="gov-panel">
          <h3>DHI Trend (Line)</h3>
          <div className="gov-chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="drainLabel" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="dhiScore" name="DHI Score" stroke="#1d4ed8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="gov-panel">
          <h3>DHI Distribution (Bar)</h3>
          <div className="gov-chart-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="drainLabel" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="dhiScore" name="DHI Score" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </>
  );
}

export default AnalyticsPage;
