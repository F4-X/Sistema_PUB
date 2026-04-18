import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateBR(v) {
  if (!v) return "—";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) {
      const [yyyy, mm, dd] = String(v).split("-");
      return `${dd}/${mm}/${yyyy}`;
    }
    return new Date(v).toLocaleString("pt-BR");
  } catch {
    return String(v);
  }
}

function valueSearch(v) {
  if (v == null || v === "") return "";
  const n = Number(v || 0);

  const br = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const simple = String(n);
  const fixed = n.toFixed(2);

  return `${br} ${simple} ${fixed} ${br.replace(/\./g, "").replace(",", ".")}`;
}

export default function XMLs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [busca, setBusca] = useState("");
  const inputRef = useRef(null);

  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  async function carregar() {
    try {
      setLoading(true);
      setErro("");
      const r = await api.get("/financeiro/xmls");
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao carregar XMLs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function enviarArquivo(file) {
    try {
      setSending(true);
      setErro("");
      setMsg("");

      const xml = await file.text();

      await api.post("/financeiro/xmls", {
        nome_arquivo: file.name,
        xml,
      });

      setMsg("XML enviado com sucesso");
      if (inputRef.current) inputRef.current.value = "";
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao enviar XML");
    } finally {
      setSending(false);
    }
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await enviarArquivo(file);
  }

  async function baixar(id, nome) {
    try {
      const response = await api.get(`/financeiro/xmls/${id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/xml" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = nome || `xml_${id}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao baixar XML");
    }
  }

  async function excluir(id) {
    if (!window.confirm("Excluir este XML?")) return;

    try {
      setErro("");
      setMsg("");
      await api.delete(`/financeiro/xmls/${id}`);
      setMsg("XML excluído com sucesso");
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao excluir XML");
    }
  }

  const filtrados = useMemo(() => {
    const termo = norm(busca);

    return items.filter((item) => {
      const dataBR = formatDateBR(item.data_vencimento);
      const criadoBR = formatDateBR(item.criado_em);
      const valorTxt = valueSearch(item.valor_documento);

      const texto = norm(`
        ${item.nome_arquivo || ""}
        ${item.numero_documento || ""}
        ${item.nosso_numero || ""}
        ${item.cedente || ""}
        ${item.sacado || ""}
        ${item.data_vencimento || ""}
        ${dataBR || ""}
        ${item.criado_em || ""}
        ${criadoBR || ""}
        ${valorTxt || ""}
      `);

      return !termo || texto.includes(termo);
    });
  }, [items, busca]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PER_PAGE));

  const paginados = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtrados.slice(start, start + PER_PAGE);
  }, [filtrados, page]);

  useEffect(() => {
    setPage(1);
  }, [busca]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="panel">
      <style>{`
        .xml-wrap{display:grid;gap:14px}
        .xml-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px}
        .xml-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
        .xml-input{width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#131528;color:#fff;outline:none;box-sizing:border-box}
        .xml-table-wrap{overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:14px}
        .xml-table{width:100%;border-collapse:collapse;min-width:1250px}
        .xml-table th{font-size:12px;text-align:left;padding:12px;background:rgba(255,255,255,.05);white-space:nowrap}
        .xml-table td{padding:12px;border-top:1px solid rgba(255,255,255,.07);vertical-align:top}
        .xml-actions{display:flex;gap:8px;flex-wrap:wrap}
        .xml-mini{padding:8px 12px;border-radius:10px;border:none;cursor:pointer;font-weight:800}
        .xml-down{background:#4f46e5;color:#fff}
        .xml-del{background:#2a0f16;color:#ffb4b4;border:1px solid rgba(255,80,80,.35)}
        .xml-err{background:#3a1212;border:1px solid #7a2a2a;color:#ffd5d5;border-radius:10px;padding:10px}
        .xml-ok{background:#11351e;border:1px solid #24663b;color:#d7ffe1;border-radius:10px;padding:10px}
        .xml-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
      `}</style>

      <div className="panel-head">
        <h2>XMLs</h2>
        <span className="badge">{filtrados.length} registro(s)</span>
      </div>

      <div className="xml-wrap">
        <div className="xml-card">
          <div className="xml-top">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                ref={inputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={onPickFile}
                disabled={sending}
                style={{ display: "none" }}
              />

              <button
                className="btn-primary"
                onClick={() => inputRef.current?.click()}
                disabled={sending}
                type="button"
              >
                {sending ? "Enviando..." : "Enviar XML"}
              </button>

              <button
                className="btn-secondary"
                onClick={carregar}
                disabled={loading}
                type="button"
              >
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>

            <div style={{ minWidth: 280, flex: 1, maxWidth: 420 }}>
              <input
                className="xml-input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar XML, data, valor..."
              />
            </div>
          </div>
        </div>

        {erro ? <div className="xml-err">{erro}</div> : null}
        {msg ? <div className="xml-ok">{msg}</div> : null}

        <div className="xml-table-wrap">
          <table className="xml-table">
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Documento</th>
                <th>Nosso número</th>
                <th>Cedente</th>
                <th>Sacado</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Enviado em</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 20 }}>
                    Carregando...
                  </td>
                </tr>
              ) : paginados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 20 }}>
                    Nenhum XML encontrado
                  </td>
                </tr>
              ) : (
                paginados.map((x) => (
                  <tr key={x.id}>
                    <td style={{ maxWidth: 260, wordBreak: "break-word" }}>
                      {x.nome_arquivo || "—"}
                    </td>
                    <td>{x.numero_documento || "—"}</td>
                    <td>{x.nosso_numero || "—"}</td>
                    <td style={{ maxWidth: 240, wordBreak: "break-word" }}>
                      {x.cedente || "—"}
                    </td>
                    <td style={{ maxWidth: 220, wordBreak: "break-word" }}>
                      {x.sacado || "—"}
                    </td>
                    <td>{x.valor_documento == null ? "—" : money(x.valor_documento)}</td>
                    <td>{formatDateBR(x.data_vencimento)}</td>
                    <td>{formatDateBR(x.criado_em)}</td>
                    <td>
                      <div className="xml-actions">
                        <button
                          type="button"
                          className="xml-mini xml-down"
                          onClick={() => baixar(x.id, x.nome_arquivo)}
                        >
                          Baixar
                        </button>

                        <button
                          type="button"
                          className="xml-mini xml-del"
                          onClick={() => excluir(x.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="xml-card xml-pager">
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Anterior
          </button>

          <div>
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}