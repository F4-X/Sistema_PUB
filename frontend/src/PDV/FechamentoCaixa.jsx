import { useEffect, useState } from "react";
import { api } from "../api";

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function n(v) {
  const numero = Number(
    String(v ?? "0")
      .trim()
      .replace(",", ".")
  );

  return Number.isFinite(numero)
    ? Number(numero.toFixed(2))
    : 0;
}

function brDate(v) {
  if (!v) return "—";

  return new Date(v).toLocaleString(
    "pt-BR"
  );
}

function fmt(v) {
  return n(v)
    .toFixed(2)
    .replace(".", ",");
}

function linha(
  nome,
  calculado,
  declarado
) {
  const calc = n(calculado);
  const decl = n(declarado);
  const dif = n(decl - calc);

  return `${nome.padEnd(
    12,
    " "
  )} ${fmt(calc).padStart(
    9,
    " "
  )} ${fmt(decl).padStart(
    9,
    " "
  )} ${fmt(dif).padStart(
    9,
    " "
  )}\n`;
}

function imprimirFechamento({
  sessao,
  preview,
  fechamento,
  declarado,
}) {
  const fechadoEm =
    fechamento?.fechado_em ||
    new Date().toISOString();

  const abertura = n(
    preview?.abertura ??
      sessao?.valor_abertura
  );

  const vendasDinheiro = n(
    preview?.dinheiro
  );

  const entradas = n(
    preview?.entradas
  );

  const sangrias = n(
    preview?.sangrias
  );

  const troco = n(
    preview?.troco
  );

  /*
   * IMPORTANTE:
   * dinheiro_sistema já contém:
   *
   * abertura
   * + vendas em dinheiro
   * + reforços
   * - sangrias
   * - troco
   */
  const dinheiroSistema = n(
    preview?.dinheiro_sistema ??
      (
        abertura +
        vendasDinheiro +
        entradas -
        n(preview?.saidas)
      )
  );

  const pixSistema = n(
    preview?.pix_sistema ??
      preview?.pix
  );

  const cartaoSistema = n(
    preview?.cartao_sistema ??
      preview?.cartao
  );

  const dinheiroDeclarado = n(
    declarado.dinheiro
  );

  const pixDeclarado = n(
    declarado.pix
  );

  const cartaoDeclarado = n(
    declarado.cartao
  );

  const totalSistema = n(
    dinheiroSistema +
      pixSistema +
      cartaoSistema
  );

  /*
   * NÃO adicionamos entradas/saídas aqui.
   * dinheiroDeclarado representa o valor
   * final do dinheiro físico do caixa.
   */
  const totalDeclarado = n(
    dinheiroDeclarado +
      pixDeclarado +
      cartaoDeclarado
  );

  const diferenca = n(
    totalDeclarado -
      totalSistema
  );

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />

<title>
Fechamento de Caixa
</title>

<style>
@page{
  size:58mm auto;
  margin:4mm
}

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

.center{
  text-align:center
}

.bold{
  font-weight:700
}

.hr{
  border-top:1px dashed #000;
  margin:8px 0
}

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

<div class="center bold">
1005 THE BEST
</div>

<div class="center">
Relatório de Fechamento
</div>

<div class="hr"></div>

<div>
Data: ${brDate(fechadoEm)}
</div>

<div>
Funcionário:
${sessao?.usuario_email || "—"}
</div>

<div class="hr"></div>

<div class="bold">
Movimento em dinheiro
</div>

<pre>
Abertura       ${fmt(
    abertura
  ).padStart(9, " ")}
Vendas         ${fmt(
    vendasDinheiro
  ).padStart(9, " ")}
Reforços       ${fmt(
    entradas
  ).padStart(9, " ")}
Sangrias      -${fmt(
    sangrias
  ).padStart(9, " ")}
Trocos        -${fmt(
    troco
  ).padStart(9, " ")}
</pre>

<div class="hr"></div>

<pre>
${"".padEnd(
    13,
    " "
  )}Calculado Declarado Diferença
${linha(
    "Dinheiro",
    dinheiroSistema,
    dinheiroDeclarado
  )}
${linha(
    "PIX",
    pixSistema,
    pixDeclarado
  )}
${linha(
    "Cartão",
    cartaoSistema,
    cartaoDeclarado
  )}
</pre>

<div class="hr"></div>

<pre>
${"Total sistema".padEnd(
    15,
    " "
  )} ${fmt(
    totalSistema
  ).padStart(9, " ")}
${"Total declarado".padEnd(
    15,
    " "
  )} ${fmt(
    totalDeclarado
  ).padStart(9, " ")}
${"Diferença".padEnd(
    15,
    " "
  )} ${fmt(
    diferenca
  ).padStart(9, " ")}
</pre>

<div class="hr"></div>

<div class="row bold">

<span>
${
  diferenca < 0
    ? "Quebra"
    : diferenca > 0
    ? "Sobra"
    : "Sem diferença"
}
</span>

<span>
${money(diferenca)}
</span>

</div>

<div class="hr"></div>

<div class="center bold">
ASSINATURA
</div>

<div class="sign"></div>

<div class="center">
${sessao?.usuario_email || ""}
</div>

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

  const w = window.open(
    "",
    "_blank",
    "width=420,height=700"
  );

  if (!w) {
    alert(
      "Pop-up bloqueado. Libere pop-up."
    );

    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function FechamentoCaixa() {
  const [sessao, setSessao] =
    useState(null);

  const [preview, setPreview] =
    useState(null);

  const [
    valorAbertura,
    setValorAbertura,
  ] = useState("");

  const [
    dinheiroDecl,
    setDinheiroDecl,
  ] = useState("");

  const [
    pixDecl,
    setPixDecl,
  ] = useState("");

  const [
    cartaoDecl,
    setCartaoDecl,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [msg, setMsg] =
    useState("");

  async function carregar() {
    setLoading(true);
    setMsg("");

    try {
      const r = await api.get(
        "/caixa/sessao-atual"
      );

      const atual =
        r.data?.sessao || null;

      setSessao(atual);

      if (atual) {
        const p = await api.get(
          "/caixa/fechamento-preview"
        );

        setPreview(
          p.data || null
        );
      } else {
        setPreview(null);
      }
    } catch (e) {
      setMsg(
        e?.response?.data?.error ||
          "Erro ao carregar caixa"
      );
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

      const valorDigitado =
        String(
          valorAbertura || ""
        ).trim();

      await api.post(
        "/caixa/abrir",
        {
          valor_abertura:
            valorDigitado
              ? n(valorDigitado)
              : 0,

          caixa_numero: 1,
        }
      );

      setValorAbertura("");

      setMsg(
        "Caixa aberto com sucesso"
      );

      await carregar();
    } catch (e) {
      setMsg(
        e?.response?.data?.error ||
          "Erro ao abrir caixa"
      );
    } finally {
      setLoading(false);
    }
  }

  async function fecharCaixa() {
    if (
      !window.confirm(
        "Deseja fechar o caixa?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setMsg("");

      /*
       * Busca novamente antes de fechar
       * para evitar fechar com valores
       * antigos da tela.
       */
      const p = await api.get(
        "/caixa/fechamento-preview"
      );

      const dados =
        p.data || preview || {};

      const dinheiroSistema = n(
        dados.dinheiro_sistema
      );

      const pixSistema = n(
        dados.pix_sistema ??
          dados.pix
      );

      const cartaoSistema = n(
        dados.cartao_sistema ??
          dados.cartao
      );

      /*
       * REGRA DEFINITIVA:
       *
       * CAMPO VAZIO
       * = assume o valor do sistema
       * = diferença zero.
       *
       * DIGITOU 0
       * = realmente declarou zero
       * = diferença é calculada.
       */

      const dinheiroVazio =
        String(
          dinheiroDecl ?? ""
        ).trim() === "";

      const pixVazio =
        String(
          pixDecl ?? ""
        ).trim() === "";

      const cartaoVazio =
        String(
          cartaoDecl ?? ""
        ).trim() === "";

      const declarado = {
        dinheiro:
          dinheiroVazio
            ? dinheiroSistema
            : n(dinheiroDecl),

        pix:
          pixVazio
            ? pixSistema
            : n(pixDecl),

        cartao:
          cartaoVazio
            ? cartaoSistema
            : n(cartaoDecl),
      };

      const valorFinal = n(
        declarado.dinheiro +
          declarado.pix +
          declarado.cartao
      );

      const r =
        await api.post(
          "/caixa/fechar",
          {
            valor_fechamento:
              valorFinal,

            dinheiro:
              declarado.dinheiro,

            pix:
              declarado.pix,

            cartao:
              declarado.cartao,
          }
        );

      imprimirFechamento({
        sessao,
        preview: dados,
        fechamento:
          r.data?.sessao,
        declarado,
      });

      setMsg(
        "Caixa fechado com sucesso"
      );

      setDinheiroDecl("");
      setPixDecl("");
      setCartaoDecl("");

      await carregar();
    } catch (e) {
      setMsg(
        e?.response?.data?.error ||
          "Erro ao fechar caixa"
      );
    } finally {
      setLoading(false);
    }
  }

  const abertura = n(
    preview?.abertura ??
      sessao?.valor_abertura
  );

  const dinheiroSistema = n(
    preview?.dinheiro_sistema ??
      (
        abertura +
        n(preview?.dinheiro) +
        n(preview?.entradas) -
        n(preview?.saidas)
      )
  );

  const pixSistema = n(
    preview?.pix_sistema ??
      preview?.pix
  );

  const cartaoSistema = n(
    preview?.cartao_sistema ??
      preview?.cartao
  );

  const dinheiroVazio =
    String(
      dinheiroDecl ?? ""
    ).trim() === "";

  const pixVazio =
    String(
      pixDecl ?? ""
    ).trim() === "";

  const cartaoVazio =
    String(
      cartaoDecl ?? ""
    ).trim() === "";

  const dinheiroTela =
    dinheiroVazio
      ? dinheiroSistema
      : n(dinheiroDecl);

  const pixTela =
    pixVazio
      ? pixSistema
      : n(pixDecl);

  const cartaoTela =
    cartaoVazio
      ? cartaoSistema
      : n(cartaoDecl);

  const totalDeclarado = n(
    dinheiroTela +
      pixTela +
      cartaoTela
  );

  return (
    <div
      style={{
        width:
          "min(1700px,96vw)",
        margin:
          "18px auto 26px",
        display: "grid",
        gap: 18,
      }}
    >
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Fechamento de Caixa
            </h2>

            <div
              style={{
                color:
                  "rgba(255,255,255,.65)",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Conferência financeira
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
              value={
                valorAbertura
              }
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
              onClick={
                abrirCaixa
              }
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
              <InfoBox
                titulo="Operador"
                valor={
                  sessao.usuario_email ||
                  "—"
                }
              />

              <InfoBox
                titulo="Abertura"
                valor={money(
                  abertura
                )}
              />

              <InfoBox
                titulo="Total considerado"
                valor={money(
                  totalDeclarado
                )}
              />
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>
                    Conferência Manual
                  </h2>

                  <div
                    style={{
                      marginTop: 5,
                      color:
                        "rgba(255,255,255,.65)",
                      fontSize: 12,
                    }}
                  >
                    Campo vazio =
                    assumir valor do
                    sistema.
                  </div>
                </div>

                <button
                  className="btn-secondary"
                  onClick={
                    carregar
                  }
                  disabled={
                    loading
                  }
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
                <CampoConferencia
                  titulo="Dinheiro"
                  sistema={
                    dinheiroSistema
                  }
                  value={
                    dinheiroDecl
                  }
                  onChange={
                    setDinheiroDecl
                  }
                />

                <CampoConferencia
                  titulo="PIX"
                  sistema={
                    pixSistema
                  }
                  value={
                    pixDecl
                  }
                  onChange={
                    setPixDecl
                  }
                />

                <CampoConferencia
                  titulo="Cartão"
                  sistema={
                    cartaoSistema
                  }
                  value={
                    cartaoDecl
                  }
                  onChange={
                    setCartaoDecl
                  }
                />
              </div>
            </div>

            <button
              className="btn-danger"
              onClick={
                fecharCaixa
              }
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

function InfoBox({
  titulo,
  valor,
}) {
  return (
    <div className="panel">
      <div className="mk-selected-k">
        {titulo}
      </div>

      <div className="mk-selected-v">
        {valor}
      </div>
    </div>
  );
}

function CampoConferencia({
  titulo,
  sistema,
  value,
  onChange,
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 7,
      }}
    >
      <div className="mk-selected-k">
        {titulo} conferência
      </div>

      <input
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder="Vazio = valor do sistema"
        inputMode="decimal"
      />

      <div
        style={{
          fontSize: 11,
          color:
            "rgba(255,255,255,.55)",
        }}
      >
        Sistema:{" "}
        <strong>
          {money(sistema)}
        </strong>
      </div>
    </div>
  );
}