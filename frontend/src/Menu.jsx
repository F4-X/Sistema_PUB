export default function Menu({ setTela, onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
const tipo = String(user?.tipo || "comum").toLowerCase();

  const cards = [
    {
      key: "funcionarios",
      icon: "👥",
      label: "Funcionários",
      desc: "Cadastros, pagamentos e controle da equipe.",
    },
    {
      key: "financeiro",
      icon: "💰",
      label: "Financeiro",
      desc: "XMLs, contas a pagar e contas pagas.",
      adminOnly: true,
    },
    {
  key: "fiscal",
  icon: "🧾",
  label: "Fiscal",
  desc: "Impostos, NFC-e, tributação e dados fiscais.",
  adminOnly: true,
},
    {
      key: "pdv",
      icon: "🛒",
      label: "PDV",
      desc: "Vendas, caixa, histórico e operação do balcão.",
    },
  ];

 const cardsVisiveis = cards.filter((item) => {
  if (!item.adminOnly) return true;

  return (
    tipo === "admin" ||
    tipo === "geral" ||
    tipo === "funcional"
  );
});

  return (
    <div className="menu-page">
      <div className="menu-glow menu-glow-a" />
      <div className="menu-glow menu-glow-b" />

      <header className="pdv-topbar">
        <div className="pdv-brand">
          <div className="pdv-title">1005 PUB</div>
          <div className="pdv-sub">Selecione um módulo do sistema</div>
        </div>

        <div className="pdv-controls">
          <div className="pdv-toggle">
            <button className="active" type="button">
              Menu
            </button>
            <button type="button" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="menu-main">
        <section className="menu-hero">
          <span className="menu-badge">Sistema interno</span>

          <h1 className="menu-heading">
            Escolha o módulo que deseja acessar
          </h1>

          <p className="menu-text">
            Um acesso rápido, bonito e organizado para as áreas principais do sistema.
          </p>
        </section>

        <section className="menu-grid">
          {cardsVisiveis.map((item) => (
            <button
              key={item.key}
              type="button"
              className="menu-box"
              onClick={() => setTela(item.key)}
            >
              <div className="menu-box-top">
                <div className="menu-icon-wrap">
                  <div className="menu-icon">{item.icon}</div>
                </div>
              </div>

              <div className="menu-content">
                <div className="menu-label">{item.label}</div>
                <div className="menu-desc">{item.desc}</div>
              </div>

              <div className="menu-arrow">Abrir módulo →</div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}