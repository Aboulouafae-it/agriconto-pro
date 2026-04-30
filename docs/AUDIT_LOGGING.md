# Audit Logging

Audit logging is a first-class security feature. It records who changed or accessed sensitive farm data and supports later investigation, export review and compliance workflows.

## Required Events

Audit logging is mandatory for:

- create farm
- update farm
- add, update and delete worker
- add, update and delete workday
- close workday
- add, update and delete expense
- add, update and delete sale
- upload and delete document
- download document
- create and resolve document request
- export reports
- change roles or memberships

## Audit Fields

Audit rows store:

- `farm_id`
- `user_id`
- `action`
- `entity_type`
- `entity_id`
- `old_value`
- `new_value`
- `ip_address`
- `user_agent`
- `created_at`

## Audit Service

The central service lives in `backend/app/core/audit.py`.

Functions:

- `audit_create(db, farm_id, user_id, entity, context=None)`
- `audit_update(db, farm_id, user_id, entity, old_value, context=None, action="update")`
- `audit_delete(db, farm_id, user_id, entity, context=None)`
- `audit_custom_event(db, farm_id, user_id, action, entity_type, entity_id=None, old_value=None, new_value=None, context=None)`

Use `audit_custom_event` for non-CRUD actions such as:

- workday close
- document download
- report export
- role change
- invitation sent

## Append-Only Rule

Audit logs must be append-only.

Current controls:

- no generic CRUD route exposes `audit_logs`
- normal users cannot update or delete audit logs
- application code only adds audit rows

Future production controls:

- database trigger preventing update/delete
- separate immutable audit sink
- monitoring for direct database tampering

## Redaction

Audit logs must never store:

- passwords
- password hashes
- access tokens
- refresh tokens
- environment secrets
- raw document bytes

The audit service redacts known secret fields and document content-like fields.

## Document Handling

For document uploads and downloads:

- log metadata only
- never log file contents
- never log raw filesystem paths
- storage keys may be logged only if they are opaque and non-sensitive

## Accountant Visibility

By default, accountants do not view audit logs. A future owner-controlled setting may allow read-only accountant visibility for selected audit events.

## Transaction Rule

Audit logs should be written in the same database transaction as the data change. If the data change rolls back, its audit log should roll back too.

