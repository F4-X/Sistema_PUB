import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export function usePDV(confirmDialog) {
  const confirmFn =
    typeof confirmDialog === "function"
      ? confirmDialog
      : (t) => Promise.resolve(window.confirm(t));
  const CAIXA_NUMERO = 1;

  const [search, setSearch] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);

  const [prodPage, setProdPage] = useState(1);
  const [prodPages, setProdPages] = useState(1);
  const [prodTotal, setProdTotal] = useState(0);
  const LIMIT = 16;

  const [cart, setCart] = useState([]);

  const [openCat, setOpenCat] = useState(false);
  const [openProd, setOpenProd] = useState(false);

  const [openPay, setOpenPay] = useState(false);
  const [payDinheiro, setPayDinheiro] = useState("");
  const [payPix, setPayPix] = useState("");
  const [payCartao, setPayCartao] = useState("");
  const [payCartaoTipo, setPayCartaoTipo] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const [descontoTipo, setDescontoTipo] = useState("rs");
  const [descontoValor, setDescontoValor] = useState("");
  const [acrescimoTipo, setAcrescimoTipo] = useState("rs");
  const [acrescimoValor, setAcrescimoValor] = useState("");

  const [lastSale, setLastSale] = useState(null);
  const [openPos, setOpenPos] = useState(false);

  const [catNome, setCatNome] = useState("");
  const [prodNome, setProdNome] = useState("");
  const [prodPreco, setProdPreco] = useState("");
  const [prodCategoriaId, setProdCategoriaId] = useState("");

  const [msg, setMsg] = useState(null);
  const [menu, setMenu] = useState(null);

  const mostrandoProdutos = search.trim().length > 0;

  function toastOk(text) {
    setMsg({ type: "ok", text });
    setTimeout(() => setMsg(null), 1800);
  }

  function toastErr(text) {
    setMsg({ type: "err", text });
    setTimeout(() => setMsg(null), 2400);
  }

  const num = (v) => Number(String(v || "").replace(",", ".")) || 0;
  const clamp2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  function normalizePriceInput(v) {
    return String(v || "").replace(/[^\d.,]/g, "");
  }

  function parseMoneyInput(v) {
    const s = String(v || "").trim();
    if (!s) return NaN;

    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    let normalized = s;

    if (hasComma && hasDot) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
      normalized = s.replace(",", ".");
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? clamp2(n) : NaN;
  }

  async function carregarCategorias() {
    const { data } = await api.get("/categorias");
    setCategorias(data);
  }

  async function carregarProdutos(params = {}) {
    const merged = { limit: LIMIT, page: prodPage, ...params };
    const qs = new URLSearchParams(merged).toString();
    const { data } = await api.get(`/produtos${qs ? `?${qs}` : ""}`);

    if (data && Array.isArray(data.items)) {
      setProdutos(data.items);
      setProdPage(data.page || 1);
      setProdPages(data.pages || 1);
      setProdTotal(data.total || 0);
      return;
    }

    if (Array.isArray(data)) {
      setProdutos(data);
      setProdPages(1);
      setProdTotal(data.length);
    }
  }

  async function recarregarProdutosVisiveis(pageOverride) {
    const s = search.trim();
    const pg = pageOverride ?? prodPage;

    if (s) return carregarProdutos({ search: s, sort: "top", page: pg });
    if (categoriaAtiva) return carregarProdutos({ categoria_id: categoriaAtiva, sort: "top", page: pg });
    return carregarProdutos({ sort: "top", page: pg });
  }

  useEffect(() => {
    carregarCategorias();
    carregarProdutos({ sort: "top", page: 1 });
  }, []);

  useEffect(() => setProdPage(1), [search]);
  useEffect(() => setProdPage(1), [categoriaAtiva]);

  useEffect(() => {
    recarregarProdutosVisiveis(1);
  }, [search, categoriaAtiva]);

  useEffect(() => {
    recarregarProdutosVisiveis(prodPage);
  }, [prodPage]);

  useEffect(() => {
    const close = () => setMenu(null);
    const esc = (e) => e.key === "Escape" && setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  function abrirMenu(type, item, x, y) {
    setMenu({ type, item, x, y });
  }

  function addToCart(p) {
    setCart((atual) => {
      const f = atual.find((i) => i.id === p.id);
      return f
        ? atual.map((i) => (i.id === p.id ? { ...i, qtd: i.qtd + 1 } : i))
        : [...atual, { id: p.id, nome: p.nome, preco: Number(p.preco), qtd: 1 }];
    });
  }

  function incItem(id) {
    setCart((atual) => atual.map((i) => (i.id === id ? { ...i, qtd: i.qtd + 1 } : i)));
  }

  function decItem(id) {
    setCart((atual) =>
      atual
        .map((i) => (i.id === id ? { ...i, qtd: i.qtd - 1 } : i))
        .filter((i) => i.qtd > 0)
    );
  }

  function limparCaixaAtual() {
    setCart([]);
  }

  const totalBruto = useMemo(
    () => clamp2(cart.reduce((s, i) => s + Number(i.preco) * Number(i.qtd), 0)),
    [cart]
  );

  const descontoCalc = useMemo(() => {
    const base = Number(totalBruto || 0);
    const v = num(descontoValor);
    let d = descontoTipo === "pct" ? (base * v) / 100 : v;
    d = clamp2(Math.max(0, Math.min(base, d)));
    return d;
  }, [totalBruto, descontoTipo, descontoValor]);

  const acrescimoCalc = useMemo(() => {
    const base = Number(totalBruto || 0);
    const v = num(acrescimoValor);
    let a = acrescimoTipo === "pct" ? (base * v) / 100 : v;
    a = clamp2(Math.max(0, a));
    return a;
  }, [totalBruto, acrescimoTipo, acrescimoValor]);

  const totalFinal = useMemo(() => {
    const t = clamp2(totalBruto - descontoCalc + acrescimoCalc);
    return Math.max(0, t);
  }, [totalBruto, descontoCalc, acrescimoCalc]);

  function abrirPagamento() {
    if (!cart.length) return toastErr("Carrinho vazio.");

    setPayDinheiro("");
    setPayPix("");
    setPayCartao("");
    setPayCartaoTipo("");

    setDescontoTipo("rs");
    setDescontoValor("");
    setAcrescimoTipo("rs");
    setAcrescimoValor("");

    setOpenPay(true);
  }

  async function confirmarPagamento() {
    if (payLoading) return;
    if (!cart.length) return toastErr("Carrinho vazio.");

    const dinheiro = clamp2(num(payDinheiro));
    const pix = clamp2(num(payPix));
    const cartao = clamp2(num(payCartao));

    const tf = clamp2(totalFinal);

    const restanteAntesCartao = clamp2(Math.max(0, tf - (dinheiro + pix)));
    if (cartao > restanteAntesCartao + 0.00001) {
      return toastErr("Cartão não pode ser maior que o valor restante.");
    }

    if (cartao > 0 && !payCartaoTipo) {
      return toastErr("Escolha crédito ou débito para o cartão.");
    }

    const pagamentos = [
      { tipo: "dinheiro", valor: dinheiro },
      { tipo: "pix", valor: pix },
      { tipo: payCartaoTipo, valor: cartao },
    ].filter((p) => p.valor > 0 && p.tipo);

    if (!pagamentos.length) return toastErr("Informe ao menos um pagamento.");

    const totalPago = clamp2(pagamentos.reduce((s, p) => s + p.valor, 0));
    if (totalPago + 0.00001 < tf) return toastErr("Pagamento insuficiente.");

    const precisaEmDinPix = clamp2(Math.max(0, tf - cartao));
    const troco = clamp2(Math.max(0, (dinheiro + pix) - precisaEmDinPix));

    setPayLoading(true);
    try {
      const payload = {
        caixa_numero: CAIXA_NUMERO,
        itens: cart.map((i) => ({ produto_id: i.id, qtd: i.qtd, preco_unit: i.preco })),
        pagamentos,
        total_bruto: totalBruto,
        desconto: descontoCalc,
        acrescimo: acrescimoCalc,
        total_final: tf,
      };

      const { data } = await api.post("/vendas", payload);
      const vendaIdSeguro = data?.venda_id ?? data?.vendaId ?? null;

      if (vendaIdSeguro) {
        api
          .post(`/vendas/${vendaIdSeguro}/fiscal/emitir`, null, { timeout: 30000 })
          .then(() => toastOk("Venda registrada + NFC-e enviada!"))
          .catch((err) => {
            console.log("ERRO emissão automática (RAW):", err);
            console.log("ERRO emissão automática (DATA):", err?.response?.data);
            console.log("ERRO emissão automática (JSON):", JSON.stringify(err?.response?.data, null, 2));
            toastOk("Venda registrada! (NFC-e ficou pendente)");
          });
      }

      const saleObj = {
        venda_id: vendaIdSeguro ?? "—",
        caixa: CAIXA_NUMERO,
        data: Date.now(),
        itens: cart.map((i) => ({ id: i.id, nome: i.nome, qtd: i.qtd, preco: i.preco })),
        pagamentos,
        total_bruto: totalBruto,
        desconto: descontoCalc,
        acrescimo: acrescimoCalc,
        total: tf,
        troco: Number(data?.troco ?? troco ?? 0),
      };

      setLastSale(saleObj);
      setOpenPos(true);

      setOpenPay(false);
      setCart([]);
      setSearch("");
      setCategoriaAtiva(null);

      setProdPage(1);
      await carregarProdutos({ sort: "top", page: 1 });

      if (!vendaIdSeguro) toastOk("Venda registrada!");
    } catch (e) {
      console.log("ERRO confirmarPagamento:", e?.response?.data || e.message);
      toastErr(e?.response?.data?.error || "Erro ao finalizar venda");
    } finally {
      setPayLoading(false);
    }
  }

  async function criarCategoria() {
    const nome = catNome.trim();
    if (!nome) return toastErr("Informe o nome da categoria.");
    try {
      await api.post("/categorias", { nome });
      setCatNome("");
      setOpenCat(false);
      await carregarCategorias();
      toastOk("Categoria criada!");
    } catch (e) {
      toastErr(e?.response?.data?.error || "Erro ao criar categoria");
    }
  }

  async function criarProduto() {
    const nome = prodNome.trim();
    const precoNum = parseMoneyInput(prodPreco);

    if (!nome) return toastErr("Informe o nome do produto.");
    if (!prodPreco || Number.isNaN(precoNum) || precoNum <= 0) {
      return toastErr("Informe um preço válido.");
    }

    try {
      await api.post("/produtos", {
        nome,
        preco: precoNum,
        categoria_id: prodCategoriaId ? Number(prodCategoriaId) : null,
      });

      setProdNome("");
      setProdPreco("");
      setProdCategoriaId("");
      setOpenProd(false);

      await recarregarProdutosVisiveis(1);
      toastOk("Produto criado!");
    } catch (e) {
      toastErr(e?.response?.data?.error || "Erro ao criar produto");
    }
  }

  async function excluirProduto(p) {
    if (!(await confirmFn(`Excluir produto "${p.nome}"?`))) return;
    try {
      await api.delete(`/produtos/${p.id}`);
      await recarregarProdutosVisiveis(1);
      toastOk("Produto excluído!");
    } catch (e) {
      toastErr(e?.response?.data?.error || "Erro ao excluir produto");
    } finally {
      setMenu(null);
    }
  }

  async function excluirCategoria(c) {
    if (!(await confirmFn(`Excluir categoria "${c.nome}"?`))) return;
    try {
      await api.delete(`/categorias/${c.id}`);
      await carregarCategorias();
      if (categoriaAtiva === c.id) setCategoriaAtiva(null);
      await recarregarProdutosVisiveis(1);
      toastOk("Categoria excluída!");
    } catch (e) {
      toastErr(e?.response?.data?.error || "Erro ao excluir categoria");
    } finally {
      setMenu(null);
    }
  }

  function nextPage() {
    setProdPage((p) => Math.min(prodPages, p + 1));
  }

  function prevPage() {
    setProdPage((p) => Math.max(1, p - 1));
  }

  return {
    caixa: CAIXA_NUMERO,

    search,
    setSearch,
    categorias,
    produtos,
    categoriaAtiva,
    setCategoriaAtiva,
    cart,
    mostrandoProdutos,

    prodPage,
    prodPages,
    prodTotal,
    nextPage,
    prevPage,
    setProdPage,

    openCat,
    setOpenCat,
    openProd,
    setOpenProd,

    openPay,
    setOpenPay,
    payDinheiro,
    setPayDinheiro,
    payPix,
    setPayPix,
    payCartao,
    setPayCartao,
    payCartaoTipo,
    setPayCartaoTipo,
    payLoading,

    descontoTipo,
    setDescontoTipo,
    descontoValor,
    setDescontoValor,
    acrescimoTipo,
    setAcrescimoTipo,
    acrescimoValor,
    setAcrescimoValor,

    total_bruto: totalBruto,
    totalBruto,
    desconto_calc: descontoCalc,
    descontoCalc,
    acrescimo_calc: acrescimoCalc,
    acrescimoCalc,
    total_final: totalFinal,
    totalFinal,

    lastSale,
    setLastSale,
    openPos,
    setOpenPos,

    catNome,
    setCatNome,
    prodNome,
    setProdNome,
    prodPreco,
    setProdPreco,
    prodCategoriaId,
    setProdCategoriaId,

    msg,

    menu,
    abrirMenu,

    addToCart,
    incItem,
    decItem,
    limparCaixaAtual,

    total: totalFinal,

    abrirPagamento,
    confirmarPagamento,

    criarCategoria,
    criarProduto,
    excluirProduto,
    excluirCategoria,

    normalizePriceInput,
  };
}