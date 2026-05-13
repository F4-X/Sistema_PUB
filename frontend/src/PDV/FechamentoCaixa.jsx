import { useEffect, useState } from "react";
import { api } from "../api";

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function n(v) {
  return Number(String(v || "0").replace(",", ".")) || 0;
}

function brDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("pt-BR");
}

function fmt(v) {
  return n(v).toFixed(2).replace(".", ",");
}

function linha(nome, calculado, declarado) {
  const calc = n(calculado);
  const decl = n(declarado);
  const dif = decl - calc;

  return `${nome.padEnd(12, " ")} ${fmt(calc).padStart(9, " ")} ${fmt(
    decl
  ).padStart(9, " ")} ${fmt(dif).padStart(9, " ")}\n`;
}

function imprimirFechamento({ sessao, preview, fechamento, declarado }) {
  const fechadoEm = fechamento?.fechado_em || new Date().toISOString();

  const abertura = n(preview?.abertura ?? sessao?.valor_abertura);
  const dinheiro = n(preview?.dinheiro);
  const pix = n(preview?.pix);
  const cartao = n(preview?.cartao);
  const entradas = n(preview?.entradas);
  const saidas = n(preview?.saidas);

  const declaradoDinheiroLiquido = n(declarado.dinheiro) - abertura;
  const declaradoPix = n(declarado.pix);
  const declaradoCartao = n(declarado.cartao);

  const totalCalculado =
    abertura + dinheiro + pix + cartao + entradas - saidas;

  const totalDeclarado =
    n(declarado.dinheiro) +
    declaradoPix +
    declaradoCartao +
    entradas -
    saidas;

  const diferenca = totalDeclarado - totalCalculado;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Fechamento de Caixa</title>

<style>
@page{size:58mm auto;margin:4mm}

html,body{
  margin:0;
  padding:0;
  background:#fff;
  color:#000;
  font-family:monospace;
  font-size:11px;
}

.recibo{
  width:50mm;
  margin:0 auto;
}

.center{text-align:center}
.bold{font-weight:700}
.hr{border-top:1px dashed #000;margin:8px 0}

pre{
  font-family:monospace;
  font-size:11px;
  white-space:pre;
  margin:0;
}

.row{
  display:flex;
  justify-content:space-between;
  gap:8px;
}

.sign{
  height:28px;
  border-bottom:1px solid #000;
  margin:22px 0 5px;
}
</style>
</head>

<body>
<div class="recibo">

<div class="center bold">1005 THE BEST</div>
<div class="center">Relatório de Fechamento</div>

<div class="hr"></div>

<div>Data: ${brDate(fechadoEm)}</div>
<div>Funcionário: ${sessao?.usuario_email || "—"}</div>

<div class="hr"></div>

<pre>
${"".padEnd(13, " ")}Calculado Declarado Diferença
${linha("Abertura", abertura, abertura)}
${linha("Dinheiro", dinheiro, declaradoDinheiroLiquido)}
${linha("PIX", pix, declaradoPix)}
${linha("Cartão", cartao, declaradoCartao)}
${linha("Entradas", entradas, entradas)}
${linha("Saídas", saidas, saidas)}
</pre>

<div class="hr"></div>

<pre>
${"Total sistema".padEnd(15, " ")} ${fmt(totalCalculado).padStart(9, " ")}
${"Total declarado".padEnd(15, " ")} ${fmt(totalDeclarado).padStart(9, " ")}
${"Diferença".padEnd(15, " ")} ${fmt(diferenca).padStart(9, " ")}
</pre>

<div class="hr"></div>

<div class="row bold">
<span>${
    diferenca < 0
      ? "Quebra"
      : diferenca > 0
      ? "Sobra"
      : "Sem diferença"
  }</span>

<span>${money(diferenca)}</span>
</div>

<div class="hr"></div>

<div class="center bold">ASSINATURA</div>
<div class="sign"></div>
<div class="center">${sessao?.usuario_email || ""}</div>

</div>

<script>
window.onload=function(){
  setTimeout(function(){
    window.print();
    window.close();
  },250);
}
</script>
</body>
</html>
`;

  const w = window.open("", "_blank", "width=420,height=700");

  if (!w) {
    alert("Pop-up bloqueado. Libere pop-up.");
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

  const [dinheiroDecl, setDinheiroDecl] = useState("");
  const [pixDecl, setPixDecl] = useState("");
  const [cartaoDecl, setCartaoDecl] = useState("");

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

      const valorDigitado = String(valorAbertura || "").trim();

await api.post("/caixa/abrir", {
  valor_abertura: valorDigitado ? n(valorDigitado) : null,
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
    if (!window.confirm("Deseja fechar o caixa?")) return;

    try {
      setLoading(true);
      setMsg("");

      const p = await api.get("/caixa/fechamento-preview");
      const dados = p.data || preview || {};

      const declarado = {
        dinheiro: n(dinheiroDecl),
        pix: n(pixDecl),
        cartao: n(cartaoDecl),
      };

      const valorFinal =
        declarado.dinheiro +
        declarado.pix +
        declarado.cartao +
        n(dados.entradas) -
        n(dados.saidas);

      const r = await api.post("/caixa/fechar", {
        valor_fechamento: valorFinal,
        dinheiro: declarado.dinheiro,
        pix: declarado.pix,
        cartao: declarado.cartao,
      });

      imprimirFechamento({
        sessao,
        preview: dados,
        fechamento: r.data?.sessao,
        declarado,
      });

      setMsg("Caixa fechado com sucesso");

      setDinheiroDecl("");
      setPixDecl("");
      setCartaoDecl("");

      await carregar();
    } catch (e) {
      setMsg(e?.response?.data?.error || "Erro ao fechar caixa");
    } finally {
      setLoading(false);
    }
  }

  const abertura = n(preview?.abertura ?? sessao?.valor_abertura);

  const totalDeclarado =
    n(dinheiroDecl) +
    n(pixDecl) +
    n(cartaoDecl);

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
              Conferência financeira
            </div>
          </div>

          <span className="badge">
            {sessao ? "Caixa aberto" : "Caixa fechado"}
          </span>
        </div>

        {msg ? (
          <div className="empty" style={{ marginTop: 14 }}>
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
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              Abrir caixa
            </div>

            <input
              value={valorAbertura}
              onChange={(e) => setValorAbertura(e.target.value)}
              placeholder="Valor inicial"
              inputMode="decimal"
            />

            <button
              className="btn-primary"
              onClick={abrirCaixa}
              disabled={loading}
            >
              {loading ? "Abrindo..." : "Abrir Caixa"}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 14,
              }}
            >
              <div className="panel">
                <div className="mk-selected-k">Operador</div>

                <div className="mk-selected-v">
                  {sessao.usuario_email || "—"}
                </div>
              </div>

              <div className="panel">
                <div className="mk-selected-k">Abertura</div>

                <div className="mk-selected-v">
                  {money(abertura)}
                </div>
              </div>

              <div className="panel">
                <div className="mk-selected-k">Total Declarado</div>

                <div className="mk-selected-v">
                  {money(totalDeclarado)}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Conferência Manual</h2>

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
                    Dinheiro conferência
                  </div>

                  <input
                    value={dinheiroDecl}
                    onChange={(e) =>
                      setDinheiroDecl(e.target.value)
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>

                <div>
                  <div className="mk-selected-k">
                    PIX conferência
                  </div>

                  <input
                    value={pixDecl}
                    onChange={(e) =>
                      setPixDecl(e.target.value)
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>

                <div>
                  <div className="mk-selected-k">
                    Cartão conferência
                  </div>

                  <input
                    value={cartaoDecl}
                    onChange={(e) =>
                      setCartaoDecl(e.target.value)
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                  />
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
}