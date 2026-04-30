# Desktop

AgriConto Pro has an Electron desktop wrapper for Debian/Linux.

## Current Status

Implemented:

- Electron shell for the React frontend.
- Secure renderer configuration:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - sandbox enabled
  - unsafe navigation blocked
  - production DevTools disabled
- Backend health check integration.
- Friendly Italian backend-unavailable screen.
- Debian `.deb` and AppImage build targets.

In progress:

- Production-ready backend sidecar packaging.
- Local database/runtime strategy.
- Installed-app smoke tests.

## Development

```bash
cd frontend
npm run dev
AGRICONTO_DEV_URL=http://localhost:5173 npm run desktop:dev
```

## Linux Packaging

```bash
cd frontend
npm run desktop:pack
```

Expected outputs:

- `frontend/release/agriconto-pro-0.1.0-amd64.deb`
- `frontend/release/agriconto-pro-0.1.0-x86_64.AppImage`

Package identity:

- product name: `AgriConto Pro`
- app id: `com.agriconto.pro`
- Debian package/executable name: `agriconto-pro`

## Debian Install

```bash
sudo apt install ./frontend/release/agriconto-pro-0.1.0-amd64.deb
```

The app should appear in the Linux applications menu as AgriConto Pro.

## Backend Behavior

The desktop launcher checks:

```text
http://127.0.0.1:8001/health
```

If no backend responds, it attempts to start FastAPI from the backend directory in development or from bundled resources in packaged mode.

Current limitation: the package includes backend source resources, but does not yet include a controlled Python runtime or local database runtime.

## Future Automatic Backend Start

Recommended production approach:

1. Package FastAPI as a PyInstaller executable.
2. Bind only to `127.0.0.1`.
3. Generate/store local secrets securely.
4. Wait for `/health`.
5. Run migrations safely.
6. Store logs in the Electron user-data directory.
7. Stop the backend on app quit.

## Windows Roadmap

Windows packaging is planned after Debian/Linux stabilizes. Required work includes `.ico` assets, installer metadata, Windows code signing strategy and backend sidecar testing.

## Desktop Security Rules

- Do not expose arbitrary filesystem APIs to the renderer.
- Do not expose backend logs or internal paths to normal users.
- Do not store secrets in source code.
- Keep all API authorization server-side.
- Treat local desktop data as sensitive business data.
