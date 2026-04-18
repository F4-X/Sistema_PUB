const router = require("express").Router();
const db = require("../db");

function normalizeMoney(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const n = Number(s) / 100;
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
  }

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  let normalized = s;

  if (hasComma && hasDot) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = s.replace(",", ".");
  } else {
    normalized = s;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT *
      FROM contas_pagar
      ORDER BY
        CASE WHEN status = 'pago' THEN 1 ELSE 0 END ASC,
        vencimento ASC NULLS LAST,
        id DESC
    `);

    res.json(
      r.rows.map((x) => ({
        ...x,
        valor: x.valor == null ? null : Number(x.valor),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao listar contas a pagar" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { fornecedor, numero_nf, chave, valor, vencimento } = req.body;

    const valorNormalizado = normalizeMoney(valor);
    if (valor != null && valor !== "" && valorNormalizado == null) {
      return res.status(400).json({ error: "Valor inválido" });
    }

    const r = await db.query(
      `
      INSERT INTO contas_pagar
      (fornecedor, numero_nf, chave, valor, vencimento)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        fornecedor || null,
        numero_nf || null,
        chave || null,
        valorNormalizado,
        vencimento || null,
      ]
    );

    res.status(201).json({
      ...r.rows[0],
      valor: r.rows[0]?.valor == null ? null : Number(r.rows[0].valor),
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao criar conta a pagar" });
  }
});

router.post("/:id/pagar", async (req, res) => {
  try {
    const { id } = req.params;

    const r = await db.query(
      `
      UPDATE contas_pagar
      SET status='pago', pago_em=NOW()
      WHERE id=$1
      RETURNING *
      `,
      [id]
    );

    if (!r.rows[0]) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    res.json({
      ok: true,
      item: {
        ...r.rows[0],
        valor: r.rows[0]?.valor == null ? null : Number(r.rows[0].valor),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao pagar conta" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const r = await db.query(
      `
      DELETE FROM contas_pagar
      WHERE id=$1
      RETURNING id
      `,
      [id]
    );

    if (!r.rows[0]) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao excluir conta" });
  }
});

module.exports = router;