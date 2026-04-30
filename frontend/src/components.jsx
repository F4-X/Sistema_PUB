import React from "react";

export function TopbarPDV({ page, setPage, search, setSearch, onLogout, onBack }) {
  const subtitle =
  page === "pdv"
    ? "PDV • Pesquisa"
    : page === "hist"
    ? "Histórico • Vendas"
    : page === "caixa"
    ? "Caixa • Sangria"
    : page === "fechamento"
    ? "Fechamento de Caixa"
    : "";

  return (
    <header className="pdv-topbar">
      <div className="pdv-brand">
        <div className="pdv-title">1005 PUB</div>
        <div className="pdv-sub">{subtitle}</div>
      </div>

      <div className="pdv-controls">
        {page === "pdv" && (
          <div className="pdv-search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar produto..."
            />
          </div>
        )}

        <div className="pdv-toggle">
          <button onClick={onBack}>← Menu</button>

          <button
            className={page === "pdv" ? "active" : ""}
            onClick={() => setPage("pdv")}
          >
            PDV
          </button>

          <button
            className={page === "hist" ? "active" : ""}
            onClick={() => setPage("hist")}
          >
            Histórico
          </button>

          <button
            className={page === "caixa" ? "active" : ""}
            onClick={() => setPage("caixa")}
          >
            Caixa
          </button>

          <button
  className={page === "fechamento" ? "active" : ""}
  onClick={() => setPage("fechamento")}
>
  Fechamento
</button>

          <button onClick={onLogout}>Sair</button>
        </div>
      </div>
    </header>
  );
}

export function TopbarFinanceiro({ page, setPage, onBack, onLogout }) {
  const subtitle =
    page === "financeiro"
      ? "Financeiro"
      : page === "xmls"
      ? "XMLs"
      : page === "contas-pagar"
      ? "Contas a Pagar"
      : page === "contas-pagas"
      ? "Contas Pagas"
      : "Financeiro";

  return (
    <header className="pdv-topbar">
      <div className="pdv-brand">
        <div className="pdv-title">1005 PUB</div>
        <div className="pdv-sub">{subtitle}</div>
      </div>

      <div className="pdv-controls">
        <div className="pdv-toggle">
          <button onClick={onBack}>← Menu</button>

          <button
            className={page === "financeiro" ? "active" : ""}
            onClick={() => setPage("financeiro")}
          >
            Financeiro
          </button>

          <button
            className={page === "xmls" ? "active" : ""}
            onClick={() => setPage("xmls")}
          >
            XMLs
          </button>

          <button
            className={page === "contas-pagar" ? "active" : ""}
            onClick={() => setPage("contas-pagar")}
          >
            Contas a Pagar
          </button>

          <button
            className={page === "contas-pagas" ? "active" : ""}
            onClick={() => setPage("contas-pagas")}
          >
            Contas Pagas
          </button>

          <button onClick={onLogout}>Sair</button>
        </div>
      </div>
    </header>
  );
}

export function TopbarFuncionarios({ onBack, onLogout }) {
  return (
    <header className="pdv-topbar">
      <div className="pdv-brand">
        <div className="pdv-title">1005 PUB</div>
        <div className="pdv-sub">Funcionários</div>
      </div>

      <div className="pdv-controls">
        <div className="pdv-toggle">
          <button onClick={onBack}>← Menu</button>
          <button className="active">Funcionários</button>
          <button onClick={onLogout}>Sair</button>
        </div>
      </div>
    </header>
  );
}

export function Toast({ msg }) {
  if (!msg) return null;
  return <div className={`toast ${msg.type}`}>{msg.text}</div>;
}

export function Categorias({
  categorias,
  categoriaAtiva,
  setCategoriaAtiva,
  onCtx,
  onOpenCat,
}) {
  return (
    <>
      <div className="panel-head">
        <h2>Categorias</h2>
        <div className="panel-actions">
          <button className="btn-mini" onClick={onOpenCat}>
            + Categoria
          </button>
          <span className="badge">Clique para filtrar</span>
        </div>
      </div>

      <div className="chips">
        <button
          className={`chip ${!categoriaAtiva ? "active" : ""}`}
          onClick={() => setCategoriaAtiva(null)}
        >
          Todas
        </button>

        {categorias.map((c) => (
          <button
            key={c.id}
            className={`chip ${categoriaAtiva === c.id ? "active" : ""}`}
            onClick={() => setCategoriaAtiva(c.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onCtx("categoria", c, e.clientX, e.clientY);
            }}
          >
            {c.nome}
          </button>
        ))}
      </div>
    </>
  );
}

export function Produtos({
  produtos,
  mostrandoProdutos,
  onAdd,
  onCtx,
  onOpenProd,
  page,
  pages,
  total,
  onPrev,
  onNext,
}) {
  return (
    <>
      <div className="panel-head">
        <h2>{mostrandoProdutos ? "Resultados" : "Produtos"}</h2>
        <div className="panel-actions">
          <button className="btn-mini" onClick={onOpenProd}>
            + Produto
          </button>
          <span className="badge">
            {total ? `${total} no total` : `${produtos.length} item(ns)`}
          </span>
        </div>
      </div>

      {produtos.length === 0 ? (
        <div className="empty">
          <div className="empty-title">Nenhum produto encontrado</div>
          <div className="empty-sub">Tente outra pesquisa ou cadastre produtos.</div>
        </div>
      ) : (
        <>
          <div className="products-grid">
            {produtos.map((p) => (
              <button
                key={p.id}
                className="product-card"
                onClick={() => onAdd(p)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onCtx("produto", p, e.clientX, e.clientY);
                }}
              >
                <div className="product-name">{p.nome}</div>
                <div className="product-foot">
                  <div className="product-cat">
                    {p.categoria_nome || "Sem categoria"}
                    {!mostrandoProdutos && p.vendido_qtd != null ? ` • ${p.vendido_qtd}x` : ""}
                  </div>
                  <div className="product-price">R$ {Number(p.preco).toFixed(2)}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="pager">
            <button className="btn-secondary" onClick={onPrev} disabled={page <= 1}>
              ← Anterior
            </button>
            <div className="pager-info">
              Página <strong>{page}</strong> de <strong>{pages}</strong>
            </div>
            <button className="btn-secondary" onClick={onNext} disabled={page >= pages}>
              Próxima →
            </button>
          </div>
        </>
      )}
    </>
  );
}

export function Carrinho({ caixa, cart, total, onDec, onInc, onClear, onFinish }) {
  return (
    <aside className="panel panel-sticky">
      <div className="panel-head">
        <h2>Comanda — Caixa {caixa}</h2>
        <span className="badge">{cart.length} item(ns)</span>
      </div>

      {cart.length === 0 ? (
        <div className="empty">
          <div className="empty-title">Nenhum item ainda</div>
          <div className="empty-sub">Clique em um produto para adicionar.</div>
        </div>
      ) : (
        <div className="cart-list">
          {cart.map((i) => (
            <div key={i.id} className="cart-row">
              <div className="cart-left">
                <div className="cart-name">{i.nome}</div>
                <div className="qty">
                  <button className="qty-btn" onClick={() => onDec(i.id)}>
                    −
                  </button>
                  <span className="qty-n">{i.qtd}</span>
                  <button className="qty-btn" onClick={() => onInc(i.id)}>
                    +
                  </button>
                </div>
              </div>
              <div className="cart-right">R$ {(i.preco * i.qtd).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="total-box">
        <span>Total</span>
        <strong>R$ {Number(total || 0).toFixed(2)}</strong>
      </div>

      <div className="actions">
        <button className="btn-danger" onClick={onClear} disabled={cart.length === 0}>
          Limpar
        </button>
        <button className="btn-primary" onClick={onFinish} disabled={cart.length === 0}>
          Finalizar
        </button>
      </div>
    </aside>
  );
}

export function ContextMenu({ menu, onEditarProduto, onExcluirProduto, onExcluirCategoria }) {
  if (!menu) return null;

  return (
    <div
      className="ctx"
      style={{ top: menu.y, left: menu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      {menu.type === "produto" ? (
        <>
          <button onClick={() => onEditarProduto(menu.item)}>
            ✏️ Editar produto
          </button>

          <button className="danger" onClick={() => onExcluirProduto(menu.item)}>
            🗑️ Excluir produto
          </button>
        </>
      ) : (
        <button className="danger" onClick={() => onExcluirCategoria(menu.item)}>
          🗑️ Excluir categoria
        </button>
      )}
    </div>
  );
}

export function ModalCategoria({ open, value, onChange, onClose, onSave }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Cadastrar Categoria</h3>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome da categoria"
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalProduto({
  open,
  nome,
  preco,
  categoriaId,
  categorias,
  onClose,
  onSave,
  setNome,
  setPreco,
  setCategoriaId,

  // NOVOS CAMPOS
  ncm,
  cfop,
  csosn,
  pis,
  cofins,
  unidade,

  setNcm,
  setCfop,
  setCsosn,
  setPis,
  setCofins,
  setUnidade,

  titulo = "Cadastrar Produto",
  textoBotao = "Salvar",
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>

        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do produto" />
        <input value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Preço" />

        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <hr />

        <h4>Fiscal</h4>

        <input value={ncm || ""} onChange={(e) => setNcm(e.target.value)} placeholder="NCM" />
        <input value={cfop || ""} onChange={(e) => setCfop(e.target.value)} placeholder="CFOP" />
        <input value={csosn || ""} onChange={(e) => setCsosn(e.target.value)} placeholder="CSOSN (ICMS)" />
        <input value={pis || ""} onChange={(e) => setPis(e.target.value)} placeholder="PIS CST" />
        <input value={cofins || ""} onChange={(e) => setCofins(e.target.value)} placeholder="COFINS CST" />
        <input value={unidade || ""} onChange={(e) => setUnidade(e.target.value)} placeholder="Unidade (UN)" />

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSave}>
            {textoBotao}
          </button>
        </div>
      </div>
    </div>
  );
} {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>

        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do produto"
        />
        <input
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="Preço (ex: 18.00)"
        />

        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={onSave}>
            {textoBotao}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalPagamento({
  open,
  total,

  dinheiro,
  pix,
  cartao,
  cartaoTipo,
  setDinheiro,
  setPix,
  setCartao,
  setCartaoTipo,

  descontoTipo,
  setDescontoTipo,
  descontoValor,
  setDescontoValor,

  onClose,
  onConfirm,
  loading,
}) {
  if (!open) return null;

  const [showDesc, setShowDesc] = React.useState(false);

  const [dinDraft, setDinDraft] = React.useState("");
  const [pixDraft, setPixDraft] = React.useState("");
  const [carDraft, setCarDraft] = React.useState("");

  const [openTipoCartao, setOpenTipoCartao] = React.useState(false);
  const [carTemp, setCarTemp] = React.useState("");

  const n = (v) => Number(String(v || "").replace(",", ".")) || 0;
  const clamp2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

  const tf = clamp2(Number(total || 0));

  const din = clamp2(n(dinheiro));
  const px = clamp2(n(pix));
  const car = clamp2(n(cartao));

  const totalPago = clamp2(din + px + car);
  const falta = clamp2(Math.max(0, tf - totalPago));

  const precisaEmDinPix = clamp2(Math.max(0, tf - car));
  const troco = clamp2(Math.max(0, (din + px) - precisaEmDinPix));

  const maxCartao = clamp2(Math.max(0, tf - (din + px)));
  const podeConfirmar = totalPago + 0.00001 >= tf && tf > 0;

  const enviar = (tipo) => {
    if (tipo === "din") {
      const v = clamp2(n(dinDraft));
      if (v <= 0) return;
      setDinheiro(String(v));
      setDinDraft("");
      return;
    }

    if (tipo === "pix") {
      const v = clamp2(n(pixDraft));
      if (v <= 0) return;
      setPix(String(v));
      setPixDraft("");
      return;
    }

    if (tipo === "car") {
      let v = clamp2(n(carDraft));
      if (v <= 0) return;

      v = Math.min(v, maxCartao);
      if (v <= 0) return;

      setCarTemp(String(v));
      setOpenTipoCartao(true);
    }
  };

  const escolherTipoCartao = (tipo) => {
    setCartao(carTemp);
    setCartaoTipo(tipo);
    setCarDraft("");
    setCarTemp("");
    setOpenTipoCartao(false);
  };

  const remover = (tipo) => {
    if (tipo === "din") setDinheiro("");
    if (tipo === "pix") setPix("");
    if (tipo === "car") {
      setCartao("");
      setCartaoTipo("");
    }
  };

  const LinhaValor = ({ label, value, onRemove }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <span>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b>R$ {Number(value).toFixed(2)}</b>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: "6px 10px" }}
          onClick={onRemove}
          title="Remover"
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Pagamento</h3>
            <div className="badge">
              Total: <b style={{ marginLeft: 6 }}>R$ {tf.toFixed(2)}</b>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
              <input
                value={dinDraft}
                onChange={(e) => setDinDraft(e.target.value)}
                placeholder="Dinheiro"
                inputMode="decimal"
                onKeyDown={(e) => e.key === "Enter" && enviar("din")}
              />
              <button className="btn-secondary" type="button" onClick={() => enviar("din")}>
                Enviar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
              <input
                value={pixDraft}
                onChange={(e) => setPixDraft(e.target.value)}
                placeholder="Pix"
                inputMode="decimal"
                onKeyDown={(e) => e.key === "Enter" && enviar("pix")}
              />
              <button className="btn-secondary" type="button" onClick={() => enviar("pix")}>
                Enviar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
              <input
                value={carDraft}
                onChange={(e) => setCarDraft(e.target.value)}
                placeholder={`Cartão (máx: ${maxCartao.toFixed(2)})`}
                inputMode="decimal"
                onKeyDown={(e) => e.key === "Enter" && enviar("car")}
              />
              <button className="btn-secondary" type="button" onClick={() => enviar("car")}>
                Enviar
              </button>
            </div>

            {(din > 0 || px > 0 || car > 0) && (
              <div className="empty">
                {din > 0 && <LinhaValor label="Dinheiro" value={din} onRemove={() => remover("din")} />}

                {px > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <LinhaValor label="Pix" value={px} onRemove={() => remover("pix")} />
                  </div>
                )}

                {car > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <LinhaValor
                      label={`Cartão${cartaoTipo ? ` (${cartaoTipo === "credito" ? "Crédito" : "Débito"})` : ""}`}
                      value={car}
                      onRemove={() => remover("car")}
                    />
                  </div>
                )}

                <div style={{ borderTop: "1px dashed rgba(255,255,255,.14)", margin: "10px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Falta pagar</span>
                  <b>R$ {falta.toFixed(2)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span>Troco</span>
                  <b>R$ {troco.toFixed(2)}</b>
                </div>
              </div>
            )}

            <button className="btn-secondary" type="button" onClick={() => setShowDesc((v) => !v)}>
              {showDesc ? "Ocultar desconto" : "Desconto (opcional)"}
            </button>

            {showDesc && (
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
                <select value={descontoTipo} onChange={(e) => setDescontoTipo(e.target.value)}>
                  <option value="rs">Desconto (R$)</option>
                  <option value="pct">Desconto (%)</option>
                </select>

                <input
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(e.target.value)}
                  placeholder={descontoTipo === "pct" ? "Ex: 10" : "Ex: 5.00"}
                  inputMode="decimal"
                />
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={onConfirm} disabled={!podeConfirmar || loading}>
              {loading ? "Salvando..." : "Confirmar venda"}
            </button>
          </div>
        </div>
      </div>

      {openTipoCartao && (
        <div className="modal-backdrop" onClick={() => setOpenTipoCartao(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)" }}>
            <h3 style={{ marginTop: 0 }}>Tipo do cartão</h3>
            <p style={{ marginTop: 0, opacity: 0.85 }}>
              Escolha se o valor de R$ {Number(carTemp || 0).toFixed(2)} é no crédito ou débito.
            </p>

            <div className="modal-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <button className="btn-secondary" type="button" onClick={() => setOpenTipoCartao(false)}>
                Cancelar
              </button>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-secondary" type="button" onClick={() => escolherTipoCartao("debito")}>
                  Débito
                </button>
                <button className="btn-primary" type="button" onClick={() => escolherTipoCartao("credito")}>
                  Crédito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}