const router = require("express").Router();
const db = require("../db");
const xmlsRoutes = require("./xmls");
const contasPagarRoutes = require("./contas_pagar");

function localDateISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getRange(req) {
  const data = String(req.query.data || "").trim();
  const inicio = String(req.query.inicio || "").trim();
  const fim = String(req.query.fim || "").trim();

  if (inicio && fim) return { inicio, fim };

  if (data) {
    const i = `${data}T00:00:00`;
    const d = new Date(`${data}T00:00:00`);
    d.setDate(d.getDate() + 1);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const f = `${yyyy}-${mm}-${dd}T00:00:00`;

    return { inicio: i, fim: f };
  }

  const today = localDateISO();
  const i = `${today}T00:00:00`;
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() + 1);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const f = `${yyyy}-${mm}-${dd}T00:00:00`;

  return { inicio: i, fim: f };
}

router.get("/resumo", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);

    const r = await db.query(
      `
      SELECT
        COALESCE(SUM(total_final),0)::numeric(10,2) AS faturamento,
        COUNT(*)::int AS qtd_vendas
      FROM vendas
      WHERE criado_em >= $1 AND criado_em < $2
      `,
      [inicio, fim]
    );

    const faturamento = Number(r.rows?.[0]?.faturamento || 0);
    const qtd_vendas = Number(r.rows?.[0]?.qtd_vendas || 0);
    const ticket_medio = qtd_vendas ? faturamento / qtd_vendas : 0;

    const pg = await db.query(
      `
      SELECT tipo, COALESCE(SUM(valor),0)::numeric(10,2) AS total
      FROM venda_pagamentos vp
      JOIN vendas v ON v.id = vp.venda_id
      WHERE v.criado_em >= $1 AND v.criado_em < $2
      GROUP BY tipo
      `,
      [inicio, fim]
    );

    const por_pagamento = { dinheiro: "0.00", pix: "0.00", cartao: "0.00" };
    for (const row of pg.rows) {
      const k = String(row.tipo || "").toLowerCase();
      if (k.includes("din")) por_pagamento.dinheiro = Number(row.total).toFixed(2);
      else if (k.includes("pix")) por_pagamento.pix = Number(row.total).toFixed(2);
      else por_pagamento.cartao = Number(row.total).toFixed(2);
    }

    res.json({
      faturamento: faturamento.toFixed(2),
      qtd_vendas,
      ticket_medio: ticket_medio.toFixed(2),
      por_pagamento,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar resumo financeiro" });
  }
});

router.get("/por-caixa", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);

    const r = await db.query(
      `
      SELECT
        caixa_numero,
        COALESCE(SUM(total_final),0)::numeric(10,2) AS faturamento,
        COUNT(*)::int AS qtd_vendas
      FROM vendas
      WHERE criado_em >= $1 AND criado_em < $2
      GROUP BY caixa_numero
      ORDER BY caixa_numero ASC
      `,
      [inicio, fim]
    );

    res.json(r.rows.map((x) => ({ ...x, faturamento: Number(x.faturamento) })));
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar por caixa" });
  }
});

router.get("/por-categoria", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);

    const r = await db.query(
      `
      SELECT
        COALESCE(c.nome, 'Sem categoria') AS categoria,
        COALESCE(SUM(vi.qtd),0)::int AS itens,
        COALESCE(SUM(vi.qtd * vi.preco_unit),0)::numeric(10,2) AS faturamento
      FROM venda_itens vi
      JOIN vendas v ON v.id = vi.venda_id
      LEFT JOIN produtos p ON p.id = vi.produto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE v.criado_em >= $1 AND v.criado_em < $2
      GROUP BY COALESCE(c.nome, 'Sem categoria')
      ORDER BY faturamento DESC
      `,
      [inicio, fim]
    );

    res.json(r.rows.map((x) => ({ ...x, faturamento: Number(x.faturamento) })));
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar por categoria" });
  }
});

router.get("/top-produtos", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));

    const r = await db.query(
      `
      SELECT
        COALESCE(p.nome, 'Produto removido') AS nome,
        COALESCE(SUM(vi.qtd),0)::int AS qtd,
        COALESCE(SUM(vi.qtd * vi.preco_unit),0)::numeric(10,2) AS faturamento
      FROM venda_itens vi
      JOIN vendas v ON v.id = vi.venda_id
      LEFT JOIN produtos p ON p.id = vi.produto_id
      WHERE v.criado_em >= $1 AND v.criado_em < $2
      GROUP BY COALESCE(p.nome, 'Produto removido')
      ORDER BY faturamento DESC
      LIMIT $3
      `,
      [inicio, fim, limit]
    );

    res.json(r.rows.map((x) => ({ ...x, faturamento: Number(x.faturamento) })));
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar top produtos" });
  }
});

router.use("/xmls", xmlsRoutes);
router.use("/contas-pagar", contasPagarRoutes);

module.exports = router;