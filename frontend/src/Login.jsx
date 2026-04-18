import { useState } from "react";
import { api } from "./api";
import "./Login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);
    try {
      const { data } = await api.post("/login", {
        email: email.trim().toLowerCase(),
        senha,
      });

      localStorage.setItem("token", data.token);

      // ✅ garante que as próximas requisições já vão autenticadas
      api.defaults.headers.common.Authorization = `Bearer ${data.token}`;

      onLogin?.();
    } catch (e2) {
      setErr(e2?.response?.data?.error || "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-title">1005 PUB</div>
        <div className="login-sub">Acesso ao PDV</div>

        <label className="login-label">Email</label>
        <input
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder=""
          autoFocus
        />

        <label className="login-label">Senha</label>
        <input
          className="login-input"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
        />

        {err ? <div className="login-err">{err}</div> : null}

        <button className="login-btn" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
