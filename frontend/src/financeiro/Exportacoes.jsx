import { useState } from "react";
import { api } from "../api";

const hojeISO = () => new Date().toISOString().slice(0, 10);

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
  const [loading, setLoading] = useState("");
  const [erro, setErro] = useState("");

  const query = `inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;

  async function exportarXmls() {
    try {
      setErro("");
      setLoading("xml");

      const response = await api.get(
        `/vendas/fiscal/xmls/exportar?${query}`,
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

      const response = await api.get(
        `/financeiro/exportar-vendas?inicio=${inicio}T00:00:00&fim=${fim}T23:59:59`,
        { responseType: "blob" }
      );

      baixarBlob(
        response,
        "text/csv;charset=utf-8;",
        `vendas_${inicio}_a_${fim}.csv`
      );
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao exportar CSV");
    } finally {
      setLoading("");
    }
  }

  async function exportarPDF() {
    try {
      setErro("");
      setLoading("pdf");

      const response = await api.get(
        `/financeiro/exportar-vendas-pdf?inicio=${inicio}T00:00:00&fim=${fim}T23:59:59`,
        { responseType: "blob" }
      );

      baixarBlob(
        response,
        "application/pdf",
        `vendas_${inicio}_a_${fim}.pdf`
      );
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao exportar PDF");
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
            Escolha o período e baixe os arquivos fiscais e financeiros.
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
        </div>

        <div className="fin-datebox">
          <span className="tag">Fim</span>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
      </div>

      {erro ? <div className="empty">{erro}</div> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn-primary"
          onClick={exportarXmls}
          disabled={!!loading}
          type="button"
        >
          {loading === "xml" ? "Exportando..." : "Exportar XMLs NFC-e"}
        </button>

        <button
          className="btn-primary"
          onClick={exportarCSV}
          disabled={!!loading}
          type="button"
        >
          {loading === "csv" ? "Exportando..." : "Exportar CSV"}
        </button>

        <button
          className="btn-secondary"
          onClick={exportarPDF}
          disabled={!!loading}
          type="button"
        >
          {loading === "pdf" ? "Exportando..." : "Exportar PDF"}
        </button>
      </div>
    </div>
  );
}