import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { TopbarFuncionarios } from "../components.jsx";

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function norm(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function printVale({ funcionario, lanc, titulo = "VALE / MARCADO" }) {
  if (!funcionario || !lanc) return;

  const valorBruto = Number(lanc.valor_bruto || 0);
  const taxaPct = Number(lanc.taxa_pct || 0);
  const taxaValor = Number(lanc.taxa_valor || 0);
  const valorLiquido = Number(lanc.valor_liquido ?? valorBruto - taxaValor);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escHtml(titulo)}</title>
      <style>
        @page { size: 58mm auto; margin: 4mm; }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: monospace;
          font-size: 12px;
        }
        .recibo { width: 50mm; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .title { font-size: 14px; }
        .row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin: 2px 0;
        }
        .hr {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .cut {
          max-width: 28mm;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          text-align: right;
        }
        .desc {
          margin-top: 4px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .sign {
          height: 22px;
          border-bottom: 1px solid #000;
          margin: 16px 0 6px;
        }
        .muted {
          font-size: 11px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="recibo">
        <div class="center bold title">PUB 1005</div>
        <div class="center bold">${escHtml(titulo)}</div>

        <div class="hr"></div>

        <div class="row">
          <div>Data:</div>
          <div>${escHtml(String(lanc.data || ""))}</div>
        </div>
        <div class="row">
          <div>Funcionário:</div>
          <div class="cut">${escHtml(String(funcionario.nome || ""))}</div>
        </div>
        <div class="row">
          <div>ID:</div>
          <div>#${escHtml(funcionario.id ?? "")}</div>
        </div>

        <div class="hr"></div>

        <div class="bold">Detalhes</div>
        <div class="desc">${escHtml(String(lanc.descricao || "Sem descrição"))}</div>

        <div class="hr"></div>

        <div class="row">
          <div>Bruto:</div>
          <div class="bold">${escHtml(money(valorBruto))}</div>
        </div>
        <div class="row">
          <div>Taxa (${escHtml(taxaPct)}%):</div>
          <div>${escHtml(money(taxaValor))}</div>
        </div>
        <div class="row">
          <div>Líquido:</div>
          <div class="bold">${escHtml(money(valorLiquido))}</div>
        </div>

        <div class="hr"></div>

        <div class="center bold">ASSINATURA</div>
        <div class="sign"></div>
        <div class="muted">Declaro estar ciente do valor acima.</div>

        <div class="hr"></div>
        <div class="center muted">Lançamento #${escHtml(lanc.id ?? "")}</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 250);
        };
      </script>
    </body>
    </html>
  `;

  const w = window.open("", "_blank", "width=420,height=700");
  if (!w) return;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

function ModalNovoFuncionario({ open, onClose, onSave, saving }) {
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (open) setNome("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Novo funcionário</h3>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do funcionário"
          onKeyDown={(e) => e.key === "Enter" && onSave(nome)}
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => onSave(nome)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Marcados({ setTela }) {
  const [tab, setTab] = useState("TODOS");
  const [funcs, setFuncs] = useState([]);
  const [loadingFuncs, setLoadingFuncs] = useState(false);
  const [selected, setSelected] = useState(null);

  const [openNovoFunc, setOpenNovoFunc] = useState(false);
  const [savingFunc, setSavingFunc] = useState(false);

  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataLanc, setDataLanc] = useState(todayISO());
  const [cobraTaxa, setCobraTaxa] = useState(true);

  const [saving, setSaving] = useState(false);

  const [statusLanc, setStatusLanc] = useState("PENDENTE");
  const [page, setPage] = useState(1);
  const [limit] = useState(3);
  const [lancRows, setLancRows] = useState([]);
  const [lancTotal, setLancTotal] = useState(0);
  const [loadingLanc, setLoadingLanc] = useState(false);

  const [closingId, setClosingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const funcLimit = 3;
  const [funcPage, setFuncPage] = useState(1);
  const [funcQuery, setFuncQuery] = useState("");

  const [toast, setToast] = useState(null);

  useEffect(() => {
    setFuncPage(1);
  }, [funcQuery]);

  function showToast(msg, ok = true) {
    setToast({ msg, ok, t: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }

  function mapStatusToBackend(st) {
    const s = String(st || "").toUpperCase();
    if (s === "PAGO" || s === "REGISTRADOS" || s === "FECHADO") return "fechado";
    return "pendente";
  }

  async function loadFuncs(selectId) {
    setLoadingFuncs(true);
    try {
      const r = await api.get("/marcados/resumo");
      const list = r.data || [];
      setFuncs(list);

      if (selectId) {
        const f = list.find((x) => x.id === selectId);
        if (f) setSelected(f);
      } else if (!selected?.id && list.length) {
        const sorted = [...list].sort((a, b) =>
          String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
            sensitivity: "base",
            numeric: true,
          })
        );
        setSelected(sorted[0] || null);
      } else if (selected?.id) {
        const f = list.find((x) => x.id === selected.id);
        if (f) setSelected(f);
      }
    } catch (e) {
      showToast(e?.response?.data?.error || "Erro ao carregar funcionários", false);
    } finally {
      setLoadingFuncs(false);
    }
  }

  async function loadLancamentos(funcionarioId, st = statusLanc, pg = page) {
    if (!funcionarioId) return;
    setLoadingLanc(true);
    try {
      const statusBackend = mapStatusToBackend(st);
      const r = await api.get("/marcados", {
        params: { funcionario_id: funcionarioId, status: statusBackend, page: pg, limit },
      });

      setLancRows(r.data?.items || []);
      setLancTotal(r.data?.total || 0);
    } catch (e) {
      showToast(e?.response?.data?.error || "Erro ao carregar lançamentos", false);
    } finally {
      setLoadingLanc(false);
    }
  }

  useEffect(() => {
    loadFuncs();
  }, []);

  useEffect(() => {
    if (!selected?.id) return;
    setStatusLanc("PENDENTE");
    setPage(1);
    loadLancamentos(selected.id, "PENDENTE", 1);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) return;
    loadLancamentos(selected.id, statusLanc, page);
  }, [statusLanc, page]);

  const filteredFuncs = useMemo(() => {
    const list = Array.isArray(funcs) ? funcs : [];

    let out = list;
    if (tab !== "TODOS") {
      out = out.filter((f) => {
        const pend = Number(f.pend_liq || 0);
        const reg = Number(f.reg_liq || 0);
        if (tab === "PENDENTE") return pend > 0;
        if (tab === "PAGO") return reg > 0;
        return true;
      });
    }

    const q = norm(funcQuery);
    if (q) out = out.filter((f) => norm(f.nome).includes(q));

    out = [...out].sort((a, b) =>
      String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
        sensitivity: "base",
        numeric: true,
      })
    );

    return out;
  }, [funcs, tab, funcQuery]);

  useEffect(() => {
    setFuncPage(1);
  }, [tab]);

  const funcPages = Math.max(1, Math.ceil(filteredFuncs.length / funcLimit));
  const funcCanPrev = funcPage > 1;
  const funcCanNext = funcPage < funcPages;

  useEffect(() => {
    if (funcPage > funcPages) setFuncPage(funcPages);
  }, [funcPage, funcPages]);

  const funcsPaged = useMemo(() => {
    const start = (funcPage - 1) * funcLimit;
    return filteredFuncs.slice(start, start + funcLimit);
  }, [filteredFuncs, funcPage]);

  const pages = Math.max(1, Math.ceil((lancTotal || 0) / limit));
  const canPrev = page > 1;
  const canNext = page < pages;

  const valorNumero = Number(String(valor || "").replace(",", "."));
  const taxaPreviewPct = cobraTaxa ? 15 : 0;
  const taxaPreviewValor =
    Number.isFinite(valorNumero) && valorNumero > 0
      ? (valorNumero * taxaPreviewPct) / 100
      : 0;
  const liquidoPreview =
    Number.isFinite(valorNumero) && valorNumero > 0
      ? valorNumero - taxaPreviewValor
      : 0;

  async function onCriarFuncionario(nome) {
    const n1 = String(nome || "").trim().replace(/\s+/g, " ");
    if (!n1) return showToast("Informe o nome do funcionário", false);

    const jaExiste = (funcs || []).some(
      (f) => String(f.nome || "").trim().toLowerCase() === n1.toLowerCase()
    );
    if (jaExiste) return showToast("Funcionário já existe", false);

    setSavingFunc(true);
    try {
      const r = await api.post("/funcionarios", { nome: n1 });
      const novo = r.data;

      showToast("Funcionário criado ✅");
      setOpenNovoFunc(false);

      await loadFuncs(novo?.id);
      setTab("TODOS");
      setFuncPage(1);
      setFuncQuery("");
    } catch (e) {
      if (e?.response?.status === 409) return showToast("Funcionário já existe", false);
      showToast(e?.response?.data?.error || "Erro ao criar funcionário", false);
    } finally {
      setSavingFunc(false);
    }
  }

  async function onSalvarLancamento() {
    if (!selected?.id) return showToast("Selecione um funcionário", false);

    const v = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return showToast("Valor inválido", false);

    const funcSnap = selected;

    setSaving(true);
    try {
      const r = await api.post("/marcados", {
        funcionario_id: funcSnap.id,
        valor_bruto: v,
        descricao: descricao?.trim() || null,
        data: dataLanc || null,
        taxa_pct: cobraTaxa ? 15 : 0,
      });

      const criado = r.data;

      setValor("");
      setDescricao("");
      setDataLanc(todayISO());
      setCobraTaxa(true);

      showToast("Lançamento salvo e impresso ✅");

      await loadFuncs(funcSnap.id);
      setStatusLanc("PENDENTE");
      setPage(1);
      await loadLancamentos(funcSnap.id, "PENDENTE", 1);

      printVale({ funcionario: funcSnap, lanc: criado, titulo: "VALE / MARCADO" });
    } catch (e) {
      showToast(e?.response?.data?.error || "Erro ao salvar lançamento", false);
    } finally {
      setSaving(false);
    }
  }

  async function onFecharLancamento(id) {
    if (!id || !selected?.id) return;

    setClosingId(id);
    try {
      await api.post(`/marcados/${id}/fechar`);
      showToast("Lançamento enviado para registrados ✅");

      await loadFuncs(selected.id);

      const novaPagina = page > 1 && lancRows.length === 1 ? page - 1 : page;
      setPage(novaPagina);
      await loadLancamentos(selected.id, statusLanc, novaPagina);
    } catch (e) {
      showToast(e?.response?.data?.error || "Erro ao fechar lançamento", false);
    } finally {
      setClosingId(null);
    }
  }

  async function onExcluirLancamento(id) {
    if (!id || !selected?.id) return;
    if (!window.confirm("Excluir este lançamento pendente?")) return;

    setDeletingId(id);
    try {
      await api.delete(`/marcados/${id}`);
      showToast("Lançamento excluído ✅");

      await loadFuncs(selected.id);

      const novaPagina = page > 1 && lancRows.length === 1 ? page - 1 : page;
      setPage(novaPagina);
      await loadLancamentos(selected.id, statusLanc, novaPagina);
    } catch (e) {
      showToast(e?.response?.data?.error || "Erro ao excluir lançamento", false);
    } finally {
      setDeletingId(null);
    }
  }

  async function onFecharPendentes() {
    if (!selected?.id) return;
    if (!window.confirm("Enviar todos os pendentes deste funcionário para registrados?")) return;

    setSaving(true);
    try {
      const r = await api.post("/marcados/fechar", { funcionario_id: selected.id });
      showToast(`Fechado: ${r.data?.fechados || 0} lançamento(s) ✅`);

      await loadFuncs(selected.id);
      setStatusLanc("PAGO");
      setPage(1);
      await loadLancamentos(selected.id, "PAGO", 1);
    } catch (e) {
      showToast(e?.response?.data?.error || "Erro ao fechar", false);
    } finally {
      setSaving(false);
    }
  }

  const resumoSelecionado = useMemo(() => {
    if (!selected) return null;
    const pend = Number(selected.pend_liq || 0);
    const reg = Number(selected.reg_liq || 0);
    return {
      pend,
      reg,
      total: pend + reg,
    };
  }, [selected]);

  const ajudaPasso = !selected
    ? "1. Escolha um funcionário na coluna da esquerda."
    : "2. Preencha o valor, confira a data e clique em salvar.";

  return (
    <div className="mk-page">
      <style>{`
        .mk-shell{
          width:min(1700px,96vw);
          margin:18px auto 26px;
          display:grid;
          grid-template-columns:1.05fr .95fr;
          gap:18px;
          align-items:start;
        }
        .mk-left-col{
          display:grid;
          gap:18px;
        }
        .mk-step{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:900;
          color:#d9d0ff;
          border:1px solid rgba(123,108,255,.25);
          background:rgba(123,108,255,.10);
        }
        .mk-top-help{
          width:min(1700px,96vw);
          margin:14px auto 0;
          display:grid;
          grid-template-columns:1fr auto;
          gap:12px;
          align-items:center;
        }
        .mk-top-help .panel{
          padding:12px 14px;
        }
        .mk-help-title{
          font-weight:900;
          margin-bottom:4px;
        }
        .mk-help-sub{
          font-size:13px;
          color:var(--muted);
        }
        .mk-filter-tabs{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          justify-content:flex-end;
        }
        .mk-filter-tabs button{
          padding:10px 14px;
          border-radius:12px;
          border:1px solid rgba(255,255,255,.10);
          background:linear-gradient(180deg,rgba(20,20,27,.9),rgba(12,12,18,.9));
          color:var(--text);
          cursor:pointer;
          transition:.2s;
          box-shadow:0 10px 25px rgba(0,0,0,.28);
          font-weight:900;
        }
        .mk-filter-tabs button:hover{
          transform:translateY(-1px);
          border-color:rgba(123,108,255,.45);
        }
        .mk-filter-tabs .active{
          background:linear-gradient(135deg,var(--accent),var(--accent2));
          border-color:transparent;
          box-shadow:0 0 0 4px var(--glow),0 12px 30px rgba(0,0,0,.35);
        }
        .mk-section-title{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:12px;
        }
        .mk-section-title h3{
          margin:0;
          font-size:18px;
        }
        .mk-soft{
          font-size:12px;
          color:var(--muted);
        }
        .mk-selected{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:10px;
          margin-bottom:14px;
        }
        .mk-selected-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
          background:rgba(10,10,16,.35);
          padding:12px;
        }
        .mk-selected-k{
          font-size:12px;
          color:var(--muted);
          font-weight:800;
        }
        .mk-selected-v{
          margin-top:6px;
          font-size:18px;
          font-weight:900;
        }
        .mk-inline-help{
          margin-top:10px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(10,10,16,.35);
          padding:10px 12px;
          border-radius:14px;
          color:var(--text);
          font-size:13px;
        }
        .mk-actions-main{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:2px;
        }
        .mk-actions-main .btn-primary{
          min-width:220px;
        }
        .mk-actions-secondary{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:8px;
        }
        .mk-lanc-row{
          display:flex;
          justify-content:space-between;
          gap:12px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
          padding:12px;
          background:rgba(17,17,24,.65);
          align-items:flex-start;
        }
        .mk-lanc-left{
          display:flex;
          flex-direction:column;
          gap:6px;
          min-width:0;
        }
        .mk-lanc-name{
          font-weight:900;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          max-width:46ch;
        }
        .mk-lanc-sub{
          font-size:12px;
          color:var(--muted);
        }
        .mk-lanc-sub strong{
          color:#fff;
        }
        .mk-lanc-right{
          text-align:right;
          white-space:nowrap;
        }
        .mk-lanc-val{
          font-weight:900;
          color:#fff;
        }
        .mk-lanc-mini{
          font-size:12px;
          color:rgba(255,255,255,.82);
          margin-top:4px;
        }
        .mk-lanc-actions{
          display:flex;
          justify-content:flex-end;
          gap:8px;
          flex-wrap:wrap;
          margin-top:8px;
        }
        .mk-empty-guide{
          display:grid;
          gap:8px;
        }
        .mk-empty-guide b{
          color:#fff;
        }
        .mk-historico-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          margin-bottom:10px;
        }
        .mk-historico-list{
          display:grid;
          gap:10px;
        }
        @media(max-width:1100px){
          .mk-shell{grid-template-columns:1fr}
          .mk-top-help{grid-template-columns:1fr}
          .mk-filter-tabs{justify-content:flex-start}
        }
        @media(max-width:720px){
          .mk-selected{grid-template-columns:1fr}
          .mk-actions-main .btn-primary{min-width:unset;width:100%}
          .mk-lanc-row{flex-direction:column}
          .mk-lanc-right{text-align:left;width:100%}
          .mk-lanc-actions{justify-content:flex-start}
        }
      `}</style>

      <TopbarFuncionarios
        onBack={() => setTela("menu")}
        onLogout={() => {
          localStorage.removeItem("token");
          location.reload();
        }}
      />

      {toast && <div className={`toast ${toast.ok ? "ok" : "err"}`}>{toast.msg}</div>}

      <div className="mk-top-help">
        <div className="panel">
          <div className="mk-help-title">Como usar</div>
          <div className="mk-help-sub">
            Escolha um funcionário, cadastre o lançamento e acompanhe o histórico logo abaixo da lista.
          </div>
        </div>

        <div className="mk-filter-tabs">
          <button className={tab === "TODOS" ? "active" : ""} onClick={() => setTab("TODOS")}>
            Todos
          </button>
          <button className={tab === "PENDENTE" ? "active" : ""} onClick={() => setTab("PENDENTE")}>
            Com pendências
          </button>
          <button className={tab === "PAGO" ? "active" : ""} onClick={() => setTab("PAGO")}>
            Com registrados
          </button>
        </div>
      </div>

      <div className="mk-shell">
        <div className="mk-left-col">
          <div className="panel">
            <div className="mk-section-title">
              <div>
                <div className="mk-step">Passo 1</div>
                <h3 style={{ marginTop: 10 }}>Escolha o funcionário</h3>
                <div className="mk-soft">Pesquise, selecione ou cadastre um novo funcionário.</div>
              </div>

              <div className="panel-actions">
                <button className="btn-mini" onClick={() => setOpenNovoFunc(true)}>
                  + Novo funcionário
                </button>
                <span className="badge">
                  {loadingFuncs ? "carregando..." : `${filteredFuncs.length} item(s)`}
                </span>
              </div>
            </div>

            <div className="mk-search">
              <input
                value={funcQuery}
                onChange={(e) => setFuncQuery(e.target.value)}
                placeholder="Pesquisar funcionário pelo nome..."
              />
              {funcQuery && (
                <button className="btn-mini" onClick={() => setFuncQuery("")}>
                  Limpar
                </button>
              )}
            </div>

            <div className="mk-list">
              {funcsPaged.map((f) => {
                const pend = Number(f.pend_liq || 0);
                const reg = Number(f.reg_liq || 0);
                const isSel = selected?.id === f.id;

                return (
                  <button
                    key={f.id}
                    className={`mk-row ${isSel ? "active" : ""}`}
                    onClick={() => setSelected(f)}
                  >
                    <div className="mk-left">
                      <div className="mk-name">{f.nome}</div>
                      <div className="mk-sub">
                        {f.ativo === false ? "Inativo" : "Ativo"} {isSel ? "• selecionado" : ""}
                      </div>
                    </div>

                    <div className="mk-right">
                      <div className={`mk-pill ${pend > 0 ? "warn" : ""}`}>Pend.: {money(pend)}</div>
                      <div className="mk-pill">Reg.: {money(reg)}</div>
                    </div>
                  </button>
                );
              })}

              {!loadingFuncs && filteredFuncs.length === 0 && (
                <div className="empty">
                  <div className="empty-title">Nada aqui</div>
                  <div className="empty-sub">
                    {funcQuery ? (
                      "Nenhum funcionário encontrado nessa pesquisa."
                    ) : (
                      <>
                        Ainda não há funcionários nessa lista. Clique em <b>+ Novo funcionário</b>.
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {filteredFuncs.length > 0 && (
              <div className="pager">
                <div className="pager-info">
                  Página <b>{funcPage}</b> de <b>{funcPages}</b> • Total <b>{filteredFuncs.length}</b>
                </div>
                <div className="panel-actions">
                  <button className="btn-mini" disabled={!funcCanPrev} onClick={() => setFuncPage((p) => p - 1)}>
                    ◀
                  </button>
                  <button className="btn-mini" disabled={!funcCanNext} onClick={() => setFuncPage((p) => p + 1)}>
                    ▶
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="mk-historico-head">
              <div>
                <div className="mk-step">Passo 3</div>
                <h3 style={{ marginTop: 10 }}>Acompanhe os lançamentos</h3>
                <div className="mk-soft">
                  Histórico do funcionário selecionado, logo abaixo da lista.
                </div>
              </div>

              <div className="mk-lanc-controls">
                <button
                  className={statusLanc === "PENDENTE" ? "active" : ""}
                  onClick={() => {
                    setStatusLanc("PENDENTE");
                    setPage(1);
                  }}
                  disabled={!selected}
                >
                  Pendentes
                </button>
                <button
                  className={statusLanc === "PAGO" ? "active" : ""}
                  onClick={() => {
                    setStatusLanc("PAGO");
                    setPage(1);
                  }}
                  disabled={!selected}
                >
                  Registrados
                </button>
              </div>
            </div>

            {!selected ? (
              <div className="empty">
                <div className="empty-title">Selecione um funcionário</div>
                <div className="empty-sub">
                  O histórico vai aparecer aqui depois que você escolher alguém na lista acima.
                </div>
              </div>
            ) : (
              <>
                <div className="mk-historico-list">
                  {loadingLanc && (
                    <div className="empty">
                      <div className="empty-title">Carregando...</div>
                      <div className="empty-sub">Buscando lançamentos.</div>
                    </div>
                  )}

                  {!loadingLanc &&
                    lancRows.map((l) => (
                      <div className="mk-lanc-row" key={l.id}>
                        <div className="mk-lanc-left">
                          <div className="mk-lanc-name">{l.descricao || "Sem descrição"}</div>
                          <div className="mk-lanc-sub">
                            <strong>Data:</strong> {String(l.data)} • <strong>ID:</strong> #{l.id} •{" "}
                            <strong>Status:</strong> {String(l.status)}
                          </div>
                        </div>

                        <div className="mk-lanc-right">
                          <div className="mk-lanc-val">{money(l.valor_liquido ?? l.valor_bruto)}</div>
                          <div className="mk-lanc-mini">
                            bruto {money(l.valor_bruto)} • taxa {money(l.taxa_valor)} ({Number(l.taxa_pct || 0)}%)
                          </div>

                          <div className="mk-lanc-actions">
                            <button
                              className="btn-mini"
                              onClick={() =>
                                selected &&
                                printVale({ funcionario: selected, lanc: l, titulo: "VALE / MARCADO" })
                              }
                            >
                              Imprimir
                            </button>

                            {statusLanc === "PENDENTE" && (
                              <>
                                <button
                                  className="btn-mini btn-mini-ok"
                                  disabled={closingId === l.id}
                                  onClick={() => onFecharLancamento(l.id)}
                                >
                                  {closingId === l.id ? "Enviando..." : "Enviar para registrados"}
                                </button>

                                <button
                                  className="btn-mini btn-mini-danger"
                                  disabled={deletingId === l.id}
                                  onClick={() => onExcluirLancamento(l.id)}
                                >
                                  {deletingId === l.id ? "Excluindo..." : "Excluir"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {!loadingLanc && lancRows.length === 0 && (
                    <div className="empty">
                      <div className="empty-title">Sem lançamentos</div>
                      <div className="empty-sub">
                        {statusLanc === "PENDENTE"
                          ? "Não há lançamentos pendentes para este funcionário."
                          : "Não há lançamentos registrados para este funcionário."}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pager">
                  <div className="pager-info">
                    Página <b>{page}</b> de <b>{pages}</b> • Total <b>{lancTotal}</b>
                  </div>
                  <div className="panel-actions">
                    <button className="btn-mini" disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
                      ◀
                    </button>
                    <button className="btn-mini" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                      ▶
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="panel panel-sticky">
          <div className="mk-section-title">
            <div>
              <div className="mk-step">Passo 2</div>
              <h3 style={{ marginTop: 10 }}>
                {selected ? `Lançar para ${selected.nome}` : "Cadastre um lançamento"}
              </h3>
              <div className="mk-soft">{ajudaPasso}</div>
            </div>
            <span className="badge">{selected ? `ID ${selected.id}` : "Nenhum selecionado"}</span>
          </div>

          {selected && resumoSelecionado && (
            <div className="mk-selected">
              <div className="mk-selected-card">
                <div className="mk-selected-k">Pendentes</div>
                <div className="mk-selected-v">{money(resumoSelecionado.pend)}</div>
              </div>
              <div className="mk-selected-card">
                <div className="mk-selected-k">Registrados</div>
                <div className="mk-selected-v">{money(resumoSelecionado.reg)}</div>
              </div>
              <div className="mk-selected-card">
                <div className="mk-selected-k">Total</div>
                <div className="mk-selected-v">{money(resumoSelecionado.total)}</div>
              </div>
            </div>
          )}

          {!selected ? (
            <div className="empty">
              <div className="empty-title">Primeiro selecione um funcionário</div>
              <div className="mk-empty-guide">
                <div><b>1.</b> Vá na coluna da esquerda.</div>
                <div><b>2.</b> Clique no nome de um funcionário.</div>
                <div><b>3.</b> Depois preencha o valor e salve o lançamento.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="mk-form">
                <div className="mk-formrow">
                  <div className="mk-field">
                    <div className="mk-label">Valor do lançamento</div>
                    <input
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="Ex.: 100 ou 100,50"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="mk-field">
                    <div className="mk-label">Data</div>
                    <input
                      type="date"
                      value={dataLanc}
                      onChange={(e) => setDataLanc(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mk-field">
                  <div className="mk-label">Descrição</div>
                  <input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex.: Vale, bebida, adiantamento, almoço..."
                  />
                </div>

                <div className="mk-field">
                  <label className="taxa-label">
                    <input
                      type="checkbox"
                      checked={cobraTaxa}
                      onChange={(e) => setCobraTaxa(e.target.checked)}
                    />
                    <span className="taxa-switch"></span>
                    Aplicar taxa de 15%
                  </label>
                </div>

                <div className="mk-inline-help">
                  Resumo: taxa <b>{taxaPreviewPct}%</b> • desconto <b>{money(taxaPreviewValor)}</b> • líquido{" "}
                  <b>{money(liquidoPreview)}</b>
                </div>

                <div className="mk-actions-main">
                  <button className="btn-primary" disabled={!selected || saving} onClick={onSalvarLancamento}>
                    {saving ? "Salvando..." : "Salvar e imprimir"}
                  </button>
                </div>

                <div className="mk-actions-secondary">
                  <button className="btn-secondary" disabled={saving} onClick={() => loadFuncs(selected?.id)}>
                    Atualizar dados
                  </button>

                  <button className="btn-danger" disabled={!selected || saving} onClick={onFecharPendentes}>
                    Enviar todos os pendentes para registrados
                  </button>
                </div>

                <div className="mk-inline-help">
                  Dica: desmarque a taxa quando for um vale sem desconto. Ao salvar, a notinha abre automaticamente para assinatura.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ModalNovoFuncionario
        open={openNovoFunc}
        onClose={() => !savingFunc && setOpenNovoFunc(false)}
        onSave={onCriarFuncionario}
        saving={savingFunc}
      />
    </div>
  );
}