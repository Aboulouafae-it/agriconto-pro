# RBAC

Role-based access control is enforced server-side in `backend/app/core/permissions.py`.

`farm_id` is the tenant boundary. Frontend role checks are UX only and must never be treated as security.

## Roles

| Role | Purpose |
|---|---|
| `OWNER` | Full controller of one farm tenant |
| `ACCOUNTANT` | Read-only financial/document/report collaborator with limited document-request and accountant-pack export actions |
| `LABOR_CONSULTANT` | Read-only worker, workday and wage collaborator |
| `WORKER` | Future self-service user, self-only access |

There is no database `ADMIN` role in the current foundation. Delegated administration should be introduced only after a precise permission design.

## Central Permission Functions

- `require_authenticated_user(user)`
- `require_farm_member(db, user_id, farm_id)`
- `require_role(db, user_id, farm_id, allowed_roles)`
- `require_farm_access_to_entity(db, user_id, farm_id, entity_type, entity_id)`
- `assert_accountant_read_only(role, action, resource_name)`
- `assert_worker_self_access(user_id, entity, linked_user_id)`

Compatibility helpers:

- `ensure_can_read(db, farm_id, user, resource_name)`
- `ensure_can_create(db, farm_id, user, resource_name)`
- `ensure_can_update(db, farm_id, user, resource_name)`
- `ensure_can_delete(db, farm_id, user, resource_name)`

## Permission Matrix

| Resource / Action | OWNER | ACCOUNTANT | LABOR_CONSULTANT | WORKER |
|---|---:|---:|---:|---:|
| Farm data | RW | R limited | R limited | None |
| Farm members | RW later | None | None | None |
| Fields | RW | None | None | None |
| Crops | RW | None | None | None |
| Workers | RW | None | R | Self only later |
| Workdays | RW | None | R | Self only later |
| Workday entries | RW | None | R | Self only later |
| Worker advances | RW | None | R | Self only later |
| Worker payments | RW | None | R | Self only later |
| Expenses | RW | R | None | None |
| Sales | RW | R | None | None |
| Suppliers | RW | R | None | None |
| Customers | RW | R | None | None |
| Documents | RW | R | None by default | Self/shared later |
| Document requests | RW | R + Create | None | None |
| Reports | RW | R financial/accountant reports | R labor reports | Self reports later |
| Report exports | RW | Create accountant pack export | None | None |
| Audit logs | R | None | None | None |

Legend:

- `R`: read
- `W`: create, update and delete
- `Self only later`: blocked in generic endpoints until a worker-to-user ownership model is implemented

## Accountant Rules

Accountants:

- can read financial records
- can read documents
- can read reports
- can request missing documents
- can create accountant-pack export records
- cannot edit or delete financial source records
- cannot change worker wage data
- cannot invite users

The backend enforces accountant read-only behavior with `assert_accountant_read_only`.

## Labor Consultant Rules

Labor consultants:

- can read workers
- can read workdays
- can read workday entries
- can read wage summaries
- can read worker advances and payments
- cannot read sales, expenses, customers, suppliers or unrelated documents
- cannot mutate labor source records by default

## Worker Rules

The `WORKER` role is reserved for future self-service access.

Until a secure `user_id` to `worker_id` mapping exists:

- generic farm list endpoints must not expose worker-role data
- self-access must call `assert_worker_self_access`
- worker users cannot see farm financial data or other workers' records

## Endpoint Rules

- Every endpoint with `farm_id` must call central permission checks.
- Every entity read by ID must verify the entity belongs to the requested farm.
- Frontend-provided roles are ignored.
- Frontend-provided `farm_id` is not trusted until membership is verified.
- Permission-bypass tests are required for new farm-scoped modules.

