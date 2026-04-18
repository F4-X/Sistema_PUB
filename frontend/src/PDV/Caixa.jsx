// frontend/src/Caixa.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "../api";

const money = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const CAIXA_PASS = (import.meta?.env?.VITE_CAIXA_SENHA || "1005").trim();
const SESSION_KEY = "caixa_unlocked";

export default function Caixa() {
  const [saldo, setSaldo] = useState(null);
  const [saldoErr, setSaldoErr] = useState("");

  const [items, setItems] = useState([]);
  const [listErr, setListErr] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [tipo, setTipo] = useState("saida");
  const [motivo, setMotivo] = useState("sangria");
  const [origem, setOrigem] = useState("caixa");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [openId, setOpenId] = useState(null);

  // ✅ paginação por card
  const LIMIT = 6;
  const [pageManual, setPageManual] = useState(1);
  const [pageVendas, setPageVendas] = useState(1);

  // 🔒 privacidade
  const [unlocked, setUnlocked] = useState(false);
  const [askPass, setAskPass] = useState(false);
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState("");

  function toastOk(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }
  function toastErr(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  const hiddenMoney = useMemo(() => "•••••", []);
  const hiddenText = useMemo(() => "🔒 Oculto", []);

  // ✅ listas completas (pra calcular next)
  const historicoManualAll = useMemo(() => {
    return (items || []).filter((it) => {
      const m = String(it?.motivo || "").trim().toLowerCase();
      return m === "sangria" || m === "reforco";
    });
  }, [items]);

  const historicoVendasAll = useMemo(() => {
    return (items || []).filter((it) => {
      const t = String(it?.tipo || "").trim().toLowerCase();
      const m = String(it?.motivo || "").trim().toLowerCase();
      return t === "entrada" && m === "venda";
    });
  }, [items]);

  // ✅ páginas (slice)
  const historicoManual = useMemo(() => {
    const start = (pageManual - 1) * LIMIT;
    return historicoManualAll.slice(start, start + LIMIT);
  }, [historicoManualAll, pageManual]);

  const historicoVendas = useMemo(() => {
    const start = (pageVendas - 1) * LIMIT;
    return historicoVendasAll.slice(start, start + LIMIT);
  }, [historicoVendasAll, pageVendas]);

  const manualHasPrev = pageManual > 1;
  const manualHasNext = historicoManualAll.length > pageManual * LIMIT;

  const vendasHasPrev = pageVendas > 1;
  const vendasHasNext = historicoVendasAll.length > pageVendas * LIMIT;

  async function loadSaldo() {
    setSaldoErr("");
    try {
      const { data } = await api.get("/caixa/saldo");
      setSaldo(data);
    } catch (e) {
      setSaldo(null);
      setSaldoErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Erro ao buscar saldo"
      );
    }
  }

  // ✅ pega bastante e pagina no FRONT
  async function loadMovimentos() {
    setListErr("");
    setLoadingList(true);
    try {
      const { data } = await api.get(`/caixa/movimentos?limit=500&page=1`);
      setItems(data?.items || []);
    } catch (e) {
      setItems([]);
      setListErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Erro ao listar movimentos"
      );
    } finally {
      setLoadingList(false);
    }
  }

  // restaura desbloqueio
  useEffect(() => {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s === "1") setUnlocked(true);
  }, []);

  useEffect(() => {
    loadSaldo();
    loadMovimentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function presetSangria() {
    setTipo("saida");
    setMotivo("sangria");
  }

  function presetReforco() {
    setTipo("entrada");
    setMotivo("reforco");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setToast("");

    try {
      const v = Number(String(valor).replace(",", "."));
      if (!v || v <= 0) throw new Error("Informe um valor válido");

      await api.post("/caixa/movimentos", {
        tipo,
        valor: v,
        motivo,
        origem: origem || null,
        observacao: obs || null,
      });

      setValor("");
      setObs("");
      setOpenId(null);

      // ✅ volta páginas
      setPageManual(1);
      setPageVendas(1);

      toastOk("Movimento lançado com sucesso!");
      await loadSaldo();
      await loadMovimentos();
    } catch (e2) {
      const msg =
        e2?.response?.data?.error ||
        e2?.response?.data?.message ||
        e2?.message ||
        "Erro ao lançar movimento";
      toastErr(msg);
    } finally {
      setSaving(false);
    }
  }

  function toggleObs(id) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function openPassword() {
    setPass("");
    setPassErr("");
    setAskPass(true);
  }

  function lockNow() {
    setUnlocked(false);
    sessionStorage.removeItem(SESSION_KEY);
    toastOk("Valores ocultados.");
  }

  function unlockNow() {
    const typed = String(pass || "").trim();
    if (!typed) {
      setPassErr("Digite a senha.");
      return;
    }
    if (typed !== CAIXA_PASS) {
      setPassErr("Senha incorreta.");
      return;
    }
    setUnlocked(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    setAskPass(false);
    setPass("");
    setPassErr("");
    toastOk("Valores liberados.");
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Caixa / Sangria</h2>

        <button className="btn-secondary" onClick={presetSangria} type="button">
          Sangria
        </button>

        <button className="btn-secondary" onClick={presetReforco} type="button">
          Reforço
        </button>

        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            setPageManual(1);
            setPageVendas(1);
            loadSaldo();
            loadMovimentos();
          }}
        >
          Atualizar
        </button>

        {!unlocked ? (
          <button className="btn-secondary" type="button" onClick={openPassword}>
            🔒 Mostrar valores
          </button>
        ) : (
          <button className="btn-secondary" type="button" onClick={lockNow}>
            👁️ Ocultar
          </button>
        )}

        {toast ? <span className="badge">{toast}</span> : null}
      </div>

      {/* Cards saldo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 12 }}>
        <div className="panel">
          <div className="panel-head">
            <h2>Saldo atual</h2>
            <span className="badge">
              {saldo ? (unlocked ? money(saldo.saldo) : hiddenMoney) : "—"}
            </span>
          </div>

          {!unlocked ? (
            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
              🔒 Saldo oculto — clique em <b>Mostrar valores</b> para liberar com senha.
            </div>
          ) : null}

          {saldoErr ? (
            <div className="empty" style={{ marginTop: 10 }}>
              <div className="empty-title">⚠ Não foi possível carregar</div>
              <div className="empty-sub">{saldoErr}</div>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Entradas</h2>
            <span className="badge">
              {saldo ? (unlocked ? money(saldo.entradas) : hiddenMoney) : "—"}
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Saídas</h2>
            <span className="badge">
              {saldo ? (unlocked ? money(saldo.saidas) : hiddenMoney) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="panel">
        <div className="panel-head">
          <h2>Novo movimento</h2>
          <span className="badge">
            {tipo === "entrada" ? "Entrada" : "Saída"} • {motivo}
          </span>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Tipo</div>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="entrada">entrada</option>
                <option value="saida">saida</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Motivo</div>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option value="sangria">sangria</option>
                <option value="reforco">reforco</option>
                <option value="troco">troco</option>
                <option value="ajuste">ajuste</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Origem</div>
              <input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="caixa" />
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Valor (R$)</div>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="ex: 50"
                inputMode="decimal"
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Observação</div>
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="opcional" />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "Lançar movimento"}
            </button>
          </div>
        </form>
      </div>

      {/* Históricos */}
      <div className="panel">
        <div className="panel-head">
          <h2>Históricos do caixa</h2>
          <span className="badge">{loadingList ? "Carregando..." : "OK"}</span>
        </div>

        {!unlocked ? (
          <div className="empty" style={{ marginTop: 10 }}>
            <div className="empty-title">{hiddenText}</div>
            <div className="empty-sub">
              O histórico está oculto. Clique em <b>Mostrar valores</b> e digite a senha para liberar.
            </div>
          </div>
        ) : (
          <>
            {listErr ? (
              <div className="empty" style={{ marginTop: 10 }}>
                <div className="empty-title">⚠ Erro ao carregar histórico</div>
                <div className="empty-sub">{listErr}</div>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(320px, 1fr))",
                gap: 14,
                marginTop: 10,
              }}
            >
              <HistoricoCard
                titulo="Histórico manual"
                subtitulo="Somente reforço e sangria"
                items={historicoManual}
                openId={openId}
                onToggleObs={toggleObs}
                page={pageManual}
                setPage={setPageManual}
                hasPrev={manualHasPrev}
                hasNext={manualHasNext}
              />

              <HistoricoCard
                titulo="Entradas de vendas"
                subtitulo="Somente entradas vindas do PDV"
                items={historicoVendas}
                openId={openId}
                onToggleObs={toggleObs}
                page={pageVendas}
                setPage={setPageVendas}
                hasPrev={vendasHasPrev}
                hasNext={vendasHasNext}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal senha */}
      {askPass ? (
        <div
          onClick={() => setAskPass(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(520px, 100%)", padding: 14, borderRadius: 14 }}
          >
            <div className="panel-head" style={{ marginBottom: 8 }}>
              <h2>🔒 Liberar valores do caixa</h2>
              <span className="badge">Senha</span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Digite a senha para mostrar saldo, entradas, saídas e históricos.
              </div>

              <input
                autoFocus
                type="password"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setPassErr("");
                }}
                placeholder="Senha do caixa"
                onKeyDown={(e) => {
                  if (e.key === "Enter") unlockNow();
                }}
              />

              {passErr ? (
                <div style={{ fontSize: 12, color: "var(--danger)", opacity: 0.95 }}>
                  {passErr}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-secondary" type="button" onClick={() => setAskPass(false)}>
                  Cancelar
                </button>
                <button className="btn-primary" type="button" onClick={unlockNow}>
                  Liberar
                </button>
              </div>

              <div style={{ fontSize: 12, opacity: 0.6 }}>
                *Dica: defina a senha no <b>.env</b> do front com <b>VITE_CAIXA_SENHA</b>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HistoricoCard({
  titulo,
  subtitulo,
  items,
  openId,
  onToggleObs,
  page,
  setPage,
  hasPrev,
  hasNext,
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 16,
        padding: 12,
        background: "rgba(255,255,255,.02)",
        minHeight: 320,
      }}
    >
      <div style={{ display: "grid", gap: 2, marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{titulo}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{subtitulo}</div>
      </div>

      {/* ✅ botões do card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!hasPrev}
          style={{ padding: "6px 10px" }}
          title="Página anterior"
        >
          ◀
        </button>

        <span className="badge">Página {page}</span>

        <button
          className="btn-secondary"
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext}
          style={{ padding: "6px 10px" }}
          title="Próxima página"
        >
          ▶
        </button>
      </div>

      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ opacity: 0.8 }}>
              <Th>Data</Th>
              <Th>Tipo</Th>
              <Th>Motivo</Th>
              <Th align="right">Valor</Th>
              <Th>Usuário</Th>
              <Th>Obs</Th>
            </tr>
          </thead>

          <tbody>
            {items.map((it) => {
              const hasObs = !!(it.observacao && String(it.observacao).trim());
              const isOpen = openId === it.id;

              return (
                <Fragment key={it.id}>
                  <tr style={{ borderTop: "1px solid rgba(255,255,255,.10)" }}>
                    <Td>{it.criado_em ? new Date(it.criado_em).toLocaleString("pt-BR") : "—"}</Td>
                    <Td>{it.tipo}</Td>
                    <Td>{it.motivo}</Td>
                    <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {money(it.valor)}
                    </Td>
                    <Td>{it.usuario_email || it.usuario_id || "—"}</Td>
                    <Td>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => onToggleObs(it.id)}
                        disabled={!hasObs}
                        style={{ padding: "6px 10px", opacity: hasObs ? 1 : 0.5 }}
                      >
                        👁 {isOpen ? "Fechar" : "Ver"}
                      </button>
                    </Td>
                  </tr>

                  {isOpen ? (
                    <tr style={{ borderTop: "1px dashed rgba(255,255,255,.10)" }}>
                      <Td colSpan={6} style={{ padding: 12 }}>
                        <div
                          style={{
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(255,255,255,.08)",
                            borderRadius: 10,
                            padding: 12,
                            display: "grid",
                            gap: 6,
                          }}
                        >
                          <div style={{ fontSize: 12, opacity: 0.75 }}>Observação</div>
                          <div style={{ whiteSpace: "pre-wrap" }}>{it.observacao}</div>
                        </div>
                      </Td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}

            {!items.length ? (
              <tr>
                <Td colSpan={6} style={{ textAlign: "center", padding: 16, opacity: 0.7 }}>
                  Nenhum registro encontrado.
                </Td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align }) {
  return (
    <th style={{ textAlign: align || "left", fontSize: 12, padding: "10px 8px", whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan, style }) {
  return (
    <td style={{ padding: "10px 8px", ...style }} colSpan={colSpan}>
      {children}
    </td>
  );
}