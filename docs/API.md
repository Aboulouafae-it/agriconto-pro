# API

Base path: `/api/v1`

Health endpoint: `GET /health`

## Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

JWT access tokens are sent with `Authorization: Bearer <token>`.

## Farms

- `GET /farms`
- `POST /farms`
- `GET /farms/{farm_id}`
- `PATCH /farms/{farm_id}`

## Farm-Scoped Resources

All farm-scoped endpoints require authentication and farm membership.

- Workers: `/farms/{farm_id}/workers`
- Workdays: `/farms/{farm_id}/workdays`
- Fields: `/farms/{farm_id}/fields`
- Crops: `/farms/{farm_id}/crops`
- Expenses: `/farms/{farm_id}/expenses`
- Sales: `/farms/{farm_id}/sales`
- Documents: `/farms/{farm_id}/documents`
- Document requests: `/farms/{farm_id}/document-requests`

List endpoints use pagination parameters such as `limit` and `offset`.

## Documents

- `POST /farms/{farm_id}/documents/upload`
- `GET /farms/{farm_id}/documents`
- `PATCH /farms/{farm_id}/documents/{document_id}`
- `DELETE /farms/{farm_id}/documents/{document_id}`
- `GET /farms/{farm_id}/documents/{document_id}/download`

Downloads are authenticated and never expose internal storage paths.

## Reports

JSON endpoints:

- `GET /farms/{farm_id}/reports/monthly`
- `GET /farms/{farm_id}/reports/workers`
- `GET /farms/{farm_id}/reports/crops`
- `GET /farms/{farm_id}/reports/expenses`
- `GET /farms/{farm_id}/reports/sales`
- `GET /farms/{farm_id}/reports/missing-documents`
- `GET /farms/{farm_id}/reports/accountant-pack`

PDF endpoints:

- `GET /farms/{farm_id}/reports/{report_type}/pdf`

Supported PDF report types include `monthly`, `workers`, `crops`, `expenses`, `sales`, `missing-documents` and `accountant-pack`.

## Analytics

- `GET /farms/{farm_id}/analytics/overview`
- `GET /farms/{farm_id}/analytics/financial`
- `GET /farms/{farm_id}/analytics/crops`
- `GET /farms/{farm_id}/analytics/fields`
- `GET /farms/{farm_id}/analytics/labor`
- `GET /farms/{farm_id}/analytics/expenses`
- `GET /farms/{farm_id}/analytics/sales`
- `GET /farms/{farm_id}/analytics/documents`
- `GET /farms/{farm_id}/analytics/comparison`
- `GET /farms/{farm_id}/analytics/advanced-metrics`
- `GET /farms/{farm_id}/analytics/tables`

## Authorization Rules

- Titolare: full farm access.
- Commercialista: read-only financial, document and report access.
- Consulente del lavoro: labor-related data.
- Lavoratore: future self-service, self-only data.

## Error Style

Public API errors should be consistent and should not expose secrets, stack traces or internal file paths. The frontend converts technical failures into user-friendly Italian messages.
