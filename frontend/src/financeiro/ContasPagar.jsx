import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDateBR(v) {
  if (!v) return "—";

  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }

  return s;
}

function valueSearch(v) {
  if (v == null || v === "") return "";

  const n = Number(v || 0);

  const br = n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${br} ${String(n)} ${n.toFixed(2)} ${br
    .replace(/\./g, "")
    .replace(",", ".")}`;
}

function statusInfo(item) {
  const st = String(item.status || "pendente").toLowerCase();

  if (st === "pago") {
    return { text: "Pago", cls: "ok" };
  }

  const venc = String(item.vencimento || "").slice(0, 10);

  if (venc) {
    const hoje = todayISO();

    if (venc < hoje) {
      return { text: "Vencido", cls: "vencido" };
    }
  }

  return { text: "Aberto", cls: "aberto" };
}

export default function ContasPagar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  const [busca, setBusca] = useState("");

  const [statusFiltro, setStatusFiltro] = useState([
    "aberto",
  ]);

  const [fornecedor, setFornecedor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [numeroNF, setNumeroNF] = useState("");
  const [chave, setChave] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(todayISO());

  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const r = await api.get("/financeiro/contas-pagar");

      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErro(
        e?.response?.data?.error ||
          "Erro ao carregar contas a pagar"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setErro("");
      setMsg("");

      await api.post("/financeiro/contas-pagar", {
  
    fornecedor,
    descricao,
   numero_nf: numeroNF,
   chave,
    valor: String(valor).replace(",", "."),
   vencimento,
    });
      
      setFornecedor("");
      setDescricao("");
      setNumeroNF("");
      setChave("");
      setValor("");
      setVencimento(todayISO());

      setMsg("Conta cadastrada com sucesso");

      await carregar();
    } catch (e) {
      setErro(
        e?.response?.data?.error ||
          "Erro ao cadastrar conta"
      );
    } finally {
      setSaving(false);
    }
  }

  async function pagar(id) {
    if (!window.confirm("Marcar esta conta como paga?")) return;

    try {
      setErro("");
      setMsg("");

      await api.post(`/financeiro/contas-pagar/${id}/pagar`);

      setMsg("Conta marcada como paga");

      await carregar();
    } catch (e) {
      setErro(
        e?.response?.data?.error ||
          "Erro ao pagar conta"
      );
    }
  }

async function editar(conta) {
  const fornecedor = prompt(
    "Fornecedor:",
    conta.fornecedor || ""
  );
  if (fornecedor === null) return;

  const numero_nf = prompt(
    "Número NF:",
    conta.numero_nf || ""
  );
  if (numero_nf === null) return;

  const chave = prompt(
    "Referência:",
    conta.chave || ""
  );
  if (chave === null) return;

  const valor = prompt(
    "Valor:",
    conta.valor
  );
  if (valor === null) return;

  const vencimento = prompt(
    "Vencimento (AAAA-MM-DD):",
    String(conta.vencimento || "").slice(0, 10)
  );
  if (vencimento === null) return;

  try {
    await api.put(
      `/financeiro/contas-pagar/${conta.id}`,
      {
        fornecedor,
        numero_nf,
        chave,
        valor,
        vencimento,
      }
    );

    setMsg("Conta atualizada com sucesso");

    carregar();
  } catch (e) {
    setErro(
      e?.response?.data?.error ||
        "Erro ao editar conta"
    );
  }
}

  async function excluir(id) {
    if (!window.confirm("Excluir esta conta?")) return;

    try {
      setErro("");
      setMsg("");

      await api.delete(`/financeiro/contas-pagar/${id}`);

      setMsg("Conta excluída com sucesso");

      await carregar();
    } catch (e) {
      setErro(
        e?.response?.data?.error ||
          "Erro ao excluir conta"
      );
    }
  }

  function toggleStatusFiltro(valor) {
    setStatusFiltro((atual) => {
      const lista = Array.isArray(atual) ? atual : [];

      if (lista.includes(valor)) {
        const novo = lista.filter((x) => x !== valor);

        return novo.length ? novo : ["aberto"];
      }

      return [...lista, valor];
    });
  }

  function selecionarTodosStatus() {
    setStatusFiltro([
      "aberto",
      "vencido",
      "pago",
    ]);
  }

  function limparStatus() {
    setStatusFiltro(["aberto"]);
  }

  const filtrados = useMemo(() => {
    const termo = norm(busca);

    return items.filter((item) => {
      const info = statusInfo(item);
      const st = String(item.status || "pendente").toLowerCase();
      const pago = st === "pago";

      const dataBase = String(
        item.vencimento || item.pago_em || ""
      ).slice(0, 10);

      const okPeriodo =
        (!inicio || dataBase >= inicio) &&
        (!fim || dataBase <= fim);

      const descricao = item.numero_nf
        ? `XML - NF ${item.numero_nf}`
        : item.fornecedor || "Conta sem descrição";

      const vencBR = formatDateBR(item.vencimento);
      const valorTxt = valueSearch(item.valor);
      const saldoTxt = valueSearch(pago ? 0 : item.valor);

      const texto = norm(`
        ${descricao || ""}
        ${item.fornecedor || ""}
        ${item.numero_nf || ""}
        ${item.chave || ""}
        ${item.vencimento || ""}
        ${vencBR || ""}
        ${item.valor || ""}
        ${valorTxt || ""}
        ${saldoTxt || ""}
        ${item.status || ""}
        ${info.text || ""}
      `);

      const okBusca = !termo || texto.includes(termo);

      const filtros = Array.isArray(statusFiltro)
        ? statusFiltro
        : ["aberto"];

      const okStatus =
        (filtros.includes("aberto") &&
          st !== "pago" &&
          info.cls === "aberto") ||
        (filtros.includes("vencido") &&
          st !== "pago" &&
          info.cls === "vencido") ||
        (filtros.includes("pago") && st === "pago");

      return okBusca && okStatus && okPeriodo;
    });
  }, [items, busca, statusFiltro, inicio, fim]);

  const totais = useMemo(() => {
    let aberto = 0;
    let pago = 0;
    let vencido = 0;

    for (const item of items) {
      const v = Number(item.valor || 0);
      const st = String(item.status || "pendente").toLowerCase();
      const info = statusInfo(item);

      if (st === "pago") {
        pago += v;
      } else if (info.cls === "vencido") {
        vencido += v;
      } else {
        aberto += v;
      }
    }

    return {
      aberto,
      pago,
      vencido,
      total: aberto + pago + vencido,
    };
  }, [items]);

const totalSelecionado = useMemo(() => {
  return filtrados.reduce(
    (total, item) => total + Number(item.valor || 0),
    0
  );
}, [filtrados]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtrados.length / PER_PAGE)
  );

  const paginados = useMemo(() => {
    const start = (page - 1) * PER_PAGE;

    return filtrados.slice(start, start + PER_PAGE);
  }, [filtrados, page]);

  useEffect(() => {
    setPage(1);
  }, [busca, statusFiltro, inicio, fim]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const todosStatusSelecionados =
    statusFiltro.includes("aberto") &&
    statusFiltro.includes("vencido") &&
    statusFiltro.includes("pago");

  return (
    <div className="panel">
      <style>{`
        .cp-wrap{
          display:grid;
          gap:14px;
        }

        .cp-top{
          display:grid;
          grid-template-columns:repeat(4,minmax(180px,1fr));
          gap:12px;
        }

        .cp-card{
          background:rgba(255,255,255,.03);
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
          padding:14px;
        }

        .cp-k{
          font-size:12px;
          opacity:.75;
        }

        .cp-v{
          font-size:24px;
          font-weight:800;
          margin-top:6px;
        }

        .cp-form{
          display:grid;
          grid-template-columns:2fr 1fr 1.4fr 1fr 1fr auto;
          gap:10px;
          align-items:end;
        }

        .cp-input,
        .cp-select{
          width:100%;
          padding:11px 12px;
          border-radius:10px;
          border:1px solid rgba(255,255,255,.12);
          background:#131528;
          color:#fff;
          outline:none;
          box-sizing:border-box;
        }

        .cp-toolbar{
          display:grid;
          grid-template-columns:1.4fr 1fr;
          gap:10px;
          align-items:start;
        }

        .cp-status-area{
          display:grid;
          gap:8px;
        }

        .cp-status-title{
          font-size:12px;
          opacity:.75;
          font-weight:800;
        }

        .cp-status-filter{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }

        .cp-status-filter button{
          padding:10px 12px;
          border-radius:10px;
          border:1px solid rgba(255,255,255,.12);
          background:#131528;
          color:#fff;
          cursor:pointer;
          font-weight:800;
          transition:.18s;
          white-space:nowrap;
        }

        .cp-status-filter button:hover{
          border-color:rgba(123,108,255,.45);
          transform:translateY(-1px);
        }

        .cp-status-filter button.active{
          background:#4f46e5;
          border-color:#7b6cff;
          box-shadow:0 0 0 3px rgba(123,108,255,.16);
        }

        .cp-status-filter button.soft{
          background:rgba(255,255,255,.04);
          color:rgba(255,255,255,.82);
        }

        .cp-table-wrap{
          overflow:auto;
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
        }

        .cp-table{
          width:100%;
          border-collapse:collapse;
          min-width:1050px;
        }

        .cp-table th{
          font-size:12px;
          text-align:left;
          padding:12px;
          background:rgba(255,255,255,.05);
          white-space:nowrap;
        }

        .cp-table td{
          padding:12px;
          border-top:1px solid rgba(255,255,255,.07);
          vertical-align:top;
        }

        .cp-actions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        }

        .cp-mini{
          padding:8px 12px;
          border-radius:10px;
          border:none;
          cursor:pointer;
          font-weight:800;
        }

        .cp-pay{
          background:#4f46e5;
          color:#fff;
        }

        .cp-del{
          background:#2a0f16;
          color:#ffb4b4;
          border:1px solid rgba(255,80,80,.35);
        }

        .cp-tag{
          display:inline-flex;
          align-items:center;
          padding:6px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
        }

        .cp-tag.ok{
          background:#11351e;
          color:#caffd7;
          border:1px solid #24663b;
        }

        .cp-tag.aberto{
          background:#4a3210;
          color:#ffe3b0;
          border:1px solid #8a5a16;
        }

        .cp-tag.vencido{
          background:#3a1212;
          color:#ffd5d5;
          border:1px solid #7a2a2a;
        }

        .cp-muted{
          opacity:.7;
          font-size:12px;
        }

        .cp-err{
          background:#3a1212;
          border:1px solid #7a2a2a;
          color:#ffd5d5;
          border-radius:10px;
          padding:10px;
        }

        .cp-ok{
          background:#11351e;
          border:1px solid #24663b;
          color:#d7ffe1;
          border-radius:10px;
          padding:10px;
        }

        .cp-pager{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
        }

        @media (max-width: 980px){
          .cp-top{
            grid-template-columns:repeat(2,minmax(180px,1fr));
          }

          .cp-form{
            grid-template-columns:1fr 1fr;
          }

          .cp-toolbar{
            grid-template-columns:1fr;
          }
        }

        @media (max-width: 620px){
          .cp-top{
            grid-template-columns:1fr;
          }

          .cp-form{
            grid-template-columns:1fr;
          }

          .cp-status-filter button{
            flex:1;
          }
        }
      `}</style>

      <div className="panel-head">
        <h2>Contas a Pagar</h2>

        <span className="badge">
          {filtrados.length} registro(s)
        </span>
      </div>

      <div className="cp-wrap">
        <div className="cp-top">
          <div className="cp-card">
            <div className="cp-k">Em aberto</div>
            <div className="cp-v">{money(totais.aberto)}</div>
          </div>

          <div className="cp-card">
            <div className="cp-k">Pagas</div>
            <div className="cp-v">{money(totais.pago)}</div>
          </div>

          <div className="cp-card">
            <div className="cp-k">Vencidas</div>
            <div className="cp-v">{money(totais.vencido)}</div>
          </div>

          <div className="cp-card">
            <div className="cp-k">Total</div>
            <div className="cp-v">{money(totais.total)}</div>
          </div>
        </div>

        <div className="cp-card">
  <div className="cp-k">Selecionados</div>
  <div className="cp-v">{money(totalSelecionado)}</div>
</div>

        <form onSubmit={salvar} className="cp-card">
          <div className="cp-form">
            
            <div>
  <div className="cp-muted" style={{ marginBottom: 6 }}>
    Descrição
  </div>

  <input
    className="cp-input"
    value={descricao}
    onChange={(e) => setDescricao(e.target.value)}
    placeholder="Ex.: Conta de luz - 06/2026"
  />
</div>
            
            <div>
              <div className="cp-muted" style={{ marginBottom: 6 }}>
                Fornecedor
              </div>

              <input
                className="cp-input"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Ex.: Nova Aliança Distribuidora"
              />
            </div>

            <div>
              <div className="cp-muted" style={{ marginBottom: 6 }}>
                Número NF
              </div>

              <input
                className="cp-input"
                value={numeroNF}
                onChange={(e) => setNumeroNF(e.target.value)}
                placeholder="Ex.: 120467"
              />
            </div>

            <div>
              <div className="cp-muted" style={{ marginBottom: 6 }}>
                Chave / referência
              </div>

              <input
                className="cp-input"
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <div className="cp-muted" style={{ marginBottom: 6 }}>
                Valor
              </div>

              <input
                className="cp-input"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="444,96"
              />
            </div>

            <div>
              <div className="cp-muted" style={{ marginBottom: 6 }}>
                Vencimento
              </div>

              <input
                className="cp-input"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </form>

        <div className="fin-date">
          <div className="fin-datebox">
            <span className="tag">Início</span>

            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>

          <div className="fin-datebox">
            <span className="tag">Fim</span>

            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
        </div>

        <div className="cp-card">
          <div className="cp-toolbar">
            <input
              className="cp-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar qualquer campo: fornecedor, NF, chave, data, valor, status..."
            />

            <div className="cp-status-area">
              <div className="cp-status-title">
                Status
              </div>

              <div className="cp-status-filter">
                <button
                  type="button"
                  className={
                    statusFiltro.includes("aberto")
                      ? "active"
                      : ""
                  }
                  onClick={() => toggleStatusFiltro("aberto")}
                >
                  {statusFiltro.includes("aberto") ? "✓ " : ""}
                  Em aberto
                </button>

                <button
                  type="button"
                  className={
                    statusFiltro.includes("vencido")
                      ? "active"
                      : ""
                  }
                  onClick={() => toggleStatusFiltro("vencido")}
                >
                  {statusFiltro.includes("vencido") ? "✓ " : ""}
                  Vencidos
                </button>

                <button
                  type="button"
                  className={
                    statusFiltro.includes("pago")
                      ? "active"
                      : ""
                  }
                  onClick={() => toggleStatusFiltro("pago")}
                >
                  {statusFiltro.includes("pago") ? "✓ " : ""}
                  Pagos
                </button>

                <button
                  type="button"
                  className={
                    todosStatusSelecionados
                      ? "active"
                      : "soft"
                  }
                  onClick={selecionarTodosStatus}
                >
                  Todos
                </button>

                <button
                  type="button"
                  className="soft"
                  onClick={limparStatus}
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        </div>

        {erro ? <div className="cp-err">{erro}</div> : null}
        {msg ? <div className="cp-ok">{msg}</div> : null}

        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Descrição</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Número NF</th>
                <th>Referência</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    Carregando...
                  </td>
                </tr>
              ) : paginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    Nenhuma conta encontrada
                  </td>
                </tr>
              ) : (
                paginados.map((c) => {
                  const info = statusInfo(c);
                  const pago =
                    String(c.status || "").toLowerCase() === "pago";

                  const descricao = c.descricao
  || (c.numero_nf ? `XML - NF ${c.numero_nf}` : "Conta sem descrição");

                  return (
                  
                    <tr key={c.id}>

                      <td>{c.fornecedor || "—"}</td>

                      <td>
                        <strong>{descricao}</strong>
                      </td>

                      <td>{formatDateBR(c.vencimento)}</td>

                      <td>{money(c.valor)}</td>

                      <td>{pago ? money(0) : money(c.valor)}</td>

                      <td>
                        <span className={`cp-tag ${info.cls}`}>
                          {info.text}
                        </span>
                      </td>

                      <td>{c.numero_nf || "—"}</td>

                      <td
                        style={{
                          maxWidth: 220,
                          wordBreak: "break-word",
                        }}
                      >
                        {c.chave || "—"}
                      </td>

                      <td>
                        <div className="cp-actions">

  <button
    type="button"
    className="cp-mini"
    style={{
      background: "#8a5a16",
      color: "#fff",
    }}
    onClick={() => editar(c)}
  >
    Editar
  </button>

  {!pago && (
    <button
      type="button"
      className="cp-mini cp-pay"
      onClick={() => pagar(c.id)}
    >
      Pagar
    </button>
  )}

  <button
    type="button"
    className="cp-mini cp-del"
    onClick={() => excluir(c.id)}
  >
    Excluir
  </button>
</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="cp-card cp-pager">
          <button
            className="btn-secondary"
            onClick={() =>
              setPage((p) => Math.max(1, p - 1))
            }
            disabled={page <= 1}
          >
            ← Anterior
          </button>

          <div>
            Página <strong>{page}</strong> de{" "}
            <strong>{totalPages}</strong>
          </div>

          <button
            className="btn-secondary"
            onClick={() =>
              setPage((p) => Math.min(totalPages, p + 1))
            }
            disabled={page >= totalPages}
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}