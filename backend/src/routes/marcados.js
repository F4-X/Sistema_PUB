const router = require("express").Router();
const db = require("../db");

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

router.get("/resumo", async (req, res) => {
  const r = await db.query(`
    SELECT
      f.id,
      f.nome,
      f.ativo,
      COALESCE(SUM(CASE WHEN m.status='pendente' THEN m.valor_liquido ELSE 0 END),0)::numeric(10,2) AS pend_liq,
      COALESCE(SUM(CASE WHEN m.status='fechado' THEN m.valor_liquido ELSE 0 END),0)::numeric(10,2) AS reg_liq
    FROM funcionarios f
    LEFT JOIN marcados m ON m.funcionario_id = f.id
    GROUP BY f.id, f.nome, f.ativo
    ORDER BY f.nome ASC
  `);

  res.json(
    r.rows.map((x) => ({
      ...x,
      pend_liq: Number(x.pend_liq),
      reg_liq: Number(x.reg_liq),
    }))
  );
});

router.get("/", async (req, res) => {
  const funcionario_id = Number(req.query.funcionario_id || 0);
  const status = String(req.query.status || "pendente").trim().toLowerCase();
  const limit = Math.max(1, Math.min(50, Number(req.query.limit || 6)));
  const page = Math.max(1, Number(req.query.page || 1));
  const off = (page - 1) * limit;

  if (!funcionario_id) {
    return res.status(400).json({ error: "funcionario_id obrigatório" });
  }

  const st = status === "fechado" ? "fechado" : "pendente";

  const totalR = await db.query(
    "SELECT COUNT(*)::int AS total FROM marcados WHERE funcionario_id=$1 AND status=$2",
    [funcionario_id, st]
  );
  const total = totalR.rows?.[0]?.total || 0;

  const r = await db.query(
    `
    SELECT
      id,
      funcionario_id,
      data,
      descricao,
      valor_bruto,
      taxa_pct,
      taxa_valor,
      valor_liquido,
      status,
      criado_em,
      fechado_em
    FROM marcados
    WHERE funcionario_id=$1 AND status=$2
    ORDER BY id DESC
    LIMIT $3 OFFSET $4
    `,
    [funcionario_id, st, limit, off]
  );

  res.json({ items: r.rows, total, page, limit });
});

router.post("/", async (req, res) => {
  const funcionario_id = Number(req.body?.funcionario_id || 0);
  const valor_bruto = round2(Number(req.body?.valor_bruto || 0));
  const descricao = req.body?.descricao == null ? null : String(req.body.descricao).trim();
  const data = String(req.body?.data || "").trim() || null;

  let taxa_pct = Number(req.body?.taxa_pct);
  if (!Number.isFinite(taxa_pct)) taxa_pct = 15;
  if (taxa_pct < 0) taxa_pct = 0;
  if (taxa_pct > 100) taxa_pct = 100;
  taxa_pct = round2(taxa_pct);

  if (!funcionario_id) {
    return res.status(400).json({ error: "funcionario_id obrigatório" });
  }

  if (!Number.isFinite(valor_bruto) || valor_bruto <= 0) {
    return res.status(400).json({ error: "valor_bruto inválido" });
  }

  const taxa_valor = round2((valor_bruto * taxa_pct) / 100);
  const valor_liquido = round2(valor_bruto - taxa_valor);
  const d = data || new Date().toISOString().slice(0, 10);

  const r = await db.query(
    `
    INSERT INTO marcados (
      funcionario_id, data, descricao, valor_bruto, taxa_pct, taxa_valor, valor_liquido, status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,'pendente')
    RETURNING *
    `,
    [funcionario_id, d, descricao, valor_bruto, taxa_pct, taxa_valor, valor_liquido]
  );

  res.json(r.rows[0]);
});

router.post("/fechar", async (req, res) => {
  const funcionario_id = Number(req.body?.funcionario_id || 0);

  if (!funcionario_id) {
    return res.status(400).json({ error: "funcionario_id obrigatório" });
  }

  const r = await db.query(
    `
    UPDATE marcados
    SET status='fechado', fechado_em=NOW()
    WHERE funcionario_id=$1 AND status='pendente'
    RETURNING id
    `,
    [funcionario_id]
  );

  res.json({ fechados: r.rows.length });
});

router.post("/:id/fechar", async (req, res) => {
  const id = Number(req.params.id || 0);

  if (!id) {
    return res.status(400).json({ error: "id obrigatório" });
  }

  const r = await db.query(
    `
    UPDATE marcados
    SET status='fechado', fechado_em=NOW()
    WHERE id=$1 AND status='pendente'
    RETURNING *
    `,
    [id]
  );

  if (!r.rows.length) {
    return res.status(404).json({ error: "Lançamento pendente não encontrado" });
  }

  res.json(r.rows[0]);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id || 0);

  if (!id) {
    return res.status(400).json({ error: "id obrigatório" });
  }

  const r = await db.query(
    `
    DELETE FROM marcados
    WHERE id=$1 AND status='pendente'
    RETURNING id
    `,
    [id]
  );

  if (!r.rows.length) {
    return res.status(404).json({ error: "Lançamento pendente não encontrado" });
  }

  res.json({ ok: true, id });
});

module.exports = router;