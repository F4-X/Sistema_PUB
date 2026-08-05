const router = require("express").Router();
const db = require("../db");
const AdmZip = require("adm-zip");

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
    const v = getTag(
      xml,
      stripNs(tag)
    );

    if (v) return v;
  }

  return "";
}

function normalizeMoney(v) {
  const s = String(v || "").trim();

  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const n = Number(s) / 100;

    return Number.isFinite(n)
      ? Number(n.toFixed(2))
      : null;
  }

  let normalized = s;

  if (
    s.includes(",") &&
    s.includes(".")
  ) {
    normalized = s
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (s.includes(",")) {
    normalized = s.replace(",", ".");
  }

  const n = Number(normalized);

  return Number.isFinite(n)
    ? Number(n.toFixed(2))
    : null;
}

function normalizeDate(v) {
  const s = String(v || "").trim();

  if (!s) return "";

  if (/^\d{8}$/.test(s)) {
    return (
      `${s.slice(0, 4)}-` +
      `${s.slice(4, 6)}-` +
      `${s.slice(6, 8)}`
    );
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(s)
  ) {
    return s;
  }

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(s)
  ) {
    const [dd, mm, yyyy] =
      s.split("/");

    return `${yyyy}-${mm}-${dd}`;
  }

  const iso = s.match(
    /^(\d{4}-\d{2}-\d{2})/
  );

  if (iso) return iso[1];

  return s;
}

function tryFindByRegex(
  xml,
  patterns
) {
  const src = String(xml || "");

  for (const re of patterns) {
    const m = src.match(re);

    if (m?.[1]) {
      return cleanText(m[1]);
    }
  }

  return "";
}

function getDuplicatas(xml) {
  const src = String(xml || "");

  const re =
    /<(?:\w+:)?dup[^>]*>([\s\S]*?)<\/(?:\w+:)?dup>/gi;

  const parcelas = [];

  let m;

  while ((m = re.exec(src))) {
    const bloco = m[1];

    const numero =
      getTag(bloco, "nDup");

    const vencimento =
      normalizeDate(
        getTag(bloco, "dVenc")
      );

    const valor =
      normalizeMoney(
        getTag(bloco, "vDup")
      );

    if (
      numero ||
      vencimento ||
      valor != null
    ) {
      parcelas.push({
        numero,
        vencimento,
        valor,
      });
    }
  }

  return parcelas;
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
    tryFindByRegex(xml, [
      /<emit[\s>][\s\S]*?<(?:\w+:)?xNome[^>]*>([\s\S]*?)<\/(?:\w+:)?xNome>[\s\S]*?<\/emit>/i,
    ]) ||
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
    ]);

  const sacado =
    tryFindByRegex(xml, [
      /<dest[\s>][\s\S]*?<(?:\w+:)?xNome[^>]*>([\s\S]*?)<\/(?:\w+:)?xNome>[\s\S]*?<\/dest>/i,
    ]) ||
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
      "vNF",
      "vLiq",
      "vOrig",
      "vDup",
    ]) ||
    tryFindByRegex(xml, [
      /<(?:\w+:)?vNF[^>]*>([\d.,]+)<\/(?:\w+:)?vNF>/i,
      /<(?:\w+:)?vLiq[^>]*>([\d.,]+)<\/(?:\w+:)?vLiq>/i,
      /<(?:\w+:)?vOrig[^>]*>([\d.,]+)<\/(?:\w+:)?vOrig>/i,
      /<(?:\w+:)?vDup[^>]*>([\d.,]+)<\/(?:\w+:)?vDup>/i,
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
    ]);

  return {
    numero_documento:
      cleanText(numero_documento),

    nosso_numero:
      cleanText(nosso_numero),

    cedente:
      cleanText(cedente),

    sacado:
      cleanText(sacado),

    valor_documento:
      normalizeMoney(valorRaw),

    data_vencimento:
      normalizeDate(vencRaw),
  };
}

function safeFilename(
  name,
  fallback
) {
  const clean = String(name || "")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();

  return clean || fallback;
}

function ensureXmlExtension(name) {
  const filename =
    String(name || "").trim();

  if (
    filename.toLowerCase().endsWith(
      ".xml"
    )
  ) {
    return filename;
  }

  return `${filename}.xml`;
}

async function createContaPagarFromXml(
  extra
) {
  const fornecedor =
    extra.cedente || null;

  const numero_nf =
    extra.numero_documento || null;

  const chave =
    extra.nosso_numero || null;

  const valor =
    extra.valor_documento ?? null;

  const vencimento =
    extra.data_vencimento || null;

  if (
    !fornecedor &&
    !numero_nf &&
    !chave &&
    valor == null &&
    !vencimento
  ) {
    return;
  }

  const existe = await db.query(
    `
    SELECT id
    FROM contas_pagar
    WHERE
      COALESCE(fornecedor, '') =
        COALESCE($1, '')

      AND COALESCE(numero_nf, '') =
        COALESCE($2, '')

      AND COALESCE(chave, '') =
        COALESCE($3, '')

      AND COALESCE(valor, 0::numeric) =
        COALESCE($4::numeric, 0::numeric)

      AND COALESCE(vencimento::text, '') =
        COALESCE($5, '')

    LIMIT 1
    `,
    [
      fornecedor,
      numero_nf,
      chave,
      valor,
      vencimento,
    ]
  );

  if (existe.rows?.[0]) return;

  await db.query(
    `
    INSERT INTO contas_pagar
    (
      fornecedor,
      numero_nf,
      chave,
      valor,
      vencimento
    )
    VALUES ($1,$2,$3,$4,$5)
    `,
    [
      fornecedor,
      numero_nf,
      chave,
      valor,
      vencimento,
    ]
  );
}

/* =========================================================
   LISTAR XMLs
========================================================= */

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
          x.valor_documento == null
            ? null
            : Number(
                x.valor_documento
              ),
      }))
    );
  } catch (e) {
    res.status(500).json({
      error:
        e?.message ||
        "Erro ao listar XMLs",
    });
  }
});

/* =========================================================
   SALVAR XML
========================================================= */

router.post("/", async (req, res) => {
  try {
    const nome_arquivo = String(
      req.body?.nome_arquivo || ""
    ).trim();

    const xml = String(
      req.body?.xml || ""
    ).trim();

    if (!nome_arquivo) {
      return res.status(400).json({
        error:
          "nome_arquivo é obrigatório",
      });
    }

    if (!xml) {
      return res.status(400).json({
        error:
          "xml é obrigatório",
      });
    }

    const extra =
      extractXmlData(xml);

    const parcelas =
      getDuplicatas(xml);

    const extraPrincipal =
      parcelas.length
        ? {
            ...extra,

            nosso_numero:
              parcelas[0].numero ||
              extra.nosso_numero,

            valor_documento:
              parcelas[0].valor ??
              extra.valor_documento,

            data_vencimento:
              parcelas[0].vencimento ||
              extra.data_vencimento,
          }
        : extra;

    const r = await db.query(
      `
      INSERT INTO financeiro_xmls
      (
        nome_arquivo,
        xml,
        numero_documento,
        nosso_numero,
        cedente,
        sacado,
        valor_documento,
        data_vencimento
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
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

        extraPrincipal
          .numero_documento ||
          null,

        extraPrincipal
          .nosso_numero ||
          null,

        extraPrincipal
          .cedente ||
          null,

        extraPrincipal
          .sacado ||
          null,

        extraPrincipal
          .valor_documento ??
          null,

        extraPrincipal
          .data_vencimento ||
          null,
      ]
    );

    try {
      if (parcelas.length) {
        for (const p of parcelas) {
          await createContaPagarFromXml(
            {
              ...extra,

              nosso_numero:
                p.numero ||
                extra.nosso_numero,

              valor_documento:
                p.valor ??
                extra.valor_documento,

              data_vencimento:
                p.vencimento ||
                extra.data_vencimento,
            }
          );
        }
      } else {
        await createContaPagarFromXml(
          extra
        );
      }
    } catch (errConta) {
      console.error(
        "Erro ao criar conta a pagar pelo XML:",
        errConta?.message ||
          errConta
      );
    }

    const row = r.rows?.[0];

    res.status(201).json({
      ...row,

      valor_documento:
        row?.valor_documento == null
          ? null
          : Number(
              row.valor_documento
            ),
    });
  } catch (e) {
    res.status(500).json({
      error:
        e?.message ||
        "Erro ao salvar XML",
    });
  }
});

/* =========================================================
   EXPORTAR TODOS OS XMLs DE ENTRADA EM ZIP

   IMPORTANTE:
   Esta rota precisa ficar antes de /:id/download.
========================================================= */

router.get(
  "/exportar",
  async (req, res) => {
    try {
      const inicio = String(
        req.query.inicio || ""
      ).trim();

      const fim = String(
        req.query.fim || ""
      ).trim();

      if (!inicio || !fim) {
        return res.status(400).json({
          error:
            "Informe o início e o fim do período",
        });
      }

      const inicioDate =
        new Date(inicio);

      const fimDate =
        new Date(fim);

      if (
        Number.isNaN(
          inicioDate.getTime()
        ) ||
        Number.isNaN(
          fimDate.getTime()
        )
      ) {
        return res.status(400).json({
          error:
            "Período inválido",
        });
      }

      if (inicioDate > fimDate) {
        return res.status(400).json({
          error:
            "A data inicial não pode ser maior que a data final",
        });
      }

      const r = await db.query(
        `
        SELECT
          id,
          nome_arquivo,
          numero_documento,
          cedente,
          xml,
          criado_em
        FROM financeiro_xmls
        WHERE criado_em >= $1::timestamp
          AND criado_em <= $2::timestamp
        ORDER BY criado_em ASC, id ASC
        `,
        [
          inicio,
          fim,
        ]
      );

      if (!r.rows.length) {
        return res.status(404).json({
          error:
            "Nenhum XML de entrada encontrado no período informado",
        });
      }

      const zip = new AdmZip();

      let quantidade = 0;

      for (const item of r.rows) {
        const xml = String(
          item.xml || ""
        ).trim();

        if (!xml) continue;

        const numero = safeFilename(
          item.numero_documento,
          String(item.id)
        );

        const fornecedor =
          safeFilename(
            item.cedente,
            "fornecedor"
          );

        const nomeOriginal =
          safeFilename(
            item.nome_arquivo,
            ""
          );

        const nomeBase =
          nomeOriginal ||
          `NFe_${numero}_${fornecedor}.xml`;

        const nomeComExtensao =
          ensureXmlExtension(
            nomeBase
          );

        const nomeFinal =
          `${item.id}_${nomeComExtensao}`;

        zip.addFile(
          safeFilename(
            nomeFinal,
            `xml_entrada_${item.id}.xml`
          ),
          Buffer.from(
            xml,
            "utf8"
          )
        );

        quantidade += 1;
      }

      if (!quantidade) {
        return res.status(404).json({
          error:
            "Os registros do período não possuem conteúdo XML",
        });
      }

      const inicioNome = String(
        inicio
      )
        .slice(0, 16)
        .replace(/[T:]/g, "-");

      const fimNome = String(
        fim
      )
        .slice(0, 16)
        .replace(/[T:]/g, "-");

      const nomeZip =
        `xmls_entrada_${inicioNome}` +
        `_a_${fimNome}.zip`;

      const zipBuffer =
        zip.toBuffer();

      res.setHeader(
        "Content-Type",
        "application/zip"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nomeZip}"`
      );

      res.setHeader(
        "Content-Length",
        zipBuffer.length
      );

      return res.send(
        zipBuffer
      );
    } catch (e) {
      console.error(
        "ERRO exportar XMLs de entrada:",
        e
      );

      if (!res.headersSent) {
        return res.status(500).json({
          error:
            e?.message ||
            "Erro ao exportar XMLs de entrada",
        });
      }

      return res.end();
    }
  }
);

/* =========================================================
   BAIXAR XML INDIVIDUAL
========================================================= */

router.get(
  "/:id/download",
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          error:
            "ID inválido",
        });
      }

      const r = await db.query(
        `
        SELECT
          id,
          nome_arquivo,
          xml
        FROM financeiro_xmls
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      const item =
        r.rows?.[0];

      if (!item) {
        return res.status(404).json({
          error:
            "XML não encontrado",
        });
      }

      const filename =
        ensureXmlExtension(
          safeFilename(
            item.nome_arquivo,
            `xml_${id}.xml`
          )
        );

      res.setHeader(
        "Content-Type",
        "application/xml; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      return res.send(
        item.xml
      );
    } catch (e) {
      return res.status(500).json({
        error:
          e?.message ||
          "Erro ao baixar XML",
      });
    }
  }
);

/* =========================================================
   EDITAR DADOS DO XML
========================================================= */

router.put(
  "/:id",
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          error:
            "ID inválido",
        });
      }

      const r = await db.query(
        `
        UPDATE financeiro_xmls
        SET
          numero_documento = $1,
          nosso_numero = $2,
          cedente = $3,
          sacado = $4,
          valor_documento = $5,
          data_vencimento = $6
        WHERE id = $7
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
          req.body
            .numero_documento ||
            null,

          req.body
            .nosso_numero ||
            null,

          req.body
            .cedente ||
            null,

          req.body
            .sacado ||
            null,

          req.body
              .valor_documento ==
            null ||
          req.body
              .valor_documento ===
            ""
            ? null
            : Number(
                String(
                  req.body
                    .valor_documento
                ).replace(",", ".")
              ),

          req.body
            .data_vencimento ||
            null,

          id,
        ]
      );

      if (!r.rows.length) {
        return res.status(404).json({
          error:
            "XML não encontrado",
        });
      }

      res.json({
        ...r.rows[0],

        valor_documento:
          r.rows[0]
              .valor_documento ==
            null
            ? null
            : Number(
                r.rows[0]
                  .valor_documento
              ),
      });
    } catch (e) {
      res.status(500).json({
        error:
          e?.message ||
          "Erro ao editar XML",
      });
    }
  }
);

/* =========================================================
   EXCLUIR XML
========================================================= */

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const id = Number(
        req.params.id
      );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return res.status(400).json({
          error:
            "ID inválido",
        });
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
        return res.status(404).json({
          error:
            "XML não encontrado",
        });
      }

      res.json({
        ok: true,
      });
    } catch (e) {
      res.status(500).json({
        error:
          e?.message ||
          "Erro ao excluir XML",
      });
    }
  }
);

module.exports = router;