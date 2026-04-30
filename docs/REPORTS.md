# Reports

AgriConto Pro reports are JSON-first and HTML/PDF-ready preparation tools for farmers, commercialisti and labor consultants. They organize source data; they do not calculate official tax, IVA, payroll, INPS, INAIL or filing obligations.

## Security Rules

- Every report endpoint is server-authorized by `farm_id`.
- `OWNER` and `ACCOUNTANT` can access financial reports for farms where they are active members.
- `OWNER` and `LABOR_CONSULTANT` can access the worker wage summary.
- `WORKER` cannot access farm-level reports in the current foundation.
- Frontend visibility is UX only; backend permissions are mandatory.
- Cross-farm report access must fail even when a caller knows a UUID.
- Report generation creates an audit event with action `report_generate`.
- Every print/PDF-ready export creates a `report_exports` row and an audit event with action `report_export`.
- Report exports never expose local filesystem paths or document storage keys.
- QR verification payloads contain only `report_id`, `farm_id`, `generated_at` and a shortened checksum reference. They never contain full financial rows, worker details or document contents.

## Endpoints

- `GET /api/v1/farms/{farm_id}/reports/monthly?year=2026&month=4`
- `GET /api/v1/farms/{farm_id}/reports/monthly/pdf?year=2026&month=4`
- `GET /api/v1/farms/{farm_id}/reports/workers`
- `GET /api/v1/farms/{farm_id}/reports/workers/pdf`
- `GET /api/v1/farms/{farm_id}/reports/crops`
- `GET /api/v1/farms/{farm_id}/reports/crops/pdf`
- `GET /api/v1/farms/{farm_id}/reports/expenses`
- `GET /api/v1/farms/{farm_id}/reports/expenses/pdf`
- `GET /api/v1/farms/{farm_id}/reports/sales`
- `GET /api/v1/farms/{farm_id}/reports/sales/pdf`
- `GET /api/v1/farms/{farm_id}/reports/missing-documents`
- `GET /api/v1/farms/{farm_id}/reports/missing-documents/pdf`
- `GET /api/v1/farms/{farm_id}/reports/accountant-pack`
- `GET /api/v1/farms/{farm_id}/reports/accountant-pack/pdf`
- `GET /api/v1/farms/{farm_id}/reports/annual`
- `GET /api/v1/farms/{farm_id}/reports/annual/pdf`
- `GET /api/v1/farms/{farm_id}/reports/document-index`
- `GET /api/v1/farms/{farm_id}/reports/document-index/pdf`
- `GET /api/v1/farms/{farm_id}/reports/audit-summary`
- `GET /api/v1/farms/{farm_id}/reports/audit-summary/pdf`

## Print/PDF-Ready Design System

The server renders professional A4 HTML documents with embedded print CSS. The browser can print or save these documents as PDF today; a dedicated binary PDF renderer can be added later without changing report data contracts.

Every print-ready export includes:

- cover page with AgriConto Pro branding;
- report title, farm, period, report ID and generation timestamp;
- generated-by metadata and fiscal profile metadata;
- verification matrix and checksum reference;
- KPI cards and administrative tables;
- repeated table headers for multi-page print;
- legal/professional disclaimer;
- `X-Report-Id` and `X-Report-Checksum` response headers.

The visual language uses deep green for agricultural trust, deep blue for accounting reliability, neutral table structure and restrained warning badges for missing information.

## Monthly Summary

The monthly summary returns:

- `total_sales`: sum of sales in the selected month.
- `total_expenses`: sum of expenses in the selected month.
- `net_result`: sales minus expenses.
- `unpaid_sales`: currently marked `not_tracked` because the first schema has no sale payment status.
- `unpaid_expenses`: currently marked `not_tracked` because the first schema has no expense payment status.
- `unpaid_worker_balances`: total remaining worker balance from wage summaries.
- `missing_documents_count`: count from the missing documents report.

## Worker Wage Summary

For each worker:

- `total_earned`: sum of workday entry hours multiplied by the entry hourly rate, falling back to the worker hourly rate.
- `total_advances`: sum of worker advances.
- `total_payments`: sum of worker payments.
- `remaining_balance`: earned minus advances minus payments.

This report is operational only. It is not an official payroll calculation.

## Crop Profitability

For each crop:

- `linked_sales`: sales linked to the crop.
- `linked_expenses`: expenses linked to the crop.
- `linked_labor_cost`: workday entry labor linked to the crop.
- `estimated_profit`: sales minus expenses minus labor cost.
- `cost_per_unit`: currently `null` because crop yield/quantity is not tracked in the first schema.

## Missing Documents

The report identifies:

- expenses without an uploaded document linked as `related_entity_type = "expense"`;
- sales invoice-number gaps as `not_tracked` until an `invoice_number` field is added;
- workers missing codice fiscale;
- open document requests with status `REQUESTED` or `MISSING`.

## Accountant Pack

The accountant pack combines:

- monthly summary for the current month;
- expenses;
- sales;
- workers;
- wage balances;
- crop profitability;
- missing documents;
- audit summary;
- attached document references.

Document references include metadata only: document id, title, type, related entity, MIME type, size and upload timestamp. They intentionally exclude storage keys and internal file paths.

## Export Metadata

`report_exports` stores:

- `farm_id`
- `requested_by`
- `report_type`
- `date_range`
- `period_start`
- `period_end`
- `status`
- `checksum`
- `qr_payload`
- `file_reference`
- `created_at`
- `expires_at`

`file_reference` remains nullable and must never expose local filesystem paths to the frontend.

## Export Expiration

Print/PDF-ready exports currently store metadata only, not persisted files. `expires_at` is set so future stored HTML/PDF artifacts and signed download links can expire consistently.
