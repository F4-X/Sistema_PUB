const express = require("express");
const cors = require("cors");

const { initOnStart } = require("./init_on_start");

const categoriasRoutes = require("./routes/categorias");
const produtosRoutes = require("./routes/produtos");
const vendasRoutes = require("./routes/vendas");
const financeiroRoutes = require("./routes/financeiro");
const fechamentosRoutes = require("./routes/fechamentos");
const caixaRoutes = require("./routes/caixa");
const authRoutes = require("./routes/auth");
const funcionariosRoutes = require("./routes/funcionarios");
const marcadosRoutes = require("./routes/marcados");
const contasPagarRoutes = require("./routes/contas_pagar");

const auth = require("./middleware/auth");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use(authRoutes);

app.use("/categorias", auth, categoriasRoutes);
app.use("/produtos", auth, produtosRoutes);
app.use("/vendas", auth, vendasRoutes);
app.use("/financeiro", auth, financeiroRoutes);
app.use("/financeiro/contas-pagar", auth, contasPagarRoutes);
app.use("/fechamentos", auth, fechamentosRoutes);
app.use("/caixa", auth, caixaRoutes);
app.use("/funcionarios", auth, funcionariosRoutes);
app.use("/marcados", auth, marcadosRoutes);

async function initDatabase() {
  await initOnStart();
}

module.exports = { app, initDatabase };