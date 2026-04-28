const router = require("express").Router();
const PDFDocument = require("pdfkit");
const db = require("../db");
const xmlsRoutes = require("./xmls");
const contasPagarRoutes = require("./contas_pagar");

function localDateISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getRange(req) {
  const data = String(req.query.data || "").trim();
  const inicio = String(req.query.inicio || "").trim();
  const fim = String(req.query.fim || "").trim();

  if (inicio && fim) return { inicio, fim };

  if (data) {
    const i = `${data}T00:00:00`;
    const d = new Date(`${data}T00:00:00`);
    d.setDate(d.getDate() + 1);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const f = `${yyyy}-${mm}-${dd}T00:00:00`;

    return { inicio: i, fim: f };
  }

  const today = localDateISO();
  const i = `${today}T00:00:00`;
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() + 1);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const f = `${yyyy}-${mm}-${dd}T00:00:00`;

  return { inicio: i, fim: f };
}

function escCsv(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function fmtBR(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function buscarVendasSintetico(inicio, fim) {
  const r = await db.query(
    `
    SELECT
      vi.produto_id,
      COALESCE(p.nome, 'Produto removido') AS produto,
      COALESCE(c.nome, 'Sem categoria') AS categoria,
      COALESCE(SUM(vi.qtd),0)::numeric(10,2) AS qtde,
      COALESCE(SUM(vi.qtd * vi.preco_unit),0)::numeric(10,2) AS valor_total
    FROM venda_itens vi
    JOIN vendas v ON v.id = vi.venda_id
    LEFT JOIN produtos p ON p.id = vi.produto_id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE v.criado_em >= $1 AND v.criado_em < $2
    GROUP BY vi.produto_id, COALESCE(p.nome, 'Produto removido'), COALESCE(c.nome, 'Sem categoria')
    ORDER BY produto ASC
    `,
    [inicio, fim]
  );

  return r.rows || [];
}

router.get("/resumo", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);

    const r = await db.query(
      `
      SELECT
        COALESCE(SUM(total_final),0)::numeric(10,2) AS faturamento,
        COUNT(*)::int AS qtd_vendas
      FROM vendas
      WHERE criado_em >= $1 AND criado_em < $2
      `,
      [inicio, fim]
    );

    const faturamento = Number(r.rows?.[0]?.faturamento || 0);
    const qtd_vendas = Number(r.rows?.[0]?.qtd_vendas || 0);
    const ticket_medio = qtd_vendas ? faturamento / qtd_vendas : 0;

    const pg = await db.query(
      `
      SELECT tipo, COALESCE(SUM(valor),0)::numeric(10,2) AS total
      FROM venda_pagamentos vp
      JOIN vendas v ON v.id = vp.venda_id
      WHERE v.criado_em >= $1 AND v.criado_em < $2
      GROUP BY tipo
      `,
      [inicio, fim]
    );

    const por_pagamento = { dinheiro: "0.00", pix: "0.00", cartao: "0.00" };
    for (const row of pg.rows) {
      const k = String(row.tipo || "").toLowerCase();
      if (k.includes("din")) por_pagamento.dinheiro = Number(row.total).toFixed(2);
      else if (k.includes("pix")) por_pagamento.pix = Number(row.total).toFixed(2);
      else por_pagamento.cartao = Number(row.total).toFixed(2);
    }

    res.json({
      faturamento: faturamento.toFixed(2),
      qtd_vendas,
      ticket_medio: ticket_medio.toFixed(2),
      por_pagamento,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar resumo financeiro" });
  }
});

router.get("/por-caixa", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);

    const r = await db.query(
      `
      SELECT
        caixa_numero,
        COALESCE(SUM(total_final),0)::numeric(10,2) AS faturamento,
        COUNT(*)::int AS qtd_vendas
      FROM vendas
      WHERE criado_em >= $1 AND criado_em < $2
      GROUP BY caixa_numero
      ORDER BY caixa_numero ASC
      `,
      [inicio, fim]
    );

    res.json(r.rows.map((x) => ({ ...x, faturamento: Number(x.faturamento) })));
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar por caixa" });
  }
});

router.get("/por-categoria", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);

    const r = await db.query(
      `
      SELECT
        COALESCE(c.nome, 'Sem categoria') AS categoria,
        COALESCE(SUM(vi.qtd),0)::int AS itens,
        COALESCE(SUM(vi.qtd * vi.preco_unit),0)::numeric(10,2) AS faturamento
      FROM venda_itens vi
      JOIN vendas v ON v.id = vi.venda_id
      LEFT JOIN produtos p ON p.id = vi.produto_id
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE v.criado_em >= $1 AND v.criado_em < $2
      GROUP BY COALESCE(c.nome, 'Sem categoria')
      ORDER BY faturamento DESC
      `,
      [inicio, fim]
    );

    res.json(r.rows.map((x) => ({ ...x, faturamento: Number(x.faturamento) })));
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar por categoria" });
  }
});

router.get("/top-produtos", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));

    const r = await db.query(
      `
      SELECT
        COALESCE(p.nome, 'Produto removido') AS nome,
        COALESCE(SUM(vi.qtd),0)::int AS qtd,
        COALESCE(SUM(vi.qtd * vi.preco_unit),0)::numeric(10,2) AS faturamento
      FROM venda_itens vi
      JOIN vendas v ON v.id = vi.venda_id
      LEFT JOIN produtos p ON p.id = vi.produto_id
      WHERE v.criado_em >= $1 AND v.criado_em < $2
      GROUP BY COALESCE(p.nome, 'Produto removido')
      ORDER BY faturamento DESC
      LIMIT $3
      `,
      [inicio, fim, limit]
    );

    res.json(r.rows.map((x) => ({ ...x, faturamento: Number(x.faturamento) })));
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao carregar top produtos" });
  }
});

router.get("/exportar-vendas", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);
    const rows = await buscarVendasSintetico(inicio, fim);

    const linhas = [
      escCsv("1005 PUB"),
      escCsv("Vendas Sintético"),
      escCsv(`Filtro Data: abertura caixa, Data: de ${String(inicio).slice(0, 10)} até ${String(fim).slice(0, 10)}`),
      "",
      ["Qtde", "Produto", "Valor Médio", "Valor Total", "SubGrupo", "Grupo", "Id Prod", "Combo"]
        .map(escCsv)
        .join(";"),
    ];

    let totalQtde = 0;
    let totalValor = 0;

    for (const item of rows) {
      const qtde = Number(item.qtde || 0);
      const valorTotal = Number(item.valor_total || 0);
      const valorMedio = qtde > 0 ? valorTotal / qtde : 0;

      totalQtde += qtde;
      totalValor += valorTotal;

      linhas.push(
        [
          escCsv(fmtBR(qtde)),
          escCsv(item.produto),
          escCsv(fmtBR(valorMedio)),
          escCsv(fmtBR(valorTotal)),
          escCsv(item.categoria),
          escCsv(item.categoria),
          escCsv(item.produto_id || ""),
          escCsv(""),
        ].join(";")
      );
    }

    linhas.push("");
    linhas.push(escCsv(`Quantidade: ${fmtBR(totalQtde)} - Valor Total: R$ ${fmtBR(totalValor)}`));

    const csv = "\uFEFF" + linhas.join("\n");
    const nome = `vendas_sintetico_${String(inicio).slice(0, 10)}_a_${String(fim).slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao exportar vendas sintético" });
  }
});

router.get("/exportar-vendas-pdf", async (req, res) => {
  try {
    const { inicio, fim } = getRange(req);
    const rows = await buscarVendasSintetico(inicio, fim);

    const nome = `vendas_sintetico_${String(inicio).slice(0, 10)}_a_${String(fim).slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);

    const doc = new PDFDocument({
      size: "A4",
      margin: 30,
      bufferPages: true,
    });

    doc.pipe(res);

    function header() {
      doc.font("Helvetica-Bold").fontSize(15).text("1005 PUB", { align: "center" });
      doc.font("Helvetica").fontSize(9).text("Av Getulio Vargas, 734, Cidade Nova, Porto União", { align: "center" });
      doc.font("Helvetica").fontSize(9).text("CNPJ: 50.371.767/0001-03", { align: "center" });
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(13).text("Vendas Sintético", { align: "center" });
      doc.font("Helvetica").fontSize(9).text(
        `Filtro Data: abertura caixa, Data: de ${String(inicio).slice(0, 10)} até ${String(fim).slice(0, 10)}`,
        { align: "center" }
      );
      doc.moveDown(1);
    }

    function tableHeader(y) {
      doc.font("Helvetica-Bold").fontSize(8);
      doc.text("Qtde", 30, y, { width: 45 });
      doc.text("Produto", 75, y, { width: 185 });
      doc.text("V. Médio", 260, y, { width: 60, align: "right" });
      doc.text("V. Total", 325, y, { width: 65, align: "right" });
      doc.text("SubGrupo", 400, y, { width: 75 });
      doc.text("Grupo", 475, y, { width: 55 });
      doc.text("Id", 535, y, { width: 30, align: "right" });
      doc.moveTo(30, y + 13).lineTo(565, y + 13).stroke();
      return y + 18;
    }

    header();
    let y = tableHeader(doc.y);

    let totalQtde = 0;
    let totalValor = 0;

    doc.font("Helvetica").fontSize(8);

    for (const item of rows) {
      const qtde = Number(item.qtde || 0);
      const valorTotal = Number(item.valor_total || 0);
      const valorMedio = qtde > 0 ? valorTotal / qtde : 0;

      totalQtde += qtde;
      totalValor += valorTotal;

      if (y > 780) {
        doc.addPage();
        header();
        y = tableHeader(doc.y);
        doc.font("Helvetica").fontSize(8);
      }

      const produto = String(item.produto || "");
      const categoria = String(item.categoria || "Sem categoria");

      doc.text(fmtBR(qtde), 30, y, { width: 45 });
      doc.text(produto, 75, y, { width: 185, lineBreak: false });
      doc.text(fmtBR(valorMedio), 260, y, { width: 60, align: "right" });
      doc.text(fmtBR(valorTotal), 325, y, { width: 65, align: "right" });
      doc.text(categoria, 400, y, { width: 75, lineBreak: false });
      doc.text(categoria, 475, y, { width: 55, lineBreak: false });
      doc.text(String(item.produto_id || ""), 535, y, { width: 30, align: "right" });

      y += 16;
    }

    doc.moveTo(30, y + 4).lineTo(565, y + 4).stroke();
    y += 14;

    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(`Quantidade: ${fmtBR(totalQtde)}    Valor Total: R$ ${fmtBR(totalValor)}`, 30, y, {
      width: 535,
      align: "right",
    });

    doc.end();
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erro ao gerar PDF" });
  }
});

router.use("/xmls", xmlsRoutes);
router.use("/contas-pagar", contasPagarRoutes);

module.exports = router;