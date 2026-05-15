import { useState } from "react";

export default function Fiscal({ setTela }) {
  const [page, setPage] = useState("tributacao");

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
                <div className="empty-title">Tributação padrão</div>
                <div className="empty-sub">
                  Aqui ficarão os padrões fiscais usados nos produtos, como NCM,
                  CFOP, CSOSN, CST PIS, CST COFINS e unidade.
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
                  <div className="fin-k">NCM</div>
                  <div className="fin-v">—</div>
                  <div className="fin-s">Classificação fiscal</div>
                </div>

                <div className="panel">
                  <div className="fin-k">CFOP</div>
                  <div className="fin-v">—</div>
                  <div className="fin-s">Operação fiscal</div>
                </div>

                <div className="panel">
                  <div className="fin-k">CSOSN</div>
                  <div className="fin-v">102</div>
                  <div className="fin-s">Simples Nacional padrão</div>
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
                    <div className="fin-sub">Simples Nacional, MEI, Lucro Presumido...</div>
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
              <div className="fin-v">—</div>
              <div className="fin-s">Com NCM/CFOP cadastrados</div>
            </div>

            <div className="fin-kpi">
              <div className="fin-k">NFC-e</div>
              <div className="fin-v">—</div>
              <div className="fin-s">Notas emitidas</div>
            </div>
          </div>

          <div className="empty" style={{ marginTop: 14 }}>
            <div className="empty-title">Próximo passo</div>
            <div className="empty-sub">
              Depois podemos ligar essa tela no banco para salvar empresa,
              contador e padrões tributários.
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}