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

function moneyNumber(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

// ✅ Ver caixa aberto atual
router.get("/sessao-atual", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT *
      FROM caixa_sessoes
      WHERE status = 'aberto'
      ORDER BY id DESC
      LIMIT 1
    `);

    res.json({ aberto: !!r.rows[0], sessao: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao buscar sessão do caixa" });
  }
});

// ✅ Abrir caixa
router.post("/abrir", async (req, res) => {
  try {
    const valor_abertura = moneyNumber(req.body?.valor_abertura);

    const aberto = await db.query(`
      SELECT id
      FROM caixa_sessoes
      WHERE status = 'aberto'
      LIMIT 1
    `);

    if (aberto.rows.length) {
      return res.status(400).json({ error: "Já existe um caixa aberto" });
    }

    const r = await db.query(
      `
      INSERT INTO caixa_sessoes
      (caixa_numero, valor_abertura, usuario_id, usuario_email)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        Number(req.body?.caixa_numero || 1),
        valor_abertura,
        req.user?.id || null,
        req.user?.email || null,
      ]
    );

    res.json({ ok: true, sessao: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao abrir caixa" });
  }
});

// ✅ Fechar caixa
router.post("/fechar", async (req, res) => {
  try {
    const valor_fechamento = moneyNumber(req.body?.valor_fechamento);

    const aberto = await db.query(`
      SELECT *
      FROM caixa_sessoes
      WHERE status = 'aberto'
      ORDER BY id DESC
      LIMIT 1
    `);

    const sessao = aberto.rows[0];

    if (!sessao) {
      return res.status(400).json({ error: "Nenhum caixa aberto" });
    }

    const r = await db.query(
      `
      UPDATE caixa_sessoes
      SET valor_fechamento=$1,
          fechado_em=NOW(),
          status='fechado'
      WHERE id=$2
      RETURNING *
      `,
      [valor_fechamento, sessao.id]
    );

    res.json({ ok: true, sessao: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao fechar caixa" });
  }
});

router.get("/fechamento-preview", async (req, res) => {
  try {
    const aberto = await db.query(`
      SELECT *
      FROM caixa_sessoes
      WHERE status='aberto'
      ORDER BY id DESC
      LIMIT 1
    `);

    const sessao = aberto.rows[0];
    if (!sessao) {
      return res.status(400).json({ error: "Nenhum caixa aberto" });
    }

    // 💰 movimentos dentro do período
    const mov = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0) AS entradas,
        COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0) AS saidas,
        COALESCE(SUM(CASE WHEN tipo='entrada' AND motivo='venda' THEN valor ELSE 0 END),0) AS dinheiro,
        COALESCE(SUM(CASE WHEN tipo='saida' AND motivo='troco' THEN valor ELSE 0 END),0) AS troco
      FROM caixa_movimentos
      WHERE criado_em >= $1
    `, [sessao.aberto_em]);

    const entradas = Number(mov.rows[0].entradas || 0);
    const saidas = Number(mov.rows[0].saidas || 0);
    const dinheiro = Number(mov.rows[0].dinheiro || 0);
    const troco = Number(mov.rows[0].troco || 0);

    const saldo = entradas - saidas;

    res.json({
      abertura: sessao.valor_abertura,
      aberto_em: sessao.aberto_em,
      dinheiro,
      troco,
      entradas,
      saidas,
      saldo,
      total: saldo + Number(sessao.valor_abertura || 0),
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
