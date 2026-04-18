const router = require("express").Router();
const db = require("../db");

router.post("/", async (req, res) => {
  const caixa_numero = Number(req.body?.caixa_numero || 1);
  const inicio = String(req.body?.inicio || "").trim();
  const fim = String(req.body?.fim || "").trim();

  if (!inicio || !fim) return res.status(400).json({ error: "Informe inicio e fim" });

  const r = await db.query(`
    SELECT COALESCE(SUM(total_final),0)::numeric(10,2) AS faturamento, COUNT(*)::int AS qtd_vendas
    FROM vendas
    WHERE caixa_numero = $1 AND criado_em >= $2 AND criado_em < $3
  `, [caixa_numero, inicio, fim]);

  const faturamento = Number(r.rows?.[0]?.faturamento || 0);
  const qtd_vendas = Number(r.rows?.[0]?.qtd_vendas || 0);

  const rp = await db.query(`
    SELECT tipo, COALESCE(SUM(valor),0)::numeric(10,2) AS total
    FROM venda_pagamentos vp
    JOIN vendas v ON v.id = vp.venda_id
    WHERE v.caixa_numero = $1 AND v.criado_em >= $2 AND v.criado_em < $3
    GROUP BY tipo
  `, [caixa_numero, inicio, fim]);

  const por_pagamento = {};
  for (const row of rp.rows) por_pagamento[row.tipo] = Number(row.total).toFixed(2);

  const ins = await db.query(`
    INSERT INTO fechamentos (caixa_numero, inicio, fim, faturamento, qtd_vendas, por_pagamento)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id, caixa_numero, inicio, fim, faturamento, qtd_vendas, criado_em
  `, [caixa_numero, inicio, fim, faturamento, qtd_vendas, JSON.stringify(por_pagamento)]);

  res.json({ ...ins.rows[0], por_pagamento });
});

module.exports = router;
