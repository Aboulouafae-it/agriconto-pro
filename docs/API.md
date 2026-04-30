# API

Base path: `/api/v1`

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

Farms:

- `GET /farms`
- `POST /farms`
- `GET /farms/{farm_id}`
- `PATCH /farms/{farm_id}`

Farm scoped API foundation:

- workers: `GET`, `POST`, `GET /{worker_id}`, `PATCH /{worker_id}`, `DELETE /{worker_id}`
- workdays: `GET`, `POST`, `GET /{workday_id}`, `POST /{workday_id}/entries`, `POST /{workday_id}/close`
- expenses: `GET`, `POST`, `GET /{expense_id}`, `PATCH /{expense_id}`
- sales: `GET`, `POST`, `GET /{sale_id}`, `PATCH /{sale_id}`
- documents: `POST /documents/upload`, `GET /documents`, `GET /documents/{document_id}/download`
- document requests: `GET`, `POST`, `PATCH /{request_id}`
- reports: `GET /reports/monthly`, `GET /reports/workers`, `GET /reports/crops`, `GET /reports/missing-documents`, `GET /reports/accountant-pack`

List endpoints are paginated with `limit` and `offset`.

Security contract:

- all farm-scoped routes require a bearer token
- all farm-scoped routes check membership
- write routes audit changes
- request body references are validated against the same farm
