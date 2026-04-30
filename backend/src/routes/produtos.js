const router = require("express").Router();
const db = require("../db");

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
}

function clean(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

router.get("/", async (req, res) => {
  const limit = Math.max(1, Math.min(100, n(req.query.limit, 16)));
  const page = Math.max(1, n(req.query.page, 1));
  const search = String(req.query.search || "").trim();
  const categoria_id = n(req.query.categoria_id, 0);
  const sort = String(req.query.sort || "");

  const where = [];
  const params = [];
  let idx = 1;

  if (search) {
    where.push(`lower(p.nome) like $${idx++}`);
    params.push(`%${search.toLowerCase()}%`);
  }

  if (categoria_id) {
    where.push(`p.categoria_id = $${idx++}`);
    params.push(categoria_id);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const joinTop =
    sort === "top"
      ? `LEFT JOIN (
          SELECT vi.produto_id, COALESCE(SUM(vi.qtd),0) AS vendido_qtd
          FROM venda_itens vi
          GROUP BY vi.produto_id
        ) t ON t.produto_id = p.id`
      : `LEFT JOIN (SELECT NULL::int AS produto_id, 0::int AS vendido_qtd) t ON t.produto_id = p.id`;

  const orderSql =
    sort === "top"
      ? "ORDER BY (t.vendido_qtd = 0) ASC, t.vendido_qtd DESC, p.nome ASC"
      : "ORDER BY p.nome ASC";

  const rTotal = await db.query(
    `
    SELECT COUNT(*)::int AS total
    FROM produtos p
    ${whereSql}
    `,
    params
  );

  const total = rTotal.rows?.[0]?.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const off = (page - 1) * limit;

  const r = await db.query(
    `
    SELECT
      p.id,
      p.nome,
      p.preco,
      p.categoria_id,
      p.ativo,
      p.criado_em,
      p.ncm,
      p.cfop,
      p.csosn,
      p.pis_cst,
      p.cofins_cst,
      p.cest,
      p.unidade,
      c.nome AS categoria_nome,
      COALESCE(t.vendido_qtd,0)::int AS vendido_qtd
    FROM produtos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    ${joinTop}
    ${whereSql}
    ${orderSql}
    LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...params, limit, off]
  );

  res.json({ items: r.rows, page, pages, total });
});

router.post("/", async (req, res) => {
  const nome = String(req.body?.nome || "").trim().replace(/\s+/g, " ");
  const preco = Number(req.body?.preco);

  const categoria_id =
    req.body?.categoria_id == null || req.body?.categoria_id === ""
      ? null
      : Number(req.body.categoria_id);

  const ncm = clean(req.body?.ncm);
  const cfop = clean(req.body?.cfop);
  const csosn = clean(req.body?.csosn);
  const pis_cst = clean(req.body?.pis_cst);
  const cofins_cst = clean(req.body?.cofins_cst);
  const cest = clean(req.body?.cest);
  const unidade = clean(req.body?.unidade) || "UN";

  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  if (!Number.isFinite(preco)) return res.status(400).json({ error: "Preço inválido" });

  try {
    const r = await db.query(
      `
      INSERT INTO produtos (
        nome,
        preco,
        categoria_id,
        ncm,
        cfop,
        csosn,
        pis_cst,
        cofins_cst,
        cest,
        unidade
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [nome, preco, categoria_id, ncm, cfop, csosn, pis_cst, cofins_cst, cest, unidade]
    );

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const nome = String(req.body?.nome || "").trim().replace(/\s+/g, " ");
  const preco = Number(req.body?.preco);

  const categoria_id =
    req.body?.categoria_id == null || req.body?.categoria_id === ""
      ? null
      : Number(req.body.categoria_id);

  const ncm = clean(req.body?.ncm);
  const cfop = clean(req.body?.cfop);
  const csosn = clean(req.body?.csosn);
  const pis_cst = clean(req.body?.pis_cst);
  const cofins_cst = clean(req.body?.cofins_cst);
  const cest = clean(req.body?.cest);
  const unidade = clean(req.body?.unidade) || "UN";

  if (!id) return res.status(400).json({ error: "ID inválido" });
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  if (!Number.isFinite(preco)) return res.status(400).json({ error: "Preço inválido" });

  try {
    const r = await db.query(
      `
      UPDATE produtos
      SET nome = $1,
          preco = $2,
          categoria_id = $3,
          ncm = $4,
          cfop = $5,
          csosn = $6,
          pis_cst = $7,
          cofins_cst = $8,
          cest = $9,
          unidade = $10
      WHERE id = $11
      RETURNING *
      `,
      [nome, preco, categoria_id, ncm, cfop, csosn, pis_cst, cofins_cst, cest, unidade, id]
    );

    if (!r.rows[0]) return res.status(404).json({ error: "Produto não encontrado" });

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Erro ao editar produto" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });

  try {
    await db.query("DELETE FROM produtos WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
});

module.exports = router;