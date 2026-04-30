const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = "8001";
const HEALTH_TIMEOUT_MS = 25_000;
const HEALTH_INTERVAL_MS = 500;

let backendProcess = null;
let backendLogStream = null;

function healthUrl(host, port) {
  return `http://${host}:${port}/health`;
}

function apiUrl(host, port) {
  return `http://${host}:${port}/api/v1`;
}

function resolveBackendDirectory(isDev) {
  if (process.env.AGRICONTO_BACKEND_DIR) {
    return path.resolve(process.env.AGRICONTO_BACKEND_DIR);
  }
  if (isDev) {
    return path.resolve(__dirname, "../../backend");
  }
  return path.join(process.resourcesPath, "backend");
}

function resolvePythonExecutable(backendDir) {
  if (process.env.AGRICONTO_BACKEND_PYTHON) {
    return process.env.AGRICONTO_BACKEND_PYTHON;
  }

  const candidates = [
    path.join(backendDir, ".venv/bin/python"),
    path.join(backendDir, "venv/bin/python"),
    path.join(process.resourcesPath || "", "python/bin/python")
  ];

  const bundledPython = candidates.find((candidate) => candidate && fs.existsSync(candidate));
  return bundledPython || "python3";
}

function ensureRuntimeSecret(app) {
  const runtimePath = path.join(app.getPath("userData"), "desktop-runtime.json");
  try {
    if (fs.existsSync(runtimePath)) {
      const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
      if (runtime.jwtSecretKey && runtime.jwtSecretKey.length >= 32) {
        return runtime.jwtSecretKey;
      }
    }
  } catch {
    // Fall through and rotate a local runtime secret if the file is unreadable.
  }

  const jwtSecretKey = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(runtimePath, JSON.stringify({ jwtSecretKey }, null, 2), {
    encoding: "utf8",
    mode: 0o600
  });
  return jwtSecretKey;
}

function openBackendLog(app) {
  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, "backend.log");
  backendLogStream = fs.createWriteStream(logFile, { flags: "a", mode: 0o600 });
  backendLogStream.write(`\n[${new Date().toISOString()}] Avvio backend AgriConto Pro\n`);
  return logFile;
}

function writeLog(message) {
  if (!backendLogStream) return;
  backendLogStream.write(`[${new Date().toISOString()}] ${message}\n`);
}

function checkHealth(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function waitForHealth(url, timeoutMs = HEALTH_TIMEOUT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await checkHealth(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, HEALTH_INTERVAL_MS));
  }
  return false;
}

async function startBackend({ app, isDev }) {
  const host = process.env.AGRICONTO_BACKEND_HOST || DEFAULT_HOST;
  const port = process.env.AGRICONTO_BACKEND_PORT || DEFAULT_PORT;
  const url = healthUrl(host, port);

  process.env.VITE_API_URL = process.env.VITE_API_URL || apiUrl(host, port);

  if (process.env.AGRICONTO_BACKEND_AUTOSTART === "0") {
    return { managed: false, ready: await checkHealth(url), healthUrl: url, reason: "disabled" };
  }

  if (await checkHealth(url)) {
    return { managed: false, ready: true, healthUrl: url, reason: "already-running" };
  }

  const backendDir = resolveBackendDirectory(isDev);
  if (!fs.existsSync(path.join(backendDir, "app/main.py"))) {
    return { managed: false, ready: false, healthUrl: url, reason: "backend-not-found", backendDir };
  }

  const logFile = openBackendLog(app);
  const python = resolvePythonExecutable(backendDir);
  const args = ["-m", "uvicorn", "app.main:app", "--host", host, "--port", port];
  const jwtSecretKey = process.env.JWT_SECRET_KEY || ensureRuntimeSecret(app);

  backendProcess = spawn(python, args, {
    cwd: backendDir,
    env: {
      ...process.env,
      ENVIRONMENT: process.env.ENVIRONMENT || "development",
      JWT_SECRET_KEY: jwtSecretKey,
      CORS_ORIGINS:
        process.env.CORS_ORIGINS ||
        "http://localhost:5173,http://127.0.0.1:5173,null",
      PYTHONUNBUFFERED: "1"
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  writeLog(`Backend directory: ${backendDir}`);
  writeLog(`Backend command: ${python} ${args.join(" ")}`);
  writeLog(`Health check: ${url}`);
  writeLog(`Log file: ${logFile}`);

  backendProcess.stdout.on("data", (chunk) => writeLog(`[stdout] ${chunk.toString().trimEnd()}`));
  backendProcess.stderr.on("data", (chunk) => writeLog(`[stderr] ${chunk.toString().trimEnd()}`));
  backendProcess.on("error", (error) => writeLog(`[error] ${error.message}`));
  backendProcess.on("exit", (code, signal) => {
    writeLog(`Backend stopped with code=${code ?? "null"} signal=${signal ?? "null"}`);
  });

  const ready = await waitForHealth(url);
  return { managed: true, ready, healthUrl: url, backendDir, logFile };
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backendProcess || backendProcess.killed) {
      if (backendLogStream) backendLogStream.end();
      resolve();
      return;
    }

    const processToStop = backendProcess;
    writeLog("Arresto backend AgriConto Pro");
    const killTimer = setTimeout(() => {
      if (!processToStop.killed) {
        writeLog("Arresto forzato backend dopo timeout");
        processToStop.kill("SIGKILL");
      }
    }, 5_000);

    processToStop.once("exit", () => {
      clearTimeout(killTimer);
      if (backendLogStream) backendLogStream.end();
      resolve();
    });

    processToStop.kill("SIGTERM");
  });
}

module.exports = {
  startBackend,
  stopBackend
};
