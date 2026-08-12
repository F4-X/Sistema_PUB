const router = require("express").Router();
const db = require("../db");

function clean(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

// =========================================================
// LISTAR PERFIS FISCAIS
// GET /perfis-fiscais
// =========================================================
router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        id,
        nome,
        ncm,
        cfop,
        csosn,
        pis_cst,
        cofins_cst,
        cest,
        unidade,
        ativo,
        criado_em
      FROM perfis_fiscais
      WHERE ativo = TRUE
      ORDER BY nome ASC
    `);

    return res.json(r.rows);
  } catch (e) {
    console.error("Erro ao listar perfis fiscais:", e);

    return res.status(500).json({
      error: "Erro ao listar perfis fiscais",
    });
  }
});

// =========================================================
// CRIAR PERFIL FISCAL
// POST /perfis-fiscais
// =========================================================
router.post("/", async (req, res) => {
  try {
    const nome = clean(req.body?.nome);
    const ncm = clean(req.body?.ncm);
    const cfop = clean(req.body?.cfop);
    const csosn = clean(req.body?.csosn);
    const pis_cst = clean(req.body?.pis_cst);
    const cofins_cst = clean(req.body?.cofins_cst);
    const cest = clean(req.body?.cest);
    const unidade =
      clean(req.body?.unidade)?.toUpperCase() || "UN";

    const faltando = [];

    if (!nome) faltando.push("Nome");
    if (!ncm) faltando.push("NCM");
    if (!cfop) faltando.push("CFOP");
    if (!csosn) faltando.push("CSOSN");
    if (!pis_cst) faltando.push("PIS CST");
    if (!cofins_cst) faltando.push("COFINS CST");

    if (faltando.length) {
      return res.status(400).json({
        error: `Campos obrigatórios: ${faltando.join(", ")}`,
      });
    }

    if (!/^\d{8}$/.test(ncm)) {
      return res.status(400).json({
        error: "NCM deve possuir 8 números",
      });
    }

    if (!/^\d{4}$/.test(cfop)) {
      return res.status(400).json({
        error: "CFOP deve possuir 4 números",
      });
    }

    if (!/^\d{3}$/.test(csosn)) {
      return res.status(400).json({
        error: "CSOSN deve possuir 3 números",
      });
    }

    if (!/^\d{2}$/.test(pis_cst)) {
      return res.status(400).json({
        error: "PIS CST deve possuir 2 números",
      });
    }

    if (!/^\d{2}$/.test(cofins_cst)) {
      return res.status(400).json({
        error: "COFINS CST deve possuir 2 números",
      });
    }

    const r = await db.query(
      `
      INSERT INTO perfis_fiscais (
        nome,
        ncm,
        cfop,
        csosn,
        pis_cst,
        cofins_cst,
        cest,
        unidade
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        nome,
        ncm,
        cfop,
        csosn,
        pis_cst,
        cofins_cst,
        cest,
        unidade,
      ]
    );

    return res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("Erro ao criar perfil fiscal:", e);

    if (e?.code === "23505") {
      return res.status(400).json({
        error: "Já existe um tipo fiscal com esse nome",
      });
    }

    return res.status(500).json({
      error: "Erro ao criar perfil fiscal",
    });
  }
});

module.exports = router;