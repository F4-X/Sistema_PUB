import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { TopbarFinanceiro } from "../components.jsx";
import XMLs from "./XMLs.jsx";
import ContasPagar from "./ContasPagar.jsx";
import ContasPagas from "./ContasPagas.jsx";

const isoDate = (d) => d.toISOString().slice(0, 10);
const startOfDay = (dateStr) => `${dateStr}T00:00:00`;
const nextDayStart = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${isoDate(d)}T00:00:00`;
};

export default function Financeiro({ setTela }) {
  const [page, setPage] = useState("financeiro");

  const [modo, setModo] = useState("dia");
  const [data, setData] = useState(isoDate(new Date()));
  const [inicio, setInicio] = useState(isoDate(new Date()));
  const [fim, setFim] = useState(isoDate(new Date()));

  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState({
    faturamento: "0.00",
    qtd_vendas: 0,
    ticket_medio: "0.00",
    por_pagamento: { dinheiro: "0.00", pix: "0.00", cartao: "0.00" },
  });

  const [porCaixa, setPorCaixa] = useState([]);
  const [porCategoria, setPorCategoria] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);

  const CAIXA_NUMERO = 1;
  const [fechMsg, setFechMsg] = useState(null);

  const queryParams = useMemo(() => {
    if (modo === "periodo") {
      const i = startOfDay(inicio);
      const f = nextDayStart(fim);
      return `inicio=${encodeURIComponent(i)}&fim=${encodeURIComponent(f)}`;
    }
    return `data=${encodeURIComponent(data)}`;
  }, [modo, data, inicio, fim]);

  async function carregar() {
    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        api.get(`/financeiro/resumo?${queryParams}`),
        api.get(`/financeiro/por-caixa?${queryParams}`),
        api.get(`/financeiro/por-categoria?${queryParams}`),
        api.get(`/financeiro/top-produtos?${queryParams}&limit=10`),
      ]);

      const rp = r1.data || {};
      const porPg = rp.por_pagamento || {};

      setResumo({
        faturamento: rp.faturamento ?? "0.00",
        qtd_vendas: rp.qtd_vendas ?? 0,
        ticket_medio: rp.ticket_medio ?? "0.00",
        por_pagamento: {
          dinheiro: porPg.dinheiro ?? "0.00",
          pix: porPg.pix ?? "0.00",
          cartao: porPg.cartao ?? "0.00",
        },
      });

      setPorCaixa(r2.data || []);
      setPorCategoria(r3.data || []);
      setTopProdutos(r4.data || []);
    } catch (e) {
      console.log("ERRO Financeiro carregar:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (page !== "financeiro") return;
    carregar();
  }, [queryParams, page]);

  const totalGeral = useMemo(
    () => Number(resumo?.faturamento || 0).toFixed(2),
    [resumo]
  );

  const caixa1 = porCaixa.find((x) => x.caixa_numero === 1);

  const pg = resumo?.por_pagamento || {};
  const dinheiro = Number(pg.dinheiro || 0).toFixed(2);
  const pix = Number(pg.pix || 0).toFixed(2);
  const cartao = Number(pg.cartao || 0).toFixed(2);

  async function fecharCaixa() {
    setFechMsg(null);
    setLoading(true);
    try {
      const i = modo === "periodo" ? startOfDay(inicio) : startOfDay(data);
      const f = modo === "periodo" ? nextDayStart(fim) : nextDayStart(data);

      const { data: resp } = await api.post("/fechamentos", {
        caixa_numero: CAIXA_NUMERO,
        inicio: i,
        fim: f,
      });

      setFechMsg(
        `Fechado! Caixa ${resp.caixa_numero} • R$ ${Number(
          resp.faturamento
        ).toFixed(2)} • ${resp.qtd_vendas} venda(s)`
      );
    } catch (e) {
      setFechMsg(e?.response?.data?.error || "Erro ao fechar caixa");
    } finally {
      setLoading(false);
    }
  }

  if (page === "xmls") {
    return (
      <>
        <TopbarFinanceiro
          page={page}
          setPage={setPage}
          onBack={() => setTela("menu")}
          onLogout={() => {
            localStorage.removeItem("token");
            location.reload();
          }}
        />
        <main className="fin-wrap">
          <XMLs />
        </main>
      </>
    );
  }

  if (page === "contas-pagar") {
    return (
      <>
        <TopbarFinanceiro
          page={page}
          setPage={setPage}
          onBack={() => setTela("menu")}
          onLogout={() => {
            localStorage.removeItem("token");
            location.reload();
          }}
        />
        <main className="fin-wrap">
          <ContasPagar />
        </main>
      </>
    );
  }

  if (page === "contas-pagas") {
    return (
      <>
        <TopbarFinanceiro
          page={page}
          setPage={setPage}
          onBack={() => setTela("menu")}
          onLogout={() => {
            localStorage.removeItem("token");
            location.reload();
          }}
        />
        <main className="fin-wrap">
          <ContasPagas />
        </main>
      </>
    );
  }

  return (
    <>
      <TopbarFinanceiro
        page={page}
        setPage={setPage}
        onBack={() => setTela("menu")}
        onLogout={() => {
          localStorage.removeItem("token");
          location.reload();
        }}
      />

      <main className="fin-wrap">
        <section className="panel">
          <div className="fin-header">
            <div>
              <h2 style={{ margin: 0 }}>Financeiro</h2>
              <div className="fin-subtitle">
                Filtro por dia ou período • fechamento de caixa
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className={modo === "dia" ? "btn-primary" : "btn-secondary"}
                onClick={() => setModo("dia")}
                disabled={loading}
              >
                Dia
              </button>

              <button
                className={modo === "periodo" ? "btn-primary" : "btn-secondary"}
                onClick={() => setModo("periodo")}
                disabled={loading}
              >
                Período
              </button>
            </div>
          </div>

          {modo === "dia" ? (
            <div className="fin-date">
              <div className="fin-datebox">
                <span className="tag">Data</span>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <button
                className="btn-secondary"
                onClick={() => setData(isoDate(new Date()))}
                disabled={loading}
              >
                Hoje
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setData(isoDate(d));
                }}
                disabled={loading}
              >
                Ontem
              </button>

              <button
                className="btn-primary"
                onClick={carregar}
                disabled={loading}
              >
                {loading ? "Carregando..." : "Atualizar"}
              </button>
            </div>
          ) : (
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

              <button
                className="btn-secondary"
                onClick={() => {
                  const d = new Date();
                  const end = isoDate(d);
                  d.setDate(d.getDate() - 6);
                  setInicio(isoDate(d));
                  setFim(end);
                }}
                disabled={loading}
              >
                7 dias
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  const d = new Date();
                  const end = isoDate(d);
                  d.setDate(d.getDate() - 29);
                  setInicio(isoDate(d));
                  setFim(end);
                }}
                disabled={loading}
              >
                30 dias
              </button>

              <button
                className="btn-primary"
                onClick={carregar}
                disabled={loading}
              >
                {loading ? "Carregando..." : "Atualizar"}
              </button>
            </div>
          )}

          <div className="fin-kpis">
            <div className={`fin-kpi ${loading ? "fin-dim" : ""}`}>
              <div className="fin-k">Faturamento</div>
              <div className="fin-v">R$ {totalGeral}</div>
              <div className="fin-s">Total do período</div>
            </div>

            <div className={`fin-kpi ${loading ? "fin-dim" : ""}`}>
              <div className="fin-k">Vendas</div>
              <div className="fin-v">{resumo?.qtd_vendas || 0}</div>
              <div className="fin-s">Quantidade</div>
            </div>

            <div className={`fin-kpi ${loading ? "fin-dim" : ""}`}>
              <div className="fin-k">Ticket médio</div>
              <div className="fin-v">
                R$ {Number(resumo?.ticket_medio || 0).toFixed(2)}
              </div>
              <div className="fin-s">Média por venda</div>
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 10 }}>
            <h2>Por Pagamento</h2>
            <span className="badge">Dinheiro / Pix / Cartão</span>
          </div>

          <div className="fin-kpis fin-kpis-3">
            <div className={`fin-kpi ${loading ? "fin-dim" : ""}`}>
              <div className="fin-k">💵 Dinheiro</div>
              <div className="fin-v">R$ {dinheiro}</div>
              <div className="fin-s">Total no período</div>
            </div>

            <div className={`fin-kpi ${loading ? "fin-dim" : ""}`}>
              <div className="fin-k">📱 Pix</div>
              <div className="fin-v">R$ {pix}</div>
              <div className="fin-s">Total no período</div>
            </div>

            <div className={`fin-kpi ${loading ? "fin-dim" : ""}`}>
              <div className="fin-k">💳 Cartão</div>
              <div className="fin-v">R$ {cartao}</div>
              <div className="fin-s">Total no período</div>
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 8 }}>
            <h2>Por Caixa</h2>
            <span className="badge">Caixa 1</span>
          </div>

          <div className="fin-kpis fin-kpis-1">
            <div className={`fin-kpi ${loading ? "fin-dim" : ""}`}>
              <div className="fin-k">Caixa 1</div>
              <div className="fin-v">
                R$ {Number(caixa1?.faturamento || 0).toFixed(2)}
              </div>
              <div className="fin-s">{caixa1?.qtd_vendas || 0} venda(s)</div>
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 10 }}>
            <h2>Por Categoria</h2>
            <span className="badge">Resumo</span>
          </div>

          <div className="fin-list">
            {!porCategoria || porCategoria.length === 0 ? (
              <div className="empty fin-empty">
                <div className="empty-title">Sem vendas nesse filtro</div>
                <div className="empty-sub">
                  Finalize uma venda no PDV para aparecer aqui.
                </div>
              </div>
            ) : (
              [...porCategoria]
                .sort((a, b) => Number(b.faturamento) - Number(a.faturamento))
                .map((c, idx) => (
                  <div key={idx} className="fin-row">
                    <div className="fin-left">
                      <div className="fin-name">
                        {c.categoria || "Sem categoria"}
                      </div>
                      <div className="fin-sub">
                        {Number(c.itens || 0)} item(ns)
                      </div>
                    </div>

                    <div className="fin-right">
                      R$ {Number(c.faturamento || 0).toFixed(2)}
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        <aside className="fin-side">
          <div className="panel">
            <div className="panel-head">
              <h2>Top Produtos</h2>
              <span className="badge">10</span>
            </div>

            <div className="fin-list">
              {topProdutos.length === 0 ? (
                <div className="empty fin-empty">
                  <div className="empty-title">Sem vendas</div>
                  <div className="empty-sub">
                    Quando vender, o ranking aparece aqui.
                  </div>
                </div>
              ) : (
                topProdutos.map((p, idx) => (
                  <div key={idx} className="fin-row">
                    <div className="fin-left">
                      <div className="fin-name">{p.nome}</div>
                      <div className="fin-sub">{p.qtd} un</div>
                    </div>
                    <div className="fin-right">
                      R$ {Number(p.faturamento).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Fechamento</h2>
              <span className="badge">Salvar</span>
            </div>

            <div className="fin-close">
              <div
                className="badge"
                style={{ padding: "10px 12px", borderRadius: 14 }}
              >
                Caixa 1
              </div>

              <button
                className="btn-primary"
                onClick={fecharCaixa}
                disabled={loading}
              >
                {loading ? "Fechando..." : "Fechar Caixa"}
              </button>
            </div>

            {fechMsg && <div className="fin-close-msg">{fechMsg}</div>}
          </div>
        </aside>
      </main>
    </>
  );
}