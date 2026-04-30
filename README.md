# AgriConto Pro

Professional Italian agricultural accounting, workforce, crop, document, analytics, desktop and accountant-ready reporting platform.

[![Status](https://img.shields.io/badge/status-MVP%20under%20active%20development-2f6f53)](#project-status)
[![Backend](https://img.shields.io/badge/backend-FastAPI-0b5f7a)](backend/)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-2563eb)](frontend/)
[![Desktop](https://img.shields.io/badge/desktop-Electron%20Linux-374151)](docs/DESKTOP.md)

AgriConto Pro helps farms, commercialisti and consulenti del lavoro organize operational and accounting data: workers, workdays, fields, crops, expenses, sales, documents, analytics and accountant-ready reports.

> AgriConto Pro does not replace a commercialista, consulente del lavoro, tax advisor, INPS, INAIL, Agenzia delle Entrate, or any official legal/tax filing system. It is a management and documentation tool that prepares organized, verifiable data for professional review.

## Project Status

MVP under active development. Core web, backend, desktop packaging foundation, analytics foundation and PDF report export foundation exist. Official tax/payroll/IVA/INPS/INAIL calculations are not implemented.

## Key Features

- Farm-scoped users, farms and farm memberships.
- RBAC roles: Titolare, Commercialista, Consulente del lavoro, Lavoratore.
- Workers, workdays, fields, crops, expenses, sales and documents modules.
- Secure document upload and authenticated download flow.
- Audit logging for important create/update/delete/export actions.
- JSON reports and server-generated PDF exports.
- Pacchetto Commercialista reporting workflow.
- Statistiche e Analisi analytics center.
- Electron desktop packaging foundation for Debian/Linux.

## Screenshots

Screenshots are planned for the public README. Placeholder folders are available under `docs/assets/screenshots/`.

## Architecture Overview

```text
agriconto-pro/
├── backend/    FastAPI, SQLAlchemy, Alembic, PostgreSQL
├── frontend/   Vite React TypeScript TailwindCSS and Electron shell
├── docs/       product, architecture, security, desktop and reports docs
└── docker-compose.yml
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for boundaries, data flow and desktop architecture.

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic, JWT auth
- Database: PostgreSQL
- Frontend: React, TypeScript, Vite, TailwindCSS, TanStack Query, React Router
- Desktop: Electron, electron-builder, Debian `.deb`, AppImage
- Reports: JSON-first services plus server-side PDF generation
- DevOps: Docker Compose development environment

## Security Principles

- `farm_id` is the tenant boundary.
- Backend permissions are authoritative; frontend permissions are UX only.
- Accountant access is read-only for financial records.
- Worker role must not see farm-wide data.
- Documents never expose internal storage paths.
- Report exports require authentication, farm membership and role checks.
- Important exports and mutations are audited.

Read the full model in [docs/SECURITY.md](docs/SECURITY.md) and the disclosure policy in [SECURITY.md](SECURITY.md).

## Reports and PDF Status

Implemented report endpoints include monthly, workers, crops, expenses, sales, missing documents and accountant pack reports. PDF exports return `application/pdf`, include report metadata/checksum headers and create audit/export records.

See [docs/REPORTS.md](docs/REPORTS.md).

## Desktop Status

The Electron app builds for Debian/Linux as `.deb` and AppImage. It includes a backend sidecar launcher foundation and `/health` checks. A fully bundled Python runtime/local database runtime is planned.

See [docs/DESKTOP.md](docs/DESKTOP.md).

## Getting Started

Copy placeholder environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Run with Docker:

```bash
docker compose up --build
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed_demo.py
```

Open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Health: `http://localhost:8000/health`

Demo login:

- Email: `demo@example.com`
- Password: `Password123!`

If local ports conflict:

```bash
POSTGRES_HOST_PORT=5433 BACKEND_HOST_PORT=8001 FRONTEND_HOST_PORT=5173 docker compose up --build
```

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
alembic upgrade head
python scripts/seed_demo.py
uvicorn app.main:app --reload
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Desktop Setup

```bash
cd frontend
npm run dev
AGRICONTO_DEV_URL=http://localhost:5173 npm run desktop:dev
```

Build Linux packages:

```bash
cd frontend
npm run desktop:pack
```

Outputs are generated in `frontend/release/` and ignored by Git.

## Documentation

- [Product](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)
- [Security](docs/SECURITY.md)
- [Reports](docs/REPORTS.md)
- [Desktop](docs/DESKTOP.md)
- [Analytics](docs/ANALYTICS.md)
- [Roadmap](docs/ROADMAP.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)

## Roadmap

See [ROADMAP.md](ROADMAP.md) and [docs/ROADMAP.md](docs/ROADMAP.md). Planned areas include desktop stabilization, professional reports, advanced analytics, local backend bundling, PWA/mobile field mode, OCR, AI assistance and cloud/SaaS collaboration.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security-sensitive changes must preserve authentication, RBAC, farm isolation and audit logging.

## License

MIT License. See [LICENSE](LICENSE).
