# Production Checklist

AgriConto Pro handles sensitive business, financial, worker and document data. Production deployment must not proceed until every item below is addressed.

## Secrets

- [ ] Set a strong unique `JWT_SECRET_KEY` with at least 32 random bytes.
- [ ] Store secrets in a secret manager, not Git, images or shell history.
- [ ] Rotate secrets with a documented procedure.
- [ ] Use separate credentials per environment.

## Transport And Browser Security

- [ ] HTTPS only.
- [ ] Redirect HTTP to HTTPS.
- [ ] Configure HSTS after validating TLS.
- [ ] Configure secure CORS with exact production origins.
- [ ] Do not use wildcard CORS with credentials.
- [ ] If cookies are used, set `HttpOnly`, `Secure`, `SameSite` and CSRF protection.

## Authentication And Authorization

- [ ] Enforce token expiry.
- [ ] Add login rate limiting.
- [ ] Add account lockout or throttling policy for repeated failures.
- [ ] Restrict admin access to approved operators only.
- [ ] Review role membership workflows before inviting accountants or consultants.
- [ ] Verify every farm-scoped endpoint checks membership and role server-side.

## Database

- [ ] Use production PostgreSQL with encrypted storage.
- [ ] Use least-privilege database credentials.
- [ ] Enable automated database backups.
- [ ] Test database restore before launch.
- [ ] Monitor migration execution and failures.
- [ ] Do not run demo seed data in production.

## File Storage

- [ ] Store documents outside public web roots.
- [ ] Enforce document storage access control through backend endpoints.
- [ ] Back up file storage.
- [ ] Test file restore.
- [ ] Plan malware scanning or quarantine workflow.
- [ ] Never expose raw filesystem paths or storage keys to users.

## Logging And Monitoring

- [ ] Centralize application logs.
- [ ] Redact passwords, tokens and document contents.
- [ ] Enable log monitoring and alerting.
- [ ] Enable error monitoring.
- [ ] Monitor authentication failures and authorization denials.
- [ ] Monitor file upload failures and suspicious MIME types.

## Audit And Retention

- [ ] Define audit log retention period.
- [ ] Protect audit logs from normal user modification or deletion.
- [ ] Back up audit logs with the database.
- [ ] Review report export expiration behavior.
- [ ] Ensure document upload/download/delete events are auditable.

## Reports And Exports

- [ ] Ensure report generation checks role and farm membership.
- [ ] Expire report exports.
- [ ] Store exported files with opaque keys only.
- [ ] Avoid internal paths in report metadata.
- [ ] Confirm reports are labeled as preparation tools, not official filings.

## Network And Runtime

- [ ] Run containers as non-root where practical.
- [ ] Keep base images updated.
- [ ] Scan container images for CVEs.
- [ ] Restrict inbound network access.
- [ ] Restrict PostgreSQL to application network only.
- [ ] Configure resource limits.

## Backups And Recovery

- [ ] Document RPO and RTO.
- [ ] Schedule database backups.
- [ ] Schedule file storage backups.
- [ ] Encrypt backups.
- [ ] Store backups in a separate failure domain.
- [ ] Test restores regularly.

## Release Gate

- [ ] Backend tests pass.
- [ ] Frontend build passes.
- [ ] Dependency security checks pass or accepted risks are documented.
- [ ] Alembic migrations tested in staging.
- [ ] Production `.env` reviewed without exposing secrets.
- [ ] Incident contact and rollback plan are documented.
