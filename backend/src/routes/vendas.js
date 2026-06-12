const router = require("express").Router();
const db = require("../db");
const AdmZip = require("adm-zip");
const { emitirNfce, baixarPdf, baixarXml } = require("./focusnfe");

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function onlyDigits(v) {
  return String(v ?? "").replace(/\D/g, "");
}

function envOrThrow(k) {
  const v = String(process.env[k] || "").trim();
  if (!v) throw new Error(`Env faltando: ${k}`);
  return v;
}

function safeJson(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch (err) {
    return JSON.stringify({
      erro_serializacao: true,
      mensagem: String(err?.message || err),
    });
  }
}

function normTipo(t) {
  const s = String(t || "").trim().toLowerCase();
  if (s.includes("din")) return "dinheiro";
  if (s.includes("pix")) return "pix";
  if (s.includes("deb")) return "debito";
  if (s.includes("cr")) return "credito";
  if (s.includes("car")) return "cartao";
  return s || "outros";
}

function mapFormaPagamentoFocus(tipo) {
  const t = normTipo(tipo);
  if (t === "dinheiro") return "01";
  if (t === "credito" || t === "cartao") return "03";
  if (t === "debito") return "04";
  if (t === "pix") return "17";
  return "99";
}

function csosnValido(v) {
  const csosn = String(v || "").trim();
  const validos = ["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"];
  return validos.includes(csosn) ? csosn : "102";
}

function cstPisCofins(v) {
  const cst = String(v || "").trim();
  return cst || "07";
}

async function nextNfceNumero() {
  const r = await db.query(`
    UPDATE nfce_numero
    SET proximo_numero = proximo_numero + 1,
        atualizado_em = NOW()
    WHERE id = 1
    RETURNING (proximo_numero - 1) AS numero
  `);

  return Number(r.rows?.[0]?.numero || 1);
}

function buildDestFocus({ cpf, cnpj, nome }) {
  const CPF = onlyDigits(cpf);
  const CNPJ = onlyDigits(cnpj);
  const nm = String(nome || "").trim();

  const dest = {};

  if (CNPJ.length === 14) dest.cnpj_destinatario = CNPJ;
  else if (CPF.length === 11) dest.cpf_destinatario = CPF;

  if (nm) dest.nome_destinatario = nm;

  return dest;
}

router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        id,
        caixa_numero,
        total_final AS total,
        nfce_status,
        nfce_numero,
        criado_em
      FROM vendas
      ORDER BY id DESC
      LIMIT 100
    `);

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao listar vendas" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const rv = await db.query("SELECT * FROM vendas WHERE id = $1", [id]);

    if (!rv.rows.length) {
      return res.status(404).json({ error: "Venda não encontrada" });
    }

    const itens = await db.query(
      `
      SELECT
        vi.id,
        vi.produto_id,
        p.nome,
        p.ncm,
        p.cfop,
        p.csosn,
        p.pis_cst,
        p.cofins_cst,
        p.cest,
        p.unidade,
        vi.qtd,
        vi.preco_unit
      FROM venda_itens vi
      LEFT JOIN produtos p ON p.id = vi.produto_id
      WHERE vi.venda_id = $1
      ORDER BY vi.id ASC
      `,
      [id]
    );

    const pags = await db.query(
      `
      SELECT id, tipo, valor
      FROM venda_pagamentos
      WHERE venda_id = $1
      ORDER BY id ASC
      `,
      [id]
    );

    res.json({
      venda: rv.rows[0],
      itens: itens.rows,
      pagamentos: pags.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao buscar venda" });
  }
});

router.post("/", async (req, res) => {
  try {
    const caixa_numero = Number(req.body?.caixa_numero || 1);
    const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
    const pagamentos = Array.isArray(req.body?.pagamentos)
      ? req.body.pagamentos
      : [];

    const sessaoR = await db.query(`
      SELECT *
      FROM caixa_sessoes
      WHERE status = 'aberto'
      ORDER BY id DESC
      LIMIT 1
    `);

    const sessao = sessaoR.rows[0];

    if (!sessao) {
      return res.status(400).json({ error: "Nenhum caixa aberto" });
    }

    if (!itens.length) {
      return res.status(400).json({ error: "Itens obrigatórios" });
    }

    if (!pagamentos.length) {
      return res.status(400).json({ error: "Pagamentos obrigatórios" });
    }

    const total_bruto = round2(Number(req.body?.total_bruto ?? 0));
    const desconto = round2(Number(req.body?.desconto ?? 0));
    const acrescimo = round2(Number(req.body?.acrescimo ?? 0));
    const total_final = round2(Number(req.body?.total_final ?? 0));

    const rv = await db.query(
      `
      INSERT INTO vendas (
        caixa_numero,
        total_bruto,
        desconto,
        acrescimo,
        total_final,
        nfce_status,
        usuario_id,
        usuario_email,
        sessao_caixa_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id
      `,
      [
        caixa_numero,
        total_bruto,
        desconto,
        acrescimo,
        total_final,
        null,
        req.user?.id || null,
        req.user?.email || null,
        sessao.id,
      ]
    );

    const venda_id = rv.rows[0].id;

    for (const it of itens) {
      const produto_id = Number(it.produto_id);
      const qtd = Number(it.qtd || 1);
      const preco_unit = round2(Number(it.preco_unit || 0));

      if (!produto_id || !qtd) continue;

      await db.query(
        `
        INSERT INTO venda_itens
        (venda_id, produto_id, qtd, preco_unit)
        VALUES ($1,$2,$3,$4)
        `,
        [venda_id, produto_id, qtd, preco_unit]
      );
    }

    let totalPago = 0;
    let pagoDinheiro = 0;
    let pagoOutros = 0;

    for (const pg of pagamentos) {
      const tipo = normTipo(pg.tipo);
      const valor = round2(Number(pg.valor || 0));

      if (!tipo || valor <= 0) continue;

      totalPago += valor;

      if (tipo === "dinheiro") pagoDinheiro += valor;
      else pagoOutros += valor;

      await db.query(
        `
        INSERT INTO venda_pagamentos
        (venda_id, tipo, valor)
        VALUES ($1,$2,$3)
        `,
        [venda_id, tipo, valor]
      );
    }

    const troco = round2(Math.max(0, totalPago - total_final));

    await db.query("UPDATE vendas SET troco=$1 WHERE id=$2", [
      troco,
      venda_id,
    ]);

    const restante = round2(Math.max(0, total_final - pagoOutros));
    const dinheiroGuardado = round2(Math.min(pagoDinheiro, restante));
    const trocoDinheiro = round2(Math.max(0, pagoDinheiro - restante));

    if (dinheiroGuardado > 0) {
      await db.query(
        `
        INSERT INTO caixa_movimentos
        (tipo, valor, motivo, origem, observacao, usuario_id, usuario_email)
        VALUES ('entrada', $1, 'venda', 'pdv', $2, $3, $4)
        `,
        [
          dinheiroGuardado,
          `Venda #${venda_id} (dinheiro)`,
          req.user?.id || null,
          req.user?.email || null,
        ]
      );
    }

    if (trocoDinheiro > 0) {
      await db.query(
        `
        INSERT INTO caixa_movimentos
        (tipo, valor, motivo, origem, observacao, usuario_id, usuario_email)
        VALUES ('saida', $1, 'troco', 'pdv', $2, $3, $4)
        `,
        [
          trocoDinheiro,
          `Troco venda #${venda_id}`,
          req.user?.id || null,
          req.user?.email || null,
        ]
      );
    }

    res.json({ venda_id, troco });
  } catch (e) {
    console.error("POST /vendas ERR:", e?.response?.data || e?.message || e);
    res.status(500).json({ error: "Erro ao registrar venda" });
  }
});

router.post("/:id/fiscal/emitir", async (req, res) => {
  const id = Number(req.params.id);

  try {
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const rv = await db.query("SELECT * FROM vendas WHERE id=$1", [id]);

    if (!rv.rows.length) {
      return res.status(404).json({ error: "Venda não encontrada" });
    }

    const venda = rv.rows[0];

    if (
      venda.nfce_id &&
      String(venda.nfce_status || "").toLowerCase().includes("autoriz")
    ) {
      return res.json({
        ok: true,
        status: venda.nfce_status,
        nfce_numero: venda.nfce_numero,
        nfce_id: venda.nfce_id,
        chave: venda.nfce_chave,
      });
    }

    const numero = venda.nfce_numero || (await nextNfceNumero());

    if (!venda.nfce_numero) {
      await db.query("UPDATE vendas SET nfce_numero=$1 WHERE id=$2", [
        numero,
        id,
      ]);
    }

    const itensR = await db.query(
      `
      SELECT
        vi.id,
        vi.produto_id,
        p.nome,
        p.ncm,
        p.cfop,
        p.csosn,
        p.pis_cst,
        p.cofins_cst,
        p.cest,
        p.unidade,
        vi.qtd,
        vi.preco_unit
      FROM venda_itens vi
      LEFT JOIN produtos p ON p.id = vi.produto_id
      WHERE vi.venda_id = $1
      ORDER BY vi.id ASC
      `,
      [id]
    );

    const pagsR = await db.query(
      `
      SELECT id, tipo, valor
      FROM venda_pagamentos
      WHERE venda_id = $1
      ORDER BY id ASC
      `,
      [id]
    );

    const serie = Number(process.env.NF_SERIE || 3);
    const totalNota = round2(Number(venda.total_final || 0));

    const items = itensR.rows.map((it, idx) => {
      const qtd = Number(it.qtd || 1);
      const valorUnit = round2(Number(it.preco_unit || 0));
      const valorBruto = round2(qtd * valorUnit);

      const item = {
        numero_item: idx + 1,
        codigo_produto: String(it.produto_id || idx + 1),
        descricao: String(it.nome || `Produto ${it.produto_id || idx + 1}`).slice(0, 120),
        codigo_ncm: onlyDigits(it.ncm || "95049010"),
        cfop: onlyDigits(it.cfop || "5102"),
        unidade_comercial: String(it.unidade || "UN").slice(0, 6),
        quantidade_comercial: qtd,
        valor_unitario_comercial: valorUnit,
        valor_bruto: valorBruto,
        unidade_tributavel: String(it.unidade || "UN").slice(0, 6),
        quantidade_tributavel: qtd,
        valor_unitario_tributavel: valorUnit,
        inclui_no_total: 1,

        icms_origem: "0",
        icms_situacao_tributaria: csosnValido(it.csosn || "102"),

        pis_situacao_tributaria: cstPisCofins(it.pis_cst || "07"),
        cofins_situacao_tributaria: cstPisCofins(it.cofins_cst || "07"),
      };

      const cest = onlyDigits(it.cest || "");
      if (cest.length === 7) item.cest = cest;

      return item;
    });

    const formas_pagamento = pagsR.rows
      .map((p) => {
        const tipo = normTipo(p.tipo);
        const forma = mapFormaPagamentoFocus(tipo);
        const valor = round2(Number(p.valor || 0));

        if (valor <= 0) return null;

        const pg = {
          indicador_pagamento: "0",
          forma_pagamento: forma,
          valor_pagamento: valor,
        };

        if (forma === "99") {
          pg.descricao_pagamento = "Outros";
        }

        if (["03", "04", "17", "20"].includes(forma)) {
          pg.tipo_integracao = "2";
          pg.numero_autorizacao = "000000";
        }

        return pg;
      })
      .filter(Boolean);

    const dest = buildDestFocus({
      cpf: req.body?.cliente?.cpf,
      cnpj: req.body?.cliente?.cnpj,
      nome: req.body?.cliente?.nome,
    });

    const totalPagamentos = round2(
      formas_pagamento.reduce((s, p) => s + Number(p.valor_pagamento || 0), 0)
    );

    const valorTroco = round2(Number(venda.troco || 0));

    if (totalPagamentos < totalNota) {
      throw new Error(
        `Total dos pagamentos menor que o total da nota. Total nota: ${totalNota}, pagamentos: ${totalPagamentos}`
      );
    }

    const payload = {
      cnpj_emitente: envOrThrow("NF_CNPJ"),
      ref: `venda_${id}`,

      data_emissao:
        new Date()
          .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
          .replace(" ", "T") + "-03:00",

      natureza_operacao: "VENDA",
      tipo_documento: "1",
      local_destino: "1",
      finalidade_emissao: "1",
      presenca_comprador: "1",
      consumidor_final: "1",
      modalidade_frete: "9",
      indicador_inscricao_estadual_destinatario: "9",

      serie: String(serie),
      numero: String(numero),

      items,
      formas_pagamento,

      ...(valorTroco > 0 ? { valor_troco: valorTroco } : {}),

      ...dest,
    };

    await db.query("UPDATE vendas SET nfce_status=$1 WHERE id=$2", [
      "EMITINDO",
      id,
    ]);

    console.log("PAYLOAD FOCUS NFC-e:");
    console.dir(payload, { depth: null });

    const resp = await emitirNfce(payload);

    const statusRaw = resp?.status || "emitida";
    const status = String(statusRaw || "").toLowerCase();

    const chave = resp?.chave_nfe || resp?.chave || null;
    const nfce_id = resp?.ref || `venda_${id}`;
    const nfceNumero = resp?.numero || numero;

    const motivo =
      resp?.mensagem_sefaz ||
      resp?.mensagem ||
      resp?.message ||
      resp?.erro ||
      null;

    const retornoDb = safeJson(resp);

    await db.query(
      `
      UPDATE vendas
      SET nfce_id=$1,
          nfce_chave=$2,
          nfce_status=$3,
          nfce_motivo=$4,
          nfce_retorno=$5::jsonb,
          nfce_numero=$6
      WHERE id=$7
      `,
      [nfce_id, chave, status, motivo, retornoDb, nfceNumero, id]
    );

    res.json({
      ok: true,
      status,
      motivo,
      nfce_numero: nfceNumero,
      nfce_id,
      chave,
      retorno: resp,
    });
  } catch (e) {
    console.log("ERRO NFC-e COMPLETO:");
    console.dir(e?.response?.data || e, { depth: null });

    const details = e?.response?.data || null;

    const errosValidacao =
      details?.error?.errors ||
      details?.errors ||
      details?.erros ||
      details?.mensagens;

    const msg = Array.isArray(errosValidacao)
      ? errosValidacao.map((x) => x.message || x.mensagem || JSON.stringify(x)).join(" | ")
      : String(
          details?.mensagem ||
            details?.message ||
            details?.error?.message ||
            e?.message ||
            "Erro ao emitir NFC-e"
        );

    const detailsDb = safeJson(details || { erro: msg });

    await db.query(
      `
      UPDATE vendas
      SET nfce_status=$1,
          nfce_motivo=$2,
          nfce_retorno=$3::jsonb
      WHERE id=$4
      `,
      ["erro", msg, detailsDb, id]
    );

    res.status(400).json({
      error: msg,
      details,
    });
  }
});

router.get("/:id/fiscal/pdf", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) return res.status(400).json({ error: "ID inválido" });

    const r = await db.query(
      `
      SELECT nfce_id
      FROM vendas
      WHERE id=$1
      `,
      [id]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: "Venda não encontrada" });
    }

    const nfce_id = r.rows[0]?.nfce_id;

    if (!nfce_id) {
      return res.status(400).json({ error: "NFC-e ainda não foi emitida" });
    }

    const pdf = await baixarPdf(nfce_id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="nfce_${id}.pdf"`);

    return res.send(pdf);
  } catch (e) {
    const msg = String(
      e?.response?.data?.message ||
        e?.response?.data?.mensagem ||
        e?.message ||
        "Erro ao baixar PDF"
    );

    return res.status(400).json({
      error: msg,
      details: e?.response?.data || null,
    });
  }
});

router.get("/fiscal/xmls/exportar", async (req, res) => {
  try {
    const inicio = String(req.query.inicio || "").trim();
    const fim = String(req.query.fim || "").trim();

    if (!inicio || !fim) {
      return res.status(400).json({
        error: "Informe inicio e fim. Ex: ?inicio=2026-05-01&fim=2026-05-31",
      });
    }

    const r = await db.query(
      `
      SELECT
        id,
        nfce_id,
        nfce_numero,
        nfce_chave,
        criado_em
      FROM vendas
      WHERE nfce_status = 'autorizado'
        AND nfce_id IS NOT NULL
        AND criado_em >= $1::date
        AND criado_em < ($2::date + INTERVAL '1 day')
      ORDER BY id ASC
      `,
      [inicio, fim]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: "Nenhuma NFC-e autorizada encontrada nesse período",
      });
    }

    const nomeZip = `xmls_nfce_${inicio}_a_${fim}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nomeZip}"`
    );

   const zip = new AdmZip();

    for (const venda of r.rows) {
      try {
        const xml = await baixarXml(venda.nfce_id);

        const nomeArquivo =
          `NFCe_${venda.nfce_numero || venda.id}_${venda.nfce_chave || venda.nfce_id}.xml`;

        zip.addFile(
  nomeArquivo.replace(/[^\w.-]/g, "_"),
  Buffer.isBuffer(xml) ? xml : Buffer.from(xml)
);
      } catch (e) {
        const erroTxt = [
          `Venda: ${venda.id}`,
          `NFC-e ID: ${venda.nfce_id}`,
          `Numero: ${venda.nfce_numero || ""}`,
          `Erro: ${
            e?.response?.data?.mensagem ||
            e?.response?.data?.message ||
            e?.message ||
            "Erro ao baixar XML"
          }`,
        ].join("\n");

        zip.addFile(
  `ERRO_venda_${venda.id}.txt`,
  Buffer.from(erroTxt)
);
      }
    }

    const zipBuffer = zip.toBuffer();

res.setHeader("Content-Type", "application/zip");
res.setHeader(
  "Content-Disposition",
  `attachment; filename="${nomeZip}"`
);

return res.send(zipBuffer);
  } catch (e) {
    console.error("ERRO exportar XMLs:", e);

    if (!res.headersSent) {
      return res.status(500).json({
        error: e?.message || "Erro ao exportar XMLs",
      });
    }

    res.end();
  }
});

module.exports = router;