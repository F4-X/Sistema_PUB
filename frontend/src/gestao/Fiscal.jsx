import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const CST_OPTIONS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "49",
  "50",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "70",
  "71",
  "72",
  "73",
  "74",
  "75",
  "98",
  "99",
].map((v) => ({
  value: v,
  label: v,
}));

export default function Fiscal({ setTela }) {
  const [produtos, setProdutos] = useState([]);
  const [perfisFiscais, setPerfisFiscais] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [perfilFiscalId, setPerfilFiscalId] = useState("");

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
    cest: "",
    unidade: "UN",
  });

  // =========================================================
  // CARREGAR PERFIS FISCAIS
  // =========================================================

  async function carregarPerfisFiscais() {
    try {
      const r = await api.get("/perfis-fiscais");

      const lista = Array.isArray(r.data)
        ? r.data
        : [];

      setPerfisFiscais(lista);
    } catch (e) {
      console.error(
        "Erro ao carregar perfis fiscais:",
        e?.response?.data || e
      );

      setPerfisFiscais([]);
    }
  }

  // =========================================================
  // CARREGAR PRODUTOS
  // =========================================================

  async function carregarProdutos() {
    setLoading(true);
    setErro("");

    try {
      const r = await api.get(
        "/produtos?limit=500&page=1"
      );

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

  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================

  useEffect(() => {
    async function iniciar() {
      await carregarPerfisFiscais();
      await carregarProdutos();
    }

    iniciar();
  }, []);

  // =========================================================
  // LOCALIZAR PERFIL DO PRODUTO
  // =========================================================

  function localizarPerfilFiscal(produto) {
    if (!produto) {
      return null;
    }

    return (
      perfisFiscais.find(
        (perfil) =>
          String(perfil.ncm || "") ===
            String(produto.ncm || "") &&
          String(perfil.cfop || "") ===
            String(produto.cfop || "") &&
          String(perfil.csosn || "") ===
            String(produto.csosn || "") &&
          String(perfil.pis_cst || "") ===
            String(produto.pis_cst || "") &&
          String(perfil.cofins_cst || "") ===
            String(produto.cofins_cst || "") &&
          String(perfil.unidade || "UN") ===
            String(produto.unidade || "UN")
      ) || null
    );
  }

  // =========================================================
  // SELECIONAR PRODUTO
  // =========================================================

  function selecionarProduto(produto) {
    if (!produto) {
      return;
    }

    setProdutoId(
      String(produto.id)
    );

    setForm({
      ncm: produto.ncm || "",
      cfop: produto.cfop || "",
      csosn: produto.csosn || "",
      pis_cst: produto.pis_cst || "",
      cofins_cst:
        produto.cofins_cst || "",
      cest: produto.cest || "",
      unidade:
        produto.unidade || "UN",
    });

    const perfil =
      localizarPerfilFiscal(produto);

    setPerfilFiscalId(
      perfil
        ? String(perfil.id)
        : ""
    );
  }

  function onSelectProduto(id) {
    const produto =
      produtos.find(
        (x) =>
          String(x.id) ===
          String(id)
      );

    selecionarProduto(produto);
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
      return;
    }

    setForm({
      ncm: perfil.ncm || "",
      cfop: perfil.cfop || "",
      csosn: perfil.csosn || "",
      pis_cst: perfil.pis_cst || "",
      cofins_cst:
        perfil.cofins_cst || "",
      cest: perfil.cest || "",
      unidade:
        perfil.unidade || "UN",
    });
  }

  // =========================================================
  // PRODUTO SELECIONADO
  // =========================================================

  const produtoSelecionado =
    useMemo(() => {
      return (
        produtos.find(
          (p) =>
            String(p.id) ===
            String(produtoId)
        ) || null
      );
    }, [produtos, produtoId]);

  // =========================================================
  // FILTRO
  // =========================================================

  const produtosFiltrados =
    useMemo(() => {
      const q = busca
        .toLowerCase()
        .trim();

      return produtos.filter(
        (p) => {
          const txt = `
            ${p.nome || ""}
            ${p.ncm || ""}
            ${p.cfop || ""}
            ${p.csosn || ""}
            ${p.pis_cst || ""}
            ${p.cofins_cst || ""}
            ${p.cest || ""}
            ${p.unidade || ""}
          `.toLowerCase();

          return (
            !q ||
            txt.includes(q)
          );
        }
      );
    }, [produtos, busca]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      produtosFiltrados.length /
        PER_PAGE
    )
  );

  const produtosPaginados =
    useMemo(() => {
      const start =
        (page - 1) *
        PER_PAGE;

      return produtosFiltrados.slice(
        start,
        start + PER_PAGE
      );
    }, [
      produtosFiltrados,
      page,
    ]);

  // =========================================================
  // SALVAR FISCAL
  // =========================================================

  async function salvarFiscal() {
    if (
      !produtoSelecionado?.id
    ) {
      alert(
        "Selecione um produto"
      );

      return;
    }

    if (!form.ncm) {
      alert(
        "Selecione um tipo fiscal ou informe o NCM"
      );

      return;
    }

    try {
      setLoading(true);

      await api.put(
        `/produtos/${produtoSelecionado.id}`,
        {
          nome:
            produtoSelecionado.nome,

          preco:
            produtoSelecionado.preco,

          categoria_id:
            produtoSelecionado.categoria_id ||
            null,

          ncm: form.ncm,

          cfop: form.cfop,

          csosn:
            form.csosn,

          pis_cst:
            form.pis_cst,

          cofins_cst:
            form.cofins_cst,

          cest:
            form.cest || null,

          unidade:
            form.unidade || "UN",
        }
      );

      await carregarProdutos();

      alert(
        "Tributação atualizada!"
      );
    } catch (e) {
      alert(
        e?.response?.data?.error ||
          "Erro ao salvar"
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // SELECT GENÉRICO
  // =========================================================

  function selectCampo(
    label,
    key,
    options
  ) {
    return (
      <div>
        <div style={labelStyle}>
          {label}
        </div>

        <select
          value={
            form[key] || ""
          }
          onChange={(e) => {
            const value =
              e.target.value;

            setForm((f) => ({
              ...f,
              [key]: value,
            }));
          }}
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

  // =========================================================
  // RENDER
  // =========================================================

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
              onClick={async () => {
                await carregarPerfisFiscais();
                await carregarProdutos();
              }}
              disabled={loading}
            >
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          width:
            "min(1850px,98vw)",
          margin:
            "18px auto 26px",
          display: "grid",
          gap: 14,
        }}
      >
        {/* ===================================================
            TRIBUTAÇÃO
        =================================================== */}

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2
                style={{
                  margin: 0,
                }}
              >
                Tributação dos Produtos
              </h2>

              <div
                style={{
                  marginTop: 6,
                  color:
                    "var(--muted)",
                  fontSize: 13,
                }}
              >
                Escolha um tipo fiscal para preencher automaticamente os dados tributários do produto.
              </div>
            </div>

            <span className="badge">
              {produtos.length}{" "}
              produto(s)
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
                "1.7fr 1.4fr repeat(6, 1fr) auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            {/* PRODUTO */}

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

                {produtos.map(
                  (p) => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.nome}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* PERFIL FISCAL */}

            <div>
              <div style={labelStyle}>
                Tipo fiscal
              </div>

              <select
                value={
                  perfilFiscalId
                }
                onChange={(e) =>
                  selecionarPerfilFiscal(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Selecione
                </option>

                {perfisFiscais.map(
                  (perfil) => (
                    <option
                      key={
                        perfil.id
                      }
                      value={
                        perfil.id
                      }
                    >
                      {perfil.nome} -{" "}
                      {perfil.ncm}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* NCM */}

            <div>
              <div style={labelStyle}>
                NCM
              </div>

              <input
                value={
                  form.ncm
                }
                onChange={(e) =>
                  setForm(
                    (f) => ({
                      ...f,
                      ncm:
                        e.target
                          .value,
                    })
                  )
                }
                style={inputStyle}
                placeholder="NCM"
              />
            </div>

            {/* CFOP */}

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

            {/* CSOSN */}

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

            {/* PIS */}

            {selectCampo(
              "PIS CST",
              "pis_cst",
              CST_OPTIONS
            )}

            {/* COFINS */}

            {selectCampo(
              "COFINS CST",
              "cofins_cst",
              CST_OPTIONS
            )}

            {/* UNIDADE */}

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
                  value: "G",
                  label: "G",
                },
                {
                  value: "L",
                  label: "L",
                },
                {
                  value: "ML",
                  label: "ML",
                },
                {
                  value: "PC",
                  label: "PC",
                },
              ]
            )}

            {/* SALVAR */}

            <button
              className="btn-primary"
              type="button"
              onClick={
                salvarFiscal
              }
              disabled={
                loading ||
                !produtoSelecionado
              }
              style={{
                height: 44,
              }}
            >
              Salvar
            </button>
          </div>

          {/* CEST */}

          <div
            style={{
              marginTop: 10,
              maxWidth: 280,
            }}
          >
            <div style={labelStyle}>
              CEST
            </div>

            <input
              value={
                form.cest || ""
              }
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cest:
                    e.target.value,
                }))
              }
              placeholder="CEST (opcional)"
              style={inputStyle}
            />
          </div>

          {/* RESUMO */}

          {produtoSelecionado ? (
            <div
              className="empty"
              style={{
                marginTop: 14,
              }}
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

              <div
                className="empty-sub"
                style={{
                  marginTop: 6,
                }}
              >
                NCM:{" "}
                {form.ncm || "—"}{" "}
                • CFOP:{" "}
                {form.cfop ||
                  "—"}{" "}
                • CSOSN:{" "}
                {form.csosn ||
                  "—"}{" "}
                • PIS:{" "}
                {form.pis_cst ||
                  "—"}{" "}
                • COFINS:{" "}
                {form.cofins_cst ||
                  "—"}{" "}
                • CEST:{" "}
                {form.cest || "—"}
              </div>
            </div>
          ) : null}
        </section>

        {/* ===================================================
            PRODUTOS CADASTRADOS
        =================================================== */}

        <section className="panel">
          <div
            className="panel-head"
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                }}
              >
                Produtos cadastrados
              </h2>

              <div
                style={{
                  marginTop: 6,
                  color:
                    "var(--muted)",
                  fontSize: 13,
                }}
              >
                Clique em um produto para editar.
              </div>
            </div>

            <input
              value={busca}
              onChange={(e) => {
                setBusca(
                  e.target.value
                );

                setPage(1);
              }}
              placeholder="Buscar produto..."
              style={{
                width: 320,
                padding:
                  "11px 12px",
                borderRadius: 12,
                border:
                  "1px solid rgba(255,255,255,.10)",
                background:
                  "rgba(10,10,16,.55)",
                color:
                  "var(--text)",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              overflow: "auto",
            }}
          >
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
                        ).toFixed(
                          2
                        )}
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
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* PAGINAÇÃO */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: 12,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
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
                alignItems:
                  "center",
              }}
            >
              <button
                className="btn-secondary"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (p) =>
                      p - 1
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
                    (p) =>
                      p + 1
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

// =========================================================
// ESTILOS
// =========================================================

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