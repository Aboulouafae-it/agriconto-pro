# Release Checklist

## Identity

- App name shown as `AgriConto Pro`.
- Debian package/executable name is `agriconto-pro`.
- App ID is `com.agriconto.pro`.
- Sidebar, login, topbar, desktop icon and reports use the AgriConto Pro visual identity.
- Linux desktop menu shows the correct name and icon.

## Security

- No real secrets are committed.
- `.env` files are not bundled.
- Authentication, RBAC, farm isolation and audit logging are enabled.
- Worker users cannot access farm-level reports.
- Accountants can access only farms where they are members.
- PDF export endpoints require authentication and farm permission.
- Report QR/checksum metadata does not contain private financial rows or document contents.

## Desktop

- Electron production build has DevTools disabled.
- `contextIsolation` is true.
- `nodeIntegration` is false.
- Unsafe navigation is blocked.
- Backend health check uses `/health`.
- If the local backend is unavailable, the app shows a friendly Italian error.
- Backend logs are written to the Electron user-data directory.

## Reports

- JSON report endpoints work.
- PDF endpoints return `application/pdf`.
- `Content-Disposition` includes a safe PDF filename.
- PDF content is non-empty and includes title, farm/report metadata and disclaimer.
- Export creates a `report_exports` row and an audit event.
- Frontend handles PDF as `Blob`, not JSON.
- Electron/browser download flow works.

## Product QA

- Login works with demo credentials.
- Main actions open real forms or show a clear Italian development message.
- Empty states have title, explanation and action where relevant.
- Errors shown to normal users are friendly and do not expose stack traces or internal paths.
- Dashboard, Reports, Commercialista and Statistiche pages render without console errors.

## Build Commands

```bash
cd frontend
npm run build
npm run desktop:pack
```

```bash
cd backend
python -m compileall app
pytest app/tests/test_report_exporter.py app/tests/test_api_foundation.py
```
