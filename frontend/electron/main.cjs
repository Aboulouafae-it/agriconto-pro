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
      webSecurity: true
    }
  });

  win.removeMenu();

  if (isDev) {
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

  win.webContents.on("will-navigate", (event, url) => {
    const allowed = isDev ? url.startsWith(devUrl) : url.startsWith("file://");
    if (!allowed) {
      event.preventDefault();
    }
  });
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
