import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const money = (n) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function badgeFromStatus(st) {
  const s = String(st || "").toUpperCase();
  if (!s || s === "—") return { text: "SEM NFC-e", cls: "badge" };
  if (s.includes("AUT") || s.includes("APROV") || s.includes("EMIT"))
    return { text: s, cls: "badge badge-ok" };
  if (s.includes("REJ") || s.includes("ERRO") || s.includes("DEN"))
    return { text: s, cls: "badge badge-err" };
  if (s.includes("PEND")) return { text: "PENDENTE", cls: "badge badge-warn" };
  return { text: s, cls: "badge" };
}

function toBR(d) {
  try {
    return new Date(d).toLocaleString("pt-BR");
  } catch {
    return String(d || "");
  }
}

function safeErr(e, fallback = "Erro") {
  const d = e?.response?.data;
  return (
    d?.error ||
    d?.message ||
    (typeof d === "string" ? d : "") ||
    e?.message ||
    fallback
  );
}

export default function Historico({
  onPrintReceipt,
  onEmitFiscal,
  onPrintFiscal,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const pageSize = 6;
  const [page, setPage] = useState(1);
  const [emittingId, setEmittingId] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/vendas");
      setRows(Array.isArray(r.data) ? r.data : []);
      setPage(1);
    } catch (e) {
      setErr(e?.response?.data?.error || "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((v) => {
      const id = String(v.id ?? "");
      const st = String(v.nfce_status ?? "").toLowerCase();
      const num = String(v.nfce_numero ?? "");
      const total = String(v.total ?? "").toLowerCase();
      return (
        id.includes(s) ||
        st.includes(s) ||
        num.includes(s) ||
        total.includes(s)
      );
    });
  }, [rows, q]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length]
  );

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const totalLista = useMemo(
    () => filtered.reduce((acc, v) => acc + Number(v.total || 0), 0),
    [filtered]
  );

  const qtdVendas = filtered.length;

  function patchVenda(id, patch) {
    setRows((prev) =>
      prev.map((v) => (String(v.id) === String(id) ? { ...v, ...patch } : v))
    );
  }

  async function handleEmit(id) {
    setErr("");
    setEmittingId(id);
    patchVenda(id, { nfce_status: "EMITINDO" });

    try {
      let data;

      if (typeof onEmitFiscal === "function") {
        data = await onEmitFiscal(id);
      } else {
        const r = await api.post(`/vendas/${id}/fiscal/emitir`);
        data = r.data;
      }

      const status = data?.status ?? data?.nfce_status ?? "EMITIDO";
      const patch = {
        nfce_status: status,
      };

      if (data?.nfce_numero != null) patch.nfce_numero = data.nfce_numero;
      if (data?.nfce_id != null) patch.nfce_id = data.nfce_id;
      if (data?.chave != null) patch.nfce_chave = data.chave;

      patchVenda(id, patch);
    } catch (e) {
      patchVenda(id, { nfce_status: "ERRO" });
      setErr(safeErr(e, "Erro ao emitir NFC-e"));
    } finally {
      setEmittingId(null);
    }
  }

  return (
    <div className="pdv-page">
      <style>{`
        .hist-wrap{
          width:min(1700px,96vw);
          margin:18px auto 26px;
          display:grid;
          gap:18px;
        }

        .hist-hero{
          display:grid;
          grid-template-columns:1.2fr .8fr .8fr;
          gap:12px;
        }

        .hist-kpi{
          border:1px solid rgba(255,255,255,.08);
          background:linear-gradient(180deg,rgba(20,20,28,.88),rgba(10,10,16,.72));
          border-radius:18px;
          padding:16px;
          box-shadow:0 14px 35px rgba(0,0,0,.35);
        }

        .hist-kpi-main{
          position:relative;
          overflow:hidden;
        }

        .hist-kpi-main:before{
          content:"";
          position:absolute;
          inset:-40% auto auto -10%;
          width:220px;
          height:220px;
          background:radial-gradient(circle,rgba(123,108,255,.22),transparent 65%);
          pointer-events:none;
        }

        .hist-kpi-label{
          font-size:12px;
          font-weight:900;
          color:var(--muted);
          letter-spacing:.2px;
        }

        .hist-kpi-value{
          margin-top:8px;
          font-size:28px;
          font-weight:900;
          color:#fff;
        }

        .hist-kpi-sub{
          margin-top:6px;
          font-size:13px;
          color:var(--muted);
        }

        .hist-panel{
          border:1px solid rgba(255,255,255,.08);
          background:linear-gradient(180deg,rgba(18,18,26,.82),rgba(10,10,16,.70));
          border-radius:22px;
          padding:16px;
          box-shadow:0 18px 45px rgba(0,0,0,.40);
        }

        .hist-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:14px;
          margin-bottom:14px;
          flex-wrap:wrap;
        }

        .hist-title{
          margin:0;
          font-size:30px;
          font-weight:900;
        }

        .hist-sub{
          margin-top:6px;
          color:var(--muted);
          font-size:13px;
        }

        .hist-tools{
          display:flex;
          gap:10px;
          align-items:center;
          flex-wrap:wrap;
          justify-content:flex-end;
        }

        .hist-search{
          min-width:290px;
          flex:1;
          max-width:360px;
        }

        .hist-search input{
          width:100%;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(10,10,16,.55);
          color:#fff;
          outline:none;
        }

        .hist-search input:focus{
          border-color:rgba(123,108,255,.65);
          box-shadow:0 0 0 4px rgba(123,108,255,.16);
        }

        .hist-grid{
          display:grid;
          gap:12px;
        }

        .hist-row{
          display:grid;
          grid-template-columns:90px 170px 170px 130px 220px 1fr;
          gap:12px;
          align-items:center;
          padding:14px 16px;
          border-radius:18px;
          border:1px solid rgba(255,255,255,.08);
          background:linear-gradient(180deg,rgba(16,16,24,.85),rgba(11,11,17,.82));
          transition:.18s ease;
        }

        .hist-row:hover{
          transform:translateY(-1px);
          border-color:rgba(123,108,255,.32);
          box-shadow:0 12px 30px rgba(0,0,0,.28);
        }

        .hist-head-row{
          background:rgba(255,255,255,.03);
          border-style:dashed;
          font-weight:900;
          color:rgba(255,255,255,.92);
        }

        .hist-col{
          min-width:0;
        }

        .hist-id{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:62px;
          padding:8px 10px;
          border-radius:999px;
          background:rgba(123,108,255,.10);
          border:1px solid rgba(123,108,255,.24);
          font-weight:900;
        }

        .hist-total{
          font-size:16px;
          font-weight:900;
          color:#fff;
        }

        .hist-date{
          color:rgba(255,255,255,.88);
          font-size:13px;
        }

        .hist-actions{
          display:flex;
          gap:8px;
          justify-content:flex-end;
          flex-wrap:wrap;
        }

        .hist-empty{
          padding:24px;
          border-radius:18px;
          border:1px dashed rgba(255,255,255,.12);
          background:rgba(12,12,18,.45);
          display:grid;
          gap:8px;
        }

        .hist-empty-title{
          font-size:24px;
          font-weight:900;
          color:#fff;
        }

        .hist-empty-sub{
          color:var(--muted);
          font-size:14px;
        }

        .hist-empty-icon{
          width:58px;
          height:58px;
          border-radius:16px;
          display:grid;
          place-items:center;
          font-size:28px;
          background:linear-gradient(135deg,rgba(123,108,255,.18),rgba(75,43,191,.12));
          border:1px solid rgba(123,108,255,.24);
          margin-bottom:2px;
        }

        .hist-footer{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          margin-top:14px;
          flex-wrap:wrap;
        }

        .hist-footer-left{
          color:var(--muted);
          font-size:13px;
        }

        .hist-pager{
          display:flex;
          gap:10px;
          align-items:center;
          flex-wrap:wrap;
        }

        .hist-err{
          border:1px solid rgba(255,77,77,.35);
          background:rgba(90,18,18,.35);
          color:#ffd7d7;
          border-radius:14px;
          padding:12px 14px;
          font-weight:700;
        }

        .hist-mono{
          font-variant-numeric:tabular-nums;
        }

        @media (max-width: 1200px){
          .hist-hero{
            grid-template-columns:1fr;
          }

          .hist-row{
            grid-template-columns:1fr 1fr;
            align-items:start;
          }

          .hist-head-row{
            display:none;
          }

          .hist-row .hist-col{
            display:grid;
            gap:4px;
          }

          .hist-row .hist-col:before{
            content:attr(data-label);
            font-size:11px;
            color:var(--muted);
            font-weight:800;
            text-transform:uppercase;
            letter-spacing:.3px;
          }

          .hist-actions{
            justify-content:flex-start;
          }

          .hist-actions-wrap{
            grid-column:1 / -1;
          }
        }

        @media (max-width: 700px){
          .hist-panel{
            padding:14px;
          }

          .hist-title{
            font-size:24px;
          }

          .hist-search{
            min-width:100%;
            max-width:none;
          }

          .hist-row{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <main className="hist-wrap">
        <section className="hist-hero">
          <div className="hist-kpi hist-kpi-main">
            <div className="hist-kpi-label">Resumo do histórico</div>
            <div className="hist-kpi-value">{money(totalLista)}</div>
            <div className="hist-kpi-sub">
              Soma total das vendas encontradas pela pesquisa atual.
            </div>
          </div>

          <div className="hist-kpi">
            <div className="hist-kpi-label">Vendas encontradas</div>
            <div className="hist-kpi-value">{qtdVendas}</div>
            <div className="hist-kpi-sub">
              Quantidade de registros listados.
            </div>
          </div>

          <div className="hist-kpi">
            <div className="hist-kpi-label">Página atual</div>
            <div className="hist-kpi-value">
              {page}/{totalPages}
            </div>
            <div className="hist-kpi-sub">
              Navegação do histórico paginado.
            </div>
          </div>
        </section>

        <section className="hist-panel">
          <div className="hist-head">
            <div>
              <h2 className="hist-title">Histórico</h2>
              <div className="hist-sub">
                Consulte vendas, confira o status da NFC-e e imprima recibos ou documentos fiscais.
              </div>
            </div>

            <div className="hist-tools">
              <div className="hist-search">
                <input
                  placeholder="Buscar por ID, status, número ou valor..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <span className="badge">Total: {money(totalLista)}</span>

              <button className="btn-mini" onClick={load} disabled={loading}>
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          </div>

          {err ? <div className="hist-err">{err}</div> : null}

          <div className="hist-grid">
            {!loading && filtered.length > 0 && (
              <div className="hist-row hist-head-row">
                <div className="hist-col">Venda</div>
                <div className="hist-col">Total</div>
                <div className="hist-col">NFC-e</div>
                <div className="hist-col">Número</div>
                <div className="hist-col">Data</div>
                <div className="hist-col" style={{ textAlign: "right" }}>
                  Ações
                </div>
              </div>
            )}

            {loading ? (
              <div className="hist-empty">
                <div className="hist-empty-icon">⏳</div>
                <div className="hist-empty-title">Carregando histórico...</div>
                <div className="hist-empty-sub">
                  Buscando as vendas do PDV para montar a lista.
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="hist-empty">
                <div className="hist-empty-icon">🧾</div>
                <div className="hist-empty-title">Sem vendas</div>
                <div className="hist-empty-sub">
                  Faça uma venda no PDV para ela aparecer aqui com recibo e NFC-e.
                </div>
              </div>
            ) : (
              paged.map((v) => {
                const b = badgeFromStatus(v.nfce_status);
                const isEmitting = emittingId === v.id;

                return (
                  <div className="hist-row" key={v.id}>
                    <div className="hist-col" data-label="Venda">
                      <span className="hist-id">#{v.id}</span>
                    </div>

                    <div className="hist-col" data-label="Total">
                      <div className="hist-total hist-mono">{money(v.total)}</div>
                    </div>

                    <div className="hist-col" data-label="NFC-e">
                      <span className={b.cls}>{b.text}</span>
                    </div>

                    <div className="hist-col hist-mono" data-label="Número">
                      {v.nfce_numero ?? "—"}
                    </div>

                    <div className="hist-col hist-date hist-mono" data-label="Data">
                      {toBR(v.criado_em)}
                    </div>

                    <div
                      className="hist-col hist-actions-wrap"
                      data-label="Ações"
                    >
                      <div className="hist-actions">
                        <button
                          className="btn-mini"
                          onClick={() =>
                            typeof onPrintReceipt === "function"
                              ? onPrintReceipt(v.id)
                              : null
                          }
                          title="Imprimir recibo"
                        >
                          Recibo
                        </button>

                        <button
                          className="btn-mini"
                          onClick={() => handleEmit(v.id)}
                          disabled={isEmitting}
                          title="Emitir NFC-e"
                        >
                          {isEmitting ? "Emitindo..." : "Emitir"}
                        </button>

                        <button
                          className="btn-mini"
                          onClick={() =>
                            typeof onPrintFiscal === "function"
                              ? onPrintFiscal(v.id)
                              : window.open(`/vendas/${v.id}/fiscal/pdf`, "_blank")
                          }
                          title="Imprimir NFC-e (PDF)"
                        >
                          NFC-e
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filtered.length > pageSize && (
            <div className="hist-footer">
              <div className="hist-footer-left">
                Mostrando <b>{paged.length}</b> item(ns) nesta página, de um total de{" "}
                <b>{filtered.length}</b>.
              </div>

              <div className="hist-pager">
                <button
                  className="btn-mini"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ← Anterior
                </button>

                <span className="badge">
                  Página {page} de {totalPages}
                </span>

                <button
                  className="btn-mini"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}