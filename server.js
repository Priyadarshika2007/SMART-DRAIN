const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const db = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Smart Drain API Running" });
});

// POST /register-authority
app.post("/register-authority", async (req, res) => {
  try {
    const {
      fullName,
      authorityId,
      designation,
      department,
      email,
      phone,
      zone,
      officeAddress,
      username,
      password
    } = req.body;

    const passwordHash = crypto
      .createHash("sha256")
      .update(String(password))
      .digest("hex");

    await db.query(
      `
      INSERT INTO authority_accounts
      (full_name, authority_id, designation, department, email, phone, zone, office_address, username, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        fullName,
        authorityId,
        designation,
        department,
        email,
        phone,
        zone,
        officeAddress,
        username,
        passwordHash
      ]
    );

    res.json({
      success: true,
      message: "Account created successfully"
    });
  } catch (err) {
    console.error("Error creating authority account:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /sensor-data
app.post("/sensor-data", async (req, res) => {
  try {
    const { drain_id, water_level, flow_rate } = req.body;

    if (
      drain_id === undefined ||
      water_level === undefined ||
      flow_rate === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "drain_id, water_level and flow_rate are required"
      });
    }

    const dhi_score = (Number(water_level) * 0.6) + (Number(flow_rate) * 0.4);
    let severity = "LOW";
    let alert = null;

    if (dhi_score > 70) {
      severity = "HIGH";
    } else if (dhi_score > 40) {
      severity = "MEDIUM";
    }

    await db.query(
      `
      INSERT INTO sensor_readings (drain_id, water_level, flow_rate, dhi_score, timestamp)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [drain_id, water_level, flow_rate, dhi_score]
    );

    if (severity === "HIGH" || severity === "MEDIUM") {
      await db.query(
        `
        INSERT INTO alerts (drain_id, alert_type, severity, timestamp)
        VALUES (?, ?, ?, NOW())
        `,
        [drain_id, "Drain Health Risk", severity]
      );
      alert = severity;
    }

    res.json({
      success: true,
      dhi_score,
      alert
    });
  } catch (err) {
    console.error("Error processing sensor data:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /drains
app.get("/drains", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.area_name, d.latitude, d.longitude,
             s.water_level_cm, s.flow_rate_min, s.timestamp
      FROM sensor_readings s
      JOIN drain_master d ON s.drain_id = d.drain_id
      ORDER BY s.timestamp DESC
      LIMIT 20
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /top-risk-drains
app.get("/top-risk-drains", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT drain_id, MAX(dhi_score) AS max_dhi
      FROM drain_health_log
      GROUP BY drain_id
      ORDER BY max_dhi DESC
      LIMIT 10
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /alerts
app.get("/alerts", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM alerts
      ORDER BY timestamp DESC
      LIMIT 100
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /sensor-data
app.get("/sensor-data", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM sensor_readings
      ORDER BY timestamp DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

app.get("/{*any}", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

async function ensureDhiColumn() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      reading_id INT PRIMARY KEY AUTO_INCREMENT,
      drain_id INT NOT NULL,
      water_level FLOAT NOT NULL,
      flow_rate FLOAT NOT NULL,
      dhi_score FLOAT NOT NULL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [waterLevelCheck] = await db.query(
    `
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'water_level'
    `
  );

  if (waterLevelCheck[0].count === 0) {
    await db.query(`
      ALTER TABLE sensor_readings
      ADD COLUMN water_level FLOAT NOT NULL DEFAULT 0
    `);
  }

  const [flowRateCheck] = await db.query(
    `
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'flow_rate'
    `
  );

  if (flowRateCheck[0].count === 0) {
    await db.query(`
      ALTER TABLE sensor_readings
      ADD COLUMN flow_rate FLOAT NOT NULL DEFAULT 0
    `);
  }

  const [dhiScoreCheck] = await db.query(
    `
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'dhi_score'
    `
  );

  if (dhiScoreCheck[0].count === 0) {
    await db.query(`
      ALTER TABLE sensor_readings
      ADD COLUMN dhi_score FLOAT NOT NULL DEFAULT 0
    `);
  }

  const [waterLevelCmCheck] = await db.query(
    `
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'water_level_cm'
    `
  );

  const [flowRateMinCheck] = await db.query(
    `
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sensor_readings'
      AND COLUMN_NAME = 'flow_rate_min'
    `
  );

  if (waterLevelCmCheck[0].count > 0 || flowRateMinCheck[0].count > 0) {
    const [legacyData] = await db.query(`
      SELECT reading_id, water_level_cm, flow_rate_min
      FROM sensor_readings
      WHERE (water_level = 0 OR flow_rate = 0)
        AND (water_level_cm IS NOT NULL OR flow_rate_min IS NOT NULL)
    `);

    for (const row of legacyData) {
      const water = Number(row.water_level_cm || 0);
      const flow = Number(row.flow_rate_min || 0);
      const dhi = (water * 0.6) + (flow * 0.4);
      await db.query(
        `
        UPDATE sensor_readings
        SET water_level = ?, flow_rate = ?, dhi_score = ?
        WHERE reading_id = ?
        `,
        [water, flow, dhi, row.reading_id]
      );
    }
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      alert_id INT PRIMARY KEY AUTO_INCREMENT,
      drain_id INT NOT NULL,
      alert_type VARCHAR(120) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [alertRows] = await db.query(`
    SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'alert'
  `);

  if (alertRows[0].count > 0) {
    await db.query(`
      INSERT INTO alerts (drain_id, alert_type, severity, timestamp)
      SELECT a.log_id, a.alert_type, UPPER(a.severity), a.alert_time
      FROM alert a
      LEFT JOIN alerts b
        ON b.drain_id = a.log_id
       AND b.alert_type = a.alert_type
       AND b.severity = UPPER(a.severity)
       AND b.timestamp = a.alert_time
      WHERE b.alert_id IS NULL
    `);
  }
}

async function ensureAuthorityAccountsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS authority_accounts (
      account_id INT PRIMARY KEY AUTO_INCREMENT,
      full_name VARCHAR(120) NOT NULL,
      authority_id VARCHAR(60) NOT NULL,
      designation VARCHAR(100) NOT NULL,
      department VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      zone VARCHAR(100) NOT NULL,
      office_address VARCHAR(255) NOT NULL,
      username VARCHAR(80) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL,
      UNIQUE KEY uq_authority_id (authority_id),
      UNIQUE KEY uq_email (email),
      UNIQUE KEY uq_username (username)
    )
  `);
}

async function startServer() {
  try {
    await ensureDhiColumn();
    await ensureAuthorityAccountsTable();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();