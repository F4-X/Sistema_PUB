import { useEffect, useMemo, useState } from "react";
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

export default function ContasPagas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);

  const PER_PAGE = 6;

  async function carregar() {
    try {
      setLoading(true);
      setErro("");
      const r = await api.get("/financeiro/contas-pagar");
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao carregar contas pagas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = norm(busca);

    return items.filter((item) => {
      const st = String(item.status || "").toLowerCase();
      if (st !== "pago") return false;

      const descricao = item.numero_nf
        ? `XML - NF ${item.numero_nf}`
        : item.fornecedor || "Conta sem descrição";

      const vencBR = formatDateBR(item.vencimento);
      const pagoEmBR = formatDateBR(item.pago_em);
      const valorTxt = valueSearch(item.valor);

      const texto = norm(`
        ${descricao || ""}
        ${item.fornecedor || ""}
        ${item.numero_nf || ""}
        ${item.chave || ""}
        ${item.vencimento || ""}
        ${vencBR || ""}
        ${item.pago_em || ""}
        ${pagoEmBR || ""}
        ${item.valor || ""}
        ${valorTxt || ""}
        ${item.status || ""}
        pago
      `);

      return !termo || texto.includes(termo);
    });
  }, [items, busca]);

  const totalPago = useMemo(() => {
    return filtrados.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }, [filtrados]);

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
        .cpp-wrap{display:grid;gap:14px}
        .cpp-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px}
        .cpp-input{width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#131528;color:#fff;outline:none;box-sizing:border-box}
        .cpp-k{font-size:12px;opacity:.75}
        .cpp-v{font-size:24px;font-weight:800;margin-top:6px}
        .cpp-table-wrap{overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:14px}
        .cpp-table{width:100%;border-collapse:collapse;min-width:1000px}
        .cpp-table th{font-size:12px;text-align:left;padding:12px;background:rgba(255,255,255,.05);white-space:nowrap}
        .cpp-table td{padding:12px;border-top:1px solid rgba(255,255,255,.07);vertical-align:top}
        .cpp-tag{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;background:#11351e;color:#caffd7;border:1px solid #24663b}
        .cpp-err{background:#3a1212;border:1px solid #7a2a2a;color:#ffd5d5;border-radius:10px;padding:10px}
        .cpp-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
      `}</style>

      <div className="panel-head">
        <h2>Contas Pagas</h2>
        <span className="badge">{filtrados.length} registro(s)</span>
      </div>

      <div className="cpp-wrap">
        <div className="cpp-card">
          <div className="cpp-k">Total pago</div>
          <div className="cpp-v">{money(totalPago)}</div>
        </div>

        <div className="cpp-card">
          <input
            className="cpp-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar qualquer campo: fornecedor, NF, chave, data, valor, status..."
          />
        </div>

        {erro ? <div className="cpp-err">{erro}</div> : null}

        <div className="cpp-table-wrap">
          <table className="cpp-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Fornecedor</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Número NF</th>
                <th>Referência</th>
                <th>Pago em</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                    Carregando...
                  </td>
                </tr>
              ) : paginados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                    Nenhuma conta paga encontrada
                  </td>
                </tr>
              ) : (
                paginados.map((c) => {
                  const descricao = c.numero_nf
                    ? `XML - NF ${c.numero_nf}`
                    : c.fornecedor || "Conta sem descrição";

                  return (
                    <tr key={c.id}>
                      <td><strong>{descricao}</strong></td>
                      <td>{c.fornecedor || "—"}</td>
                      <td>{formatDateBR(c.vencimento)}</td>
                      <td>{money(c.valor)}</td>
                      <td><span className="cpp-tag">Pago</span></td>
                      <td>{c.numero_nf || "—"}</td>
                      <td style={{ maxWidth: 220, wordBreak: "break-word" }}>
                        {c.chave || "—"}
                      </td>
                      <td>{formatDateBR(c.pago_em)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="cpp-card cpp-pager">
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