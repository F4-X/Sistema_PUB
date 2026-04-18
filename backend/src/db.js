// backend/src/db.js
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const { PGlite } = require("@electric-sql/pglite");

// ✅ PGDATA_DIR do .env tem prioridade (pode ser absoluto ou relativo)
const envDir = (process.env.PGDATA_DIR || "").trim();

function pickWritableBaseDir() {
  // Windows: LOCALAPPDATA/APPDATA é o melhor lugar pra gravar (não precisa admin)
  const winBase = process.env.LOCALAPPDATA || process.env.APPDATA;

  // fallback (dev / outros ambientes)
  const userHome = process.env.USERPROFILE || process.env.HOME;

  return winBase || userHome || path.resolve(__dirname, "..");
}

function resolveDataDir() {
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.resolve(__dirname, "..", envDir);
  }

  // ✅ default: pasta persistente do Windows (ou home)
  const base = pickWritableBaseDir();
  return path.join(base, "PUB1005", "PGLITE_DB");
}

const DATA_DIR = resolveDataDir();

console.log("📦 PGLITE DIR:", DATA_DIR);

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.error("❌ Falha ao criar pasta do banco:", e?.message || e);
}

let dbPromise;

function now() {
  return new Date().toISOString().slice(11, 19);
}

function shortSql(sql) {
  return String(sql || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

function normalize(r) {
  return {
    rows: r?.rows || [],
    rowCount: r?.affectedRows ?? (r?.rows ? r.rows.length : 0),
  };
}

async function openDB() {
  try {
    console.log(`[${now()}] 🔌 DB OPEN ->`, DATA_DIR);
    return await PGlite.create(DATA_DIR, { relaxedDurability: true });
  } catch (e) {
    console.error("⚠️ Banco corrompido ou inacessível. Recriando base...");

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const brokenDir = `${DATA_DIR}_broken_${stamp}`;

    try {
      fs.renameSync(DATA_DIR, brokenDir);
      console.log("📦 Backup da base salvo em:", brokenDir);
    } catch (err) {
      console.log("⚠️ Não consegui renomear a base antiga:", err?.message || err);
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[${now()}] 🔌 DB OPEN (novo) ->`, DATA_DIR);
    return await PGlite.create(DATA_DIR, { relaxedDurability: true });
  }
}

async function getDB() {
  if (!dbPromise) dbPromise = openDB();
  return dbPromise;
}

module.exports = {
  DATA_DIR,

  async query(sql, params) {
    const db = await getDB();

    console.log(
      `[${now()}] 🧠 DB QUERY @ ${DATA_DIR} ::`,
      shortSql(sql),
      params || []
    );

    return normalize(await db.query(sql, params));
  },

  async connect() {
    const db = await getDB();

    return {
      query: async (sql, params) => {
        console.log(
          `[${now()}] 🧠 DB QUERY @ ${DATA_DIR} ::`,
          shortSql(sql),
          params || []
        );
        return normalize(await db.query(sql, params));
      },
      release: async () => {},
    };
  },
};