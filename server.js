const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

app.get("/api/health", (req, res) => {
  res.status(200).send("API is running");
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

    await pool.query(
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

    // Validate required fields
    if (!drain_id || water_level === undefined || flow_rate === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required: ["drain_id", "water_level", "flow_rate"]
      });
    }

    // Validate data types
    if (isNaN(drain_id) || isNaN(water_level) || isNaN(flow_rate)) {
      return res.status(400).json({
        success: false,
        error: "Invalid data types. drain_id, water_level, and flow_rate must be numbers"
      });
    }

    // Insert sensor reading
    const result = await insertSensorReading(
      parseInt(drain_id),
      parseFloat(water_level),
      parseFloat(flow_rate)
    );

    // Determine severity level based on DHI score
    let severity = "LOW";
    if (result.dhi_score > 70) {
      severity = "HIGH";
    } else if (result.dhi_score > 40) {
      severity = "MEDIUM";
    }

    res.status(201).json({
      success: true,
      message: "Sensor reading recorded successfully",
      data: {
        readingId: result.readingId,
        drain_id: drain_id,
        water_level: water_level,
        flow_rate: flow_rate,
        dhi_score: result.dhi_score,
        severity: severity,
        timestamp: result.timestamp
      }
    });
  } catch (err) {
    console.error("Error in POST /sensor-data:", err);
    res.status(500).json({
      success: false,
      error: "Failed to process sensor data",
      message: err.message
    });
  }
});

// GET /drains
app.get("/drains", async (req, res) => {
  try {
    const [rows] = await pool.query(`
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
    const [rows] = await pool.query(`
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
    const [rows] = await pool.query(`
      SELECT * FROM alerts
      ORDER BY timestamp DESC
      LIMIT 100
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// DATABASE INITIALIZATION & UTILITY FUNCTIONS
// ============================================

/**
 * Initialize sensor_readings table if it doesn't exist
 * Creates table with proper schema and error handling
 */
async function initializeSensorTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sensor_readings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drain_id INT NOT NULL,
        water_level FLOAT NOT NULL,
        flow_rate FLOAT NOT NULL,
        dhi_score FLOAT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_drain_id (drain_id),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log("✓ sensor_readings table initialized successfully");
    return true;
  } catch (err) {
    console.error("✗ Error initializing sensor_readings table:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Insert sensor reading into database
 * @param {number} drain_id - Drain identifier
 * @param {number} water_level - Water level reading
 * @param {number} flow_rate - Flow rate reading
 * @returns {object} Result with reading ID and calculated DHI score
 */
async function insertSensorReading(drain_id, water_level, flow_rate) {
  let connection;
  try {
    // Validate inputs
    if (!drain_id || water_level === undefined || flow_rate === undefined) {
      throw new Error("Missing required fields: drain_id, water_level, flow_rate");
    }

    // Calculate DHI score
    const dhi_score = Number(water_level) * 0.6 + Number(flow_rate) * 0.4;

    connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO sensor_readings (drain_id, water_level, flow_rate, dhi_score, timestamp)
       VALUES (?, ?, ?, ?, NOW())`,
      [drain_id, water_level, flow_rate, dhi_score]
    );

    return {
      success: true,
      readingId: result.insertId,
      dhi_score: dhi_score,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error("Error inserting sensor reading:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Fetch all sensor readings ordered by latest timestamp
 * @param {number} limit - Maximum number of records (default: 100)
 * @returns {array} Array of sensor readings
 */
async function getAllSensorReadings(limit = 100) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [rows] = await connection.execute(
      `SELECT id, drain_id, water_level, flow_rate, dhi_score, timestamp
       FROM sensor_readings
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    );

    return rows;
  } catch (err) {
    console.error("Error fetching sensor readings:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Fetch sensor readings for a specific drain
 * @param {number} drain_id - Drain identifier
 * @param {number} limit - Maximum number of records (default: 50)
 * @returns {array} Array of sensor readings for the drain
 */
async function getSensorReadingsByDrain(drain_id, limit = 50) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    const [rows] = await connection.execute(
      `SELECT id, drain_id, water_level, flow_rate, dhi_score, timestamp
       FROM sensor_readings
       WHERE drain_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [drain_id, limit]
    );

    return rows;
  } catch (err) {
    console.error("Error fetching sensor readings for drain:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// ============================================
// API ROUTES
// ============================================

// GET /sensor-data - Fetch all sensor readings
app.get("/sensor-data", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return res.status(400).json({
        success: false,
        error: "Invalid limit parameter. Must be between 1 and 1000"
      });
    }

    const data = await getAllSensorReadings(limit);

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (err) {
    console.error("Error in GET /sensor-data:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sensor readings",
      message: err.message
    });
  }
});

// GET /sensor-data/:drain_id - Fetch sensor readings for specific drain
app.get("/sensor-data/:drain_id", async (req, res) => {
  try {
    const drain_id = parseInt(req.params.drain_id);
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    if (isNaN(drain_id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid drain_id. Must be a number"
      });
    }

    if (isNaN(limit) || limit < 1 || limit > 500) {
      return res.status(400).json({
        success: false,
        error: "Invalid limit parameter. Must be between 1 and 500"
      });
    }

    const data = await getSensorReadingsByDrain(drain_id, limit);

    res.json({
      success: true,
      drain_id: drain_id,
      count: data.length,
      data: data
    });
  } catch (err) {
    console.error("Error in GET /sensor-data/:drain_id:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sensor readings for drain",
      message: err.message
    });
  }
});

const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

app.get("/{*any}", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

async function ensureAuthorityAccountsTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log("✓ authority_accounts table initialized successfully");
  } catch (err) {
    console.error("✗ Error initializing authority_accounts table:", err.message);
    // Don't throw - allow server to continue
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Initialize database on server startup
 */
async function initializeDatabase() {
  try {
    // Test connection
    const connection = await pool.getConnection();
    await connection.execute("SELECT 1");
    connection.release();
    console.log("✓ Connected to MySQL database");

    // Initialize tables
    await initializeSensorTable();
    await ensureAuthorityAccountsTable();
    
    console.log("✓ All database tables initialized successfully");
    return true;
  } catch (err) {
    console.error("✗ Database initialization error:", err.message);
    console.warn("⚠ Continuing without database setup - ensure database is configured");
    return false;
  }
}

/**
 * Start Express server
 */
async function startServer() {
  try {
    await initializeDatabase();
  } catch (err) {
    console.error("Database initialization failed:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Start the server
startServer();
