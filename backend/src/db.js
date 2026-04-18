const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "127.0.0.1",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "sistemapub_user",
  password: process.env.PGPASSWORD || "",
  database: process.env.PGDATABASE || "sistemapub",
  ssl:
    String(process.env.PGSSL || "false").toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : false,
});

function now() {
  return new Date().toISOString().slice(11, 19);
}

function shortSql(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

module.exports = {
  async query(sql, params) {
    console.log(`[${now()}] 🧠 DB QUERY ::`, shortSql(sql), params || []);
    const result = await pool.query(sql, params || []);
    return {
      rows: result.rows || [],
      rowCount: result.rowCount || 0,
    };
  },

  async connect() {
    const client = await pool.connect();

    return {
      query: async (sql, params) => {
        console.log(`[${now()}] 🧠 DB QUERY ::`, shortSql(sql), params || []);
        const result = await client.query(sql, params || []);
        return {
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
        };
      },
      release: () => client.release(),
    };
  },
};