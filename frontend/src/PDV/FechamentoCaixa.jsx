return (
  <div
    style={{
      width: "min(1700px,96vw)",
      margin: "18px auto 26px",
      display: "grid",
      gap: 18,
    }}
  >
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Fechamento de Caixa</h2>

          <div
            style={{
              color: "rgba(255,255,255,.65)",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Conferência financeira e fechamento operacional
          </div>
        </div>

        <span className="badge">
          {sessao
            ? "Caixa aberto"
            : "Caixa fechado"}
        </span>
      </div>

      {msg ? (
        <div
          className="empty"
          style={{
            marginTop: 14,
          }}
        >
          {msg}
        </div>
      ) : null}

      {!sessao ? (
        <div
          style={{
            display: "grid",
            gap: 14,
            marginTop: 18,
            maxWidth: 420,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            Abrir caixa
          </div>

          <input
            value={valorAbertura}
            onChange={(e) =>
              setValorAbertura(
                e.target.value
              )
            }
            placeholder="Valor inicial"
            inputMode="decimal"
          />

          <button
            className="btn-primary"
            onClick={abrirCaixa}
            disabled={loading}
          >
            {loading
              ? "Abrindo..."
              : "Abrir Caixa"}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: 14,
            }}
          >
            <div className="panel">
              <div className="mk-selected-k">
                Operador
              </div>

              <div className="mk-selected-v">
                {sessao.usuario_email ||
                  "—"}
              </div>
            </div>

            <div className="panel">
              <div className="mk-selected-k">
                Abertura
              </div>

              <div className="mk-selected-v">
                {money(
                  preview?.abertura ??
                    sessao.valor_abertura
                )}
              </div>
            </div>

            <div className="panel">
              <div className="mk-selected-k">
                Total Sistema
              </div>

              <div className="mk-selected-v">
                {money(totalSistema)}
              </div>
            </div>

            <div className="panel">
              <div className="mk-selected-k">
                Total Declarado
              </div>

              <div className="mk-selected-v">
                {money(totalDeclarado)}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>
                Conferência Manual
              </h2>

              <button
                className="btn-secondary"
                onClick={carregar}
              >
                Atualizar
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 14,
                marginTop: 18,
              }}
            >
              <div>
                <div className="mk-selected-k">
                  Dinheiro contado
                </div>

                <input
                  value={dinheiroDecl}
                  onChange={(e) =>
                    setDinheiroDecl(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <div className="mk-selected-k">
                  PIX conferido
                </div>

                <input
                  value={pixDecl}
                  onChange={(e) =>
                    setPixDecl(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <div className="mk-selected-k">
                  Cartão conferido
                </div>

                <input
                  value={cartaoDecl}
                  onChange={(e) =>
                    setCartaoDecl(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: 14,
            }}
          >
            <div className="panel">
              <div className="mk-selected-k">
                Dinheiro sistema
              </div>

              <div className="mk-selected-v">
                {money(preview?.dinheiro)}
              </div>
            </div>

            <div className="panel">
              <div className="mk-selected-k">
                PIX sistema
              </div>

              <div className="mk-selected-v">
                {money(preview?.pix)}
              </div>
            </div>

            <div className="panel">
              <div className="mk-selected-k">
                Cartão sistema
              </div>

              <div className="mk-selected-v">
                {money(calculadoCartao)}
              </div>
            </div>

            <div
              className="panel"
              style={{
                border:
                  totalDeclarado -
                    totalSistema ===
                  0
                    ? "1px solid rgba(46,204,113,.35)"
                    : "1px solid rgba(231,76,60,.35)",
              }}
            >
              <div className="mk-selected-k">
                Diferença
              </div>

              <div
                className="mk-selected-v"
                style={{
                  color:
                    totalDeclarado -
                      totalSistema ===
                    0
                      ? "#2ecc71"
                      : "#ff7675",
                }}
              >
                {money(
                  totalDeclarado -
                    totalSistema
                )}
              </div>
            </div>
          </div>

          <button
            className="btn-danger"
            onClick={fecharCaixa}
            disabled={loading}
            style={{
              height: 58,
              fontSize: 17,
              fontWeight: 900,
            }}
          >
            {loading
              ? "Fechando..."
              : "Fechar Caixa e Imprimir"}
          </button>
        </div>
      )}
    </div>
  </div>
);