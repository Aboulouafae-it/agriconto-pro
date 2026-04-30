# DevOps

This document defines the secure development and deployment foundation for AgriConto Pro.

## Local Services

`docker-compose.yml` provides:

- `postgres`: PostgreSQL 16 with a persistent named volume.
- `backend`: FastAPI app using environment variables and local document storage volume.
- `frontend`: Vite development server.

Start everything:

```bash
docker compose up --build
```

Run database migrations:

```bash
docker compose exec backend alembic upgrade head
```

Seed demo data:

```bash
docker compose exec backend python scripts/seed_demo.py
```

The seed script creates one demo farm only and is idempotent for the demo owner email.

## Environment Files

Committed files:

- `.env.example`
- `backend/.env.example`
- `frontend/.env.example`

Ignored files:

- `.env`
- `.env.*`
- `backend/.env`
- `frontend/.env`

Rules:

- examples contain fake placeholders only;
- production secrets must be provided by the deployment platform or secret manager;
- never store real database passwords, JWT secrets or storage credentials in Git;
- only public browser configuration may use `VITE_` variables.

## Migrations

Create a migration:

```bash
cd backend
alembic revision --autogenerate -m "change_description"
```

Apply migrations:

```bash
alembic upgrade head
```

Check heads:

```bash
alembic heads
```

Production migration rules:

- take and verify a database backup before migrations;
- review generated SQL for destructive changes;
- test migrations in staging against production-like data;
- document rollback or forward-fix strategy;
- do not seed demo data in production.

## Pre-Commit Plan

`.pre-commit-config.yaml` defines local hooks for:

- backend Ruff;
- backend tests;
- frontend build.

Install:

```bash
pip install pre-commit
pre-commit install
```

Run manually:

```bash
pre-commit run --all-files
```

## Dependency Security Checks

Backend:

```bash
pip install pip-audit
pip-audit
```

Frontend:

```bash
npm audit --audit-level=moderate
```

Container images:

```bash
docker compose build
docker scout cves
```

If a dependency advisory requires a breaking upgrade, document the impact, run the full test suite and update the production checklist before release.

## Development Ports

- Frontend: `5173`
- Backend: `8000`
- PostgreSQL: `5432`

Do not expose these development services directly to the public internet.

## Deployment Notes

The current compose file is for development. Production should use:

- managed PostgreSQL or a hardened self-managed PostgreSQL deployment;
- HTTPS termination;
- secret manager;
- persistent encrypted document storage;
- centralized logs and metrics;
- scheduled backups;
- explicit CORS origins;
- rate limiting at gateway and application layers.
