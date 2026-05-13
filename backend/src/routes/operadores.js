const router = require("express").Router();
const bcrypt = require("bcryptjs");
const db = require("../db");

function normalizarTipo(tipo) {
  const t = String(tipo || "Comum").trim();

  const permitidos = ["Comum", "Funcional", "Geral"];

  return permitidos.includes(t) ? t : "Comum";
}

router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        id,
        email,
        tipo,
        ativo,
        criado_em
      FROM usuarios
      ORDER BY id DESC
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({
      error: "Erro ao listar operadores",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "").trim();
    const tipo = normalizarTipo(req.body?.tipo);

    if (!nome) {
      return res.status(400).json({
        error: "Nome obrigatório",
      });
    }

    if (!email) {
      return res.status(400).json({
        error: "Email obrigatório",
      });
    }

    if (!senha) {
      return res.status(400).json({
        error: "Senha obrigatória",
      });
    }

    const existe = await db.query(
      `
      SELECT id
      FROM usuarios
      WHERE lower(email)=lower($1)
      LIMIT 1
      `,
      [email]
    );

    if (existe.rows.length) {
      return res.status(409).json({
        error: "Email já cadastrado",
      });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const ru = await db.query(
      `
      INSERT INTO usuarios
      (email, senha_hash, tipo, ativo)
      VALUES ($1,$2,$3,TRUE)
      RETURNING id,email,tipo,ativo
      `,
      [email, senha_hash, tipo]
    );

    const usuario = ru.rows[0];

    await db.query(
      `
      INSERT INTO funcionarios
      (nome, tipo, usuario_id, ativo)
      VALUES ($1,$2,$3,TRUE)
      `,
      [nome, tipo, usuario.id]
    );

    res.json(usuario);
  } catch (e) {
    console.error("OPERADORES POST ERR:", e?.message || e);

    res.status(500).json({
      error: "Erro ao criar operador",
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    const r = await db.query(
      `
      UPDATE usuarios
      SET ativo = NOT ativo
      WHERE id=$1
      RETURNING id,email,tipo,ativo
      `,
      [id]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: "Operador não encontrado",
      });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({
      error: "Erro ao alterar status",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    const r = await db.query(
      `
      SELECT id, email, tipo
      FROM usuarios
      WHERE id=$1
      LIMIT 1
      `,
      [id]
    );

    const usuario = r.rows[0];

    if (!usuario) {
      return res.status(404).json({
        error: "Operador não encontrado",
      });
    }

    const email = String(usuario.email || "").trim().toLowerCase();
    const tipo = String(usuario.tipo || "").trim().toLowerCase();

    if (email === "admin@pub.com" || tipo === "admin") {
      return res.status(400).json({
        error: "Não é permitido excluir usuários administradores",
      });
    }

    await db.query(
      `
      DELETE FROM funcionarios
      WHERE usuario_id=$1
      `,
      [id]
    );

    await db.query(
      `
      DELETE FROM usuarios
      WHERE id=$1
      `,
      [id]
    );

    res.json({
      ok: true,
      message: "Operador excluído com sucesso",
    });
  } catch (e) {
    console.error("OPERADORES DELETE ERR:", e?.message || e);

    res.status(500).json({
      error: "Erro ao excluir operador",
    });
  }
});

module.exports = router;