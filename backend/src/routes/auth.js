const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = (process.env.JWT_SECRET || "pub1005").trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@pub.com").trim();
const ADMIN_PASS = (process.env.ADMIN_PASS || "1005").trim();

async function ensureAdmin() {
  // cria admin se não existir
  const r = await db.query("SELECT id, email, senha_hash, tipo FROM usuarios WHERE email = $1 LIMIT 1", [ADMIN_EMAIL]);
  if (r.rows.length) return;

  const hash = await bcrypt.hash(ADMIN_PASS, 10);
  await db.query(
    "INSERT INTO usuarios (email, senha_hash, tipo, ativo) VALUES ($1, $2, $3, TRUE)",
    [ADMIN_EMAIL, hash, "admin"]
  );
  console.log("ℹ️ Admin criado:", ADMIN_EMAIL);
}

router.post("/login", async (req, res) => {
  try {
    await ensureAdmin();

    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "").trim();

    if (!email || !senha) return res.status(400).json({ error: "Informe email e senha" });

    const r = await db.query("SELECT id, email, senha_hash, tipo, ativo FROM usuarios WHERE lower(email) = $1 LIMIT 1", [email]);
    const u = r.rows[0];
    if (!u) return res.status(401).json({ error: "Usuário ou senha inválidos" });
    if (u.ativo === false) return res.status(403).json({ error: "Usuário inativo" });

    const ok = await bcrypt.compare(senha, u.senha_hash);
    if (!ok) return res.status(401).json({ error: "Usuário ou senha inválidos" });

    const token = jwt.sign({ id: u.id, email: u.email, tipo: u.tipo }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: u.id, email: u.email, tipo: u.tipo } });
  } catch (e) {
    console.error("LOGIN ERR:", e?.message || e);
    res.status(500).json({ error: "Erro no login" });
  }
});

module.exports = router;
