# Backup Strategy

AgriConto Pro must protect database records, audit logs, report exports and uploaded documents.

## Scope

Back up:

- PostgreSQL database;
- audit logs;
- report export metadata;
- local document storage volume;
- deployment configuration templates.

Do not back up:

- local `.env` files into shared source archives;
- transient frontend build artifacts;
- local virtual environments or `node_modules`.

## Development Backup

Database dump:

```bash
docker compose exec postgres pg_dump -U agriconto -d agriconto > backups/agriconto-dev.sql
```

Document storage archive:

```bash
docker run --rm -v agriconto-pro_backend-storage:/data -v "$PWD/backups:/backups" alpine tar czf /backups/storage-dev.tgz -C /data .
```

Development backups may contain sensitive demo data and must stay local.

## Production Backup

Minimum requirements:

- automated PostgreSQL backups;
- point-in-time recovery if available;
- encrypted document storage backups;
- backup encryption at rest;
- separate storage account or region;
- restore tests before launch and on a recurring schedule.

## Retention

Recommended baseline:

- daily backups retained for 30 days;
- weekly backups retained for 12 weeks;
- monthly backups retained for 12 months;
- audit retention defined with legal/accounting advisors.

Retention must comply with customer contracts and applicable law.

## Restore Testing

At least once per quarter:

1. restore database into an isolated environment;
2. restore document storage;
3. run migrations if needed;
4. verify demo login is disabled unless using demo-only data;
5. verify reports and document downloads;
6. document elapsed restore time and issues.

## RPO And RTO

Define before production:

- RPO: maximum acceptable data loss window.
- RTO: maximum acceptable recovery time.

For sensitive accounting and labor records, choose conservative values and communicate them clearly to stakeholders.
