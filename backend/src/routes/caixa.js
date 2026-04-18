const router = require("express").Router();
const db = require("../db");

/**
 * 📌 Conceitos:
 * - motivo='venda'  -> dinheiro que efetivamente entrou no caixa físico por vendas em dinheiro
 * - motivo='troco'  -> dinheiro que saiu do caixa físico como troco
 * - outros motivos  -> lançamentos manuais (sangria, aporte, etc.)
 */

router.get("/saldo", async (req, res) => {
  const r = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0)::numeric(10,2) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0)::numeric(10,2) AS saidas
    FROM caixa_movimentos
  `);
  const entradas = Number(r.rows?.[0]?.entradas || 0);
  const saidas = Number(r.rows?.[0]?.saidas || 0);
  res.json({ entradas, saidas, saldo: Number((entradas - saidas).toFixed(2)) });
});

// ✅ Resumo do caixa (pra UI mostrar "Dinheiro recebido" e "Troco")
router.get("/resumo", async (req, res) => {
  const r = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0)::numeric(10,2) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0)::numeric(10,2) AS saidas,

      COALESCE(SUM(CASE WHEN tipo='entrada' AND motivo='venda' THEN valor ELSE 0 END),0)::numeric(10,2) AS dinheiro_recebido,
      COALESCE(SUM(CASE WHEN tipo='saida' AND motivo='troco' THEN valor ELSE 0 END),0)::numeric(10,2) AS troco_pago,

      COALESCE(SUM(CASE WHEN tipo='entrada' AND (motivo IS NULL OR motivo NOT IN ('venda')) THEN valor ELSE 0 END),0)::numeric(10,2) AS entradas_manuais,
      COALESCE(SUM(CASE WHEN tipo='saida' AND (motivo IS NULL OR motivo NOT IN ('troco')) THEN valor ELSE 0 END),0)::numeric(10,2) AS saidas_manuais
    FROM caixa_movimentos
  `);

  const entradas = Number(r.rows?.[0]?.entradas || 0);
  const saidas = Number(r.rows?.[0]?.saidas || 0);
  const saldo = Number((entradas - saidas).toFixed(2));

  res.json({
    saldo,
    entradas,
    saidas,
    dinheiro_recebido: Number(r.rows?.[0]?.dinheiro_recebido || 0),
    troco_pago: Number(r.rows?.[0]?.troco_pago || 0),
    entradas_manuais: Number(r.rows?.[0]?.entradas_manuais || 0),
    saidas_manuais: Number(r.rows?.[0]?.saidas_manuais || 0),
  });
});

router.get("/movimentos", async (req, res) => {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
  const page = Math.max(1, Number(req.query.page || 1));
  const off = (page - 1) * limit;

  const r = await db.query(`
    SELECT id, tipo, valor, motivo, origem, observacao, usuario_id, usuario_email, criado_em
    FROM caixa_movimentos
    ORDER BY id DESC
    LIMIT $1 OFFSET $2
  `, [limit, off]);

  res.json({ items: r.rows, page, limit });
});

router.post("/movimentos", async (req, res) => {
  const tipo = String(req.body?.tipo || "").trim();
  const valor = Number(req.body?.valor || 0);
  const motivo = String(req.body?.motivo || "").trim();
  const origem = req.body?.origem == null ? null : String(req.body.origem).trim();
  const observacao = req.body?.observacao == null ? null : String(req.body.observacao).trim();

  if (!tipo || !["entrada", "saida"].includes(tipo)) return res.status(400).json({ error: "Tipo inválido" });
  if (!Number.isFinite(valor) || valor <= 0) return res.status(400).json({ error: "Valor inválido" });
  if (!motivo) return res.status(400).json({ error: "Motivo obrigatório" });

  await db.query(`
    INSERT INTO caixa_movimentos (tipo, valor, motivo, origem, observacao, usuario_id, usuario_email)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [tipo, valor, motivo, origem, observacao, req.user?.id || null, req.user?.email || null]);

  res.json({ ok: true });
});

module.exports = router;
