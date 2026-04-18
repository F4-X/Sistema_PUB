const router = require("express").Router();
const db = require("../db");

function cleanText(v) {
  return String(v || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNs(tag) {
  return String(tag || "").replace(/^.*:/, "");
}

function getTag(xml, tag) {
  const t = String(tag || "").trim();
  if (!t) return "";

  const re = new RegExp(
    `<(?:\\w+:)?${t}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${t}>`,
    "i"
  );

  const m = String(xml || "").match(re);
  if (!m) return "";
  return cleanText(m[1] || "");
}

function getFirst(xml, tags) {
  for (const tag of tags) {
    const v = getTag(xml, stripNs(tag));
    if (v) return v;
  }
  return "";
}

function normalizeMoney(v) {
  const s = String(v || "").trim();
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

function normalizeDate(v) {
  const s = String(v || "").trim();
  if (!s) return "";

  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  return s;
}

function tryFindByRegex(xml, patterns) {
  const src = String(xml || "");
  for (const re of patterns) {
    const m = src.match(re);
    if (m?.[1]) return cleanText(m[1]);
  }
  return "";
}

function extractXmlData(xml) {
  const numero_documento =
    getFirst(xml, [
      "numeroDocumento",
      "NumeroDocumento",
      "nDocumento",
      "numDocumento",
      "numero_titulo",
      "NumeroTitulo",
      "numeroTitulo",
      "nTitulo",
      "titulo",
      "numero",
      "nDoc",
      "identificacao_titulo_empresa",
      "identificacaoTituloEmpresa",
      "nNF",
      "nFat",
    ]) ||
    tryFindByRegex(xml, [
      /<(?:\w+:)?nNF[^>]*>([\s\S]*?)<\/(?:\w+:)?nNF>/i,
      /<(?:\w+:)?nFat[^>]*>([\s\S]*?)<\/(?:\w+:)?nFat>/i,
      /<(?:\w+:)?numero[^>]*>([\s\S]*?)<\/(?:\w+:)?numero>/i,
      /<(?:\w+:)?numeroDocumento[^>]*>([\s\S]*?)<\/(?:\w+:)?numeroDocumento>/i,
    ]);

  const nosso_numero =
    getFirst(xml, [
      "nossoNumero",
      "NossoNumero",
      "nosso_numero",
      "numeroControleParticipante",
      "numero_controle_participante",
      "identificacao_titulo_banco",
      "identificacaoTituloBanco",
      "nDup",
    ]) ||
    tryFindByRegex(xml, [
      /<(?:\w+:)?nDup[^>]*>([\s\S]*?)<\/(?:\w+:)?nDup>/i,
      /<(?:\w+:)?nossoNumero[^>]*>([\s\S]*?)<\/(?:\w+:)?nossoNumero>/i,
    ]);

  const cedente =
    getFirst(xml, [
      "cedente",
      "Cedente",
      "nomeCedente",
      "NomeCedente",
      "beneficiario",
      "Beneficiario",
      "nomeBeneficiario",
      "razaoSocialBeneficiario",
      "nomeEmpresa",
      "sacadorAvalista",
      "favorecido",
      "xNome",
    ]) ||
    tryFindByRegex(xml, [
      /<emit[\s>][\s\S]*?<(?:\w+:)?xNome[^>]*>([\s\S]*?)<\/(?:\w+:)?xNome>[\s\S]*?<\/emit>/i,
      /<(?:\w+:)?beneficiario[^>]*>([\s\S]*?)<\/(?:\w+:)?beneficiario>/i,
      /<(?:\w+:)?cedente[^>]*>([\s\S]*?)<\/(?:\w+:)?cedente>/i,
    ]);

  const sacado =
    getFirst(xml, [
      "sacado",
      "Sacado",
      "nomeSacado",
      "NomeSacado",
      "pagador",
      "Pagador",
      "nomePagador",
      "razaoSocialPagador",
      "nomeSacadoAvalista",
    ]) ||
    tryFindByRegex(xml, [
      /<dest[\s>][\s\S]*?<(?:\w+:)?xNome[^>]*>([\s\S]*?)<\/(?:\w+:)?xNome>[\s\S]*?<\/dest>/i,
      /<(?:\w+:)?pagador[^>]*>([\s\S]*?)<\/(?:\w+:)?pagador>/i,
      /<(?:\w+:)?sacado[^>]*>([\s\S]*?)<\/(?:\w+:)?sacado>/i,
    ]);

  const valorRaw =
    getFirst(xml, [
      "valorDocumento",
      "ValorDocumento",
      "valorTitulo",
      "ValorTitulo",
      "valor_cobrado",
      "valorBoleto",
      "valorNominalTitulo",
      "valor_nominal_titulo",
      "valor",
      "vlrDocumento",
      "valorOriginal",
      "vDup",
      "vNF",
      "vLiq",
      "vOrig",
    ]) ||
    tryFindByRegex(xml, [
      /<(?:\w+:)?vDup[^>]*>([\d.,]+)<\/(?:\w+:)?vDup>/i,
      /<(?:\w+:)?vNF[^>]*>([\d.,]+)<\/(?:\w+:)?vNF>/i,
      /<(?:\w+:)?vLiq[^>]*>([\d.,]+)<\/(?:\w+:)?vLiq>/i,
      /<(?:\w+:)?vOrig[^>]*>([\d.,]+)<\/(?:\w+:)?vOrig>/i,
      /<(?:\w+:)?valor[^>]*>([\d.,]+)<\/(?:\w+:)?valor>/i,
      /<(?:\w+:)?valorDocumento[^>]*>([\d.,]+)<\/(?:\w+:)?valorDocumento>/i,
      /<(?:\w+:)?valorTitulo[^>]*>([\d.,]+)<\/(?:\w+:)?valorTitulo>/i,
    ]);

  const vencRaw =
    getFirst(xml, [
      "dataVencimento",
      "DataVencimento",
      "vencimento",
      "data_vencimento",
      "dataVencto",
      "dataVenc",
      "vencimentoTitulo",
      "dVenc",
    ]) ||
    tryFindByRegex(xml, [
      /<(?:\w+:)?dVenc[^>]*>([\s\S]*?)<\/(?:\w+:)?dVenc>/i,
      /<(?:\w+:)?dataVencimento[^>]*>([\s\S]*?)<\/(?:\w+:)?dataVencimento>/i,
      /<(?:\w+:)?vencimento[^>]*>([\s\S]*?)<\/(?:\w+:)?vencimento>/i,
    ]);

  return {
    numero_documento: cleanText(numero_documento),
    nosso_numero: cleanText(nosso_numero),
    cedente: cleanText(cedente),
    sacado: cleanText(sacado),
    valor_documento: normalizeMoney(valorRaw),
    data_vencimento: normalizeDate(vencRaw),
  };
}

function safeFilename(name, fallback) {
  const clean = String(name || "")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .trim();

  return clean || fallback;
}

async function createContaPagarFromXml(extra) {
  const fornecedor = extra.cedente || null;
  const numero_nf = extra.numero_documento || null;
  const chave = extra.nosso_numero || null;
  const valor = extra.valor_documento ?? null;
  const vencimento = extra.data_vencimento || null;

  if (!fornecedor && !numero_nf && !chave && valor == null && !vencimento) {
    return;
  }

  const existe = await db.query(
    `
    SELECT id
    FROM contas_pagar
    WHERE
      COALESCE(fornecedor, '') = COALESCE($1, '')
      AND COALESCE(numero_nf, '') = COALESCE($2, '')
      AND COALESCE(chave, '') = COALESCE($3, '')
      AND COALESCE(valor, 0::numeric) = COALESCE($4::numeric, 0::numeric)
      AND COALESCE(vencimento::text, '') = COALESCE($5, '')
    LIMIT 1
    `,
    [fornecedor, numero_nf, chave, valor, vencimento]
  );

  if (existe.rows?.[0]) return;

  await db.query(
    `
    INSERT INTO contas_pagar
    (fornecedor, numero_nf, chave, valor, vencimento)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [fornecedor, numero_nf, chave, valor, vencimento]
  );
}

router.get("/", async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        id,
        nome_arquivo,
        numero_documento,
        nosso_numero,
        cedente,
        sacado,
        valor_documento,
        data_vencimento,
        criado_em
      FROM financeiro_xmls
      ORDER BY id DESC
    `);

    res.json(
      r.rows.map((x) => ({
        ...x,
        valor_documento:
          x.valor_documento == null ? null : Number(x.valor_documento),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao listar XMLs" });
  }
});

router.post("/", async (req, res) => {
  try {
    const nome_arquivo = String(req.body?.nome_arquivo || "").trim();
    const xml = String(req.body?.xml || "").trim();

    if (!nome_arquivo) {
      return res.status(400).json({ error: "nome_arquivo é obrigatório" });
    }

    if (!xml) {
      return res.status(400).json({ error: "xml é obrigatório" });
    }

    const extra = extractXmlData(xml);

    const r = await db.query(
      `
      INSERT INTO financeiro_xmls (
        nome_arquivo,
        xml,
        numero_documento,
        nosso_numero,
        cedente,
        sacado,
        valor_documento,
        data_vencimento
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING
        id,
        nome_arquivo,
        numero_documento,
        nosso_numero,
        cedente,
        sacado,
        valor_documento,
        data_vencimento,
        criado_em
      `,
      [
        nome_arquivo,
        xml,
        extra.numero_documento || null,
        extra.nosso_numero || null,
        extra.cedente || null,
        extra.sacado || null,
        extra.valor_documento ?? null,
        extra.data_vencimento || null,
      ]
    );

    try {
      await createContaPagarFromXml(extra);
    } catch (errConta) {
      console.error(
        "Erro ao criar conta a pagar pelo XML:",
        errConta?.message || errConta
      );
    }

    const row = r.rows?.[0];
    res.status(201).json({
      ...row,
      valor_documento:
        row?.valor_documento == null ? null : Number(row.valor_documento),
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao salvar XML" });
  }
});

router.get("/:id/download", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const r = await db.query(
      `
      SELECT id, nome_arquivo, xml
      FROM financeiro_xmls
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    const item = r.rows?.[0];
    if (!item) {
      return res.status(404).json({ error: "XML não encontrado" });
    }

    const filename = safeFilename(item.nome_arquivo, `xml_${id}.xml`);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    res.send(item.xml);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao baixar XML" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const r = await db.query(
      `
      DELETE FROM financeiro_xmls
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (!r.rows?.[0]) {
      return res.status(404).json({ error: "XML não encontrado" });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao excluir XML" });
  }
});

module.exports = router;