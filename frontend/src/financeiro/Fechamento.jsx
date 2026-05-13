import { useEffect, useState } from "react";
import { api } from "../api";

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function brDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

export default function Fechamento() {
  const [historico, setHistorico] = useState([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregarHistorico() {
    try {
      setLoading(true);
      setMsg("");

      const hist = await api.get(
        `/caixa/fechamentos?page=${histPage}&limit=6`
      );

      setHistorico(hist.data?.items || []);
      setHistTotalPages(hist.data?.pages || 1);
    } catch (e) {
      setMsg(e?.response?.data?.error || "Erro ao carregar fechamentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, [histPage]);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Histórico de Fechamentos</h2>
        <span className="badge">
          {loading ? "Carregando..." : `${historico.length} registro(s)`}
        </span>
      </div>

      {msg ? <div className="empty">{msg}</div> : null}

      {!historico.length ? (
        <div className="empty" style={{ marginTop: 16 }}>
          Nenhum fechamento encontrado
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          {historico.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 18,
                padding: 18,
                background: "rgba(17,17,24,.55)",
                display: "grid",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {item.usuario_email || "Operador"}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: "rgba(255,255,255,.7)",
                      fontSize: 13,
                    }}
                  >
                    {brDate(item.fechado_em || item.aberto_em)}
                  </div>
                </div>

                <div className="badge" style={{ fontSize: 13 }}>
                  {item.status}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 12,
                }}
              >
                <div className="panel">
                  <div className="mk-selected-k">Dinheiro vendas</div>
                  <div className="mk-selected-v">{money(item.dinheiro)}</div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Dinheiro entrada</div>
                  <div className="mk-selected-v">{money(item.abertura)}</div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Dinheiro total</div>
                  <div className="mk-selected-v" style={{ color: "#4da3ff" }}>
                    {money(item.dinheiro_sistema)}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Dinheiro conferência</div>
                  <div className="mk-selected-v" style={{ color: "#4da3ff" }}>
                    {item.status === "fechado"
                      ? money(item.dinheiro_conferencia)
                      : "—"}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">PIX sistema</div>
                  <div className="mk-selected-v">
                    {money(item.pix_sistema)}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">PIX conferência</div>
                  <div className="mk-selected-v">
                    {item.status === "fechado"
                      ? money(item.pix_conferencia)
                      : "—"}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Cartão sistema</div>
                  <div className="mk-selected-v">
                    {money(item.cartao_sistema)}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Cartão conferência</div>
                  <div className="mk-selected-v">
                    {item.status === "fechado"
                      ? money(item.cartao_conferencia)
                      : "—"}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Valor total final</div>
                  <div className="mk-selected-v">
                    {money(item.valor_total_final ?? item.total)}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Diferença dinheiro</div>
                  <div
                    className="mk-selected-v"
                    style={{
                      color:
                        Number(item.dif_dinheiro || 0) === 0
                          ? "#2ecc71"
                          : "#ff7675",
                    }}
                  >
                    {money(item.dif_dinheiro)}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Diferença PIX</div>
                  <div
                    className="mk-selected-v"
                    style={{
                      color:
                        Number(item.dif_pix || 0) === 0
                          ? "#2ecc71"
                          : "#ff7675",
                    }}
                  >
                    {money(item.dif_pix)}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Diferença cartão</div>
                  <div
                    className="mk-selected-v"
                    style={{
                      color:
                        Number(item.dif_cartao || 0) === 0
                          ? "#2ecc71"
                          : "#ff7675",
                    }}
                  >
                    {money(item.dif_cartao)}
                  </div>
                </div>

                <div className="panel">
                  <div className="mk-selected-k">Diferença Total</div>
                  <div
                    className="mk-selected-v"
                    style={{
                      color:
                        Number(item.diferenca || 0) === 0
                          ? "#2ecc71"
                          : "#ff7675",
                    }}
                  >
                    {money(item.diferenca)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginTop: 10,
            }}
          >
            <button
              className="btn-secondary"
              disabled={histPage <= 1}
              onClick={() => setHistPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>

            <div className="badge" style={{ padding: "10px 18px" }}>
              Página {histPage} de {histTotalPages}
            </div>

            <button
              className="btn-secondary"
              disabled={histPage >= histTotalPages}
              onClick={() =>
                setHistPage((p) => Math.min(histTotalPages, p + 1))
              }
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}