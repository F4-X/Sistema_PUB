import { useState } from "react";
import { api } from "../api";

const hojeISO = () => new Date().toISOString().slice(0, 10);

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function baixarBlob(response, type, nome) {
  const blob = new Blob([response.data], { type });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

export default function Exportacoes() {
  const [inicio, setInicio] = useState(hojeISO());
  const [fim, setFim] = useState(hojeISO());

  const [usarHorario, setUsarHorario] = useState(false);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("02:00");

  const [loading, setLoading] = useState("");
  const [erro, setErro] = useState("");

  const [openRelatorio, setOpenRelatorio] = useState(false);
  const [relatorioStatus, setRelatorioStatus] = useState("todos");

  const inicioFinal = usarHorario
    ? `${inicio}T${horaInicio}:00`
    : `${inicio}T00:00:00`;

  const fimFinal = usarHorario
    ? `${fim}T${horaFim}:00`
    : `${fim}T23:59:59`;

  const query = `inicio=${encodeURIComponent(inicioFinal)}&fim=${encodeURIComponent(fimFinal)}`;

  async function exportarXmls() {
    try {
      setErro("");
      setLoading("xml");

      const response = await api.get(
        `/vendas/fiscal/xmls/exportar?inicio=${inicio}&fim=${fim}`,
        { responseType: "blob" }
      );

      baixarBlob(
        response,
        "application/zip",
        `xmls_nfce_${inicio}_a_${fim}.zip`
      );
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao exportar XMLs");
    } finally {
      setLoading("");
    }
  }

  async function exportarCSV() {
    try {
      setErro("");
      setLoading("csv");

      const response = await api.get(`/financeiro/exportar-vendas?${query}`, {
        responseType: "blob",
      });

      baixarBlob(
        response,
        "text/csv;charset=utf-8;",
        usarHorario
          ? `vendas_${inicio}_${horaInicio}_a_${fim}_${horaFim}.csv`
          : `vendas_${inicio}_a_${fim}.csv`
      );
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao exportar CSV");
    } finally {
      setLoading("");
    }
  }

  async function gerarRelatorioContas() {
    try {
      setErro("");
      setLoading("relatorio");

      const response = await api.get(
        `/financeiro/contas-pagar/relatorio?${query}&status=${relatorioStatus}`,
        { responseType: "blob" }
      );

      baixarBlob(
        response,
        "application/pdf",
        `relatorio_contas_${relatorioStatus}_${inicio}_a_${fim}.pdf`
      );

      setOpenRelatorio(false);
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao gerar relatório");
    } finally {
      setLoading("");
    }
  }

  async function faturamentoSintetico() {
    try {
      setErro("");
      setLoading("sintetico");

      const { data } = await api.get(`/financeiro/resumo?${query}`);
      const pg = data?.por_pagamento || {};

      const dinheiro = Number(pg.dinheiro || 0);
      const pix = Number(pg.pix || 0);

      const cartao =
        Number(pg.cartao || 0) +
        Number(pg.credito || 0) +
        Number(pg.debito || 0) +
        Number(pg.cartao_credito || 0) +
        Number(pg.cartao_debito || 0);

      const liquido = dinheiro + pix + cartao;

      const desconto =
        Number(data?.desconto || 0) ||
        Number(data?.desconto_concedido || 0) ||
        0;

      const bruto = liquido + desconto;

      const periodoTexto = usarHorario
        ? `${inicio} ${horaInicio} até ${fim} ${horaFim}`
        : `${inicio} até ${fim}`;

      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Faturamento Sintético</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;background:#fff;color:#111;padding:25px}
.box{width:720px;margin:auto;border:2px solid #222;padding:35px 55px}
.print{text-align:center;font-size:28px;margin-bottom:8px}
h2{text-align:center;margin:0 0 10px;font-size:24px}
.periodo{text-align:center;margin-bottom:30px;font-size:16px}
.row{display:flex;justify-content:space-between;font-size:26px;margin:24px 0}
.row strong{font-size:32px}
.sep{border-top:1px solid #ddd;margin:28px 0}
.blue{color:#244a86;font-weight:bold}
.red{color:#a83232}
.total{font-size:28px}
@media print{button{display:none}body{padding:0}.box{border:2px solid #222}}
</style>
</head>
<body>
<div class="box">
  <div class="print">🖨️</div>
  <h2>Faturamento Sintético</h2>
  <div class="periodo">Período: ${periodoTexto}</div>

  <div class="row"><span>Dinheiro</span><strong>${money(dinheiro)}</strong></div>
  <div class="row"><span>PIX</span><strong>${money(pix)}</strong></div>
  <div class="row"><span>Cartão</span><strong>${money(cartao)}</strong></div>

  <div class="sep"></div>

  <div class="row blue total">
    <span>Faturamento Líquido:</span>
    <strong>${money(liquido)}</strong>
  </div>

  <div class="sep"></div>

  <div class="row red">
    <span>Desconto Concedido</span>
    <strong>${money(desconto)}</strong>
  </div>

  <div class="sep"></div>

  <div class="row blue total">
    <span>Faturamento Bruto:</span>
    <strong>${money(bruto)}</strong>
  </div>
</div>

<script>
window.onload = () => setTimeout(() => window.print(), 300);
</script>
</body>
</html>
`;

      const w = window.open("", "_blank", "width=900,height=900");

      if (!w) {
        alert("Pop-up bloqueado. Libere pop-up para imprimir.");
        return;
      }

      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      setErro(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Erro ao gerar faturamento sintético"
      );
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Exportações</h2>
          <div className="fin-subtitle">
            Escolha o período e, se quiser, filtre por horário.
          </div>
        </div>

        <span className="badge">Período</span>
      </div>

      <div className="fin-date">
        <div className="fin-datebox">
          <span className="tag">Início</span>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />

          {usarHorario && (
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          )}
        </div>

        <div className="fin-datebox">
          <span className="tag">Fim</span>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />

          {usarHorario && (
            <input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          )}
        </div>

        <label
          className="fin-datebox"
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          <input
            type="checkbox"
            checked={usarHorario}
            onChange={(e) => setUsarHorario(e.target.checked)}
          />
          <span className="tag">Usar horário</span>
        </label>
      </div>

      {erro ? <div className="empty">{erro}</div> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn-primary"
          onClick={faturamentoSintetico}
          disabled={!!loading}
          type="button"
        >
          {loading === "sintetico" ? "Gerando..." : "Faturamento Sintético"}
        </button>

        <button
          className="btn-primary"
          onClick={exportarXmls}
          disabled={!!loading}
          type="button"
        >
          {loading === "xml" ? "Exportando..." : "Exportar XMLs NFC-e"}
        </button>

        <button
          className="btn-secondary"
          onClick={exportarCSV}
          disabled={!!loading}
          type="button"
        >
          {loading === "csv" ? "Exportando..." : "Exportar CSV"}
        </button>

        <button
          className="btn-secondary"
          onClick={() => setOpenRelatorio(true)}
          disabled={!!loading}
          type="button"
        >
          Relatório
        </button>
      </div>

      {openRelatorio ? (
        <div
          className="modal-backdrop"
          onClick={() => setOpenRelatorio(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Relatório de Contas a Pagar</h3>

            <div style={{ marginBottom: 10, color: "var(--muted)" }}>
              Período: {inicio} até {fim}
            </div>

            <select
              value={relatorioStatus}
              onChange={(e) => setRelatorioStatus(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="aberto">Em aberto</option>
              <option value="vencido">Vencidos</option>
              <option value="pago">Pagas</option>
            </select>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setOpenRelatorio(false)}
                type="button"
              >
                Cancelar
              </button>

              <button
                className="btn-primary"
                onClick={gerarRelatorioContas}
                disabled={loading === "relatorio"}
                type="button"
              >
                {loading === "relatorio" ? "Gerando..." : "Gerar PDF"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}