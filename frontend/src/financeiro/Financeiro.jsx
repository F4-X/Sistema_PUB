import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { TopbarFinanceiro } from "../components.jsx";
import XMLs from "./XMLs.jsx";
import ContasPagar from "./ContasPagar.jsx";
import ContasPagas from "./ContasPagas.jsx";
import Fechamento from "./Fechamento.jsx";

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
    por_pagamento: { dinheiro: "0.00", pix: "0.00", debito: "0.00", credito: "0.00" },
  });

  const [porCaixa, setPorCaixa] = useState([]);
  const [porCategoria, setPorCategoria] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);

  const CAIXA_NUMERO = 1;
  const [fechMsg, setFechMsg] = useState(null);

  const compactPanel = {
    padding: 12,
  };

  const compactTitle = {
    margin: 0,
    fontSize: 18,
  };

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
          debito: porPg.debito ?? "0.00",
          credito: porPg.credito ?? "0.00",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams, page]);

  const totalGeral = useMemo(
    () => Number(resumo?.faturamento || 0).toFixed(2),
    [resumo]
  );

  const caixa1 = porCaixa.find((x) => x.caixa_numero === 1);

  const pg = resumo?.por_pagamento || {};
  const dinheiro = Number(pg.dinheiro || 0).toFixed(2);
  const pix = Number(pg.pix || 0).toFixed(2);
  const debito = Number(pg.debito || 0).toFixed(2);
  const credito = Number(pg.credito || 0).toFixed(2);

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

  function baixarBlob(response, type, fallbackName) {
    const blob = new Blob([response.data], { type });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackName;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  }

  async function exportarVendas() {
    try {
      const response = await api.get(`/financeiro/exportar-vendas?${queryParams}`, {
        responseType: "blob",
      });

      const hoje = new Date().toISOString().slice(0, 10);
      const nome =
        modo === "periodo"
          ? `vendas_sintetico_${inicio}_a_${fim}.csv`
          : `vendas_sintetico_${data || hoje}.csv`;

      baixarBlob(response, "text/csv;charset=utf-8;", nome);
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao exportar CSV");
    }
  }

  async function exportarPDF() {
    try {
      const response = await api.get(`/financeiro/exportar-vendas-pdf?${queryParams}`, {
        responseType: "blob",
      });

      const hoje = new Date().toISOString().slice(0, 10);
      const nome =
        modo === "periodo"
          ? `vendas_sintetico_${inicio}_a_${fim}.pdf`
          : `vendas_sintetico_${data || hoje}.pdf`;

      baixarBlob(response, "application/pdf", nome);
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao exportar PDF");
    }
  }

  function TopbarPadrao() {
    return (
      <TopbarFinanceiro
        page={page}
        setPage={setPage}
        onBack={() => setTela("menu")}
        onLogout={() => {
          localStorage.removeItem("token");
          location.reload();
        }}
      />
    );
  }

  if (page === "xmls") {
    return (
      <>
        <TopbarPadrao />
        <main className="fin-wrap" style={{ gap: 10, paddingTop: 10 }}>
          <XMLs />
        </main>
      </>
    );
  }

  if (page === "contas-pagar") {
    return (
      <>
        <TopbarPadrao />
        <main className="fin-wrap" style={{ gap: 10, paddingTop: 10 }}>
          <ContasPagar />
        </main>
      </>
    );
  }

  if (page === "contas-pagas") {
    return (
      <>
        <TopbarPadrao />
        <main className="fin-wrap" style={{ gap: 10, paddingTop: 10 }}>
          <ContasPagas />
        </main>
      </>
    );
  }

  if (page === "fechamentos") {
    return (
      <>
        <TopbarPadrao />
        <main className="fin-wrap" style={{ gap: 10, paddingTop: 10 }}>
          <Fechamento />
        </main>
      </>
    );
  }

  return (
    <>
      <TopbarPadrao />

      <main
        className="fin-wrap"
        style={{
          gap: 10,
          paddingTop: 10,
          alignItems: "start",
        }}
      >
        <section className="panel" style={compactPanel}>
          <div
            className="fin-header"
            style={{
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div>
              <h2 style={compactTitle}>Financeiro</h2>
              <div className="fin-subtitle" style={{ fontSize: 12 }}>
                Filtro por dia ou período • fechamento de caixa
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className={modo === "dia" ? "btn-primary" : "btn-secondary"}
                onClick={() => setModo("dia")}
                disabled={loading}
                style={{ padding: "8px 12px" }}
              >
                Dia
              </button>

              <button
                className={modo === "periodo" ? "btn-primary" : "btn-secondary"}
                onClick={() => setModo("periodo")}
                disabled={loading}
                style={{ padding: "8px 12px" }}
              >
                Período
              </button>

              <button
                className="btn-primary"
                onClick={exportarVendas}
                disabled={loading}
                style={{ padding: "8px 12px" }}
              >
                Exportar CSV
              </button>

              <button
                className="btn-secondary"
                onClick={exportarPDF}
                disabled={loading}
                style={{ padding: "8px 12px" }}
              >
                Exportar PDF
              </button>
            </div>
          </div>

          {modo === "dia" ? (
            <div
              className="fin-date"
              style={{
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div className="fin-datebox" style={{ padding: "8px 10px" }}>
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
                style={{ padding: "8px 12px" }}
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
                style={{ padding: "8px 12px" }}
              >
                Ontem
              </button>

              <button
                className="btn-primary"
                onClick={carregar}
                disabled={loading}
                style={{ padding: "8px 12px" }}
              >
                {loading ? "Carregando..." : "Atualizar"}
              </button>
            </div>
          ) : (
            <div
              className="fin-date"
              style={{
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div className="fin-datebox" style={{ padding: "8px 10px" }}>
                <span className="tag">Início</span>
                <input
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </div>

              <div className="fin-datebox" style={{ padding: "8px 10px" }}>
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
                style={{ padding: "8px 12px" }}
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
                style={{ padding: "8px 12px" }}
              >
                30 dias
              </button>

              <button
                className="btn-primary"
                onClick={carregar}
                disabled={loading}
                style={{ padding: "8px 12px" }}
              >
                {loading ? "Carregando..." : "Atualizar"}
              </button>
            </div>
          )}

          <div
            className="fin-kpis"
            style={{
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                Faturamento
              </div>
              <div className="fin-v" style={{ fontSize: 22 }}>
                R$ {totalGeral}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                Total do período
              </div>
            </div>

            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                Vendas
              </div>
              <div className="fin-v" style={{ fontSize: 22 }}>
                {resumo?.qtd_vendas || 0}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                Quantidade
              </div>
            </div>

            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                Ticket médio
              </div>
              <div className="fin-v" style={{ fontSize: 22 }}>
                R$ {Number(resumo?.ticket_medio || 0).toFixed(2)}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                Média por venda
              </div>
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 6, marginBottom: 6 }}>
            <h2 style={{ fontSize: 16 }}>Por Pagamento</h2>
            <span className="badge">Dinheiro / Pix / Débito / Crédito</span>
          </div>

          <div
            className="fin-kpis fin-kpis-3"
            style={{
              gap: 8,
              marginBottom: 8,
              gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
            }}
          >
            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                💵 Dinheiro
              </div>
              <div className="fin-v" style={{ fontSize: 20 }}>
                R$ {dinheiro}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                Total no período
              </div>
            </div>

            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                📱 Pix
              </div>
              <div className="fin-v" style={{ fontSize: 20 }}>
                R$ {pix}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                Total no período
              </div>
            </div>

            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                💳 Débito
              </div>
              <div className="fin-v" style={{ fontSize: 20 }}>
                R$ {debito}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                Total no período
              </div>
            </div>

            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                💳 Crédito
              </div>
              <div className="fin-v" style={{ fontSize: 20 }}>
                R$ {credito}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                Total no período
              </div>
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 6, marginBottom: 6 }}>
            <h2 style={{ fontSize: 16 }}>Por Caixa</h2>
            <span className="badge">Caixa 1</span>
          </div>

          <div
            className="fin-kpis fin-kpis-1"
            style={{
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              className={`fin-kpi ${loading ? "fin-dim" : ""}`}
              style={{ padding: 12 }}
            >
              <div className="fin-k" style={{ fontSize: 12 }}>
                Caixa 1
              </div>
              <div className="fin-v" style={{ fontSize: 20 }}>
                R$ {Number(caixa1?.faturamento || 0).toFixed(2)}
              </div>
              <div className="fin-s" style={{ fontSize: 11 }}>
                {caixa1?.qtd_vendas || 0} venda(s)
              </div>
            </div>
          </div>

          <div className="panel-head" style={{ marginTop: 6, marginBottom: 6 }}>
            <h2 style={{ fontSize: 16 }}>Por Categoria</h2>
            <span className="badge">Resumo</span>
          </div>

          <div className="fin-list" style={{ gap: 6 }}>
            {!porCategoria || porCategoria.length === 0 ? (
              <div className="empty fin-empty" style={{ padding: 12 }}>
                <div className="empty-title">Sem vendas nesse filtro</div>
                <div className="empty-sub">
                  Finalize uma venda no PDV para aparecer aqui.
                </div>
              </div>
            ) : (
              [...porCategoria]
                .sort((a, b) => Number(b.faturamento) - Number(a.faturamento))
                .map((c, idx) => (
                  <div key={idx} className="fin-row" style={{ padding: "8px 10px" }}>
                    <div className="fin-left">
                      <div className="fin-name" style={{ fontSize: 13 }}>
                        {c.categoria || "Sem categoria"}
                      </div>
                      <div className="fin-sub" style={{ fontSize: 11 }}>
                        {Number(c.itens || 0)} item(ns)
                      </div>
                    </div>

                    <div className="fin-right" style={{ fontSize: 13 }}>
                      R$ {Number(c.faturamento || 0).toFixed(2)}
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>

        <aside
          className="fin-side"
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div className="panel" style={compactPanel}>
            <div className="panel-head" style={{ marginBottom: 6 }}>
              <h2 style={{ fontSize: 16 }}>Top Produtos</h2>
              <span className="badge">10</span>
            </div>

            <div className="fin-list" style={{ gap: 6 }}>
              {topProdutos.length === 0 ? (
                <div className="empty fin-empty" style={{ padding: 12 }}>
                  <div className="empty-title">Sem vendas</div>
                  <div className="empty-sub">
                    Quando vender, o ranking aparece aqui.
                  </div>
                </div>
              ) : (
                topProdutos.map((p, idx) => (
                  <div key={idx} className="fin-row" style={{ padding: "8px 10px" }}>
                    <div className="fin-left">
                      <div className="fin-name" style={{ fontSize: 13 }}>
                        {p.nome}
                      </div>
                      <div className="fin-sub" style={{ fontSize: 11 }}>
                        {p.qtd} un
                      </div>
                    </div>

                    <div className="fin-right" style={{ fontSize: 13 }}>
                      R$ {Number(p.faturamento).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel" style={compactPanel}>
            <div className="panel-head" style={{ marginBottom: 8 }}>
              <h2 style={{ fontSize: 16 }}>Fechamento</h2>
              <span className="badge">Salvar</span>
            </div>

            <div className="fin-close" style={{ gap: 8 }}>
              <div
                className="badge"
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                }}
              >
                Caixa 1
              </div>

              <button
                className="btn-primary"
                onClick={fecharCaixa}
                disabled={loading}
                style={{ padding: "8px 12px" }}
              >
                {loading ? "Fechando..." : "Fechar Caixa"}
              </button>
            </div>

            {fechMsg && (
              <div className="fin-close-msg" style={{ marginTop: 8, fontSize: 12 }}>
                {fechMsg}
              </div>
            )}
          </div>
        </aside>
      </main>
    </>
  );
}