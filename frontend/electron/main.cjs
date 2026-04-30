const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { startBackend, stopBackend } = require("./backendLauncher.cjs");

const isDev = !app.isPackaged;
const devUrl = process.env.AGRICONTO_DEV_URL || "http://localhost:5173";
let backendState = { managed: false, ready: false };

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: "AgriConto Pro",
    backgroundColor: "#f4f7f2",
    icon: path.join(__dirname, "../build/icons/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: isDev
    }
  });

  win.removeMenu();

  if (!backendState.ready && !isDev) {
    win.loadURL(backendErrorScreen(backendState));
  } else if (isDev) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("mailto:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (!isDev) {
    win.webContents.on("before-input-event", (event, input) => {
      if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
        event.preventDefault();
      }
    });
  }

  win.webContents.on("will-navigate", (event, url) => {
    const allowed = isDev ? url.startsWith(devUrl) : url.startsWith("file://");
    if (!allowed) {
      event.preventDefault();
    }
  });
}

function backendErrorScreen(state) {
  const detail = state.logFile ? "I log tecnici sono disponibili nella cartella dati dell'applicazione." : "Log locale non disponibile.";
  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>AgriConto Pro</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f7f2; font-family: Inter, system-ui, sans-serif; color: #17211b; }
    main { width: min(680px, calc(100vw - 48px)); border: 1px solid #d9e2d8; border-radius: 24px; background: white; padding: 40px; box-shadow: 0 24px 80px rgba(21, 45, 36, .14); }
    .mark { width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; background: #2f6f53; color: white; font-weight: 800; }
    h1 { margin: 24px 0 10px; font-size: 28px; }
    p { line-height: 1.7; color: #57534e; }
    .hint { margin-top: 20px; border-radius: 16px; background: #fff7ed; color: #7c2d12; padding: 14px 16px; font-size: 14px; }
    .small { margin-top: 18px; font-size: 12px; color: #78716c; }
  </style>
</head>
<body>
  <main>
    <div class="mark">AP</div>
    <h1>Motore locale non disponibile</h1>
    <p>Il motore locale di AgriConto Pro non è disponibile. Riavvia l'applicazione o contatta il supporto.</p>
    <div class="hint">La tua sessione non è stata modificata e nessun controllo di sicurezza è stato disattivato.</div>
    <div class="small">${escapeHtml(detail)}</div>
  </main>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.agriconto.pro");
  backendState = await startBackend({ app, isDev });
  if (!backendState.ready) {
    console.warn("AgriConto backend non pronto", {
      reason: backendState.reason,
      healthUrl: backendState.healthUrl,
      logFile: backendState.logFile
    });
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", (event) => {
  if (!backendState.managed) return;
  event.preventDefault();
  stopBackend().finally(() => {
    backendState.managed = false;
    app.quit();
  });
});
