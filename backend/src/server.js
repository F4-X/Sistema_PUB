const backendMod = require("./app");

const app = backendMod?.app || backendMod;
const initDatabase = backendMod?.initDatabase;

const port = process.env.PORT || 3001;

(async () => {
  try {
    if (typeof initDatabase === "function") await initDatabase();

    if (typeof app?.listen !== "function") {
      console.log("DEBUG backendMod =", backendMod);
      throw new Error("Export inválido: não encontrei app.listen()");
    }

    app.listen(port, () => {
      console.log("🚀 API rodando na porta", port);
    });
  } catch (err) {
    console.error("❌ Erro ao iniciar servidor:");
    console.error(err?.message || err);
    console.error(err?.stack || "");
    process.exit(1);
  }
})();
