// frontend/src/PDV.jsx
import { useEffect, useState } from "react";
import { usePDV } from "./usePDV";
import { api } from "../api";
import Historico from "./Historico";
import Recibo from "./Recibo";
import Caixa from "./Caixa";
import FechamentoCaixa from "./FechamentoCaixa";
import {
  TopbarPDV,
  Toast,
  Categorias,
  Produtos,
  Carrinho,
  ContextMenu,
  ModalCategoria,
  ModalProduto,
  ModalPagamento,
} from "../components.jsx";

function pretty(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function errMsg(e, fallback) {
  const d = e?.response?.data;
  return (
    d?.detalhe ||
    d?.error ||
    d?.message ||
    (typeof d === "string" ? d : pretty(d)) ||
    e?.message ||
    fallback
  );
}

function blurActiveElement() {
  setTimeout(() => {
    try {
      document?.activeElement?.blur?.();
    } catch {}
  }, 0);
}

export default function PDV({ setTela, onLogout }) {
  const s = usePDV();
  const [page, setPage] = useState("pdv");
  const [editandoProduto, setEditandoProduto] = useState(null);

  useEffect(() => {
    const onWindowBlur = () => {
      try {
        document.activeElement?.blur?.();
      } catch {}
    };

    window.addEventListener("blur", onWindowBlur);
    return () => window.removeEventListener("blur", onWindowBlur);
  }, []);

  function abrirNovoProduto() {
    setEditandoProduto(null);
    s.setProdNome("");
    s.setProdPreco("");
    s.setProdCategoriaId("");
    s.setOpenProd(true);
  }

  function abrirEditarProduto(produto) {
    setEditandoProduto(produto);
    s.setProdNome(produto.nome || "");
    s.setProdPreco(String(produto.preco || ""));
    s.setProdCategoriaId(produto.categoria_id || "");
    s.setOpenProd(true);
  }

  async function salvarProduto() {
    if (editandoProduto?.id) {
      await api.put(`/produtos/${editandoProduto.id}`, {
        nome: s.prodNome,
        preco: String(s.prodPreco).replace(",", "."),
        categoria_id: s.prodCategoriaId || null,
      });

      setEditandoProduto(null);
      s.setOpenProd(false);
      location.reload();
      return;
    }

    await s.criarProduto();
  }

  async function printReceipt(venda) {
    try {
      blurActiveElement();

      const vendaId = venda?.venda_id || venda?.id || venda;

      if (!vendaId) {
        alert("Venda inválida");
        return;
      }

      const { data } = await api.get(`/vendas/${vendaId}`);

      const itens = Array.isArray(data?.itens) ? data.itens : [];
      const pagamentos = Array.isArray(data?.pagamentos) ? data.pagamentos : [];

      const saleObj = {
        ...(data?.venda || {}),
        venda_id: data?.venda?.id ?? data?.venda?.venda_id ?? vendaId,
        itens: itens.map((i) => ({
          ...i,
          nome:
            i?.nome ||
            i?.produto_nome ||
            (i?.produto_id ? `Produto #${i.produto_id}` : "Produto"),
          qtd: Number(i?.qtd || 1),
          preco: Number(i?.preco ?? i?.preco_unit ?? 0),
          preco_unit: Number(i?.preco_unit ?? i?.preco ?? 0),
        })),
        pagamentos: pagamentos.map((p) => ({
          ...p,
          tipo: p?.tipo,
          valor: Number(p?.valor || 0),
        })),
      };

      s.setLastSale(saleObj);
      setTimeout(() => window.print(), 120);
    } catch (e) {
      blurActiveElement();
      alert("Erro ao carregar venda para recibo");
      console.log(e);
    }
  }

  async function emitFiscal(vendaId) {
    if (!vendaId || vendaId === "—") {
      blurActiveElement();
      throw new Error("Venda inválida");
    }

    try {
      blurActiveElement();
      const { data } = await api.post(`/vendas/${vendaId}/fiscal/emitir`);
      return data;
    } catch (e) {
      console.log("ERRO EMITIR NFC-e:", e?.response?.data || e);
      throw e;
    } finally {
      blurActiveElement();
    }
  }

  async function printFiscal(vendaId) {
    if (!vendaId || vendaId === "—") {
      blurActiveElement();
      return alert("Venda inválida");
    }

    try {
      blurActiveElement();

      const r = await api.get(`/vendas/${vendaId}/fiscal/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const w = window.open(url, "_blank");
      if (!w) {
        alert("Pop-up bloqueado. Libere pop-up pra imprimir.");
        return;
      }

      w.onload = () => {
        w.focus();
        w.print();
      };
    } catch (e) {
      blurActiveElement();
      alert(errMsg(e, "Erro ao imprimir NFC-e"));
    }
  }

  return (
    <div className="pdv-page">
      <div className="no-print">
        <TopbarPDV
          page={page}
          setPage={setPage}
          search={s.search}
          setSearch={s.setSearch}
          onBack={() => setTela("menu")}
          onLogout={onLogout}
        />

        <Toast msg={s.msg} />

        {page === "hist" ? (
          <Historico
            onPrintReceipt={printReceipt}
            onEmitFiscal={emitFiscal}
            onPrintFiscal={printFiscal}
          />
        ) : page === "caixa" ? (
          <Caixa />
        ) : page === "fechamento" ? (
          <FechamentoCaixa />
        ) : (
          <>
            <main className="pdv-grid">
              <section className="panel">
                {!s.mostrandoProdutos && (
                  <Categorias
                    categorias={s.categorias}
                    categoriaAtiva={s.categoriaAtiva}
                    setCategoriaAtiva={s.setCategoriaAtiva}
                    onCtx={s.abrirMenu}
                    onOpenCat={() => s.setOpenCat(true)}
                  />
                )}

                <Produtos
                  produtos={s.produtos}
                  mostrandoProdutos={s.mostrandoProdutos}
                  onAdd={s.addToCart}
                  onCtx={s.abrirMenu}
                  onOpenProd={abrirNovoProduto}
                  page={s.prodPage}
                  pages={s.prodPages}
                  total={s.prodTotal}
                  onPrev={s.prevPage}
                  onNext={s.nextPage}
                />
              </section>

              <Carrinho
                caixa={1}
                cart={s.cart}
                total={s.total}
                onDec={s.decItem}
                onInc={s.incItem}
                onClear={s.limparCaixaAtual}
                onFinish={() => {
                  blurActiveElement();
                  s.abrirPagamento();
                }}
              />
            </main>

            <ContextMenu
              menu={s.menu}
              onEditarProduto={abrirEditarProduto}
              onExcluirProduto={s.excluirProduto}
              onExcluirCategoria={s.excluirCategoria}
            />

            <ModalCategoria
              open={s.openCat}
              value={s.catNome}
              onChange={s.setCatNome}
              onClose={() => {
                blurActiveElement();
                s.setOpenCat(false);
              }}
              onSave={s.criarCategoria}
            />

            <ModalProduto
              open={s.openProd}
              nome={s.prodNome}
              preco={s.prodPreco}
              categoriaId={s.prodCategoriaId}
              categorias={s.categorias}
              onClose={() => {
                blurActiveElement();
                setEditandoProduto(null);
                s.setOpenProd(false);
              }}
              onSave={salvarProduto}
              setNome={s.setProdNome}
              setPreco={s.setProdPreco}
              setCategoriaId={s.setProdCategoriaId}
              titulo={editandoProduto ? "Editar Produto" : "Cadastrar Produto"}
              textoBotao={editandoProduto ? "Salvar alterações" : "Salvar"}
            />

            <ModalPagamento
              open={s.openPay}
              total={s.totalFinal}
              dinheiro={s.payDinheiro}
              pix={s.payPix}
              cartao={s.payCartao}
              cartaoTipo={s.payCartaoTipo}
              setDinheiro={s.setPayDinheiro}
              setPix={s.setPayPix}
              setCartao={s.setPayCartao}
              setCartaoTipo={s.setPayCartaoTipo}
              descontoTipo={s.descontoTipo}
              setDescontoTipo={s.setDescontoTipo}
              descontoValor={s.descontoValor}
              setDescontoValor={s.setDescontoValor}
              onClose={() => {
                if (!s.payLoading) {
                  blurActiveElement();
                  s.setOpenPay(false);
                }
              }}
              onConfirm={async () => {
                blurActiveElement();
                await s.confirmarPagamento();
                blurActiveElement();
              }}
              loading={s.payLoading}
            />

            {s.openPos && (
              <div
                className="modal-backdrop"
                onClick={() => {
                  blurActiveElement();
                  s.setOpenPos(false);
                }}
              >
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <h3>Venda finalizada</h3>
                  <p style={{ marginTop: 0, opacity: 0.85 }}>
                    O que você quer fazer agora?
                  </p>

                  <div className="modal-actions" style={{ flexWrap: "wrap" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        blurActiveElement();
                        s.setOpenPos(false);
                      }}
                    >
                      Não imprimir
                    </button>

                    <button
                      className="btn-primary"
                      onClick={() => {
                        blurActiveElement();
                        s.setOpenPos(false);
                        printReceipt(s.lastSale);
                      }}
                    >
                      Imprimir recibo
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => {
                        blurActiveElement();
                        printFiscal(s.lastSale?.venda_id);
                      }}
                    >
                      Imprimir NFC-e
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="print-area">
        <Recibo sale={s.lastSale} />
      </div>
    </div>
  );
}