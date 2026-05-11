import { useEffect, useState } from "react";
import { api } from "../api";

export default function Operadores() {
  const [items, setItems] = useState([]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("Comum");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const r = await api.get("/operadores");
    setItems(Array.isArray(r.data) ? r.data : []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setMsg("");

      await api.post("/operadores", {
        nome,
        email,
        senha,
        tipo,
      });

      setNome("");
      setEmail("");
      setSenha("");
      setTipo("Comum");

      setMsg("Operador criado com sucesso");

      await carregar();
    } catch (e) {
      setMsg(
        e?.response?.data?.error ||
        "Erro ao criar operador"
      );
    } finally {
      setLoading(false);
    }
  }

  async function alterarStatus(id) {
    try {
      await api.patch(`/operadores/${id}/status`);
      await carregar();
    } catch {}
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Cadastro de Funcionários</h2>
      </div>

      <form
        onSubmit={salvar}
        style={{
          display: "grid",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="Comum">Comum</option>
          <option value="Funcional">Funcional</option>
          <option value="Geral">Geral</option>
        </select>

        <button
          className="btn-primary"
          disabled={loading}
        >
          {loading ? "Salvando..." : "Cadastrar"}
        </button>
      </form>

      {msg ? (
        <div className="empty">{msg}</div>
      ) : null}

      <div className="fin-list">
        {items.map((op) => (
          <div
            className="fin-row"
            key={op.id}
          >
            <div className="fin-left">
              <div className="fin-name">
                {op.email}
              </div>

              <div className="fin-sub">
                Tipo: {op.tipo}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div>
                {op.ativo ? "Ativo" : "Inativo"}
              </div>

              <button
                className="btn-secondary"
                onClick={() => alterarStatus(op.id)}
              >
                Alterar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}