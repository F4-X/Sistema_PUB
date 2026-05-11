return (
  <div
    style={{
      width: "min(1700px,96vw)",
      margin: "18px auto 26px",
      display: "grid",
      gridTemplateColumns: "420px 1fr",
      gap: 18,
      alignItems: "start",
    }}
  >
    <div className="panel panel-sticky">
      <div className="panel-head">
        <h2>Cadastro</h2>

        <span className="badge">
          Funcionários
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) =>
            setNome(e.target.value)
          }
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) =>
            setSenha(e.target.value)
          }
        />

        <select
          value={tipo}
          onChange={(e) =>
            setTipo(e.target.value)
          }
        >
          <option value="Comum">
            Comum
          </option>

          <option value="Funcional">
            Funcional
          </option>

          <option value="Geral">
            Geral
          </option>
        </select>

        <button
          className="btn-primary"
          disabled={loading}
          onClick={salvar}
        >
          {loading
            ? "Salvando..."
            : "Cadastrar Funcionário"}
        </button>

        {msg ? (
          <div className="empty">
            {msg}
          </div>
        ) : null}
      </div>
    </div>

    <div className="panel">
      <div className="panel-head">
        <h2>Funcionários cadastrados</h2>

        <span className="badge">
          {items.length} item(ns)
        </span>
      </div>

      {!items.length ? (
        <div className="empty">
          Nenhum funcionário cadastrado
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {items.map((op) => (
            <div
              key={op.id}
              style={{
                border:
                  "1px solid rgba(255,255,255,.08)",
                borderRadius: 16,
                padding: 16,
                background:
                  "rgba(17,17,24,.55)",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  {op.email}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color:
                      "rgba(255,255,255,.7)",
                    fontSize: 13,
                  }}
                >
                  Tipo: {op.tipo}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  className="badge"
                  style={{
                    background: op.ativo
                      ? "rgba(46,204,113,.18)"
                      : "rgba(231,76,60,.18)",
                  }}
                >
                  {op.ativo
                    ? "Ativo"
                    : "Inativo"}
                </div>

                <button
                  className="btn-secondary"
                  onClick={() =>
                    alterarStatus(op.id)
                  }
                >
                  Alterar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);