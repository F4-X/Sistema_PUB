const router = require("express").Router();
const db = require("../db");
const PDFDocument = require("pdfkit");

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

  if (hasComma && hasDot) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (hasComma) normalized = s.replace(",", ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateBR(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

function dateTimeBR(v = new Date()) {
  return new Date(v).toLocaleString("pt-BR");
}

function statusConta(row) {
  const st = String(row.status || "pendente").toLowerCase();
  if (st === "pago") return "Pago";

  if (row.vencimento) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const venc = new Date(row.vencimento);
    venc.setHours(0, 0, 0, 0);

    if (venc < hoje) return "Vencido";
  }

  return "Aberto";
}

function fitText(doc, txt, x, y, w, h, opt = {}) {
  doc.text(String(txt || ""), x, y, {
    width: w,
    height: h,
    ellipsis: true,
    ...opt,
  });
}

/* =========================================================
   RELATÓRIO PDF - precisa ficar ANTES de /:id
========================================================= */
router.get("/relatorio", async (req, res) => {
  try {
    const { inicio, fim, status = "todos" } = req.query;

    const params = [];
    let where = "WHERE 1=1";

    if (inicio) {
      params.push(inicio);
      where += ` AND criado_em >= $${params.length}`;
    }

    if (fim) {
      params.push(fim);
      where += ` AND criado_em <= $${params.length}`;
    }

    const r = await db.query(
      `
      SELECT *
      FROM contas_pagar
      ${where}
      ORDER BY
        vencimento ASC NULLS LAST,
        id ASC
      `,
      params
    );

    let rows = r.rows.map((x) => ({
      ...x,
      valor: x.valor == null ? 0 : Number(x.valor),
      status_calc: statusConta(x),
    }));

    const st = String(status || "todos").toLowerCase();

    if (st === "aberto") rows = rows.filter((x) => x.status_calc === "Aberto");
    if (st === "vencido") rows = rows.filter((x) => x.status_calc === "Vencido");
    if (st === "pago") rows = rows.filter((x) => x.status_calc === "Pago");

    const totalAberto = rows
      .filter((x) => x.status_calc === "Aberto")
      .reduce((s, x) => s + Number(x.valor || 0), 0);

    const totalVencido = rows
      .filter((x) => x.status_calc === "Vencido")
      .reduce((s, x) => s + Number(x.valor || 0), 0);

    const totalPago = rows
      .filter((x) => x.status_calc === "Pago")
      .reduce((s, x) => s + Number(x.valor || 0), 0);

    const totalGeral = rows.reduce((s, x) => s + Number(x.valor || 0), 0);

    const tituloStatus =
      st === "aberto"
        ? "EM ABERTO"
        : st === "vencido"
        ? "VENCIDOS"
        : st === "pago"
        ? "PAGAS"
        : "TODAS";

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 18,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=relatorio_contas_${st}.pdf`
    );

    doc.pipe(res);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 18;

    const cols = [
      { label: "Status", x: 18, w: 52 },
      { label: "Descrição", x: 70, w: 130 },
      { label: "Tipo de documento", x: 200, w: 82 },
      { label: "Fornecedor", x: 282, w: 132 },
      { label: "Vencimento/Caixa", x: 414, w: 82 },
      { label: "Valor", x: 496, w: 58 },
      { label: "Saldo", x: 554, w: 58 },
      { label: "Entrada/Competência", x: 612, w: 96 },
      { label: "Conta analítica", x: 708, w: 82 },
      { label: "Número NF", x: 790, w: 55 },
    ];

    function drawHeader() {
      doc.font("Helvetica-Bold").fontSize(19).fillColor("#111");
      doc.text("1005 PUB", margin, 20);

      doc.font("Helvetica").fontSize(8);
      doc.text("Estabelecimento: 1005 PUB", margin, 48);
      doc.text("Telefone: (42) 99801-1925", margin, 59);
      doc.text("Usuário: admin", margin, 70);

      doc.font("Helvetica-Bold").fontSize(13);
      doc.text("Contas a Pagar", 0, 60, {
        align: "center",
        width: pageW,
      });

      doc.fontSize(15).fillColor("#1b7f3a");
      doc.text(tituloStatus, pageW - 175, 58, {
        width: 120,
        align: "center",
      });

      doc.fillColor("#111");
      doc.moveTo(margin, 92).lineTo(pageW - margin, 92).stroke();

      doc.font("Helvetica-Bold").fontSize(7);

      const y = 99;
      for (const c of cols) {
        doc.rect(c.x, y, c.w, 28).stroke();
        fitText(doc, c.label, c.x + 3, y + 7, c.w - 6, 16, {
          align: "center",
        });
      }
    }

    function drawFooter() {
      const y = pageH - 45;

      doc.moveTo(margin, y - 8).lineTo(pageW - margin, y - 8).stroke();

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111");

      doc.text(`A pagar: R$ ${money(totalAberto)}`, margin, y);
      doc.text(`Total: R$ ${money(totalGeral)}`, 245, y);
      doc.text(`Vencidas: R$ ${money(totalVencido)}`, 405, y);
      doc.text(`Pagas: R$ ${money(totalPago)}`, 590, y);

      doc.font("Helvetica").fontSize(7);
      doc.text(`Emitido dia ${dateTimeBR()}.`, margin, y + 17);
    }

    function drawTableHeader(y) {
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#111");

      for (const c of cols) {
        doc.rect(c.x, y, c.w, 28).stroke();
        fitText(doc, c.label, c.x + 3, y + 7, c.w - 6, 16, {
          align: "center",
        });
      }
    }

    drawHeader();

    let y = 127;
    const rowH = 38;

    doc.font("Helvetica").fontSize(7).fillColor("#111");

    for (const item of rows) {
      if (y + rowH > pageH - 65) {
        drawFooter();
        doc.addPage();
        drawHeader();
        y = 127;
        doc.font("Helvetica").fontSize(7).fillColor("#111");
      }

      const descricao =
        item.descricao ||
        (item.numero_nf ? `XML - NF ${item.numero_nf}` : "Conta sem descrição");

      const tipoDocumento = item.numero_nf ? "XML" : "";
      const fornecedor = item.fornecedor || "";
      const vencimento = dateBR(item.vencimento);
      const valor = money(item.valor);
      const saldo = item.status_calc === "Pago" ? "0,00" : money(item.valor);
      const entrada = dateBR(item.criado_em || item.pago_em);
      const conta =
        item.status_calc === "Pago"
          ? "Fornecedores"
          : item.fornecedor?.toLowerCase().includes("fgts")
          ? "FGTS sobre folha"
          : item.fornecedor?.toLowerCase().includes("receita")
          ? "Impostos e taxas"
          : "Fornecedores";

      const values = [
        item.status_calc,
        descricao,
        tipoDocumento,
        fornecedor,
        vencimento,
        valor,
        saldo,
        entrada,
        conta,
        item.numero_nf || "",
      ];

      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        doc.rect(c.x, y, c.w, rowH).stroke();

        const align = i === 5 || i === 6 ? "right" : "left";

        fitText(doc, values[i], c.x + 3, y + 5, c.w - 6, rowH - 8, {
          align,
        });
      }

      y += rowH;
    }

    if (!rows.length) {
      doc.font("Helvetica-Bold").fontSize(12);
      doc.text("Nenhuma conta encontrada no período selecionado.", margin, 145);
    }

    drawFooter();
    doc.end();
  } catch (e) {
    console.error("ERRO RELATORIO CONTAS:", e);
    res.status(500).json({
      error: e?.message || "Erro ao gerar relatório",
    });
  }
});

/* =========================================================
   LISTAR
========================================================= */
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
    res.status(500).json({
      error: e?.message || "Erro ao listar contas a pagar",
    });
  }
});

/* =========================================================
   CRIAR
========================================================= */
router.post("/", async (req, res) => {
  try {
    const { descricao, fornecedor, numero_nf, chave, valor, vencimento } =
      req.body;

    const valorNormalizado = normalizeMoney(valor);

    if (valor != null && valor !== "" && valorNormalizado == null) {
      return res.status(400).json({ error: "Valor inválido" });
    }

    const r = await db.query(
      `
      INSERT INTO contas_pagar
      (descricao, fornecedor, numero_nf, chave, valor, vencimento)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        descricao || null,
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
    res.status(500).json({
      error: e?.message || "Erro ao criar conta a pagar",
    });
  }
});

/* =========================================================
   PAGAR
========================================================= */
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
    res.status(500).json({
      error: e?.message || "Erro ao pagar conta",
    });
  }
});

/* =========================================================
   EDITAR
========================================================= */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, fornecedor, numero_nf, chave, valor, vencimento } =
      req.body;

    const valorNormalizado = normalizeMoney(valor);

    if (valor != null && valor !== "" && valorNormalizado == null) {
      return res.status(400).json({ error: "Valor inválido" });
    }

    const r = await db.query(
      `
      UPDATE contas_pagar
      SET
        descricao = $1,
        fornecedor = $2,
        numero_nf = $3,
        chave = $4,
        valor = $5,
        vencimento = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        descricao || null,
        fornecedor || null,
        numero_nf || null,
        chave || null,
        valorNormalizado,
        vencimento || null,
        id,
      ]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: "Conta não encontrada",
      });
    }

    res.json({
      ...r.rows[0],
      valor: r.rows[0].valor == null ? null : Number(r.rows[0].valor),
    });
  } catch (e) {
    res.status(500).json({
      error: e?.message || "Erro ao editar conta",
    });
  }
});

/* =========================================================
   EXCLUIR
========================================================= */
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
    res.status(500).json({
      error: e?.message || "Erro ao excluir conta",
    });
  }
});

module.exports = router;