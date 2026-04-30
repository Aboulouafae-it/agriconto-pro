# Logging Strategy

Logs support operations and security monitoring, but they must not become a second copy of sensitive farm data.

## Principles

- Log events, not secrets.
- Never log passwords, password hashes, access tokens, refresh tokens or raw document contents.
- Avoid logging full invoices, contracts or worker identity documents.
- Prefer structured logs with stable fields.
- Correlate logs with request IDs when added.

## Current Foundation

The backend configures application logging centrally in `app.core.logging`. Audit logs are stored separately in the database through the audit service.

Operational logs and audit logs have different purposes:

- operational logs: health, errors, performance and security signals;
- audit logs: business-relevant create/update/delete/download/export actions.

## Recommended Fields

For application logs:

- timestamp;
- level;
- environment;
- service;
- request path;
- status code;
- authenticated user id when available;
- farm id when available;
- event name;
- request id or trace id when available.

For security events:

- login failures;
- token validation failures;
- authorization denials;
- upload validation failures;
- report export requests;
- document download requests.

## Redaction

Redact:

- `password`;
- `password_hash`;
- `token`;
- `access_token`;
- `authorization`;
- raw file bytes;
- document OCR text until a dedicated policy exists.

## Production Monitoring

Production should include:

- centralized log collection;
- alerting for repeated `401` and `403` spikes;
- alerting for upload rejection spikes;
- error monitoring for unhandled exceptions;
- retention policy aligned with privacy and audit needs;
- restricted access to logs.

## Incident Use

During incidents, logs should help answer:

- which user acted;
- which farm was targeted;
- what endpoint or service was involved;
- whether access was denied or allowed;
- whether a document/report/export was involved.

Use audit logs for authoritative business-action history.
