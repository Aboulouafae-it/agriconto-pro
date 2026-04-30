# AgriConto Pro Threat Model

AgriConto Pro handles sensitive farm, financial, worker, document and accountant collaboration data. Security is a product requirement and an architectural constraint. This document defines the baseline threat model before additional implementation.

## Product Boundary

AgriConto Pro organizes agricultural business records and prepares accountant-ready reports. It does not replace a commercialista, consulente del lavoro, tax advisor, INPS, INAIL, Agenzia delle Entrate, payroll filing, tax filing or official legal system.

Official legal, tax, payroll, IVA, INPS and INAIL operations must be verified by qualified professionals.

## Security Principles

- `farm_id` is the primary tenant boundary.
- Every farm-scoped record must be owned by exactly one farm.
- Every farm-scoped endpoint must enforce authenticated farm membership server-side.
- Role permissions are enforced server-side; frontend permissions are UX only.
- Broken object level authorization is treated as a critical vulnerability.
- IDs in URLs or payloads are never trusted as authorization proof.
- All file and document access must pass farm membership and role checks.
- Every create, update, delete, export and sensitive report access should be auditable.
- Audit logs must be append-oriented and protected from normal user modification.
- Financial, worker, document and report data must never be exposed across farm boundaries.
- Exports inherit the same permission and data classification rules as API responses.
- No official tax, payroll or compliance calculations are implemented until reviewed by domain experts.

## Roles

### OWNER

Primary farm administrator and data controller for a farm.

Allowed:

- manage farm settings
- manage members and role assignments
- create, read, update and delete farm records
- access financial, labor, document and report data
- export farm data

Risks:

- compromised owner account exposes the full farm
- incorrect invitations can grant excessive access
- owner actions require strong auditability

### ACCOUNTANT

External or internal accounting collaborator. Read-oriented access to financial, document and report data.

Allowed:

- read expenses, sales, suppliers, customers, invoices and accounting documents
- read accountant packs and financial reports
- add accountant comments if explicitly supported

Denied:

- modifying financial source records by default
- reading worker identity/labor data unless explicitly included in an accountant pack with owner approval
- managing members or roles

Risks:

- accountant accessing the wrong farm
- accountant seeing worker data outside intended report scope
- report exports leaking unrelated farm data

### LABOR_CONSULTANT

External or internal labor consultant. Read-oriented access to worker, workday and wage-related records.

Allowed:

- read workers
- read workdays and workday entries
- read worker advances/payments
- read labor-focused reports

Denied:

- reading sales, expenses, customers, suppliers or accounting documents
- managing farm members
- modifying payroll source records by default

Risks:

- labor consultant viewing financial records
- labor consultant viewing documents unrelated to workers
- labor reports exposing more data than needed

### WORKER

Limited self-service role, if implemented. A worker is not automatically a platform user.

Allowed:

- read only their own profile, workdays, payments and documents explicitly shared with them
- submit limited corrections or document uploads only if enabled

Denied:

- viewing other workers
- viewing farm financial records
- viewing customer/supplier records
- viewing accountant reports
- viewing audit logs

Risks:

- worker seeing other workers' identity, wage or payment data
- insecure mapping between `users` and `workers`
- self-service uploads becoming a malware or data leakage vector

### ADMIN

Avoid unless absolutely necessary. If introduced, distinguish between farm-level admin and platform/operator admin.

Farm ADMIN:

- delegated by OWNER
- may manage operational records and members depending on policy
- should not bypass audit logging

Platform ADMIN:

- high-risk operational role
- must be separated from farm membership permissions
- requires MFA, just-in-time access, reason logging and strong audit controls

Risks:

- excessive global access
- silent data access by operators
- privilege escalation from farm admin to platform admin

## Access Control Matrix

Default access policy. More restrictive endpoint-specific rules may override this table.

| Resource | OWNER | FARM ADMIN | ACCOUNTANT | LABOR_CONSULTANT | WORKER |
|---|---:|---:|---:|---:|---:|
| Farm profile | RW | RW | R | R limited | R limited |
| Farm members | RW | R/RW by policy | None | None | None |
| Workers | RW | RW | None by default | R | Self only |
| Workdays | RW | RW | None by default | R | Self only |
| Workday entries | RW | RW | None by default | R | Self only |
| Worker advances/payments | RW | RW | None by default | R | Self only |
| Expenses | RW | RW | R | None | None |
| Sales | RW | RW | R | None | None |
| Suppliers | RW | RW | R | None | None |
| Customers | RW | RW | R | None | None |
| Invoices | RW | RW | R | None unless worker-related and explicitly shared | None |
| Uploaded documents | RW | RW | R scoped | R worker/labor scoped | Self/shared only |
| Accountant comments | RW | R | RW comments only | None | None |
| Reports | RW | RW | R financial/accountant reports | R labor reports | Self reports only |
| Exports | RW | RW by policy | R scoped exports | R labor exports | Self export only |
| Audit logs | R | R by policy | None | None | None |

Legend:

- `R`: read
- `W`: write
- `RW`: read/write
- `None`: no access
- `Self only`: access only to records explicitly linked to that worker identity

## Data Classification

| Data | Classification | Examples | Access Requirements | Protection Requirements |
|---|---|---|---|---|
| Farm financial records | Confidential | expenses, sales, margins, accountant pack totals | farm membership plus financial role | server-side RBAC, audit reads for exports/reports, no cross-farm joins |
| Worker identity data | Highly Confidential | fiscal code, name, contract metadata, work history | owner/admin/labor consultant/self only | strict object authorization, minimal reporting, careful exports |
| Worker payments | Highly Confidential | advances, payments, wage summaries | owner/admin/labor consultant/self only | same-farm validation, report scoping, audit exports |
| Invoices | Confidential | supplier/customer invoices | owner/admin/accountant | storage authorization, malware scanning later, metadata validation |
| Uploaded documents | Confidential to Highly Confidential | identity docs, contracts, invoices, receipts | role and document-scope dependent | private storage, signed access later, content-type and size limits |
| Customer/supplier records | Confidential | names, VAT numbers, emails | owner/admin/accountant | validation, export controls, no worker access |
| Reports | Confidential aggregate | monthly summaries, crop profitability, accountant pack | report-specific permission | query scoping by farm, export audit, no cached cross-tenant data |
| Accountant comments | Confidential | notes, requests, review comments | owner/admin/accountant | audit changes, no worker/labor access by default |
| Audit logs | Restricted | actor, action, entity, timestamp, before/after metadata | owner/platform security only | append-only behavior, no normal delete/update, tamper monitoring later |
| Environment secrets | Secret | JWT secret, DB password, storage keys | operators only | never committed, strong production validation, rotation process |

## Threats And Controls

### Unauthorized Farm Access

Threat: an authenticated user accesses a farm they do not belong to.

Controls:

- every farm-scoped endpoint checks membership by `farm_id`
- never infer access from object ID alone
- deny by default when membership is absent

Requirement:

- automated tests for membership denial on every farm-scoped module

### Accountant Accessing Wrong Farm

Threat: accountant URL or token is reused to access another farm.

Controls:

- accountant must be a member of the target farm
- accountant role limited to financial/document/report scopes
- report queries must filter by `farm_id`

Requirement:

- tests for accountant cross-farm denial and worker-data denial

### Worker Seeing Other Workers' Data

Threat: worker self-service exposes another worker’s records.

Controls:

- worker role requires explicit `user_id` to `worker_id` mapping
- worker endpoints must enforce self-only object authorization
- no list-all workers endpoint for worker role

Requirement:

- do not implement worker portal until self-access model is designed and tested

### Broken Object Level Authorization And IDOR

Threat: user passes another farm’s object ID in path or payload.

Controls:

- load object and verify `object.farm_id == requested farm_id`
- validate related object IDs belong to the same farm before writes
- use server-side checks in services

Requirement:

- tests for cross-farm IDs in path params and request bodies

### File Upload Abuse

Threat: malicious upload, oversized file, executable content, path traversal, storage overwrite.

Controls:

- never use user-supplied filename as storage path
- generate opaque storage keys
- enforce size limits
- allow-list content types
- scan files before later production release
- store outside public web root

Requirement:

- no production file upload without content validation, size limit and authorization tests

### Invoice And Document Leakage

Threat: document download endpoint exposes files without checking farm and role.

Controls:

- document metadata is farm-scoped
- file reads require document metadata authorization first
- storage keys are not public URLs
- later S3 access must use short-lived signed URLs only after authorization

Requirement:

- document download tests for wrong farm and wrong role

### Weak Password Handling

Threat: weak passwords, leaked hashes, brute force.

Controls:

- bcrypt password hashing
- minimum password strength policy
- no password logging
- rate limiting and lockout before public deployment
- MFA roadmap for sensitive roles

Requirement:

- add login rate limiting before internet exposure

### JWT Misuse

Threat: long-lived tokens, missing claims, weak secret, token replay.

Controls:

- strong production secret validation
- access token claim type
- expiration claim
- token ID claim
- HTTPS-only deployment

Requirement:

- implement refresh tokens, revocation/session tracking and short access-token lifetime before production

### Privilege Escalation

Threat: user changes their role or adds themselves to farms.

Controls:

- only owner or authorized farm admin can manage members
- role changes audited
- server never accepts role claims from frontend as authority

Requirement:

- member-management endpoints require dedicated tests and audit logs

### SQL Injection

Threat: attacker injects SQL through filters/search/report params.

Controls:

- use SQLAlchemy parameterized queries
- avoid raw SQL unless reviewed
- validate query parameters with Pydantic

Requirement:

- raw SQL must be banned or explicitly reviewed

### XSS

Threat: stored comments, document names or free-text fields execute script in browser.

Controls:

- React escapes text by default
- avoid `dangerouslySetInnerHTML`
- sanitize any future HTML report/comment rendering
- Content Security Policy before production

Requirement:

- HTML report templates must escape variables by default

### CSRF

Threat: browser automatically sends cookies to mutate data.

Current state:

- bearer-token architecture avoids cookie CSRF by default

If cookies are introduced:

- SameSite=Lax or Strict
- CSRF tokens for unsafe methods
- secure and httponly flags

Requirement:

- do not switch to cookie auth without CSRF design

### Report Data Leakage

Threat: report queries aggregate data across farms or include unauthorized categories.

Controls:

- report services must use same permission checks as source records
- every report query filters by `farm_id`
- exported reports include farm identity and generation metadata

Requirement:

- report tests must include cross-farm fixture data

### Audit Log Tampering

Threat: malicious user modifies or deletes audit evidence.

Controls:

- audit logs are not exposed through normal CRUD
- no update/delete endpoints for audit logs
- audit payload redacts secrets

Requirement:

- later add append-only database controls or immutable external audit sink

### Insecure Exports

Threat: CSV/JSON/XLSX exports leak excessive or cross-farm data.

Controls:

- exports use same service permission checks as API/report views
- exports are audited
- exported filenames avoid sensitive uncontrolled input
- generated files expire if stored

Requirement:

- no export endpoint without authorization, audit and data-scope tests

### Environment Secret Exposure

Threat: secrets committed, logged or exposed to frontend builds.

Controls:

- `.env` ignored
- production requires strong JWT secret
- frontend environment variables must not contain backend secrets

Requirement:

- add secret scanning in CI before production

## Required Security Work Before Feature Expansion

Before implementing additional product depth:

- finalize role taxonomy, especially whether `ADMIN` exists and whether `WORKER` is a platform user
- define farm member invitation and acceptance flow
- add test fixtures for multi-farm authorization
- add authorization tests for every farm-scoped endpoint
- add same-farm reference validation tests for all related IDs
- add audit tests for create/update/delete
- design document upload/download authorization
- define file size, file type and storage rules
- define report export audit and retention policy
- define password reset flow
- define session refresh/revocation model
- define production secret management
- define backup and recovery expectations
- define data retention and deletion policy

## Open Security Decisions

- Should `ADMIN` exist as a farm role, or should OWNER delegate specific capabilities instead?
- Should accountants be allowed to add comments without editing source records?
- Should labor consultants ever see documents, and if so only worker-linked documents?
- Will workers authenticate directly, or will worker data remain owner-managed only?
- Should audit logs be visible to farm owners, platform security, or both?
- What export formats are required first, and how long generated exports should persist?

