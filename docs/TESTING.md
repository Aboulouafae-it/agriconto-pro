# Security Testing Strategy

AgriConto Pro handles farm financial records, worker data, documents and accountant access. Testing must prove that tenant isolation, authentication, authorization, validation and auditability hold before new features are expanded.

## Test Layers

1. Unit security tests
   - password hashing and token behavior;
   - permission helpers;
   - Pydantic validation;
   - storage path traversal checks;
   - audit redaction.

2. Service boundary tests
   - farm-scoped CRUD rejects cross-farm entities;
   - report services check role and membership before generation;
   - document handling validates type, size and related entity ownership;
   - create/update/delete operations emit audit logs.

3. API contract tests
   - unauthenticated requests return `401`;
   - unauthorized requests return `403`;
   - missing resources return generic `404`;
   - validation errors return a consistent `detail` payload;
   - paginated endpoints use the shared page shape.

4. Future integration tests
   - run the FastAPI app against an isolated PostgreSQL container;
   - execute Alembic migrations from scratch;
   - seed multiple farms and users;
   - exercise complete request flows with real JWTs and database rows.

## Required Security Cases

Authentication:

- register works;
- login works;
- wrong password fails with a generic message;
- inactive users cannot login;
- `password_hash` is never returned in public schemas.

Authorization:

- user cannot access a farm where they are not a member;
- accountant cannot edit expenses;
- labor consultant cannot access sales;
- worker cannot access other workers;
- document access is farm-scoped;
- report export is farm-scoped.

BOLA / IDOR:

- fetching an entity by ID from another farm fails;
- updating an entity by ID from another farm fails;
- downloading a document by ID from another farm fails.

Validation:

- invalid amounts are rejected;
- negative values are rejected where inappropriate;
- invalid dates are rejected;
- invalid roles are rejected;
- unsafe file types are rejected;
- oversized files are rejected.

Audit:

- create/update/delete emits audit logs;
- report export emits an audit log;
- document upload emits an audit log;
- passwords, tokens and document contents are redacted.

API:

- pagination response shape is stable;
- error payloads consistently include `detail`;
- `401`, `403`, and `404` are distinguishable without leaking sensitive internals.

## Current Limitations

Most Phase 11 tests use focused unit/service fakes because the project foundation does not yet include a disposable PostgreSQL test database fixture. Before broad feature expansion, add a Docker-backed integration test profile that runs migrations and endpoint tests against real PostgreSQL.

## Commands

Backend:

```bash
cd backend
/tmp/agriconto-backend-venv/bin/pytest app/tests
/tmp/agriconto-backend-venv/bin/ruff check app scripts
python -m compileall app
```

Frontend:

```bash
cd frontend
npm run build
npm audit --audit-level=moderate
```
