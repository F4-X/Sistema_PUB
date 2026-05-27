const router = require("express").Router();
const db = require("../db");

function moneyNumber(v) {
  const n = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

async function garantirColunas() {
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

  await db.query(`
    ALTER TABLE caixa_sessoes
    ADD COLUMN IF NOT EXISTS dinheiro_sistema NUMERIC(10,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE caixa_sessoes
    ADD COLUMN IF NOT EXISTS pix_sistema NUMERIC(10,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE caixa_sessoes
    ADD COLUMN IF NOT EXISTS cartao_sistema NUMERIC(10,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE caixa_sessoes
    ADD COLUMN IF NOT EXISTS dif_dinheiro NUMERIC(10,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE caixa_sessoes
    ADD COLUMN IF NOT EXISTS dif_pix NUMERIC(10,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE caixa_sessoes
    ADD COLUMN IF NOT EXISTS dif_cartao NUMERIC(10,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE caixa_movimentos
    ADD COLUMN IF NOT EXISTS sessao_id INTEGER
  `);
}

async function buscarSessaoAberta() {
  const r = await db.query(`
    SELECT *
    FROM caixa_sessoes
    WHERE status='aberto'
    ORDER BY id DESC
    LIMIT 1
  `);

  return r.rows[0] || null;
}

async function buscarUltimoFechamento() {
  const r = await db.query(`
    SELECT
      id,
      valor_fechamento,
      fechado_em
    FROM caixa_sessoes
    WHERE status='fechado'
      AND fechado_em IS NOT NULL
    ORDER BY fechado_em DESC, id DESC
    LIMIT 1
  `);

  return r.rows[0] || null;
}

async function calcularSaldoSemCaixaAberto() {
  const ultimo = await buscarUltimoFechamento();
  const saldoBase = Number(ultimo?.valor_fechamento || 0);

  let sql = `
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0)::numeric(10,2) AS entradas,
      COALESCE(SUM(CASE WHEN tipo='saida' THEN valor ELSE 0 END),0)::numeric(10,2) AS saidas
    FROM caixa_movimentos
    WHERE sessao_id IS NULL
  `;

  const params = [];

  if (ultimo?.fechado_em) {
    sql += ` AND criado_em > $1`;
    params.push(ultimo.fechado_em);
  }

  const r = await db.query(sql, params);

  const entradas = Number(r.rows?.[0]?.entradas || 0);
  const saidas = Number(r.rows?.[0]?.saidas || 0);

  return {
    entradas,
    saidas,
    saldo_base: saldoBase,
    saldo: Number((saldoBase + entradas - saidas).toFixed(2)),
    ultimo_fechamento_id: ultimo?.id || null,
    ultimo_fechamento_em: ultimo?.fechado_em || null,
  };
}

async function calcularPeriodo(sessao) {
  const inicio = sessao.aberto_em;
  const fim = sessao.fechado_em || new Date();

  const pagamentos = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN LOWER(vp.tipo)='dinheiro' THEN vp.valor ELSE 0 END),0)::numeric(10,2) AS dinheiro_pago,
      COALESCE(SUM(CASE WHEN LOWER(vp.tipo)='pix' THEN vp.valor ELSE 0 END),0)::numeric(10,2) AS pix,
      COALESCE(SUM(CASE WHEN LOWER(vp.tipo) IN ('credito','debito','cartao') THEN vp.valor ELSE 0 END),0)::numeric(10,2) AS cartao
    FROM venda_pagamentos vp
    JOIN vendas v ON v.id = vp.venda_id
    WHERE v.sessao_caixa_id = $1
    `,
    [sessao.id]
  );

  const movimentos = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN tipo='entrada' AND motivo='reforco' THEN valor ELSE 0 END),0)::numeric(10,2) AS entradas_manuais,
      COALESCE(SUM(CASE WHEN tipo='saida' AND motivo='sangria' THEN valor ELSE 0 END),0)::numeric(10,2) AS sangrias,
      COALESCE(SUM(CASE WHEN tipo='saida' AND motivo='troco' THEN valor ELSE 0 END),0)::numeric(10,2) AS trocos
    FROM caixa_movimentos
    WHERE
      sessao_id = $1
      OR (
        sessao_id IS NULL
        AND criado_em >= $2
        AND criado_em <= $3
      )
    `,
    [sessao.id, inicio, fim]
  );

  const dinheiro = Number(pagamentos.rows?.[0]?.dinheiro_pago || 0);
  const pix = Number(pagamentos.rows?.[0]?.pix || 0);
  const cartao = Number(pagamentos.rows?.[0]?.cartao || 0);

  const entradas = Number(movimentos.rows?.[0]?.entradas_manuais || 0);
  const sangrias = Number(movimentos.rows?.[0]?.sangrias || 0);
  const troco = Number(movimentos.rows?.[0]?.trocos || 0);

  const saidas = Number((sangrias + troco).toFixed(2));

  return {
    dinheiro,
    pix,
    cartao,
    credito: 0,
    debito: cartao,
    troco,
    entradas,
    sangrias,
    saidas,
  };
}

function calcularTotais(sessao, dados) {
  const abertura = Number(sessao.valor_abertura || 0);

  const dinheiroSistema = Number(
    (abertura + dados.dinheiro + dados.entradas - dados.saidas).toFixed(2)
  );

  const totalSistema = Number(
    (dinheiroSistema + dados.pix + dados.cartao).toFixed(2)
  );

  return {
    abertura,
    dinheiroSistema,
    totalSistema,
  };
}

router.get("/saldo", async (req, res) => {
  try {
    await garantirColunas();

    const sessao = await buscarSessaoAberta();

    if (!sessao) {
      const saldoAtual = await calcularSaldoSemCaixaAberto();

      return res.json({
        aberto: false,
        entradas: saldoAtual.entradas,
        saidas: saldoAtual.saidas,
        saldo_base: saldoAtual.saldo_base,
        saldo: saldoAtual.saldo,
        ultimo_fechamento_id: saldoAtual.ultimo_fechamento_id,
        ultimo_fechamento_em: saldoAtual.ultimo_fechamento_em,
      });
    }

    const dados = await calcularPeriodo(sessao);
    const { dinheiroSistema } = calcularTotais(sessao, dados);

    res.json({
      aberto: true,
      entradas: dados.entradas,
      saidas: dados.saidas,
      troco: dados.troco,
      saldo: dinheiroSistema,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao buscar saldo" });
  }
});

router.get("/movimentos", async (req, res) => {
  try {
    await garantirColunas();

    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 50)));
    const page = Math.max(1, Number(req.query.page || 1));
    const off = (page - 1) * limit;

    const r = await db.query(
      `
      SELECT
        id,
        sessao_id,
        tipo,
        valor,
        motivo,
        origem,
        observacao,
        usuario_id,
        usuario_email,
        criado_em
      FROM caixa_movimentos
      ORDER BY id DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, off]
    );

    res.json({ items: r.rows, page, limit });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao listar movimentos" });
  }
});

router.post("/movimentos", async (req, res) => {
  try {
    await garantirColunas();

    let tipo = String(req.body?.tipo || "").trim();
    const valor = moneyNumber(req.body?.valor);
    const motivo = String(req.body?.motivo || "").trim();

    if (motivo === "reforco") tipo = "entrada";
    if (motivo === "sangria") tipo = "saida";

    const origem =
      req.body?.origem == null ? "caixa" : String(req.body.origem).trim();

    const observacao =
      req.body?.observacao == null
        ? null
        : String(req.body.observacao).trim();

    if (!["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido" });
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      return res.status(400).json({ error: "Valor inválido" });
    }

    if (!["sangria", "reforco"].includes(motivo)) {
      return res.status(400).json({ error: "Motivo inválido" });
    }

    const sessao = await buscarSessaoAberta();

    await db.query(
      `
      INSERT INTO caixa_movimentos
      (sessao_id, tipo, valor, motivo, origem, observacao, usuario_id, usuario_email)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        sessao?.id || null,
        tipo,
        valor,
        motivo,
        origem || "caixa",
        observacao,
        req.user?.id || null,
        req.user?.email || null,
      ]
    );

    res.json({
      ok: true,
      avulso: !sessao,
      mensagem: sessao
        ? "Movimento lançado no caixa aberto"
        : "Movimento lançado como avulso, sem caixa aberto",
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao lançar movimento" });
  }
});

router.get("/sessao-atual", async (req, res) => {
  try {
    await garantirColunas();

    const sessao = await buscarSessaoAberta();

    res.json({
      aberto: !!sessao,
      sessao: sessao || null,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao buscar sessão do caixa" });
  }
});

router.post("/abrir", async (req, res) => {
  try {
    await garantirColunas();

    const aberto = await buscarSessaoAberta();

    if (aberto) {
      return res.status(400).json({ error: "Já existe um caixa aberto" });
    }

    const valorInformado =
      req.body?.valor_abertura !== undefined &&
      req.body?.valor_abertura !== null &&
      String(req.body.valor_abertura).trim() !== "";

    const saldoAtual = valorInformado ? null : await calcularSaldoSemCaixaAberto();

    const valor_abertura = valorInformado
      ? moneyNumber(req.body.valor_abertura)
      : moneyNumber(saldoAtual?.saldo || 0);

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
    res.status(500).json({ error: e?.message || "Erro ao abrir caixa" });
  }
});

router.post("/fechar", async (req, res) => {
  try {
    await garantirColunas();

    const sessao = await buscarSessaoAberta();

    if (!sessao) {
      return res.status(400).json({ error: "Nenhum caixa aberto" });
    }

    const dinheiroInformado = req.body?.dinheiro !== undefined;
    const pixInformado = req.body?.pix !== undefined;
    const cartaoInformado = req.body?.cartao !== undefined;

    const dados = await calcularPeriodo(sessao);
    const { dinheiroSistema, totalSistema } = calcularTotais(sessao, dados);

    const dinheiro_conferencia = dinheiroInformado
      ? moneyNumber(req.body?.dinheiro)
      : dinheiroSistema;

    const pix_conferencia = pixInformado
      ? moneyNumber(req.body?.pix)
      : Number(dados.pix || 0);

    const cartao_conferencia = cartaoInformado
      ? moneyNumber(req.body?.cartao)
      : Number(dados.cartao || 0);

    const pixSistema = Number(dados.pix || 0);
    const cartaoSistema = Number(dados.cartao || 0);

    const dif_dinheiro = Number(
      (dinheiro_conferencia - dinheiroSistema).toFixed(2)
    );

    const dif_pix = Number(
      (pix_conferencia - pixSistema).toFixed(2)
    );

    const dif_cartao = Number(
      (cartao_conferencia - cartaoSistema).toFixed(2)
    );

    const valor_fechamento =
      req.body?.valor_fechamento !== undefined
        ? moneyNumber(req.body?.valor_fechamento)
        : Number(
            (
              dinheiro_conferencia +
              pix_conferencia +
              cartao_conferencia
            ).toFixed(2)
          );

    const r = await db.query(
      `
      UPDATE caixa_sessoes
      SET valor_fechamento=$1,
          dinheiro_conferencia=$2,
          pix_conferencia=$3,
          cartao_conferencia=$4,
          dinheiro_sistema=$5,
          pix_sistema=$6,
          cartao_sistema=$7,
          dif_dinheiro=$8,
          dif_pix=$9,
          dif_cartao=$10,
          fechado_em=NOW(),
          status='fechado'
      WHERE id=$11
      RETURNING *
      `,
      [
        valor_fechamento,
        dinheiro_conferencia,
        pix_conferencia,
        cartao_conferencia,
        dinheiroSistema,
        pixSistema,
        cartaoSistema,
        dif_dinheiro,
        dif_pix,
        dif_cartao,
        sessao.id,
      ]
    );

    res.json({
      ok: true,
      sessao: r.rows[0],
      sistema: {
        dinheiro_sistema: dinheiroSistema,
        pix_sistema: pixSistema,
        cartao_sistema: cartaoSistema,
        total_sistema: totalSistema,
      },
      diferencas: {
        dif_dinheiro,
        dif_pix,
        dif_cartao,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao fechar caixa" });
  }
});

router.get("/fechamento-preview", async (req, res) => {
  try {
    await garantirColunas();

    const sessao = await buscarSessaoAberta();

    if (!sessao) {
      return res.status(400).json({ error: "Nenhum caixa aberto" });
    }

    const dados = await calcularPeriodo(sessao);
    const { abertura, dinheiroSistema, totalSistema } = calcularTotais(sessao, dados);

    res.json({
      abertura,
      aberto_em: sessao.aberto_em,
      ...dados,

      dinheiro_sistema: dinheiroSistema,
      pix_sistema: dados.pix,
      cartao_sistema: dados.cartao,

      saldo: dinheiroSistema,
      total: dinheiroSistema,
      total_sistema: totalSistema,
    });
  } catch (e) {
    res.status(500).json({
      error: e?.message || "Erro ao gerar preview do fechamento",
    });
  }
});

router.get("/fechamentos", async (req, res) => {
  try {
    await garantirColunas();

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
        dinheiro_sistema,
        pix_sistema,
        cartao_sistema,
        dif_dinheiro,
        dif_pix,
        dif_cartao,
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

      const dinheiroSistema = fechado
        ? Number(s.dinheiro_sistema || 0)
        : 0;

      const pixSistema = fechado
        ? Number(s.pix_sistema || 0)
        : 0;

      const cartaoSistema = fechado
        ? Number(s.cartao_sistema || 0)
        : 0;

      const difDinheiro = fechado
        ? Number(s.dif_dinheiro || 0)
        : 0;

      const difPix = fechado
        ? Number(s.dif_pix || 0)
        : 0;

      const difCartao = fechado
        ? Number(s.dif_cartao || 0)
        : 0;

      const totalSistema = Number(
        (dinheiroSistema + pixSistema + cartaoSistema).toFixed(2)
      );

      const totalDeclarado = fechado ? Number(s.valor_fechamento || 0) : null;

      const diferenca = Number(
        (difDinheiro + difPix + difCartao).toFixed(2)
      );

      items.push({
        ...s,

        abertura: Number(s.valor_abertura || 0),

        dinheiro: dinheiroSistema,
        pix: pixSistema,
        cartao: cartaoSistema,
        credito: 0,
        debito: cartaoSistema,
        troco: 0,
        entradas: 0,
        sangrias: 0,
        saidas: 0,

        dinheiro_sistema: dinheiroSistema,
        pix_sistema: pixSistema,
        cartao_sistema: cartaoSistema,

        dinheiro_conferencia: dinheiroConferencia,
        pix_conferencia: pixConferencia,
        cartao_conferencia: cartaoConferencia,

        dif_dinheiro: difDinheiro,
        dif_pix: difPix,
        dif_cartao: difCartao,

        total_sistema: totalSistema,
        total: totalDeclarado ?? totalSistema,
        valor_total_final: totalDeclarado ?? totalSistema,
        diferenca,
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
    res.status(500).json({ error: e?.message || "Erro ao buscar fechamentos" });
  }
});

module.exports = router;