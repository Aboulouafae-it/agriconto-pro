# Roadmap

AgriConto Pro is an MVP under active development. This roadmap separates implemented foundations from planned work.

## Phase 1: Core MVP

- Goal: establish secure farm-scoped records.
- Planned/implemented features: auth, farms, workers, workdays, fields, crops, expenses, sales, documents, audit logs.
- Status: in progress; core foundation implemented.
- Risks: schema expansion must preserve farm isolation and auditability.

## Phase 2: Desktop Stabilization

- Goal: make Debian/Linux desktop distribution reliable.
- Planned/implemented features: Electron wrapper, `.deb`, AppImage, secure Electron settings, backend health checks.
- Status: in progress; packaging foundation implemented.
- Risks: backend runtime is not fully bundled yet.

## Phase 3: Professional PDF Reports

- Goal: accountant-ready management documents.
- Planned/implemented features: report metadata, checksum, PDF responses, audit log on exports, Pacchetto Commercialista.
- Status: in progress; PDF foundation implemented.
- Risks: richer PDF layout may require WeasyPrint/Chromium dependencies.

## Phase 4: Advanced Analytics

- Goal: business intelligence for owners and advisors.
- Planned/implemented features: KPIs, financial analytics, crop profitability, labor analytics, document completeness, exports.
- Status: foundation implemented; drill-down and saved views are evolving.
- Risks: performance and aggregation strategy for large farms.

## Phase 5: Local Backend Integration

- Goal: desktop users should not manage backend manually.
- Planned features: PyInstaller backend sidecar, local database strategy, migration-on-launch, log rotation.
- Status: planned.
- Risks: secure local secrets and upgrade handling.

## Phase 6: Mobile/PWA Field Mode

- Goal: field-friendly workday, expense and document capture.
- Planned features: PWA installability, offline queue, camera document capture, sync conflict handling.
- Status: planned.
- Risks: offline data consistency and device security.

## Phase 7: OCR and AI Assistant

- Goal: reduce manual invoice/document entry.
- Planned features: OCR ingestion, AI-assisted categorization, review workflows.
- Status: planned.
- Risks: privacy, accuracy, human review and regulatory positioning.

## Phase 8: Cloud/SaaS and Multi-Farm Accountant Workspace

- Goal: hosted collaboration across many farms.
- Planned features: accountant workspace, invitations, multi-farm dashboards, managed backups.
- Status: planned.
- Risks: production security, tenancy, monitoring, billing and compliance.
