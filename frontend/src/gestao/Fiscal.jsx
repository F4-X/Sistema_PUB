import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function Fiscal({ setTela }) {
  const [produtos, setProdutos] = useState([]);
  const [produtoId, setProdutoId] = useState("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    ncm: "",
    cfop: "",
    csosn: "",
    pis_cst: "",
    cofins_cst: "",
    unidade: "UN",
  });

  async function carregarProdutos() {
    setLoading(true);
    setErro("");

    try {
      const r = await api.get("/produtos?limit=500&page=1");
      const lista = r.data?.items || [];
      setProdutos(lista);

      if (!produtoId && lista[0]) {
        selecionarProduto(lista[0]);
      }
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao carregar produtos");
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  function selecionarProduto(produto) {
    if (!produto) return;

    setProdutoId(String(produto.id));

    setForm({
      ncm: produto.ncm || "",
      cfop: produto.cfop || "",
      csosn: produto.csosn || "",
      pis_cst: produto.pis_cst || "",
      cofins_cst: produto.cofins_cst || "",
      unidade: produto.unidade || "UN",
    });
  }

  function onSelectProduto(id) {
    const p = produtos.find((x) => String(x.id) === String(id));
    selecionarProduto(p);
  }

  const produtoSelecionado = useMemo(() => {
    return produtos.find((p) => String(p.id) === String(produtoId)) || null;
  }, [produtos, produtoId]);

  const produtosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();

    return produtos.filter((p) => {
      const txt = `
        ${p.nome || ""}
        ${p.ncm || ""}
        ${p.cfop || ""}
        ${p.csosn || ""}
        ${p.pis_cst || ""}
        ${p.cofins_cst || ""}
        ${p.unidade || ""}
      `.toLowerCase();

      return !q || txt.includes(q);
    });
  }, [produtos, busca]);

  function copiarDoProduto() {
    if (!produtoSelecionado) return;

    setForm({
      ncm: produtoSelecionado.ncm || "",
      cfop: produtoSelecionado.cfop || "",
      csosn: produtoSelecionado.csosn || "",
      pis_cst: produtoSelecionado.pis_cst || "",
      cofins_cst: produtoSelecionado.cofins_cst || "",
      unidade: produtoSelecionado.unidade || "UN",
    });
  }

  async function salvarFiscal() {
    if (!produtoSelecionado?.id) {
      alert("Selecione um produto");
      return;
    }

    try {
      setLoading(true);

      await api.put(`/produtos/${produtoSelecionado.id}`, {
        nome: produtoSelecionado.nome,
        preco: produtoSelecionado.preco,
        categoria_id: produtoSelecionado.categoria_id || null,
        ncm: form.ncm,
        cfop: form.cfop,
        csosn: form.csosn,
        pis_cst: form.pis_cst,
        cofins_cst: form.cofins_cst,
        unidade: form.unidade || "UN",
      });

      await carregarProdutos();
      alert("Tributação atualizada com sucesso!");
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao salvar tributação");
    } finally {
      setLoading(false);
    }
  }

  function campo(label, key, placeholder) {
    return (
      <div>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 900, marginBottom: 6 }}>
          {label}
        </div>

        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "11px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(10,10,16,.55)",
            color: "var(--text)",
            outline: "none",
          }}
        />
      </div>
    );
  }

  return (
    <div className="pdv-page">
      <header className="pdv-topbar">
        <div className="pdv-brand">
          <div className="pdv-title">1005 PUB</div>
          <div className="pdv-sub">Fiscal & Tributário</div>
        </div>

        <div className="pdv-controls">
          <div className="pdv-toggle">
            <button onClick={() => setTela("menu")}>← Menu</button>
            <button className="active">Tributação</button>
            <button onClick={carregarProdutos} disabled={loading}>
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          width: "min(1800px,97vw)",
          margin: "18px auto 26px",
          display: "grid",
          gap: 14,
        }}
      >
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 style={{ margin: 0 }}>Tributação dos Produtos</h2>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                Selecione um produto e ajuste rapidamente NCM, CFOP, CSOSN, PIS, COFINS e unidade.
              </div>
            </div>

            <span className="badge">
              {loading ? "Carregando..." : `${produtos.length} produto(s)`}
            </span>
          </div>

          {erro ? (
            <div className="empty">
              <div className="empty-title">Erro</div>
              <div className="empty-sub">{erro}</div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr repeat(6, 1fr) auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 900, marginBottom: 6 }}>
                Produto
              </div>

              <select
                value={produtoId}
                onChange={(e) => onSelectProduto(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(10,10,16,.55)",
                  color: "var(--text)",
                  outline: "none",
                }}
              >
                <option value="">Selecione um produto</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {campo("NCM", "ncm", "ex: 24031100")}
            {campo("CFOP", "cfop", "ex: 5405")}
            {campo("CSOSN", "csosn", "ex: 500")}
            {campo("PIS CST", "pis_cst", "ex: 04")}
            {campo("COFINS CST", "cofins_cst", "ex: 04")}
            {campo("Unidade", "unidade", "UN")}

            <button
              className="btn-primary"
              type="button"
              onClick={salvarFiscal}
              disabled={loading || !produtoSelecionado}
              style={{ height: 44 }}
            >
              Salvar
            </button>
          </div>

          {produtoSelecionado ? (
            <div className="empty" style={{ marginTop: 14 }}>
              <div className="empty-title">{produtoSelecionado.nome}</div>
              <div className="empty-sub">
                Preço: R$ {Number(produtoSelecionado.preco || 0).toFixed(2)} • Categoria:{" "}
                {produtoSelecionado.categoria_nome || "Sem categoria"}
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 style={{ margin: 0 }}>Produtos cadastrados</h2>
              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                Clique em um produto para carregar os dados no seletor acima.
              </div>
            </div>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto, NCM, CFOP..."
              style={{
                width: 320,
                padding: "11px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(10,10,16,.55)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </div>

          <div style={{ overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 1100,
              }}
            >
              <thead>
                <tr style={{ color: "var(--muted)", fontSize: 12 }}>
                  <th style={th}>Produto</th>
                  <th style={th}>Preço</th>
                  <th style={th}>NCM</th>
                  <th style={th}>CFOP</th>
                  <th style={th}>CSOSN</th>
                  <th style={th}>PIS</th>
                  <th style={th}>COFINS</th>
                  <th style={th}>UN</th>
                  <th style={th}>Ação</th>
                </tr>
              </thead>

              <tbody>
                {produtosFiltrados.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                    <td style={td}>
                      <strong>{p.nome}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>
                        {p.categoria_nome || "Sem categoria"}
                      </div>
                    </td>
                    <td style={td}>R$ {Number(p.preco || 0).toFixed(2)}</td>
                    <td style={td}>{p.ncm || "—"}</td>
                    <td style={td}>{p.cfop || "—"}</td>
                    <td style={td}>{p.csosn || "—"}</td>
                    <td style={td}>{p.pis_cst || "—"}</td>
                    <td style={td}>{p.cofins_cst || "—"}</td>
                    <td style={td}>{p.unidade || "—"}</td>
                    <td style={td}>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => selecionarProduto(p)}
                      >
                        Editar fiscal
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && produtosFiltrados.length === 0 ? (
                  <tr>
                    <td style={td} colSpan={9}>
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px 8px",
  whiteSpace: "nowrap",
};

const td = {
  padding: "10px 8px",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};