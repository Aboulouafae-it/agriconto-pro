# Architecture

The monorepo has two apps:

- `backend`: FastAPI service with domain models, services, repositories, RBAC and audit logging
- `frontend`: Vite React TypeScript client with Italian UI labels

Repository structure:

```text
backend/app/core        security, config, database facade, audit, exceptions, logging
backend/app/api/v1      thin HTTP route handlers
backend/app/services    business workflows and authorization orchestration
backend/app/repositories database access
backend/app/models      SQLAlchemy persistence models
backend/app/schemas     Pydantic validation contracts
backend/app/storage     document storage abstractions
backend/app/reports     report services
backend/app/tests       security and service tests
frontend/src/app        application root
frontend/src/api        API client
frontend/src/auth       authentication UI and future auth state
frontend/src/layouts    page shells and navigation
frontend/src/features   future feature modules
frontend/src/lib        shared frontend utilities
frontend/src/routes     route-level screens
```

Backend boundaries:

- Routes validate HTTP input and call services.
- Services enforce permissions, audit logging and business workflow.
- Repositories handle database persistence.
- SQLAlchemy models define persistence.
- Report services return JSON-first structures.

Every farm-scoped record has:

- `farm_id`
- `created_by_id` on most farm records, or an action-specific user field such as `requested_by`
- timestamps
- permission checks on endpoints
- audit logs on create, update and delete

Security invariants:

- No farm-scoped route may return data before membership and role checks.
- No write may accept a related entity from another farm.
- Routes stay thin; security decisions live in services.
- Reports reuse the same permission gates as the underlying data.
- File storage is accessed only through storage services.
- Internal paths and secrets are never sent to the browser.
