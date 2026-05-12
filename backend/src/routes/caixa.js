const router = require("express").Router();
const db = require("../db");

function moneyNumber(v) {
  const n = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

async function garantirColunasConferencia() {
  try {
    await db.query(`
      ALTER TABLE caixa_sessoes
      ADD COLUMN IF NOT EXISTS dinheiro_conferencia NUMERIC(10,2) DEFAULT 0
    `);

    await db.query(`
      ALTER TABLE caixa_sessoes
      ADD COLUMN IF NOT EXISTS pix_conferencia NUMERIC(10,2) DEFAULT 0
    `);

    await db.query(`
      ALTER TABLE caixa_sessoes
      ADD COLUMN IF NOT EXISTS cartao_conferencia NUMERIC(10,2) DEFAULT 0
    `);
  } catch (e) {
    console.log("Erro ao garantir colunas de conferência:", e?.message || e);
  }
}

router.get("/saldo", async (req, res) => {
  const r = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0)::numeric(10,2) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0)::numeric(10,2) AS saidas
    FROM caixa_movimentos
  `);

  const entradas = Number(r.rows?.[0]?.entradas || 0);
  const saidas = Number(r.rows?.[0]?.saidas || 0);

  res.json({
    entradas,
    saidas,
    saldo: Number((entradas - saidas).toFixed(2)),
  });
});

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

  res.json({
    saldo: Number((entradas - saidas).toFixed(2)),
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

  const r = await db.query(
    `
    SELECT id, tipo, valor, motivo, origem, observacao, usuario_id, usuario_email, criado_em
    FROM caixa_movimentos
    ORDER BY id DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, off]
  );

  res.json({ items: r.rows, page, limit });
});

router.post("/movimentos", async (req, res) => {
  const tipo = String(req.body?.tipo || "").trim();
  const valor = moneyNumber(req.body?.valor);
  const motivo = String(req.body?.motivo || "").trim();
  const origem = req.body?.origem == null ? null : String(req.body.origem).trim();
  const observacao = req.body?.observacao == null ? null : String(req.body.observacao).trim();

  if (!tipo || !["entrada", "saida"].includes(tipo)) {
    return res.status(400).json({ error: "Tipo inválido" });
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return res.status(400).json({ error: "Valor inválido" });
  }

  if (!motivo) {
    return res.status(400).json({ error: "Motivo obrigatório" });
  }

  await db.query(
    `
    INSERT INTO caixa_movimentos
    (tipo, valor, motivo, origem, observacao, usuario_id, usuario_email)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      tipo,
      valor,
      motivo,
      origem,
      observacao,
      req.user?.id || null,
      req.user?.email || null,
    ]
  );

  res.json({ ok: true });
});

router.get("/sessao-atual", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT *
      FROM caixa_sessoes
      WHERE status = 'aberto'
      ORDER BY id DESC
      LIMIT 1
    `);

    res.json({
      aberto: !!r.rows[0],
      sessao: r.rows[0] || null,
    });
  } catch (e) {
    res.status(500).json({
      error: e?.message || "Erro ao buscar sessão do caixa",
    });
  }
});

router.post("/abrir", async (req, res) => {
  try {
    await garantirColunasConferencia();

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
    res.status(500).json({
      error: e?.message || "Erro ao abrir caixa",
    });
  }
});

router.post("/fechar", async (req, res) => {
  try {
    await garantirColunasConferencia();

    const valor_fechamento = moneyNumber(req.body?.valor_fechamento);
    const dinheiro_conferencia = moneyNumber(req.body?.dinheiro);
    const pix_conferencia = moneyNumber(req.body?.pix);
    const cartao_conferencia = moneyNumber(req.body?.cartao);

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
          dinheiro_conferencia=$2,
          pix_conferencia=$3,
          cartao_conferencia=$4,
          fechado_em=NOW(),
          status='fechado'
      WHERE id=$5
      RETURNING *
      `,
      [
        valor_fechamento,
        dinheiro_conferencia,
        pix_conferencia,
        cartao_conferencia,
        sessao.id,
      ]
    );

    res.json({ ok: true, sessao: r.rows[0] });
  } catch (e) {
    res.status(500).json({
      error: e?.message || "Erro ao fechar caixa",
    });
  }
});

async function calcularPeriodo(inicio, fim) {
  const pagamentos = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN LOWER(vp.tipo)='dinheiro' THEN vp.valor ELSE 0 END),0)::numeric(10,2) AS dinheiro_pago,
      COALESCE(SUM(CASE WHEN LOWER(vp.tipo)='pix' THEN vp.valor ELSE 0 END),0)::numeric(10,2) AS pix,
      COALESCE(SUM(CASE WHEN LOWER(vp.tipo) IN ('credito','debito','cartao') THEN vp.valor ELSE 0 END),0)::numeric(10,2) AS cartao
    FROM venda_pagamentos vp
    JOIN vendas v ON v.id = vp.venda_id
    WHERE v.criado_em >= $1
      AND v.criado_em <= $2
    `,
    [inicio, fim]
  );

  const movimentos = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN tipo='saida' AND motivo='troco' THEN valor ELSE 0 END),0)::numeric(10,2) AS troco,
      COALESCE(SUM(CASE WHEN tipo='entrada' AND motivo!='venda' THEN valor ELSE 0 END),0)::numeric(10,2) AS entradas_manuais,
      COALESCE(SUM(CASE WHEN tipo='saida' AND motivo!='troco' THEN valor ELSE 0 END),0)::numeric(10,2) AS saidas_manuais
    FROM caixa_movimentos
    WHERE criado_em >= $1
      AND criado_em <= $2
    `,
    [inicio, fim]
  );

  const dinheiroPago = Number(pagamentos.rows?.[0]?.dinheiro_pago || 0);
  const troco = Number(movimentos.rows?.[0]?.troco || 0);

  const dinheiro = Number((dinheiroPago - troco).toFixed(2));
  const pix = Number(pagamentos.rows?.[0]?.pix || 0);
  const cartao = Number(pagamentos.rows?.[0]?.cartao || 0);
  const entradas = Number(movimentos.rows?.[0]?.entradas_manuais || 0);
  const saidas = Number(movimentos.rows?.[0]?.saidas_manuais || 0);

  return {
    dinheiro,
    pix,
    cartao,
    credito: 0,
    debito: cartao,
    troco,
    entradas,
    saidas,
  };
}

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

    const dados = await calcularPeriodo(sessao.aberto_em, new Date());

    const abertura = Number(sessao.valor_abertura || 0);
    const saldo =
      dados.dinheiro +
      dados.pix +
      dados.cartao +
      dados.entradas -
      dados.saidas;

    res.json({
      abertura,
      aberto_em: sessao.aberto_em,
      ...dados,
      saldo,
      total: Number((abertura + saldo).toFixed(2)),
    });
  } catch (e) {
    res.status(500).json({
      error: e?.message || "Erro ao gerar preview do fechamento",
    });
  }
});

router.get("/fechamentos", async (req, res) => {
  try {
    await garantirColunasConferencia();

    const limit = Math.max(1, Math.min(6, Number(req.query.limit || 6)));
    const page = Math.max(1, Number(req.query.page || 1));
    const off = (page - 1) * limit;

    const sessoes = await db.query(
      `
      SELECT
        id,
        caixa_numero,
        valor_abertura,
        valor_fechamento,
        dinheiro_conferencia,
        pix_conferencia,
        cartao_conferencia,
        usuario_email,
        aberto_em,
        fechado_em,
        status
      FROM caixa_sessoes
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, off]
    );

    const totalR = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM caixa_sessoes
    `);

    const items = [];

    for (const s of sessoes.rows) {
      const fim = s.fechado_em || new Date();
      const dados = await calcularPeriodo(s.aberto_em, fim);

      const abertura = Number(s.valor_abertura || 0);

      const totalSistema =
        abertura +
        dados.dinheiro +
        dados.pix +
        dados.cartao +
        dados.entradas -
        dados.saidas;

      const fechado = String(s.status || "") === "fechado";

      const dinheiroConferencia = fechado
        ? Number(s.dinheiro_conferencia || 0)
        : 0;

      const pixConferencia = fechado
        ? Number(s.pix_conferencia || 0)
        : 0;

      const cartaoConferencia = fechado
        ? Number(s.cartao_conferencia || 0)
        : 0;

      const totalDeclarado = fechado
        ? Number(s.valor_fechamento || 0)
        : null;

      const difDinheiro = fechado
  ? dinheiroConferencia - (abertura + dados.dinheiro)
  : 0;

const difPix = fechado
  ? pixConferencia - dados.pix
  : 0;

const difCartao = fechado
  ? cartaoConferencia - dados.cartao
  : 0;

const diferenca = fechado
  ? Number((difDinheiro + difPix + difCartao).toFixed(2))
  : 0;

      items.push({
        ...s,
        dinheiro: dados.dinheiro,
        pix: dados.pix,
        cartao: dados.cartao,
        credito: dados.credito,
        debito: dados.debito,
        troco: dados.troco,
        entradas: dados.entradas,
        saidas: dados.saidas,
        abertura,
        dinheiro_sistema: dados.dinheiro,
        pix_sistema: dados.pix,
        cartao_sistema: dados.cartao,
        dinheiro_conferencia: dinheiroConferencia,
        dif_dinheiro: Number(difDinheiro.toFixed(2)),
dif_pix: Number(difPix.toFixed(2)),
dif_cartao: Number(difCartao.toFixed(2)),
        pix_conferencia: pixConferencia,
        cartao_conferencia: cartaoConferencia,
        total_sistema: Number(totalSistema.toFixed(2)),
        total: totalDeclarado ?? Number(totalSistema.toFixed(2)),
        valor_total_final: totalDeclarado ?? Number(totalSistema.toFixed(2)),
        diferenca: diferenca ?? 0,
      });
    }

    const total = totalR.rows?.[0]?.total || 0;

    res.json({
      items,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (e) {
    res.status(500).json({
      error: e?.message || "Erro ao buscar fechamentos",
    });
  }
});

module.exports = router;