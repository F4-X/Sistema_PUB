export default function Recibo({ sale }) {
  if (!sale) return null;

  const money = (n) =>
    Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const dt = new Date(sale.data || sale.criado_em || Date.now()).toLocaleString("pt-BR");
  const caixa = sale.caixa ?? sale.caixa_numero ?? 1;

  const itens = Array.isArray(sale.itens) ? sale.itens : [];
  const pagamentos = Array.isArray(sale.pagamentos) ? sale.pagamentos : [];

  const total = Number(sale.total ?? sale.total_final ?? sale.total_bruto ?? 0);
  const troco = Number(sale.troco ?? 0);

  return (
    <div
      style={{
        width: 280,
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <div style={{ textAlign: "center", fontWeight: "bold" }}>1005 PUB</div>

      <div style={{ textAlign: "center" }}>COMPROVANTE DE VENDA</div>

      <div style={{ textAlign: "center", fontSize: 11 }}>
        *** NÃO FISCAL ***
      </div>

      <hr />

      <div>DATA: {dt}</div>
      <div>CAIXA: {caixa}</div>

      <hr />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b>ITEM</b>
        <b>VALOR</b>
      </div>

      {itens.length === 0 ? (
        <div style={{ textAlign: "center", opacity: 0.8 }}>Sem itens</div>
      ) : (
        itens.map((i, idx) => {
          const qtd = Number(i.qtd || 1);
          const preco = Number(i.preco || i.preco_unit || 0);
          return (
            <div
              key={idx}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>
                {qtd}x {i.nome}
              </span>
              <span>{money(preco * qtd)}</span>
            </div>
          );
        })
      )}

      <hr />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
        }}
      >
        <span>TOTAL</span>
        <span>{money(total)}</span>
      </div>

      <hr />

      {pagamentos.map((p, idx) => (
        <div
          key={idx}
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <span>{String(p.tipo || "").toUpperCase()}</span>
          <span>{money(p.valor)}</span>
        </div>
      ))}

      {troco > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>TROCO</span>
          <span>{money(troco)}</span>
        </div>
      )}

      <hr />

      <div style={{ textAlign: "center" }}>Obrigado pela preferência!</div>
    </div>
  );
}
