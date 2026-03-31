const mysql = require("mysql2/promise");

const isProduction = process.env.NODE_ENV === "production";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "urban_drainx",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === "true" || isProduction ? { rejectUnauthorized: false } : undefined
});

module.exports = pool;
