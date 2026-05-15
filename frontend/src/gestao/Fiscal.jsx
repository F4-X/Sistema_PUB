import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function Fiscal({ setTela }) {
  const [produtos, setProdutos] = useState([]);
  const [produtoId, setProdutoId] = useState("");

  const [busca, setBusca] = useState("");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [page, setPage] = useState(1);

  const PER_PAGE = 6;

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
      setErro(
        e?.response?.data?.error ||
          "Erro ao carregar produtos"
      );

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
    const p = produtos.find(
      (x) => String(x.id) === String(id)
    );

    selecionarProduto(p);
  }

  const produtoSelecionado = useMemo(() => {
    return (
      produtos.find(
        (p) =>
          String(p.id) === String(produtoId)
      ) || null
    );
  }, [produtos, produtoId]);

  const produtosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();

    return produtos.filter((p) => {
      const txt = `
        ${p.nome || ""}
        ${p.ncm || ""}
        ${p.cfop || ""}
        ${p.csosn || ""}
      `.toLowerCase();

      return !q || txt.includes(q);
    });
  }, [produtos, busca]);

  const totalPages = Math.max(
    1,
    Math.ceil(produtosFiltrados.length / PER_PAGE)
  );

  const produtosPaginados = useMemo(() => {
    const start = (page - 1) * PER_PAGE;

    return produtosFiltrados.slice(
      start,
      start + PER_PAGE
    );
  }, [produtosFiltrados, page]);

  async function salvarFiscal() {
    if (!produtoSelecionado?.id) {
      alert("Selecione um produto");
      return;
    }

    try {
      setLoading(true);

      await api.put(
        `/produtos/${produtoSelecionado.id}`,
        {
          nome: produtoSelecionado.nome,
          preco: produtoSelecionado.preco,
          categoria_id:
            produtoSelecionado.categoria_id ||
            null,

          ncm: form.ncm,
          cfop: form.cfop,
          csosn: form.csosn,
          pis_cst: form.pis_cst,
          cofins_cst: form.cofins_cst,
          unidade: form.unidade || "UN",
        }
      );

      await carregarProdutos();

      alert("Tributação atualizada!");
    } catch (e) {
      alert(
        e?.response?.data?.error ||
          "Erro ao salvar"
      );
    } finally {
      setLoading(false);
    }
  }

  function selectCampo(
    label,
    key,
    options
  ) {
    return (
      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            fontWeight: 900,
            marginBottom: 6,
          }}
        >
          {label}
        </div>

        <select
          value={form[key]}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [key]: e.target.value,
            }))
          }
          style={inputStyle}
        >
          <option value="">
            Selecione
          </option>

          {options.map((op) => (
            <option
              key={op.value}
              value={op.value}
            >
              {op.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="pdv-page">
      <header className="pdv-topbar">
        <div className="pdv-brand">
          <div className="pdv-title">
            1005 PUB
          </div>

          <div className="pdv-sub">
            Fiscal & Tributário
          </div>
        </div>

        <div className="pdv-controls">
          <div className="pdv-toggle">
            <button
              onClick={() =>
                setTela("menu")
              }
            >
              ← Menu
            </button>

            <button className="active">
              Tributação
            </button>

            <button
              onClick={carregarProdutos}
              disabled={loading}
            >
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          width: "min(1850px,98vw)",
          margin: "18px auto 26px",
          display: "grid",
          gap: 14,
        }}
      >
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 style={{ margin: 0 }}>
                Tributação dos Produtos
              </h2>

              <div
                style={{
                  marginTop: 6,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Selecione um produto e
                escolha os códigos fiscais.
              </div>
            </div>

            <span className="badge">
              {produtos.length} produto(s)
            </span>
          </div>

          {erro ? (
            <div className="empty">
              <div className="empty-title">
                Erro
              </div>

              <div className="empty-sub">
                {erro}
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "2fr repeat(6, 1fr) auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={labelStyle}>
                Produto
              </div>

              <select
                value={produtoId}
                onChange={(e) =>
                  onSelectProduto(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Selecione um produto
                </option>

                {produtos.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {selectCampo(
              "NCM",
              "ncm",
              [
                {
                  value: "24031100",
                  label:
                    "24031100 - Narguilé",
                },
                {
                  value: "22030000",
                  label:
                    "22030000 - Cerveja",
                },
                {
                  value: "22021000",
                  label:
                    "22021000 - Refrigerante",
                },
              ]
            )}

            {selectCampo(
              "CFOP",
              "cfop",
              [
                {
                  value: "5102",
                  label: "5102",
                },
                {
                  value: "5405",
                  label: "5405",
                },
                {
                  value: "6102",
                  label: "6102",
                },
              ]
            )}

            {selectCampo(
              "CSOSN",
              "csosn",
              [
                {
                  value: "102",
                  label: "102",
                },
                {
                  value: "400",
                  label: "400",
                },
                {
                  value: "500",
                  label: "500",
                },
              ]
            )}

            {selectCampo(
              "PIS CST",
              "pis_cst",
              [
                {
                  value: "01",
                  label: "01",
                },
                {
                  value: "04",
                  label: "04",
                },
                {
                  value: "06",
                  label: "06",
                },
                {
                  value: "07",
                  label: "07",
                },
                {
                  value: "08",
                  label: "08",
                },
                {
                  value: "09",
                  label: "09",
                },
              ]
            )}

            {selectCampo(
              "COFINS CST",
              "cofins_cst",
              [
                {
                  value: "01",
                  label: "01",
                },
                {
                  value: "04",
                  label: "04",
                },
                {
                  value: "06",
                  label: "06",
                },
                {
                  value: "07",
                  label: "07",
                },
                {
                  value: "08",
                  label: "08",
                },
                {
                  value: "09",
                  label: "09",
                },
              ]
            )}

            {selectCampo(
              "Unidade",
              "unidade",
              [
                {
                  value: "UN",
                  label: "UN",
                },
                {
                  value: "CX",
                  label: "CX",
                },
                {
                  value: "KG",
                  label: "KG",
                },
                {
                  value: "ML",
                  label: "ML",
                },
              ]
            )}

            <button
              className="btn-primary"
              type="button"
              onClick={salvarFiscal}
              disabled={
                loading ||
                !produtoSelecionado
              }
              style={{ height: 44 }}
            >
              Salvar
            </button>
          </div>

          {produtoSelecionado ? (
            <div
              className="empty"
              style={{ marginTop: 14 }}
            >
              <div className="empty-title">
                {
                  produtoSelecionado.nome
                }
              </div>

              <div className="empty-sub">
                Preço: R${" "}
                {Number(
                  produtoSelecionado.preco ||
                    0
                ).toFixed(2)}
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 style={{ margin: 0 }}>
                Produtos cadastrados
              </h2>

              <div
                style={{
                  marginTop: 6,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                Clique em um produto
                para editar.
              </div>
            </div>
          </div>

          <div style={{ overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                minWidth: 1100,
              }}
            >
              <thead>
                <tr
                  style={{
                    color:
                      "var(--muted)",
                    fontSize: 12,
                  }}
                >
                  <th style={th}>
                    Produto
                  </th>

                  <th style={th}>
                    Preço
                  </th>

                  <th style={th}>
                    NCM
                  </th>

                  <th style={th}>
                    CFOP
                  </th>

                  <th style={th}>
                    CSOSN
                  </th>

                  <th style={th}>
                    PIS
                  </th>

                  <th style={th}>
                    COFINS
                  </th>

                  <th style={th}>
                    UN
                  </th>

                  <th style={th}>
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {produtosPaginados.map(
                  (p) => (
                    <tr
                      key={p.id}
                      style={{
                        borderTop:
                          "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      <td style={td}>
                        <strong>
                          {p.nome}
                        </strong>
                      </td>

                      <td style={td}>
                        R${" "}
                        {Number(
                          p.preco ||
                            0
                        ).toFixed(2)}
                      </td>

                      <td style={td}>
                        {p.ncm ||
                          "—"}
                      </td>

                      <td style={td}>
                        {p.cfop ||
                          "—"}
                      </td>

                      <td style={td}>
                        {p.csosn ||
                          "—"}
                      </td>

                      <td style={td}>
                        {p.pis_cst ||
                          "—"}
                      </td>

                      <td style={td}>
                        {p.cofins_cst ||
                          "—"}
                      </td>

                      <td style={td}>
                        {p.unidade ||
                          "—"}
                      </td>

                      <td style={td}>
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() =>
                            selecionarProduto(
                              p
                            )
                          }
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {!loading &&
                produtosPaginados.length ===
                  0 ? (
                  <tr>
                    <td
                      style={td}
                      colSpan={9}
                    >
                      Nenhum produto
                      encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    flexWrap: "wrap",
  }}
>
  <input
    value={busca}
    onChange={(e) => {
      setBusca(e.target.value);
      setPage(1);
    }}
    placeholder="Buscar produto..."
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
            <div
              style={{
                color:
                  "var(--muted)",
                fontSize: 13,
              }}
            >
              Página {page} de{" "}
              {totalPages}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >

              <button
                className="btn-secondary"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (p) => p - 1
                  )
                }
              >
                ← Anterior
              </button>

              <button
                className="btn-secondary"
                disabled={
                  page >=
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (p) => p + 1
                  )
                }
              >
                Próxima →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const labelStyle = {
  fontSize: 12,
  color: "var(--muted)",
  fontWeight: 900,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border:
    "1px solid rgba(255,255,255,.10)",
  background:
    "rgba(10,10,16,.55)",
  color: "var(--text)",
  outline: "none",
};

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