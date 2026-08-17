const router = require("express").Router();
const db = require("../db");

function limpar(v) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

// =========================================================
// LISTAR BANCOS
// GET /bancos
// =========================================================
router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        id,
        nome,
        ativo
      FROM bancos
      WHERE ativo = TRUE
      ORDER BY nome ASC
    `);

    return res.json(r.rows);
  } catch (e) {
    console.error(
      "Erro ao listar bancos:",
      e
    );

    return res.status(500).json({
      error: "Erro ao listar bancos",
    });
  }
});

// =========================================================
// CRIAR BANCO
// POST /bancos
// =========================================================
router.post("/", async (req, res) => {
  try {
    const nome = limpar(
      req.body?.nome
    );

    if (!nome) {
      return res.status(400).json({
        error:
          "Informe o nome do banco",
      });
    }

    const r = await db.query(
      `
      INSERT INTO bancos (
        nome,
        ativo
      )
      VALUES ($1, TRUE)
      RETURNING
        id,
        nome,
        ativo
      `,
      [nome]
    );

    return res
      .status(201)
      .json(r.rows[0]);
  } catch (e) {
    console.error(
      "Erro ao criar banco:",
      e
    );

    if (e?.code === "23505") {
      return res.status(400).json({
        error:
          "Já existe um banco com esse nome",
      });
    }

    return res.status(500).json({
      error: "Erro ao criar banco",
    });
  }
});

// =========================================================
// EDITAR NOME DO BANCO
// PUT /bancos/:id
// =========================================================
router.put("/:id", async (req, res) => {
  try {
    const id = Number(
      req.params.id
    );

    const nome = limpar(
      req.body?.nome
    );

    if (!id) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    if (!nome) {
      return res.status(400).json({
        error:
          "Informe o nome do banco",
      });
    }

    const r = await db.query(
      `
      UPDATE bancos
      SET nome = $1
      WHERE id = $2
      RETURNING
        id,
        nome,
        ativo
      `,
      [nome, id]
    );

    if (!r.rows[0]) {
      return res.status(404).json({
        error:
          "Banco não encontrado",
      });
    }

    return res.json(r.rows[0]);
  } catch (e) {
    console.error(
      "Erro ao editar banco:",
      e
    );

    if (e?.code === "23505") {
      return res.status(400).json({
        error:
          "Já existe um banco com esse nome",
      });
    }

    return res.status(500).json({
      error: "Erro ao editar banco",
    });
  }
});

// =========================================================
// DESATIVAR BANCO
// DELETE /bancos/:id
// =========================================================
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(
      req.params.id
    );

    if (!id) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    const r = await db.query(
      `
      UPDATE bancos
      SET ativo = FALSE
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (!r.rows[0]) {
      return res.status(404).json({
        error:
          "Banco não encontrado",
      });
    }

    return res.json({
      ok: true,
    });
  } catch (e) {
    console.error(
      "Erro ao remover banco:",
      e
    );

    return res.status(500).json({
      error:
        "Erro ao remover banco",
    });
  }
});

module.exports = router;