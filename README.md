# AgriConto Pro

Professional Italian farm accounting, workforce, crop, document and accountant-reporting platform.

AgriConto Pro does not replace commercialisti, consulenti del lavoro, tax advisors, INPS, INAIL, Agenzia delle Entrate or official filing systems. It organizes farm data and prepares accountant-ready reports.

## Stack

- Backend: FastAPI, PostgreSQL, SQLAlchemy 2.x, Alembic, Pydantic, JWT
- Frontend: Vite, React, TypeScript, TailwindCSS, React Router, TanStack Query
- Reports: JSON-first services
- Storage: local abstraction for documents, S3-compatible later
- DevOps: Docker Compose development foundation

## Secure Local Setup

Copy placeholder environment files and replace development secrets locally:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Never commit `.env` files. The committed examples contain fake values only.

## Run With Docker Compose

```bash
docker compose up --build
```

Apply migrations and seed the demo farm:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed_demo.py
```

Open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Health: `http://localhost:8000/health`

If another local project already uses ports `8000` or `5432`, run the stack on
the alternate development ports used by the checked-in frontend local config:

```bash
POSTGRES_HOST_PORT=5433 BACKEND_HOST_PORT=8001 FRONTEND_HOST_PORT=5173 docker compose up --build
```

Then use:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8001`
- Health: `http://localhost:8001/health`

Demo login:

- Email: `demo@example.com`
- Password: `Password123!`

The demo seed is idempotent. Re-run it any time to repair the demo user's password hash,
active status and farm OWNER membership without exposing `password_hash`.

## Run Without Docker

Monorepo convenience commands can be run from the project root:

```bash
npm run build          # builds the Vite frontend
npm run dev:frontend   # starts the frontend on localhost:5173
npm run dev:backend    # starts FastAPI on localhost:8000, after DB/env setup
npm run dev:docker     # starts the full Docker Compose stack
npm run health:backend # checks localhost:8000/health
npm run migrate        # runs Alembic migrations, after backend env setup
npm run seed           # creates/repairs the demo farm user
```

If the login page says `Backend non raggiungibile`, the frontend is running but
FastAPI is not reachable at the configured `VITE_API_URL`. In this workspace the
frontend local config points to `http://localhost:8001/api/v1`, because port
`8000` may already be used by another service. Start the backend with Docker
Compose on the matching port or run PostgreSQL plus FastAPI locally on that port.

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Backend:

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

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The Vite dev server is pinned to `http://localhost:5173` so it matches backend CORS
settings. If that port is busy, stop the other process instead of running the UI on a
random port.

## Migrations

```bash
cd backend
alembic revision --autogenerate -m "describe_change"
alembic upgrade head
alembic downgrade -1
alembic heads
```

Review generated migrations before applying them. Never run destructive migrations against production without a tested backup and rollback plan.

## Verification

Backend:

```bash
cd backend
pytest app/tests
ruff check app scripts
python -m compileall app
```

Frontend:

```bash
cd frontend
npm run build
npm audit --audit-level=moderate
```

Optional pre-commit:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

## Security Boundaries

- `farm_id` is the tenant boundary.
- Frontend permissions are UX only; backend permissions are authoritative.
- Every farm-scoped write must validate same-farm references.
- Create/update/delete actions are audited.
- Document files are stored outside frontend public folders and accessed only through authenticated backend endpoints.
- Fiscal profile is metadata only: `REGIME_SPECIALE_AGRICOLO`, `REGIME_ORDINARIO`, `REGIME_ESONERO`.
- No official tax, IVA, payroll, INPS or INAIL calculations are implemented.

## Operational Docs

- [DevOps](docs/DEVOPS.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)
- [Backup Strategy](docs/BACKUP.md)
- [Logging Strategy](docs/LOGGING.md)
- [Security Testing](docs/TESTING.md)
