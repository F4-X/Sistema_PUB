import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function Fiscal({ setTela }) {
  const [page, setPage] = useState("tributacao");

  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarProdutos() {
    setLoading(true);
    setErro("");

    try {
      const r = await api.get("/produtos?limit=100&page=1");
      setProdutos(r.data?.items || []);
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao carregar produtos");
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  const produtosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();

    return produtos.filter((p) => {
      const txt = `
        ${p.nome || ""}
        ${p.ncm || ""}
        ${p.cfop || ""}
        ${p.csosn || ""}
        ${p.pis_cst || ""}
        ${p.cofins_cst || ""}
        ${p.unidade || ""}
      `.toLowerCase();

      return !q || txt.includes(q);
    });
  }, [produtos, busca]);

  const produtosComFiscal = useMemo(() => {
    return produtos.filter(
      (p) =>
        p.ncm ||
        p.cfop ||
        p.csosn ||
        p.pis_cst ||
        p.cofins_cst ||
        p.unidade
    ).length;
  }, [produtos]);

  const produtosSemFiscal = Math.max(0, produtos.length - produtosComFiscal);

  return (
    <div className="pdv-page">
      <header className="pdv-topbar">
        <div className="pdv-brand">
          <div className="pdv-title">1005 PUB</div>
          <div className="pdv-sub">Fiscal & Tributário</div>
        </div>

        <div className="pdv-controls">
          <div className="pdv-toggle">
            <button onClick={() => setTela("menu")}>← Menu</button>

            <button
              className={page === "tributacao" ? "active" : ""}
              onClick={() => setPage("tributacao")}
            >
              Tributação
            </button>

            <button
              className={page === "nfce" ? "active" : ""}
              onClick={() => setPage("nfce")}
            >
              NFC-e
            </button>

            <button
              className={page === "empresa" ? "active" : ""}
              onClick={() => setPage("empresa")}
            >
              Empresa
            </button>

            <button
              className={page === "contador" ? "active" : ""}
              onClick={() => setPage("contador")}
            >
              Contador
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          width: "min(1700px,96vw)",
          margin: "18px auto 26px",
          display: "grid",
          gridTemplateColumns: "1.4fr .8fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 style={{ margin: 0 }}>
                {page === "tributacao" && "Tributação dos Produtos"}
                {page === "nfce" && "Configurações de NFC-e"}
                {page === "empresa" && "Dados Fiscais da Empresa"}
                {page === "contador" && "Dados do Contador"}
              </h2>

              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                Área de gestão fiscal, impostos e informações tributárias.
              </div>
            </div>

            <span className="badge">Fiscal</span>
          </div>

          {page === "tributacao" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="empty">
                <div className="empty-title">Tributação dos produtos</div>
                <div className="empty-sub">
                  Visualize os dados fiscais cadastrados em cada produto, como
                  NCM, CFOP, CSOSN, PIS, COFINS e unidade.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                <div className="panel">
                  <div className="fin-k">Produtos cadastrados</div>
                  <div className="fin-v">{produtos.length}</div>
                  <div className="fin-s">Total no sistema</div>
                </div>

                <div className="panel">
                  <div className="fin-k">Com fiscal</div>
                  <div className="fin-v">{produtosComFiscal}</div>
                  <div className="fin-s">Possuem dados fiscais</div>
                </div>

                <div className="panel">
                  <div className="fin-k">Sem fiscal</div>
                  <div className="fin-v">{produtosSemFiscal}</div>
                  <div className="fin-s">Precisam de conferência</div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h2 style={{ margin: 0 }}>Produtos e tributação</h2>
                    <div
                      style={{
                        marginTop: 6,
                        color: "var(--muted)",
                        fontSize: 13,
                      }}
                    >
                      Lista dos produtos com seus campos fiscais.
                    </div>
                  </div>

                  <span className="badge">
                    {loading
                      ? "Carregando..."
                      : `${produtosFiltrados.length} produto(s)`}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por produto, NCM, CFOP, CSOSN..."
                    style={{
                      flex: 1,
                      minWidth: 260,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(10,10,16,.55)",
                      color: "var(--text)",
                      outline: "none",
                    }}
                  />

                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={carregarProdutos}
                    disabled={loading}
                  >
                    Atualizar
                  </button>
                </div>

                {erro ? (
                  <div className="empty">
                    <div className="empty-title">Erro</div>
                    <div className="empty-sub">{erro}</div>
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 10 }}>
                  {produtosFiltrados.map((p) => (
                    <div key={p.id} className="fin-row">
                      <div className="fin-left">
                        <div className="fin-name">{p.nome}</div>

                        <div className="fin-sub">
                          NCM: {p.ncm || "—"} • CFOP: {p.cfop || "—"} • CSOSN:{" "}
                          {p.csosn || "—"}
                        </div>

                        <div className="fin-sub">
                          PIS: {p.pis_cst || "—"} • COFINS:{" "}
                          {p.cofins_cst || "—"} • Unidade: {p.unidade || "—"}
                        </div>
                      </div>

                      <div className="fin-right">
                        R$ {Number(p.preco || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {!loading && produtosFiltrados.length === 0 && (
                    <div className="empty">
                      <div className="empty-title">Nenhum produto encontrado</div>
                      <div className="empty-sub">
                        Cadastre ou edite produtos com dados fiscais no PDV.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {page === "nfce" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="empty">
                <div className="empty-title">NFC-e</div>
                <div className="empty-sub">
                  Aqui ficarão as configurações de emissão fiscal, ambiente,
                  série, número, certificado e integração fiscal.
                </div>
              </div>

              <div className="fin-list">
                <div className="fin-row">
                  <div className="fin-left">
                    <div className="fin-name">Ambiente</div>
                    <div className="fin-sub">Homologação ou produção</div>
                  </div>
                  <div className="fin-right">—</div>
                </div>

                <div className="fin-row">
                  <div className="fin-left">
                    <div className="fin-name">Próximo número NFC-e</div>
                    <div className="fin-sub">Controle sequencial das notas</div>
                  </div>
                  <div className="fin-right">—</div>
                </div>

                <div className="fin-row">
                  <div className="fin-left">
                    <div className="fin-name">Integração</div>
                    <div className="fin-sub">Nuvem Fiscal / Focus NFe</div>
                  </div>
                  <div className="fin-right">—</div>
                </div>
              </div>
            </div>
          )}

          {page === "empresa" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="empty">
                <div className="empty-title">Dados fiscais da empresa</div>
                <div className="empty-sub">
                  Aqui ficarão CNPJ, razão social, inscrição estadual, endereço
                  fiscal e regime tributário.
                </div>
              </div>

              <div className="fin-list">
                <div className="fin-row">
                  <div className="fin-left">
                    <div className="fin-name">CNPJ</div>
                    <div className="fin-sub">Documento da empresa</div>
                  </div>
                  <div className="fin-right">—</div>
                </div>

                <div className="fin-row">
                  <div className="fin-left">
                    <div className="fin-name">Regime tributário</div>
                    <div className="fin-sub">
                      Simples Nacional, MEI, Lucro Presumido...
                    </div>
                  </div>
                  <div className="fin-right">—</div>
                </div>
              </div>
            </div>
          )}

          {page === "contador" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div className="empty">
                <div className="empty-title">Contador</div>
                <div className="empty-sub">
                  Aqui ficarão os dados do contador responsável e arquivos
                  mensais enviados para ele.
                </div>
              </div>

              <div className="fin-list">
                <div className="fin-row">
                  <div className="fin-left">
                    <div className="fin-name">Nome / Escritório</div>
                    <div className="fin-sub">Responsável contábil</div>
                  </div>
                  <div className="fin-right">—</div>
                </div>

                <div className="fin-row">
                  <div className="fin-left">
                    <div className="fin-name">Contato</div>
                    <div className="fin-sub">Telefone ou email</div>
                  </div>
                  <div className="fin-right">—</div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="panel panel-sticky">
          <div className="panel-head">
            <h2>Resumo Fiscal</h2>
            <span className="badge">Gestão</span>
          </div>

          <div className="fin-kpis fin-kpis-2">
            <div className="fin-kpi">
              <div className="fin-k">Produtos fiscais</div>
              <div className="fin-v">{produtosComFiscal}</div>
              <div className="fin-s">Com dados fiscais preenchidos</div>
            </div>

            <div className="fin-kpi">
              <div className="fin-k">Produtos sem fiscal</div>
              <div className="fin-v">{produtosSemFiscal}</div>
              <div className="fin-s">Precisam revisar NCM/CFOP</div>
            </div>
          </div>

          <div className="empty" style={{ marginTop: 14 }}>
            <div className="empty-title">Por enquanto</div>
            <div className="empty-sub">
              Esta tela apenas visualiza os dados fiscais dos produtos. A edição
              continua sendo feita no cadastro de produto do PDV.
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}