const router = require("express").Router();
const db = require("../db");

function n(v, def = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : def;
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

  // vendido_qtd (top) opcional
  const joinTop = sort === "top"
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

  // total
  const rTotal = await db.query(`
    SELECT COUNT(*)::int AS total
    FROM produtos p
    ${whereSql}
  `, params);

  const total = rTotal.rows?.[0]?.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const off = (page - 1) * limit;

  const r = await db.query(`
    SELECT
      p.id, p.nome, p.preco, p.categoria_id, p.ativo, p.criado_em,
      c.nome AS categoria_nome,
      COALESCE(t.vendido_qtd,0)::int AS vendido_qtd
    FROM produtos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    ${joinTop}
    ${whereSql}
    ${orderSql}
    LIMIT $${idx++} OFFSET $${idx++}
  `, [...params, limit, off]);

  res.json({ items: r.rows, page, pages, total });
});

router.post("/", async (req, res) => {
  const nome = String(req.body?.nome || "").trim().replace(/\s+/g, " ");
  const preco = Number(req.body?.preco);
  const categoria_id = req.body?.categoria_id == null ? null : Number(req.body.categoria_id);

  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  if (!Number.isFinite(preco)) return res.status(400).json({ error: "Preço inválido" });

  const r = await db.query(
    "INSERT INTO produtos (nome, preco, categoria_id) VALUES ($1,$2,$3) RETURNING id, nome, preco, categoria_id",
    [nome, preco, categoria_id]
  );
  res.json(r.rows[0]);
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
