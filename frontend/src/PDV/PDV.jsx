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

  const [editandoProduto, setEditandoProduto] =
    useState(null);

  // =========================================================
  // PERFIS FISCAIS
  // =========================================================

  const [perfisFiscais, setPerfisFiscais] =
    useState([]);

  const [perfilFiscalId, setPerfilFiscalId] =
    useState("");

  // =========================================================
  // DADOS FISCAIS INTERNOS
  // Não aparecem mais manualmente no modal.
  // São preenchidos pelo perfil fiscal selecionado.
  // =========================================================

  const [ncm, setNcm] = useState("");
  const [cfop, setCfop] = useState("");
  const [csosn, setCsosn] = useState("");
  const [pis, setPis] = useState("");
  const [cofins, setCofins] = useState("");
  const [unidade, setUnidade] = useState("UN");
  const [cest, setCest] = useState("");

  // =========================================================
  // BLUR
  // =========================================================

  useEffect(() => {
    const onWindowBlur = () => {
      try {
        document.activeElement?.blur?.();
      } catch {}
    };

    window.addEventListener(
      "blur",
      onWindowBlur
    );

    return () =>
      window.removeEventListener(
        "blur",
        onWindowBlur
      );
  }, []);

  // =========================================================
  // CARREGAR PERFIS FISCAIS
  // =========================================================

  async function carregarPerfisFiscais() {
    try {
      const { data } = await api.get(
        "/perfis-fiscais"
      );

      setPerfisFiscais(
        Array.isArray(data) ? data : []
      );
    } catch (e) {
      console.log(
        "Erro ao carregar perfis fiscais:",
        e?.response?.data || e
      );

      setPerfisFiscais([]);
    }
  }

  useEffect(() => {
    carregarPerfisFiscais();
  }, []);

  // =========================================================
  // LIMPAR FISCAL
  // =========================================================

  function limparFiscal() {
    setPerfilFiscalId("");

    setNcm("");
    setCfop("");
    setCsosn("");
    setPis("");
    setCofins("");
    setCest("");
    setUnidade("UN");
  }

  // =========================================================
  // SELECIONAR PERFIL FISCAL
  // =========================================================

  function selecionarPerfilFiscal(id) {
    setPerfilFiscalId(id);

    const perfil =
      perfisFiscais.find(
        (p) =>
          String(p.id) ===
          String(id)
      );

    if (!perfil) {
      setNcm("");
      setCfop("");
      setCsosn("");
      setPis("");
      setCofins("");
      setCest("");
      setUnidade("UN");

      return;
    }

    setNcm(perfil.ncm || "");
    setCfop(perfil.cfop || "");
    setCsosn(perfil.csosn || "");
    setPis(perfil.pis_cst || "");
    setCofins(
      perfil.cofins_cst || ""
    );
    setCest(perfil.cest || "");
    setUnidade(
      perfil.unidade || "UN"
    );
  }

  // =========================================================
  // ABRIR NOVO PRODUTO
  // =========================================================

  function abrirNovoProduto() {
    setEditandoProduto(null);

    s.setProdNome("");
    s.setProdPreco("");
    s.setProdCategoriaId("");

    limparFiscal();

    s.setOpenProd(true);
  }

  // =========================================================
  // ABRIR EDIÇÃO
  // =========================================================

  function abrirEditarProduto(produto) {
    setEditandoProduto(produto);

    s.setProdNome(
      produto.nome || ""
    );

    s.setProdPreco(
      String(produto.preco || "")
    );

    s.setProdCategoriaId(
      produto.categoria_id || ""
    );

    setNcm(produto.ncm || "");
    setCfop(produto.cfop || "");
    setCsosn(produto.csosn || "");
    setPis(produto.pis_cst || "");
    setCofins(
      produto.cofins_cst || ""
    );
    setCest(produto.cest || "");
    setUnidade(
      produto.unidade || "UN"
    );

    const perfilEncontrado =
      perfisFiscais.find(
        (p) =>
          String(p.ncm || "") ===
            String(
              produto.ncm || ""
            ) &&
          String(p.cfop || "") ===
            String(
              produto.cfop || ""
            ) &&
          String(p.csosn || "") ===
            String(
              produto.csosn || ""
            ) &&
          String(
            p.pis_cst || ""
          ) ===
            String(
              produto.pis_cst || ""
            ) &&
          String(
            p.cofins_cst || ""
          ) ===
            String(
              produto.cofins_cst ||
                ""
            ) &&
          String(
            p.unidade || "UN"
          ) ===
            String(
              produto.unidade ||
                "UN"
            )
      );

    setPerfilFiscalId(
      perfilEncontrado
        ? String(
            perfilEncontrado.id
          )
        : ""
    );

    s.setOpenProd(true);
  }

  // =========================================================
  // SALVAR PRODUTO
  // =========================================================

  async function salvarProduto() {
    const nome = String(
      s.prodNome || ""
    ).trim();

    const preco = String(
      s.prodPreco || ""
    )
      .trim()
      .replace(",", ".");

    const ncmLimpo = String(
      ncm || ""
    ).replace(/\D/g, "");

    const cfopLimpo = String(
      cfop || ""
    ).replace(/\D/g, "");

    const csosnLimpo = String(
      csosn || ""
    ).replace(/\D/g, "");

    const pisLimpo = String(
      pis || ""
    ).replace(/\D/g, "");

    const cofinsLimpo = String(
      cofins || ""
    ).replace(/\D/g, "");

    const cestLimpo = String(
      cest || ""
    ).replace(/\D/g, "");

    const unidadeLimpa = String(
      unidade || ""
    )
      .trim()
      .toUpperCase();

    const erros = [];

    // =====================================================
    // DADOS BÁSICOS
    // =====================================================

    if (!nome) {
      erros.push(
        "Nome do produto é obrigatório"
      );
    }

    if (
      !preco ||
      !Number.isFinite(
        Number(preco)
      ) ||
      Number(preco) <= 0
    ) {
      erros.push(
        "Preço é obrigatório e deve ser maior que zero"
      );
    }

    // =====================================================
    // PERFIL FISCAL
    // =====================================================

    if (!perfilFiscalId) {
      erros.push(
        "Selecione um tipo fiscal"
      );
    }

    // =====================================================
    // NCM
    // =====================================================

    if (!ncmLimpo) {
      erros.push(
        "NCM é obrigatório"
      );
    } else if (
      ncmLimpo.length !== 8
    ) {
      erros.push(
        "NCM deve possuir exatamente 8 números"
      );
    }

    // =====================================================
    // CFOP
    // =====================================================

    if (!cfopLimpo) {
      erros.push(
        "CFOP é obrigatório"
      );
    } else if (
      cfopLimpo.length !== 4
    ) {
      erros.push(
        "CFOP deve possuir exatamente 4 números"
      );
    }

    // =====================================================
    // CSOSN
    // =====================================================

    if (!csosnLimpo) {
      erros.push(
        "CSOSN (ICMS) é obrigatório"
      );
    } else if (
      csosnLimpo.length !== 3
    ) {
      erros.push(
        "CSOSN deve possuir exatamente 3 números"
      );
    }

    // =====================================================
    // PIS CST
    // =====================================================

    if (!pisLimpo) {
      erros.push(
        "PIS CST é obrigatório"
      );
    } else if (
      pisLimpo.length !== 2
    ) {
      erros.push(
        "PIS CST deve possuir exatamente 2 números"
      );
    }

    // =====================================================
    // COFINS CST
    // =====================================================

    if (!cofinsLimpo) {
      erros.push(
        "COFINS CST é obrigatório"
      );
    } else if (
      cofinsLimpo.length !== 2
    ) {
      erros.push(
        "COFINS CST deve possuir exatamente 2 números"
      );
    }

    // =====================================================
    // CEST
    // =====================================================

    if (
      cestLimpo &&
      cestLimpo.length !== 7
    ) {
      erros.push(
        "CEST deve possuir 7 números"
      );
    }

    // =====================================================
    // UNIDADE
    // =====================================================

    if (!unidadeLimpa) {
      erros.push(
        "Unidade é obrigatória"
      );
    }

    const unidadesPermitidas = [
      "UN",
      "CX",
      "KG",
      "G",
      "L",
      "ML",
      "PC",
    ];

    if (
      unidadeLimpa &&
      !unidadesPermitidas.includes(
        unidadeLimpa
      )
    ) {
      erros.push(
        `Unidade inválida. Use: ${unidadesPermitidas.join(
          ", "
        )}`
      );
    }

    // =====================================================
    // BLOQUEIA SALVAMENTO
    // =====================================================

    if (erros.length) {
      alert(
        "Não foi possível salvar o produto.\n\n" +
          erros
            .map(
              (erro) =>
                `• ${erro}`
            )
            .join("\n")
      );

      return;
    }

    // =====================================================
    // PAYLOAD
    // =====================================================

    const payload = {
      nome,

      preco,

      categoria_id:
        s.prodCategoriaId ||
        null,

      ncm: ncmLimpo,

      cfop: cfopLimpo,

      csosn: csosnLimpo,

      pis_cst: pisLimpo,

      cofins_cst:
        cofinsLimpo,

      cest:
        cestLimpo || null,

      unidade:
        unidadeLimpa,
    };

    try {
      // ===================================================
      // EDITAR
      // ===================================================

      if (
        editandoProduto?.id
      ) {
        await api.put(
          `/produtos/${editandoProduto.id}`,
          payload
        );

        setEditandoProduto(
          null
        );

        limparFiscal();

        s.setOpenProd(
          false
        );

        location.reload();

        return;
      }

      // ===================================================
      // CRIAR
      // ===================================================

      await api.post(
        "/produtos",
        payload
      );

      setEditandoProduto(
        null
      );

      limparFiscal();

      s.setOpenProd(false);

      location.reload();
    } catch (e) {
      alert(
        e?.response?.data?.error ||
          e?.response?.data
            ?.message ||
          "Erro ao salvar produto"
      );
    }
  }

  // =========================================================
  // IMPRIMIR RECIBO
  // =========================================================

  async function printReceipt(
    venda
  ) {
    try {
      blurActiveElement();

      const vendaId =
        venda?.venda_id ||
        venda?.id ||
        venda;

      if (!vendaId) {
        alert(
          "Venda inválida"
        );

        return;
      }

      const { data } =
        await api.get(
          `/vendas/${vendaId}`
        );

      const itens =
        Array.isArray(
          data?.itens
        )
          ? data.itens
          : [];

      const pagamentos =
        Array.isArray(
          data?.pagamentos
        )
          ? data.pagamentos
          : [];

      const saleObj = {
        ...(data?.venda || {}),

        venda_id:
          data?.venda?.id ??
          data?.venda
            ?.venda_id ??
          vendaId,

        itens:
          itens.map((i) => ({
            ...i,

            nome:
              i?.nome ||
              i?.produto_nome ||
              (i?.produto_id
                ? `Produto #${i.produto_id}`
                : "Produto"),

            qtd: Number(
              i?.qtd || 1
            ),

            preco: Number(
              i?.preco ??
                i?.preco_unit ??
                0
            ),

            preco_unit:
              Number(
                i?.preco_unit ??
                  i?.preco ??
                  0
              ),
          })),

        pagamentos:
          pagamentos.map(
            (p) => ({
              ...p,

              tipo: p?.tipo,

              valor: Number(
                p?.valor || 0
              ),
            })
          ),
      };

      s.setLastSale(
        saleObj
      );

      setTimeout(
        () =>
          window.print(),
        120
      );
    } catch (e) {
      blurActiveElement();

      alert(
        "Erro ao carregar venda para recibo"
      );

      console.log(e);
    }
  }

  // =========================================================
  // EMITIR NFC-E
  // =========================================================

  async function emitFiscal(
    vendaId
  ) {
    if (
      !vendaId ||
      vendaId === "—"
    ) {
      blurActiveElement();

      throw new Error(
        "Venda inválida"
      );
    }

    try {
      blurActiveElement();

      const { data } =
        await api.post(
          `/vendas/${vendaId}/fiscal/emitir`
        );

      return data;
    } catch (e) {
      console.log(
        "ERRO EMITIR NFC-e:",
        e?.response?.data ||
          e
      );

      throw e;
    } finally {
      blurActiveElement();
    }
  }

  // =========================================================
  // IMPRIMIR NFC-E
  // =========================================================

  async function printFiscal(
    vendaId
  ) {
    if (
      !vendaId ||
      vendaId === "—"
    ) {
      blurActiveElement();

      return alert(
        "Venda inválida"
      );
    }

    try {
      blurActiveElement();

      const r =
        await api.get(
          `/vendas/${vendaId}/fiscal/pdf`,
          {
            responseType:
              "blob",
          }
        );

      const blob =
        new Blob(
          [r.data],
          {
            type:
              "application/pdf",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const w =
        window.open(
          url,
          "_blank"
        );

      if (!w) {
        alert(
          "Pop-up bloqueado. Libere pop-up pra imprimir."
        );

        return;
      }

      w.onload = () => {
        w.focus();
        w.print();
      };
    } catch (e) {
      blurActiveElement();

      alert(
        errMsg(
          e,
          "Erro ao imprimir NFC-e"
        )
      );
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="pdv-page">
      <div className="no-print">
        <TopbarPDV
          page={page}
          setPage={setPage}
          search={s.search}
          setSearch={
            s.setSearch
          }
          onBack={() =>
            setTela("menu")
          }
          onLogout={
            onLogout
          }
        />

        <Toast msg={s.msg} />

        {page === "hist" ? (
          <Historico
            onPrintReceipt={
              printReceipt
            }
            onEmitFiscal={
              emitFiscal
            }
            onPrintFiscal={
              printFiscal
            }
          />
        ) : page ===
          "caixa" ? (
          <Caixa />
        ) : page ===
          "fechamento" ? (
          <FechamentoCaixa />
        ) : (
          <>
            <main className="pdv-grid">
              <section className="panel">
                {!s.mostrandoProdutos && (
                  <Categorias
                    categorias={
                      s.categorias
                    }
                    categoriaAtiva={
                      s.categoriaAtiva
                    }
                    setCategoriaAtiva={
                      s.setCategoriaAtiva
                    }
                    onCtx={
                      s.abrirMenu
                    }
                    onOpenCat={() =>
                      s.setOpenCat(
                        true
                      )
                    }
                  />
                )}

                <Produtos
                  produtos={
                    s.produtos
                  }
                  mostrandoProdutos={
                    s.mostrandoProdutos
                  }
                  onAdd={
                    s.addToCart
                  }
                  onCtx={
                    s.abrirMenu
                  }
                  onOpenProd={
                    abrirNovoProduto
                  }
                  page={
                    s.prodPage
                  }
                  pages={
                    s.prodPages
                  }
                  total={
                    s.prodTotal
                  }
                  onPrev={
                    s.prevPage
                  }
                  onNext={
                    s.nextPage
                  }
                />
              </section>

              <Carrinho
                caixa={1}
                cart={s.cart}
                total={s.total}
                onDec={
                  s.decItem
                }
                onInc={
                  s.incItem
                }
                onClear={
                  s.limparCaixaAtual
                }
                onFinish={() => {
                  blurActiveElement();

                  s.abrirPagamento();
                }}
              />
            </main>

            <ContextMenu
              menu={
                s.openProd
                  ? null
                  : s.menu
              }
              onEditarProduto={
                abrirEditarProduto
              }
              onExcluirProduto={
                s.excluirProduto
              }
              onExcluirCategoria={
                s.excluirCategoria
              }
            />

            <ModalCategoria
              open={
                s.openCat
              }
              value={
                s.catNome
              }
              onChange={
                s.setCatNome
              }
              onClose={() => {
                blurActiveElement();

                s.setOpenCat(
                  false
                );
              }}
              onSave={
                s.criarCategoria
              }
            />

            <ModalProduto
              open={
                s.openProd
              }

              nome={
                s.prodNome
              }

              preco={
                s.prodPreco
              }

              categoriaId={
                s.prodCategoriaId
              }

              categorias={
                s.categorias
              }

              perfisFiscais={
                perfisFiscais
              }

              perfilFiscalId={
                perfilFiscalId
              }

              setPerfilFiscalId={
                selecionarPerfilFiscal
              }

              onClose={() => {
                blurActiveElement();

                setEditandoProduto(
                  null
                );

                limparFiscal();

                s.setOpenProd(
                  false
                );
              }}

              onSave={
                salvarProduto
              }

              setNome={
                s.setProdNome
              }

              setPreco={
                s.setProdPreco
              }

              setCategoriaId={
                s.setProdCategoriaId
              }

              titulo={
                editandoProduto
                  ? "Editar Produto"
                  : "Cadastrar Produto"
              }

              textoBotao={
                editandoProduto
                  ? "Salvar alterações"
                  : "Salvar"
              }
            />

            <ModalPagamento
              open={
                s.openPay
              }

              total={
                s.totalFinal
              }

              dinheiro={
                s.payDinheiro
              }

              pix={
                s.payPix
              }

              debito={
                s.payDebito
              }

              credito={
                s.payCredito
              }

              setDinheiro={
                s.setPayDinheiro
              }

              setPix={
                s.setPayPix
              }

              setDebito={
                s.setPayDebito
              }

              setCredito={
                s.setPayCredito
              }

              descontoTipo={
                s.descontoTipo
              }

              setDescontoTipo={
                s.setDescontoTipo
              }

              descontoValor={
                s.descontoValor
              }

              setDescontoValor={
                s.setDescontoValor
              }

              onClose={() => {
                if (
                  !s.payLoading
                ) {
                  blurActiveElement();

                  s.setOpenPay(
                    false
                  );
                }
              }}

              onConfirm={
                async () => {
                  blurActiveElement();

                  await s.confirmarPagamento();

                  blurActiveElement();
                }
              }

              loading={
                s.payLoading
              }
            />

            {s.openPos && (
              <div
                className="modal-backdrop"
                onClick={() => {
                  blurActiveElement();

                  s.setOpenPos(
                    false
                  );
                }}
              >
                <div
                  className="modal"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  <h3>
                    Venda finalizada
                  </h3>

                  <p
                    style={{
                      marginTop: 0,
                      opacity: 0.85,
                    }}
                  >
                    O que você quer
                    fazer agora?
                  </p>

                  <div
                    className="modal-actions"
                    style={{
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        blurActiveElement();

                        s.setOpenPos(
                          false
                        );
                      }}
                    >
                      Não imprimir
                    </button>

                    <button
                      className="btn-primary"
                      onClick={() => {
                        blurActiveElement();

                        s.setOpenPos(
                          false
                        );

                        printReceipt(
                          s.lastSale
                        );
                      }}
                    >
                      Imprimir recibo
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => {
                        blurActiveElement();

                        printFiscal(
                          s.lastSale
                            ?.venda_id
                        );
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
        <Recibo
          sale={s.lastSale}
        />
      </div>
    </div>
  );
}