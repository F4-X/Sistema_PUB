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
  return Math.abs(Number(v || 0)) < 0.005
    ? "#2ecc71"
    : "#ff7675";
}

function statusDiferenca(v) {
  const n = Number(v || 0);

  if (Math.abs(n) < 0.005) {
    return "Sem diferença";
  }

  if (n > 0) {
    return "Sobra";
  }

  return "Quebra";
}

export default function Fechamento() {
  const [historico, setHistorico] = useState([]);
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] =
    useState(1);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregarHistorico() {
    try {
      setLoading(true);
      setMsg("");

      const hist = await api.get(
        `/caixa/fechamentos?page=${histPage}&limit=6`
      );

      setHistorico(
        hist.data?.items || []
      );

      setHistTotalPages(
        hist.data?.pages || 1
      );
    } catch (e) {
      setMsg(
        e?.response?.data?.error ||
          "Erro ao carregar fechamentos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histPage]);

  return (
    <div
      className="panel"
      style={{ padding: 12 }}
    >
      <div
        className="panel-head"
        style={{ marginBottom: 8 }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              margin: 0,
            }}
          >
            Histórico de Fechamentos
          </h2>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color:
                "rgba(255,255,255,.65)",
            }}
          >
            Valores calculados, conferidos e
            diferenças do caixa
          </div>
        </div>

        <span className="badge">
          {loading
            ? "Carregando..."
            : `${historico.length} registro(s)`}
        </span>
      </div>

      {msg ? (
        <div
          className="empty"
          style={{
            padding: 12,
            marginTop: 8,
          }}
        >
          {msg}
        </div>
      ) : null}

      {!historico.length ? (
        <div
          className="empty"
          style={{
            marginTop: 10,
            padding: 12,
          }}
        >
          Nenhum fechamento encontrado
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 10,
          }}
        >
          {historico.map((item) => {
            const diferencaTotal =
              Number(
                item.diferenca || 0
              );

            return (
              <div
                key={item.id}
                style={{
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius: 14,
                  padding: 12,
                  background:
                    "rgba(17,17,24,.55)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      {item.usuario_email ||
                        "Operador"}
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        color:
                          "rgba(255,255,255,.7)",
                        fontSize: 12,
                      }}
                    >
                      {brDate(
                        item.fechado_em ||
                          item.aberto_em
                      )}
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
                    <span className="badge">
                      {item.status}
                    </span>

                    <span
                      className="badge"
                      style={{
                        color:
                          diffColor(
                            diferencaTotal
                          ),
                      }}
                    >
                      {statusDiferenca(
                        diferencaTotal
                      )}{" "}
                      •{" "}
                      {money(
                        diferencaTotal
                      )}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3,minmax(220px,1fr))",
                    gap: 10,
                  }}
                >
                  <ResumoForma
                    titulo="Dinheiro"
                    sistema={
                      item.dinheiro_sistema
                    }
                    conferencia={
                      item.dinheiro_conferencia
                    }
                    diferenca={
                      item.dif_dinheiro
                    }
                  />

                  <ResumoForma
                    titulo="PIX"
                    sistema={
                      item.pix_sistema
                    }
                    conferencia={
                      item.pix_conferencia
                    }
                    diferenca={
                      item.dif_pix
                    }
                  />

                  <ResumoForma
                    titulo="Cartão"
                    sistema={
                      item.cartao_sistema
                    }
                    conferencia={
                      item.cartao_conferencia
                    }
                    diferenca={
                      item.dif_cartao
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3,minmax(170px,1fr))",
                    gap: 8,
                  }}
                >
                  <MiniValor
                    titulo="Total sistema"
                    valor={
                      item.total_sistema
                    }
                  />

                  <MiniValor
                    titulo="Total conferido"
                    valor={
                      item.valor_fechamento
                    }
                  />

                  <MiniValor
                    titulo="Diferença total"
                    valor={
                      diferencaTotal
                    }
                    cor={diffColor(
                      diferencaTotal
                    )}
                  />
                </div>
              </div>
            );
          })}

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
              onClick={() =>
                setHistPage((p) =>
                  Math.max(1, p - 1)
                )
              }
              style={{
                padding: "7px 10px",
                fontSize: 12,
              }}
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
              Página {histPage} de{" "}
              {histTotalPages}
            </div>

            <button
              className="btn-secondary"
              disabled={
                histPage >=
                histTotalPages
              }
              onClick={() =>
                setHistPage((p) =>
                  Math.min(
                    histTotalPages,
                    p + 1
                  )
                )
              }
              style={{
                padding: "7px 10px",
                fontSize: 12,
              }}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumoForma({
  titulo,
  sistema,
  conferencia,
  diferenca,
}) {
  return (
    <div
      className="panel"
      style={{ padding: 12 }}
    >
      <div
        style={{
          fontWeight: 900,
          marginBottom: 10,
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          display: "grid",
          gap: 6,
          fontSize: 12,
        }}
      >
        <Linha
          label="Sistema"
          valor={sistema}
        />

        <Linha
          label="Conferido"
          valor={conferencia}
        />

        <Linha
          label="Diferença"
          valor={diferenca}
          cor={diffColor(diferenca)}
          forte
        />
      </div>
    </div>
  );
}

function Linha({
  label,
  valor,
  cor,
  forte,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <span
        style={{
          color:
            "rgba(255,255,255,.65)",
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: cor || "#fff",
          fontWeight: forte ? 900 : 700,
        }}
      >
        {money(valor)}
      </span>
    </div>
  );
}

function MiniValor({
  titulo,
  valor,
  cor,
}) {
  return (
    <div
      className="panel"
      style={{
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color:
            "rgba(255,255,255,.65)",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop: 5,
          fontWeight: 900,
          fontSize: 17,
          color: cor || "#fff",
        }}
      >
        {money(valor)}
      </div>
    </div>
  );
}