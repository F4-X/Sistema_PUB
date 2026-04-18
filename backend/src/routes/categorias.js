const router = require("express").Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const r = await db.query("SELECT id, nome, criado_em FROM categorias ORDER BY nome ASC");
  res.json(r.rows);
});

router.post("/", async (req, res) => {
  const nome = String(req.body?.nome || "").trim().replace(/\s+/g, " ");
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });

  try {
    const r = await db.query("INSERT INTO categorias (nome) VALUES ($1) RETURNING id, nome", [nome]);
    res.json(r.rows[0]);
  } catch (e) {
    if (String(e?.message || "").includes("unique")) return res.status(409).json({ error: "Categoria já existe" });
    res.status(500).json({ error: "Erro ao criar categoria" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });
  try {
    await db.query("DELETE FROM categorias WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao excluir categoria" });
  }
});

module.exports = router;
