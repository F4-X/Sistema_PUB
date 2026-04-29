import { useEffect, useState } from "react";
import { api } from "../api";

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function FechamentoCaixa() {
  const [sessao, setSessao] = useState(null);
  const [valorAbertura, setValorAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    setLoading(true);
    setMsg("");
    try {
      const r = await api.get("/caixa/sessao-atual");
      setSessao(r.data?.sessao || null);
    } catch (e) {
      setMsg(e?.response?.data?.error || "Erro ao carregar caixa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function abrirCaixa() {
    try {
      setLoading(true);
      setMsg("");

      await api.post("/caixa/abrir", {
        valor_abertura: Number(String(valorAbertura).replace(",", ".")),
        caixa_numero: 1,
      });

      setValorAbertura("");
      setMsg("Caixa aberto com sucesso");
      await carregar();
    } catch (e) {
      setMsg(e?.response?.data?.error || "Erro ao abrir caixa");
    } finally {
      setLoading(false);
    }
  }

  async function fecharCaixa() {
    if (!window.confirm("Deseja fechar o caixa agora?")) return;

    try {
      setLoading(true);
      setMsg("");

      await api.post("/caixa/fechar", {
        valor_fechamento: Number(String(valorFechamento).replace(",", ".")),
      });

      setValorFechamento("");
      setMsg("Caixa fechado com sucesso");
      await carregar();
    } catch (e) {
      setMsg(e?.response?.data?.error || "Erro ao fechar caixa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      <div className="panel">
        <div className="panel-head">
          <h2>Abertura / Fechamento de Caixa</h2>
          <span className="badge">
            {sessao ? "Caixa aberto" : "Caixa fechado"}
          </span>
        </div>

        {msg ? <div className="badge">{msg}</div> : null}

        {!sessao ? (
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <h3 style={{ margin: 0 }}>Abrir caixa</h3>

            <input
              value={valorAbertura}
              onChange={(e) => setValorAbertura(e.target.value)}
              placeholder="Valor inicial do caixa"
              inputMode="decimal"
            />

            <button
              className="btn-primary"
              onClick={abrirCaixa}
              disabled={loading}
            >
              {loading ? "Abrindo..." : "Abrir caixa"}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <h3 style={{ margin: 0 }}>Caixa aberto</h3>

            <div className="panel">
              <p>
                <b>Valor de abertura:</b> {money(sessao.valor_abertura)}
              </p>
              <p>
                <b>Aberto em:</b>{" "}
                {new Date(sessao.aberto_em).toLocaleString("pt-BR")}
              </p>
              <p>
                <b>Usuário:</b> {sessao.usuario_email || "—"}
              </p>
            </div>

            <h3 style={{ margin: 0 }}>Fechar caixa</h3>

            <input
              value={valorFechamento}
              onChange={(e) => setValorFechamento(e.target.value)}
              placeholder="Valor contado no caixa"
              inputMode="decimal"
            />

            <button
              className="btn-danger"
              onClick={fecharCaixa}
              disabled={loading}
            >
              {loading ? "Fechando..." : "Fechar caixa"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}