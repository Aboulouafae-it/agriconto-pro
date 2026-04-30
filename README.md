# AgriConto Pro

**Professional agricultural accounting, workforce management, crop tracking, document organization, and accountant-ready reporting for Italian farms.**

AgriConto Pro is a modern farm management and accounting support platform designed for agricultural businesses, small farmers, accountants, and labor consultants.

It helps organize daily farm operations, expenses, sales, workers, workdays, crops, fields, documents, analytics, and professional reports in one secure and structured system.

> AgriConto Pro does not replace a commercialista, consulente del lavoro, tax advisor, INPS, INAIL, Agenzia delle Entrate, or any official legal/tax filing system.  
> It is a management and documentation platform that prepares organized, verifiable data for professional review.

---

## Project Vision

Agricultural businesses often manage critical information through paper notes, scattered invoices, WhatsApp photos, incomplete spreadsheets, and disconnected tools.

AgriConto Pro aims to solve this by creating a single professional platform where farm owners can:

- register expenses and sales,
- manage workers and daily work records,
- track crops and fields,
- upload invoices and documents,
- monitor missing documentation,
- generate accountant-ready reports,
- prepare structured data for commercialisti and labor consultants.

The goal is not only to build software, but to create a serious digital foundation for modern agricultural administration.

---

## Key Features

### Farm Management

- Farm profile and fiscal metadata
- Fields and land registry
- Crop seasons and production tracking
- Multi-farm-ready architecture
- Farm-level data isolation

### Workforce Management

- Worker registry
- Wage type tracking
- Daily work records
- Hours, days, and task assignment
- Worker balances
- Advances and payments
- Labor cost summaries

### Expenses and Sales

- Expense tracking by category
- Sales and receivables tracking
- Supplier and customer registry
- Payment status monitoring
- Crop and field cost allocation
- Missing document indicators

### Documents

- Secure document upload
- Invoice and receipt organization
- Worker document tracking
- Document requests
- Missing document alerts
- Accountant-focused document preparation

### Reports

AgriConto Pro is designed with a strong reporting system, including:

- Monthly Management Report
- Expense Report
- Sales and Receivables Report
- Worker Wage Summary
- Crop Profitability Report
- Missing Documents Report
- Document Index
- Audit Summary
- Accountant Pack / Pacchetto Commercialista

Reports are designed to be clear, printable, professional, and suitable for administrative review.

### Accountant Portal

A dedicated read-only area for accountants:

- farm overview,
- missing documents,
- recent expenses,
- recent sales,
- worker balances,
- document checklist,
- accountant package export,
- audit-friendly data structure.

### Analytics

A dedicated statistics and intelligence area:

- financial KPIs,
- crop profitability,
- labor analytics,
- expense analysis,
- sales analysis,
- document completeness,
- comparison views,
- business intelligence dashboards.

---

## Desktop Application

AgriConto Pro is being prepared as a standalone desktop application.

Current desktop direction:

- Electron desktop wrapper
- Debian/Linux packaging
- AppImage and `.deb` builds
- Windows packaging planned
- Secure desktop shell
- Local backend integration roadmap
- Professional application branding

The goal is to allow users to open AgriConto Pro like a normal desktop program without manually opening a browser.

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- Modern component architecture
- Responsive UI
- Desktop-first and mobile-aware design

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy / SQLModel architecture
- PostgreSQL
- Alembic migrations
- JWT authentication
- Role-based access control

### Desktop

- Electron
- electron-builder
- Debian `.deb` packaging
- AppImage support
- Windows installer planned

### Reports

- Server-side PDF generation architecture
- HTML report templates
- Professional PDF layout system
- QR/report verification planning
- Audit log integration

---

## Architecture Overview

```text
AgriConto Pro
│
├── Frontend
│   ├── React
│   ├── TypeScript
│   ├── Vite
│   └── TailwindCSS
│
├── Backend
│   ├── FastAPI
│   ├── PostgreSQL
│   ├── Authentication
│   ├── RBAC
│   ├── Reports
│   └── Audit Logs
│
├── Desktop
│   ├── Electron
│   ├── Linux packaging
│   └── Windows packaging planned
│
└── Documentation
    ├── Product specification
    ├── Architecture
    ├── Security
    ├── Database
    ├── Reports
    └── Roadmap
## Security Principles

Security is a core part of AgriConto Pro.

Every financial, worker, document, or report record must be:

- owned by a farm,
- created by an authenticated user,
- permission-protected,
- validated,
- auditable,
- reportable,
- exportable,
- protected from unauthorized access.

### Main Security Rules

- Backend is the security authority.
- Frontend permissions are only for user experience.
- Every farm-scoped record must verify farm membership.
- Role permissions must be enforced server-side.
- Accountant access is read-only by default.
- Worker access is restricted to personal data only.
- Sensitive files must never be exposed directly.
- Audit logs must track important actions.
- PDF exports must require authentication and authorization.

---

## Roles

### Owner / Titolare

Full control over the farm workspace.

Can manage:

- farm profile,
- workers,
- fields,
- crops,
- expenses,
- sales,
- documents,
- reports,
- users and roles.

### Accountant / Commercialista

Read-only financial and document review access.

Can view:

- expenses,
- sales,
- documents,
- reports,
- missing document lists,
- accountant pack.

Cannot modify core financial records by default.

### Labor Consultant / Consulente del lavoro

Focused access to labor-related data.

Can view:

- workers,
- workdays,
- wages,
- advances,
- payments,
- labor summaries.

### Worker / Lavoratore

Planned restricted role.

Can only access personal workday/payment information.

---

## Project Structure

```text
agriconto-pro/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── reports/
│   │   ├── storage/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   ├── layouts/
│   │   └── styles/
│   │
│   └── package.json
│
├── desktop/
│   ├── electron/
│   ├── assets/
│   └── electron-builder.yml
│
├── docs/
│   ├── PRODUCT.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── REPORTS.md
│   ├── ROADMAP.md
│   └── RELEASE_CHECKLIST.md
│
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

## Getting Started

### Requirements

Recommended development environment:

- Node.js 20+
- Python 3.11+
- PostgreSQL
- Docker / Docker Compose
- Git
- Linux Debian/Ubuntu for desktop packaging

---

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Backend health check:

```bash
curl http://127.0.0.1:8001/health
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

---

## Desktop Development

```bash
cd frontend
npm run desktop:dev
```

Build desktop package:

```bash
npm run desktop:dist:linux
```

Expected Linux outputs:

```text
AgriConto Pro-0.1.0.AppImage
agriconto-pro_0.1.0_amd64.deb
```

Install the Debian package:

```bash
sudo apt install ./agriconto-pro_0.1.0_amd64.deb
```

Run AppImage directly:

```bash
chmod +x "AgriConto Pro-0.1.0.AppImage"
./"AgriConto Pro-0.1.0.AppImage"
```

---

## Demo Mode

The current development version may include demo data for:

- farm profile,
- workers,
- fields,
- crops,
- expenses,
- sales,
- documents,
- reports,
- analytics.

Demo data is intended for development, validation, and presentation only.

---

## Reports and PDF Export

AgriConto Pro is designed to generate professional administrative PDF reports.

Planned/exportable reports include:

| Report | Purpose |
|---|---|
| Monthly Management Report | Monthly financial and operational overview |
| Expense Report | Detailed cost tracking |
| Sales Report | Sales and receivables overview |
| Worker Wage Report | Workdays, earnings, advances, payments |
| Crop Profitability Report | Profitability by crop and season |
| Missing Documents Report | Documents and information still required |
| Accountant Pack | Complete package for commercialista review |
| Annual Summary | Year-end business overview |
| Document Index | Organized document archive |
| Audit Summary | Relevant system and data changes |

Each report is designed to include:

- report ID,
- farm data,
- date range,
- generated by,
- generated at,
- QR/reference metadata,
- clean tables,
- totals,
- legal disclaimer,
- professional layout.

---

## Analytics Center

The **Statistiche e Analisi** module is designed as an advanced business intelligence area.

It may include:

- financial overview,
- crop profitability analytics,
- field performance,
- labor analytics,
- expense intelligence,
- sales and receivables analysis,
- document completeness,
- comparison analytics,
- advanced indicators,
- detailed data tables.

The analytics module is intended for management insight and operational decision support.

---

## Legal Disclaimer

AgriConto Pro is a management and documentation platform.

It does **not** replace:

- commercialista,
- consulente del lavoro,
- tax advisor,
- payroll consultant,
- Agenzia delle Entrate,
- INPS,
- INAIL,
- official declarations,
- official payroll documents,
- legal or fiscal obligations.

All tax, IVA, payroll, labor, social security, and legal obligations must be reviewed and submitted by qualified professionals.

Italian disclaimer used in reports:

> Questo report è un documento gestionale interno generato da AgriConto Pro.  
> Non sostituisce il commercialista, il consulente del lavoro, le dichiarazioni fiscali, IVA, INPS, INAIL o altri adempimenti ufficiali.  
> I dati devono essere verificati da un professionista abilitato.

---

## Roadmap

### Phase 1 — Core Foundation

- Authentication
- Farm workspace
- Role-based access control
- Workers
- Fields
- Crops
- Expenses
- Sales
- Documents
- Basic reports

### Phase 2 — Desktop MVP

- Electron desktop wrapper
- Debian packaging
- AppImage support
- Application branding
- Backend health checks
- Desktop release workflow

### Phase 3 — Professional Reports

- PDF export
- Accountant Pack
- QR/report reference
- Report export history
- Audit log integration

### Phase 4 — Advanced Analytics

- Dedicated analytics center
- Crop profitability
- Labor intelligence
- Expense analysis
- Sales analysis
- Document completeness
- Comparative views

### Phase 5 — Local Backend Integration

- Automatic local backend startup
- Backend lifecycle management
- Local logs
- Desktop error handling
- Packaging improvements

### Phase 6 — Future Extensions

- PWA/mobile field mode
- OCR invoice scanning
- AI assistant
- Cloud synchronization
- Multi-farm accountant workspace
- Windows installer
- SaaS deployment mode

---

## Development Priorities

Current priorities:

1. Stabilize the desktop app.
2. Fix backend desktop integration.
3. Complete PDF report generation.
4. Improve branding and logo consistency.
5. Polish UI/UX.
6. Strengthen demo data and presentation flow.
7. Prepare clean GitHub documentation and releases.

---

## Screenshots

Screenshots should be added in:

```text
docs/assets/screenshots/
```

Recommended screenshots:

```text
dashboard.png
statistics.png
workers.png
workdays.png
expenses.png
sales.png
documents.png
commercialista.png
reports.png
desktop-app.png
pdf-report.png
```

Example Markdown:

```markdown
![Dashboard](docs/assets/screenshots/dashboard.png)
![Commercialista](docs/assets/screenshots/commercialista.png)
![Statistics](docs/assets/screenshots/statistics.png)
```

---

## Release Assets

Recommended release assets:

```text
AgriConto-Pro-0.1.0.AppImage
agriconto-pro_0.1.0_amd64.deb
```

Each release should include:

- changelog,
- known limitations,
- installation instructions,
- security notes,
- demo credentials if applicable,
- PDF/report status.

---

## Known Limitations

AgriConto Pro is currently under active development.

Current limitations may include:

- desktop backend may still require manual startup depending on build mode,
- PDF export may be under active implementation,
- some analytics are based on demo data,
- official fiscal/tax/payroll calculations are not implemented,
- Windows installer is planned but not yet fully validated,
- production deployment hardening is still in progress.

---

## Contributing

Contributions are welcome when the project is ready for collaboration.

Useful contribution areas:

- UI/UX improvements,
- backend APIs,
- PDF reports,
- desktop packaging,
- security review,
- documentation,
- Italian business/accounting terminology,
- testing,
- accessibility.

Before contributing, please read:

```text
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
```

---

## Security

If you discover a security issue, please do not open a public issue with sensitive details.

Recommended future contact:

```text
security@example.com
```

Until a dedicated contact is configured, security reports can be handled privately by the repository maintainer.

Security priorities:

- farm-level data isolation,
- authentication,
- role-based access control,
- safe document handling,
- secure PDF export,
- audit logs,
- no exposed secrets,
- no cross-farm data leakage.

---

## Project Status

AgriConto Pro is an early-stage professional MVP under active development.

Current focus:

```text
Desktop stabilization
Backend integration
Professional PDF reports
UI/UX polish
GitHub documentation
```

---

## License

This project is licensed under the terms defined in the repository license file.

See:

```text
LICENSE
```

---

## Author

Created and maintained by:

**Aboulouafae-it**

GitHub:

```text
https://github.com/Aboulouafae-it
```

---

## Final Note

AgriConto Pro is built around one core idea:

> Turn agricultural administration from scattered papers, messages, and missing documents into a clean, structured, verifiable workflow ready for professional review.

The long-term goal is to become a serious digital bridge between farmers, accountants, labor consultants, and agricultural businesses.
