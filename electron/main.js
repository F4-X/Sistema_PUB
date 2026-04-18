const { app: electronApp, BrowserWindow, dialog } = require("electron");
const path = require("path");
const http = require("http");

let win;
let server;

function waitHealth(url, tries = 60, delayMs = 250) {
  return new Promise((resolve, reject) => {
    let n = 0;

    const tick = () => {
      n++;

      const req = http.get(url, (res) => {
        res.resume();

        if (res.statusCode === 200) return resolve();

        if (n >= tries) return reject(new Error("Healthcheck falhou"));
        setTimeout(tick, delayMs);
      });

      req.on("error", () => {
        if (n >= tries) return reject(new Error("Backend não respondeu"));
        setTimeout(tick, delayMs);
      });

      req.setTimeout(1500, () => {
        req.destroy();
      });
    };

    tick();
  });
}

electronApp.whenReady().then(async () => {
  try {
    process.env.PGDATA_DIR =
      process.env.PGDATA_DIR ||
      path.join(electronApp.getPath("userData"), "pglite_data");

    process.env.PORT = process.env.PORT || "3001";

    const isPackaged = electronApp.isPackaged;
    const appPath = electronApp.getAppPath();

    console.log("isPackaged =", isPackaged);
    console.log("appPath =", appPath);
    console.log("resourcesPath =", process.resourcesPath);

    const backendAppPath = isPackaged
      ? path.join(appPath, "backend", "src", "app.js")
      : path.join(__dirname, "..", "backend", "src", "app.js");

    const frontendIndexPath = isPackaged
      ? path.join(appPath, "frontend", "dist", "index.html")
      : path.join(__dirname, "..", "frontend", "dist", "index.html");

    console.log("backendAppPath =", backendAppPath);
    console.log("frontendIndexPath =", frontendIndexPath);

    const backendMod = require(backendAppPath);
    const expressApp = backendMod?.app || backendMod;
    const initDatabase = backendMod?.initDatabase;

    if (typeof initDatabase === "function") {
      await initDatabase();
    }

    if (typeof expressApp?.listen !== "function") {
      throw new Error("Export inválido: não encontrei app.listen()");
    }

    server = expressApp.listen(Number(process.env.PORT), "127.0.0.1", () => {
      console.log("API embutida na porta", process.env.PORT);
    });

    await waitHealth(`http://127.0.0.1:${process.env.PORT}/health`);

    win = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1100,
      minHeight: 700,
      autoHideMenuBar: true,
      backgroundColor: "#0b0b13",
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await win.loadFile(frontendIndexPath);

    win.once("ready-to-show", () => {
      win.show();
    });
  } catch (err) {
    console.error("FATAL:", err);
    dialog.showErrorBox("Erro ao iniciar", String(err?.message || err));
    electronApp.quit();
  }
});

electronApp.on("window-all-closed", () => {
  try {
    if (server) server.close();
  } catch {}

  if (process.platform !== "darwin") electronApp.quit();
});