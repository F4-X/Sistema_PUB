const router = require("express").Router();
const db = require("../db");

router.post("/", async (req, res) => {
  const nome = String(req.body?.nome || "").trim().replace(/\s+/g, " ");
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });

  try {
    const r = await db.query("INSERT INTO funcionarios (nome) VALUES ($1) RETURNING id, nome, ativo", [nome]);
    res.json(r.rows[0]);
  } catch (e) {
    if (String(e?.message || "").includes("unique")) return res.status(409).json({ error: "Funcionário já existe" });
    res.status(500).json({ error: "Erro ao criar funcionário" });
  }
});

module.exports = router;
