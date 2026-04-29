import { useEffect, useState } from "react";
import { api } from "../api";

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function n(v) {
  return Number(v || 0);
}

function brDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

function linha(nome, calculado, declarado = null) {
  const calc = n(calculado);
  const decl = declarado == null ? calc : n(declarado);
  const dif = decl - calc;

  return `
${nome.padEnd(14, " ")} ${calc.toFixed(2).padStart(9, " ")} ${decl
    .toFixed(2)
    .padStart(9, " ")} ${dif.toFixed(2).padStart(9, " ")}
`;
}

function imprimirFechamento({ sessao, preview, fechamento }) {
  const abertoEm = sessao?.aberto_em;
  const fechadoEm = fechamento?.fechado_em || new Date().toISOString();

  const dinheiro = n(preview?.dinheiro);
  const pix = n(preview?.pix);
  const cartao = n(preview?.cartao);
  const credito = n(preview?.credito);
  const debito = n(preview?.debito);
  const entradas = n(preview?.entradas);
  const saidas = n(preview?.saidas);
  const abertura = n(preview?.abertura ?? sessao?.valor_abertura);

  const totalCalculado =
    n(preview?.total) ||
    abertura + dinheiro + pix + cartao + credito + debito + entradas - saidas;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Fechamento de Caixa</title>
<style>
@page { size: 58mm auto; margin: 4mm; }
html,body{
  margin:0;
  padding:0;
  background:#fff;
  color:#000;
  font-family:monospace;
  font-size:11px;
}
.recibo{width:50mm;margin:0 auto;}
.center{text-align:center;}
.bold{font-weight:700;}
.hr{border-top:1px dashed #000;margin:8px 0;}
pre{font-family:monospace;font-size:11px;white-space:pre-wrap;margin:0;}
.row{display:flex;justify-content:space-between;gap:8px;}
.sign{height:26px;border-bottom:1px solid #000;margin:22px 0 5px;}
</style>
</head>
<body>
<div class="recibo">
  <div class="center bold">1005 THE BEST</div>
  <div class="center">Relatório de Fechamento de Caixa</div>

  <div class="hr"></div>

  <div>Data: ${brDate(fechadoEm)}</div>
  <div>Caixa: Principal</div>
  <div>Funcionário: ${sessao?.usuario_email || "—"}</div>
  <div>Abertura: ${brDate(abertoEm)}</div>
  <div>Fechamento: ${brDate(fechadoEm)}</div>

  <div class="hr"></div>

<pre>
${"".padEnd(15, " ")}Calculado Declarado Diferença
${linha("Abertura", abertura)}
${linha("Dinheiro", dinheiro)}
${linha("PIX", pix)}
${linha("Cartão", cartao)}
${linha("Crédito", credito)}
${linha("Débito", debito)}
${linha("Entradas", entradas)}
${linha("Saídas", saidas)}
</pre>

  <div class="hr"></div>

<pre>
${"Total".padEnd(14, " ")} ${totalCalculado.toFixed(2).padStart(9, " ")}
</pre>

  <div class="hr"></div>

  <div class="row bold">
    <span>Valor final</span>
    <span>${money(totalCalculado)}</span>
  </div>

  <div class="hr"></div>

  <div class="center bold">ASSINATURA</div>
  <div class="sign"></div>
  <div class="center">${sessao?.usuario_email || ""}</div>
</div>

<script>
window.onload = function(){
  setTimeout(function(){
    window.print();
    window.close();
  }, 250);
}
</script>
</body>
</html>
`;

  const w = window.open("", "_blank", "width=420,height=700");
  if (!w) {
    alert("Pop-up bloqueado. Libere pop-up para imprimir.");
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function FechamentoCaixa() {
  const [sessao, setSessao] = useState(null);
  const [preview, setPreview] = useState(null);
  const [valorAbertura, setValorAbertura] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    setLoading(true);
    setMsg("");

    try {
      const r = await api.get("/caixa/sessao-atual");
      const atual = r.data?.sessao || null;
      setSessao(atual);

      if (atual) {
        const p = await api.get("/caixa/fechamento-preview");
        setPreview(p.data || null);
      } else {
        setPreview(null);
      }
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

      const valor = Number(String(valorAbertura).replace(",", "."));

      await api.post("/caixa/abrir", {
        valor_abertura: valor,
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
    if (!window.confirm("Deseja fechar o caixa e imprimir o relatório?")) return;

    try {
      setLoading(true);
      setMsg("");

      const p = await api.get("/caixa/fechamento-preview");
      const dados = p.data || preview || {};
      const valorFinal = n(dados.total);

      const r = await api.post("/caixa/fechar", {
        valor_fechamento: valorFinal,
      });

      imprimirFechamento({
        sessao,
        preview: dados,
        fechamento: r.data?.sessao,
      });

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
                <b>Valor de abertura:</b>{" "}
                {money(preview?.abertura ?? sessao.valor_abertura)}
              </p>
              <p>
                <b>Aberto em:</b> {brDate(sessao.aberto_em)}
              </p>
              <p>
                <b>Usuário:</b> {sessao.usuario_email || "—"}
              </p>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Prévia automática</h2>
                <button className="btn-secondary" onClick={carregar}>
                  Atualizar
                </button>
              </div>

              <p>
                <b>Dinheiro:</b> {money(preview?.dinheiro)}
              </p>
              <p>
                <b>Entradas:</b> {money(preview?.entradas)}
              </p>
              <p>
                <b>Saídas:</b> {money(preview?.saidas)}
              </p>
              <p>
                <b>Total final:</b> {money(preview?.total)}
              </p>
            </div>

            <button
              className="btn-danger"
              onClick={fecharCaixa}
              disabled={loading}
            >
              {loading ? "Fechando..." : "Fechar caixa e imprimir"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}