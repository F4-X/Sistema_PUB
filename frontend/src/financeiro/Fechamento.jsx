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

function diffColor(v) {
  return Number(v || 0) === 0 ? "#2ecc71" : "#ff7675";
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

      const hist = await api.get(`/caixa/fechamentos?page=${histPage}&limit=6`);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histPage]);

  return (
    <div className="panel" style={{ padding: 12 }}>
      <div className="panel-head" style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 18 }}>Histórico de Fechamentos</h2>

        <span className="badge">
          {loading ? "Carregando..." : `${historico.length} registro(s)`}
        </span>
      </div>

      {msg ? (
        <div className="empty" style={{ padding: 12, marginTop: 8 }}>
          {msg}
        </div>
      ) : null}

      {!historico.length ? (
        <div className="empty" style={{ marginTop: 10, padding: 12 }}>
          Nenhum fechamento encontrado
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {historico.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(17,17,24,.55)",
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {item.usuario_email || "Operador"}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color: "rgba(255,255,255,.7)",
                      fontSize: 12,
                    }}
                  >
                    {brDate(item.fechado_em || item.aberto_em)}
                  </div>
                </div>

                <div className="badge" style={{ fontSize: 12 }}>
                  {item.status}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
                  gap: 8,
                }}
              >
                <div className="panel" style={{ padding: 10 }}>
                  <div className="mk-selected-k" style={{ fontSize: 12 }}>
                    Dinheiro total
                  </div>
                  <div
                    className="mk-selected-v"
                    style={{ color: "#4da3ff", fontSize: 18 }}
                  >
                    {money(item.dinheiro_sistema)}
                  </div>
                </div>

                <div className="panel" style={{ padding: 10 }}>
                  <div className="mk-selected-k" style={{ fontSize: 12 }}>
                    Diferença dinheiro
                  </div>
                  <div
                    className="mk-selected-v"
                    style={{
                      color: diffColor(item.dif_dinheiro),
                      fontSize: 18,
                    }}
                  >
                    {money(item.dif_dinheiro)}
                  </div>
                </div>

                <div className="panel" style={{ padding: 10 }}>
                  <div className="mk-selected-k" style={{ fontSize: 12 }}>
                    Diferença PIX
                  </div>
                  <div
                    className="mk-selected-v"
                    style={{
                      color: diffColor(item.dif_pix),
                      fontSize: 18,
                    }}
                  >
                    {money(item.dif_pix)}
                  </div>
                </div>

                <div className="panel" style={{ padding: 10 }}>
                  <div className="mk-selected-k" style={{ fontSize: 12 }}>
                    Diferença cartão
                  </div>
                  <div
                    className="mk-selected-v"
                    style={{
                      color: diffColor(item.dif_cartao),
                      fontSize: 18,
                    }}
                  >
                    {money(item.dif_cartao)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn-secondary"
              disabled={histPage <= 1}
              onClick={() => setHistPage((p) => Math.max(1, p - 1))}
              style={{ padding: "7px 10px", fontSize: 12 }}
            >
              ← Anterior
            </button>

            <div
              className="badge"
              style={{
                padding: "7px 12px",
                fontSize: 12,
              }}
            >
              Página {histPage} de {histTotalPages}
            </div>

            <button
              className="btn-secondary"
              disabled={histPage >= histTotalPages}
              onClick={() =>
                setHistPage((p) => Math.min(histTotalPages, p + 1))
              }
              style={{ padding: "7px 10px", fontSize: 12 }}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}