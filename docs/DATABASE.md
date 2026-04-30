# Database

PostgreSQL is the system of record. The schema is designed for multi-tenant farm isolation, auditability and future export/report workflows.

## Tenant Boundary

`farm_id` is the ownership boundary for business data.

Rules:

- business records include `farm_id` directly unless they are global identity records such as `users`
- API services must still check permissions; UUIDs and foreign keys are not authorization
- related IDs in request bodies must belong to the same `farm_id`
- normal users must not update or delete `audit_logs`
- sensitive business records use `deleted_at` for soft delete support

## Identity And Membership

### `users`

Global login identities.

Columns:

- `id` UUID primary key
- `email` unique
- `full_name`
- `password_hash`
- `is_active`
- `created_at`
- `updated_at`

Tenant boundary:

- not farm-scoped
- access to farm data is granted only through `farm_members`

### `farms`

Tenant root table.

Columns:

- `id` UUID primary key
- `name`
- `legal_name`
- `partita_iva`
- `codice_fiscale`
- `address`
- `city`
- `province`
- `region`
- `fiscal_profile`
- `owner_id` foreign key to `users.id`
- `created_at`
- `updated_at`

Relationships:

- one farm has many members
- one farm owns fields, crops, workers, workdays, financial records, documents, audit logs and report exports

### `farm_members`

User access to a farm.

Columns:

- `id` UUID primary key
- `farm_id` foreign key to `farms.id`
- `user_id` foreign key to `users.id`
- `role`: `OWNER`, `ACCOUNTANT`, `LABOR_CONSULTANT`, `WORKER`
- `status`: `INVITED`, `ACTIVE`, `SUSPENDED`
- `created_at`
- `updated_at`

Constraints:

- unique `(farm_id, user_id)`

Tenant boundary:

- membership is required before a user can access farm-scoped data

## Farm Operations

### `fields`

Farm parcels or production areas.

Important columns:

- `farm_id`
- `created_by_id`
- `name`
- `cadastral_reference`
- `area_hectares`
- `deleted_at`

Relationships:

- one field can have many crops

Constraints:

- `area_hectares` must be null or non-negative

### `crops`

Production crop records.

Important columns:

- `farm_id`
- `created_by_id`
- `field_id`
- `name`
- `season`
- `deleted_at`

Relationships:

- belongs to a farm
- optionally belongs to a field
- can be linked to workday entries, expenses and sales

### `workers`

Worker master data.

Important columns:

- `farm_id`
- `created_by_id`
- `first_name`
- `last_name`
- `fiscal_code`
- `contract_type`
- `hourly_rate`
- `notes`
- `deleted_at`

Security:

- highly confidential worker identity data
- worker self-service must be self-only if implemented

### `workdays`

Workday headers.

Important columns:

- `farm_id`
- `created_by_id`
- `work_date`
- `description`
- `deleted_at`

Relationships:

- one workday has many workday entries

### `workday_entries`

Worker activity lines for a workday.

Important columns:

- `farm_id`
- `created_by_id`
- `workday_id`
- `worker_id`
- `crop_id`
- `hours`
- `hourly_rate`
- `activity`
- `deleted_at`

Constraints:

- `hours > 0`
- `hours <= 24`
- `hourly_rate` must be null or non-negative

Tenant boundary:

- `workday_id`, `worker_id` and `crop_id` must refer to records in the same farm at the service layer

## Labor Payments

### `worker_advances`

Advance payments to workers.

Important columns:

- `farm_id`
- `created_by_id`
- `worker_id`
- `advance_date`
- `amount`
- `note`
- `deleted_at`

Constraints:

- `amount > 0`

### `worker_payments`

Final or ordinary worker payments.

Important columns:

- `farm_id`
- `created_by_id`
- `worker_id`
- `payment_date`
- `amount`
- `note`
- `deleted_at`

Constraints:

- `amount > 0`

## Financial Records

### `expenses`

Farm expenses.

Important columns:

- `farm_id`
- `created_by_id`
- `expense_date`
- `supplier_id`
- `crop_id`
- `category`
- `amount`
- `description`
- `deleted_at`

Constraints:

- `amount > 0`

### `sales`

Farm sales.

Important columns:

- `farm_id`
- `created_by_id`
- `sale_date`
- `customer_id`
- `crop_id`
- `amount`
- `description`
- `deleted_at`

Constraints:

- `amount > 0`

### `suppliers`

Supplier records.

Important columns:

- `farm_id`
- `created_by_id`
- `name`
- `vat_number`
- `email`
- `deleted_at`

### `customers`

Customer records.

Important columns:

- `farm_id`
- `created_by_id`
- `name`
- `vat_number`
- `email`
- `deleted_at`

## Documents

### `documents`

Document metadata. File bytes live behind the storage abstraction.

Important columns:

- `farm_id`
- `created_by_id`
- `title`
- `document_type`
- `original_file_name`
- `stored_file_name`
- `storage_key`
- `mime_type`
- `size_bytes`
- `uploaded_by`
- `uploaded_at`
- `status`
- `related_entity_type`
- `related_entity_id`
- `notes`
- `deleted_at`

Security:

- never expose internal filesystem paths
- authorize metadata before reading file bytes
- related entity references must be same-farm

### `document_requests`

Requests for missing or required documents.

Important columns:

- `farm_id`
- `created_by_id`
- `title`
- `requested_from`
- `due_date`
- `status`
- `deleted_at`

## Audit And Reports

### `audit_logs`

Append-oriented security record.

Columns:

- `id`
- `farm_id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `old_value` JSON nullable
- `new_value` JSON nullable
- `ip_address` nullable
- `user_agent` nullable
- `created_at`

Rules:

- no generic update/delete endpoint
- normal users must not mutate audit logs
- secret fields are redacted before storage

### `report_exports`

Tracks generated export artifacts.

Columns:

- `id`
- `farm_id`
- `requested_by`
- `report_type`
- `date_range` JSON
- `status`
- `file_reference` nullable
- `created_at`
- `expires_at` nullable

Security:

- report generation must pass server-side permission checks
- `file_reference` is an opaque storage key, not an internal path
- exports should expire when stored

## Indexing

The initial migration indexes:

- `farm_id` on farm-scoped tables
- `user_id` on membership and audit tables
- `worker_id` on workday/labor payment tables
- `crop_id` on crop-linked operational/financial tables
- `created_at` on records commonly used in timelines, reports and exports

## Migration

Migrations live in `backend/alembic/versions`.

Run migrations with:

```bash
cd backend
alembic upgrade head
```

Current head:

- `0001_foundation`
