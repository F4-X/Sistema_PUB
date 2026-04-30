const router = require("express").Router();
const db = require("../db");
const { emitirNfce, baixarPdf } = require("./nuvemfiscal");

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
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

function mapTPag(tipo) {
  const t = normTipo(tipo);
  if (t === "dinheiro") return "01";
  if (t === "pix") return "17";
  if (t === "debito") return "04";
  if (t === "credito") return "03";
  if (t === "cartao") return "03";
  return "99";
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

function envOrThrow(k) {
  const v = String(process.env[k] || "").trim();
  if (!v) throw new Error(`Env faltando: ${k}`);
  return v;
}

function ambienteNF() {
  const e = String(process.env.NUVEMFISCAL_ENV || "sandbox").toLowerCase();
  if (e.includes("prod")) return { ambiente: "producao", tpAmb: 1 };
  return { ambiente: "homologacao", tpAmb: 2 };
}

function onlyDigits(v) {
  return String(v ?? "").replace(/\D/g, "");
}

function buildDest({ cpf, cnpj, nome }) {
  const CPF = onlyDigits(cpf);
  const CNPJ = onlyDigits(cnpj);

  if (!CPF && !CNPJ) return undefined;

  const dest = {};
  if (CNPJ.length === 14) dest.CNPJ = CNPJ;
  else if (CPF.length === 11) dest.CPF = CPF;
  else return undefined;

  const nm = String(nome || "").trim();
  if (nm) dest.xNome = nm;

  dest.indIEDest = 9;
  return dest;
}

router.get("/", async (req, res) => {
  const r = await db.query(`
    SELECT id, caixa_numero, total_final AS total, nfce_status, nfce_numero, criado_em
    FROM vendas
    ORDER BY id DESC
    LIMIT 100
  `);
  res.json(r.rows);
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });

  const rv = await db.query("SELECT * FROM vendas WHERE id = $1", [id]);
  if (!rv.rows.length) return res.status(404).json({ error: "Venda não encontrada" });

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

  res.json({ venda: rv.rows[0], itens: itens.rows, pagamentos: pags.rows });
});

router.post("/", async (req, res) => {
  try {
    const caixa_numero = Number(req.body?.caixa_numero || 1);
    const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
    const pagamentos = Array.isArray(req.body?.pagamentos) ? req.body.pagamentos : [];

    if (!itens.length) return res.status(400).json({ error: "Itens obrigatórios" });
    if (!pagamentos.length) return res.status(400).json({ error: "Pagamentos obrigatórios" });

    const total_bruto = round2(Number(req.body?.total_bruto ?? 0));
    const desconto = round2(Number(req.body?.desconto ?? 0));
    const acrescimo = round2(Number(req.body?.acrescimo ?? 0));
    const total_final = round2(Number(req.body?.total_final ?? 0));

    const rv = await db.query(
      `
      INSERT INTO vendas (caixa_numero, total_bruto, desconto, acrescimo, total_final, nfce_status)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
    `,
      [caixa_numero, total_bruto, desconto, acrescimo, total_final, null]
    );

    const venda_id = rv.rows[0].id;

    for (const it of itens) {
      const produto_id = Number(it.produto_id);
      const qtd = Number(it.qtd || 1);
      const preco_unit = round2(Number(it.preco_unit || 0));
      if (!produto_id || !qtd) continue;

      await db.query(
        "INSERT INTO venda_itens (venda_id, produto_id, qtd, preco_unit) VALUES ($1,$2,$3,$4)",
        [venda_id, produto_id, qtd, preco_unit]
      );
    }

    let totalPago = 0;
    let pagoDinheiro = 0;
    let pagoOutros = 0;

    for (const pg of pagamentos) {
      const tipoRaw = String(pg.tipo || "").trim();
      const tipo = normTipo(tipoRaw);
      const valor = round2(Number(pg.valor || 0));
      if (!tipo || valor <= 0) continue;

      totalPago += valor;
      if (tipo === "dinheiro") pagoDinheiro += valor;
      else pagoOutros += valor;

      await db.query(
        "INSERT INTO venda_pagamentos (venda_id, tipo, valor) VALUES ($1,$2,$3)",
        [venda_id, tipo, valor]
      );
    }

    const troco = round2(Math.max(0, totalPago - total_final));
    await db.query("UPDATE vendas SET troco=$1 WHERE id=$2", [troco, venda_id]);

    const restante = round2(Math.max(0, total_final - pagoOutros));
    const dinheiroGuardado = round2(Math.min(pagoDinheiro, restante));
    const trocoDinheiro = round2(Math.max(0, pagoDinheiro - restante));

    if (dinheiroGuardado > 0) {
      await db.query(
        `
        INSERT INTO caixa_movimentos (tipo, valor, motivo, origem, observacao, usuario_id, usuario_email)
        VALUES ('entrada', $1, 'venda', 'pdv', $2, $3, $4)
      `,
        [dinheiroGuardado, `Venda #${venda_id} (dinheiro)`, req.user?.id || null, req.user?.email || null]
      );
    }

    if (trocoDinheiro > 0) {
      await db.query(
        `
        INSERT INTO caixa_movimentos (tipo, valor, motivo, origem, observacao, usuario_id, usuario_email)
        VALUES ('saida', $1, 'troco', 'pdv', $2, $3, $4)
      `,
        [trocoDinheiro, `Troco venda #${venda_id}`, req.user?.id || null, req.user?.email || null]
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
  if (!id) return res.status(400).json({ error: "ID inválido" });

  const rv = await db.query("SELECT * FROM vendas WHERE id=$1", [id]);
  if (!rv.rows.length) return res.status(404).json({ error: "Venda não encontrada" });

  const venda = rv.rows[0];

  if (venda.nfce_id && String(venda.nfce_status || "").toUpperCase().includes("AUT")) {
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
    await db.query("UPDATE vendas SET nfce_numero=$1 WHERE id=$2", [numero, id]);
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

  const { ambiente, tpAmb } = ambienteNF();
  const total = Number(venda.total_final || 0);

  const det = itensR.rows.map((it, idx) => {
    const qtd = Number(it.qtd || 1);
    const vUn = Number(it.preco_unit || 0);
    const vProd = round2(qtd * vUn);

    const ncm = String(it.ncm || "").trim() || "21069090";
    const cfop = String(it.cfop || "").trim() || "5102";
    const csosn = String(it.csosn || "").trim() || "102";
    const pisCst = String(it.pis_cst || "").trim() || "07";
    const cofinsCst = String(it.cofins_cst || "").trim() || "07";
    const unidade = String(it.unidade || "").trim() || "UN";

    return {
      nItem: idx + 1,
      prod: {
        cProd: String(it.produto_id),
        xProd: it.nome || `Produto ${it.produto_id}`,
        NCM: ncm,
        CFOP: cfop,
        uCom: unidade,
        qCom: qtd,
        vUnCom: vUn,
        vProd,
        cEAN: "SEM GTIN",
        cEANTrib: "SEM GTIN",
        uTrib: unidade,
        qTrib: qtd,
        vUnTrib: vUn,
        indTot: 1,
      },
      imposto: {
        ICMS: { ICMSSN102: { orig: 0, CSOSN: csosn } },
        PIS: { PISNT: { CST: pisCst } },
        COFINS: { COFINSNT: { CST: cofinsCst } },
      },
    };
  });

  const detPag = pagsR.rows.map((p) => {
    const tipo = normTipo(p.tipo);
    const vPag = Number(p.valor || 0);

    const base = {
      tPag: mapTPag(tipo),
      vPag,
    };

    if (
      tipo === "credito" ||
      tipo === "debito" ||
      tipo === "cartao" ||
      tipo === "pix"
    ) {
      base.card = {
        tpIntegra: 2,
        cAut: "000000",
      };
    }

    return base;
  });

  console.log("PAGS DO BANCO:", JSON.stringify(pagsR.rows, null, 2));
  console.log("DET PAG GERADO:", JSON.stringify(detPag, null, 2));

  const dest = buildDest({
    cpf: req.body?.cliente?.cpf,
    cnpj: req.body?.cliente?.cnpj,
    nome: req.body?.cliente?.nome,
  });

  const payload = {
    ambiente,
    infNFe: {
      versao: "4.00",
      ide: {
        cUF: Number(envOrThrow("NF_CUF")),
        natOp: "VENDA",
        mod: 65,
        serie: 3,
        nNF: Number(numero),
        tpNF: 1,
        idDest: 1,
        cMunFG: String(envOrThrow("NF_CMUNFG")),
        tpImp: 4,
        tpEmis: 1,
        tpAmb,
        finNFe: 1,
        indFinal: 1,
        indPres: 1,
        procEmi: 0,
        verProc: "PUB1005",
        dhEmi: new Date().toISOString(),
      },
      emit: {
        CNPJ: envOrThrow("NF_CNPJ"),
        IE: envOrThrow("NF_IE"),
        xNome: envOrThrow("NF_XNOME"),
        CRT: Number(envOrThrow("NF_CRT")),
        enderEmit: {
          xLgr: envOrThrow("NF_XLGR"),
          nro: envOrThrow("NF_NRO"),
          xBairro: envOrThrow("NF_XBAIRRO"),
          cMun: envOrThrow("NF_CMUN"),
          xMun: envOrThrow("NF_XMUN"),
          UF: envOrThrow("NF_UF"),
          CEP: envOrThrow("NF_CEP"),
        },
      },
      ...(dest ? { dest } : {}),
      det,
      total: {
        ICMSTot: {
          vBC: 0,
          vICMS: 0,
          vICMSDeson: 0,
          vFCP: 0,
          vBCST: 0,
          vST: 0,
          vFCPST: 0,
          vFCPSTRet: 0,
          vIPIDevol: 0,
          vProd: total,
          vNF: total,
          vPIS: 0,
          vCOFINS: 0,
          vDesc: Number(venda.desconto || 0),
          vOutro: 0,
          vFrete: 0,
          vSeg: 0,
          vII: 0,
          vIPI: 0,
        },
      },
      pag: { detPag },
      transp: { modFrete: 9 },
      infRespTec: {
        CNPJ: process.env.NF_RT_CNPJ,
        xContato: process.env.NF_RT_XCONTATO,
        email: process.env.NF_RT_EMAIL,
        fone: process.env.NF_RT_FONE,
      },
    },
  };

  try {
    await db.query("UPDATE vendas SET nfce_status=$1 WHERE id=$2", ["EMITINDO", id]);

    const resp = await emitirNfce(payload);

    console.log("📄 NFC-e RESP:", JSON.stringify(resp, null, 2));

    const nfce_id = resp?.id || resp?.nfce?.id || null;
    const chave = resp?.chave || resp?.nfce?.chave || null;

    const statusRaw = resp?.status || resp?.nfce?.status || "EMITIDA";
    const status = String(statusRaw || "").toLowerCase();

    const motivo =
      resp?.motivo ||
      resp?.message ||
      resp?.mensagem ||
      resp?.nfce?.motivo ||
      resp?.nfce?.message ||
      resp?.nfce?.mensagem ||
      (resp?.autorizacao?.motivo_status
        ? `(${resp.autorizacao.codigo_status}) ${resp.autorizacao.motivo_status}`
        : null) ||
      (resp?.details?.error?.errors?.[0]?.message ?? null) ||
      null;

    if (!nfce_id) throw new Error(`Resposta sem nfce_id: ${JSON.stringify(resp)}`);

    let retornoDb = resp;
    try {
      JSON.stringify(resp);
    } catch {
      retornoDb = String(resp);
    }

    await db.query(
      `UPDATE vendas
       SET nfce_id=$1, nfce_chave=$2, nfce_status=$3, nfce_motivo=$4, nfce_retorno=$5
       WHERE id=$6`,
      [nfce_id, chave, status, motivo, retornoDb, id]
    );

    res.json({ ok: true, status, motivo, nfce_numero: numero, nfce_id, chave });
  } catch (e) {
    const msg = String(
      e?.response?.data?.message ||
        e?.response?.data?.error?.message ||
        e?.message ||
        "Erro ao emitir NFC-e"
    );

    const details = e?.response?.data || null;
    let detailsDb = details;
    try {
      JSON.stringify(details);
    } catch {
      detailsDb = details ? String(details) : null;
    }

    await db.query(
      `UPDATE vendas
       SET nfce_status=$1, nfce_motivo=$2, nfce_retorno=$3
       WHERE id=$4`,
      ["erro", msg, detailsDb, id]
    );

    res.status(400).json({ error: msg, details: e?.response?.data || null });
  }
});

router.get("/:id/fiscal/pdf", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "ID inválido" });

  const r = await db.query("SELECT nfce_id FROM vendas WHERE id=$1", [id]);
  if (!r.rows.length) return res.status(404).json({ error: "Venda não encontrada" });

  const nfce_id = r.rows[0]?.nfce_id;
  if (!nfce_id) return res.status(400).json({ error: "NFC-e ainda não foi emitida" });

  try {
    const pdf = await baixarPdf(nfce_id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="nfce_${id}.pdf"`);
    return res.send(pdf);
  } catch (e) {
    const msg = String(e?.response?.data?.message || e?.message || "Erro ao baixar PDF");
    return res.status(400).json({ error: msg, details: e?.response?.data || null });
  }
});

module.exports = router;