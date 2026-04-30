# Architecture

AgriConto Pro is a monorepo with a FastAPI backend, Vite React frontend and Electron desktop wrapper.

## Monorepo Layout

```text
backend/     FastAPI API, SQLAlchemy models, Alembic migrations, services, tests
frontend/    React TypeScript app, Electron shell, desktop packaging config
docs/        product, security, reports, analytics, desktop and release docs
```

## Backend Boundaries

- `app/api/v1`: thin HTTP handlers.
- `app/services`: business workflows and authorization orchestration.
- `app/repositories`: database access patterns.
- `app/models`: SQLAlchemy persistence models.
- `app/schemas`: Pydantic request/response contracts.
- `app/storage`: local document storage abstraction.
- `app/reports`: JSON and PDF report generation.
- `app/analytics`: aggregated analytics endpoints.

Routes should remain thin. Permission checks and audit behavior should live in shared services/helpers rather than being duplicated in route code.

## Frontend Boundaries

- `src/api`: typed API client.
- `src/auth`: authentication state and protected routes.
- `src/layouts`: app shell, sidebar and topbar.
- `src/routes`: page-level screens.
- `src/features`: feature modules such as analytics.
- `src/components`: reusable design-system components.

Frontend role checks are UX only. Backend authorization is authoritative.

## Desktop Architecture

Electron loads the built React app in production and the Vite dev server in development. The desktop shell includes a backend sidecar launcher foundation, health checks and secure Electron settings.

See [DESKTOP.md](DESKTOP.md).

## Farm Isolation Principle

`farm_id` is the tenant boundary. Farm-scoped records must be read or modified only after backend membership and role checks. Knowing a UUID must never be enough to access an object.

## Report Architecture

Reports are JSON-first. PDF export uses server-side report data, creates `report_exports` metadata, emits audit events and returns `application/pdf`.

## Data Flow

1. User authenticates and receives a JWT.
2. Frontend calls `/api/v1` with bearer token.
3. Backend validates token and active user.
4. Farm-scoped endpoints check membership and role.
5. Services query repositories/models.
6. Writes generate audit logs.
7. Reports and analytics return scoped, structured data.

## Future Goals

- Packaged backend sidecar executable for desktop.
- Local database/runtime strategy for offline desktop installs.
- More granular repository/service boundaries.
- Background jobs for heavy reports and OCR.
- Cloud/SaaS deployment profile.
