# Security

Security is part of the AgriConto Pro foundation. The platform handles farm financial records, worker identity data, invoices, uploaded documents, customer/supplier records, reports and audit logs.

## Authentication

Authentication currently uses stateless JWT bearer access tokens.

Endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

The logout endpoint is explicit but stateless in the current architecture. Clients must discard the access token. Server-side revocation will require refresh tokens or session storage.

## Password Policy

Passwords:

- are hashed with bcrypt
- are never returned by API schemas
- must be at least 10 characters
- must be at most 72 bytes because of bcrypt input limits
- must include at least one uppercase letter
- must include at least one lowercase letter
- must include at least one number

Passwords and password hashes must never be logged.

## Login Policy

Login failures use a generic message:

```text
Credenziali non valide
```

This avoids disclosing whether an email exists, whether a password was wrong, or whether an account is disabled.

Disabled users cannot log in and cannot pass `GET /auth/me`.

Rate limiting is not implemented yet. Before internet exposure, add:

- per-IP login throttling
- per-account login throttling
- exponential backoff or temporary lockout
- audit events for repeated failures
- alerting for credential stuffing patterns

## Token Policy

Access tokens include:

- `sub`: user ID
- `typ`: `access`
- `iat`: issued-at timestamp
- `exp`: expiration timestamp
- `jti`: token ID

Tokens expire according to `ACCESS_TOKEN_EXPIRE_MINUTES`.

Refresh tokens are not implemented yet. Before production, choose one:

- short-lived access tokens plus rotating refresh tokens stored server-side
- opaque server-side sessions
- external identity provider with revocation support

Until revocation exists, password changes, logout and account compromise cannot immediately invalidate already-issued access tokens.

## Session Policy

Current session model:

- stateless bearer access token
- no refresh token
- no server-side session table
- logout is client-side token discard

Future session model should include:

- refresh token rotation
- token reuse detection
- session/device tracking
- server-side revocation
- forced logout for disabled users

## LocalStorage And XSS

The current frontend stores the bearer token in `localStorage`.

Risk:

- any successful XSS can read the access token
- stolen bearer tokens can be used until expiration

Mitigations required before production:

- strict Content Security Policy
- no `dangerouslySetInnerHTML`
- dependency audit
- short access-token lifetime
- refresh-token/session revocation model

If cookie auth is introduced instead:

- use `HttpOnly`
- use `Secure`
- use `SameSite=Lax` or `SameSite=Strict`
- implement CSRF tokens for unsafe methods

## Environment Secret Policy

Secrets must come from environment variables, not source code.

Important variables:

- `JWT_SECRET_KEY`
- `DATABASE_URL`
- future storage credentials

Production requirements:

- `JWT_SECRET_KEY` must be strong and unique
- default development secrets must never be used in production
- `.env` files must not be committed
- frontend `VITE_` variables must not contain backend secrets
- add CI secret scanning before production

## CORS Policy

CORS origins are controlled by `CORS_ORIGINS`.

Rules:

- do not use wildcard origins with credentials
- list exact frontend origins per environment
- keep development and production origins separate

## RBAC Summary

Role checks are server-side only.

- `OWNER`: full farm access
- `ACCOUNTANT`: read-only financial/document/report access, plus document requests and accountant-pack export
- `LABOR_CONSULTANT`: read-only worker/workday/wage access
- `WORKER`: future self-service role, self-only access

All farm-scoped endpoints check membership before returning data.

## Audit Logging

Create, update and delete actions are written to `audit_logs`.

Farm-scoped writes validate that related object references belong to the same farm. This prevents records such as expenses, sales, workday entries and documents from linking across tenant boundaries.

Production hardening still needed:

- token revocation and session/device tracking
- login rate limiting
- password reset flow
- MFA for sensitive roles
- invite flow for members
- object-level document download authorization
- encrypted storage option for sensitive documents

## Document Security

Uploaded documents may contain invoices, receipts, worker documents and contracts. The current foundation:

- validates file size and MIME type;
- stores files outside frontend public folders;
- stores metadata in the database;
- serves downloads only through authenticated backend endpoints;
- avoids exposing local storage paths to the frontend.

Future hardening should add malware scanning, encrypted storage, S3-compatible storage policies and expiring signed download links.

## PDF Export Security

PDF exports:

- require authentication;
- require farm membership and role permission;
- create report export metadata;
- create audit events;
- return safe filenames;
- include checksum/report ID metadata;
- do not include internal storage paths in headers or QR payloads.

## Electron Security

The desktop shell uses:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- renderer sandboxing;
- blocked unsafe navigation;
- production DevTools disabled.

The renderer does not receive arbitrary filesystem access. Future desktop hardening should add a bundled backend binary, local secret storage and log rotation.

## Responsible Disclosure

Report suspected vulnerabilities privately. Do not publish exploit details, real farm data, worker data, invoices, credentials or tokens in public issues.
