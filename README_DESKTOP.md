# AgriConto Pro Desktop

AgriConto Pro Desktop wraps the React application with Electron and keeps FastAPI as the local data engine.

## Development

Run the frontend:

```bash
cd frontend
npm run dev
```

Run the desktop shell:

```bash
cd frontend
AGRICONTO_DEV_URL=http://localhost:5173 npm run desktop:dev
```

The desktop launcher checks `http://127.0.0.1:8001/health`. If no backend is already running, it tries to start FastAPI from `../backend` with:

```bash
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

You can override paths with:

- `AGRICONTO_BACKEND_DIR`
- `AGRICONTO_BACKEND_PYTHON`
- `AGRICONTO_BACKEND_PORT`
- `AGRICONTO_BACKEND_AUTOSTART=0`

## Security

Electron is configured with:

- `contextIsolation: true`
- `nodeIntegration: false`
- renderer sandbox enabled
- unsafe navigation blocked
- production DevTools disabled
- no arbitrary filesystem API exposed to the renderer

If the backend is unavailable in a packaged app, the user sees a friendly Italian error screen instead of a technical stack trace.

## Packaging

```bash
cd frontend
npm run desktop:pack
```

Outputs:

- `frontend/release/agriconto-pro-0.1.0-amd64.deb`
- `frontend/release/agriconto-pro-0.1.0-amd64.AppImage`

Package identity:

- product name: `AgriConto Pro`
- app id: `com.agriconto.pro`
- Debian package/executable name: `agriconto-pro`

## Current Limitation

The package includes backend source files as an Electron resource, but it does not yet bundle a controlled Python runtime or local database runtime. A fresh Debian machine must have a suitable Python environment and backend dependencies available, or the next release should ship a PyInstaller backend sidecar.

Recommended production path:

1. Package FastAPI with PyInstaller.
2. Start the backend executable from Electron.
3. Bind only to `127.0.0.1`.
4. Wait for `/health`.
5. Store logs under the Electron user-data directory.
6. Stop the backend on app quit.
