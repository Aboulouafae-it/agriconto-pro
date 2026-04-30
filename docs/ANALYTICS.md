# Analytics

The “Statistiche e Analisi” page is the business intelligence center of AgriConto Pro. It is designed for farm owners, commercialisti and authorized consultants who need deeper operational visibility.

## Current Status

Implemented foundation:

- executive KPI cards;
- financial analytics;
- crop profitability;
- field performance;
- labor analytics;
- expense analytics;
- sales analytics;
- document completeness;
- comparison and advanced metrics sections;
- export of analytics summaries/sections as JSON;
- role-aware visibility.

Planned:

- deeper drill-down pages;
- saved analytics views synced server-side;
- PDF analytical report export;
- budget vs actual;
- season-over-season comparisons;
- anomaly detection and forecasting.

## Security

- Analytics endpoints live under `/api/v1/farms/{farm_id}/analytics`.
- `farm_id` remains the tenant boundary.
- Backend checks membership and role before generating aggregations.
- Titolare and Commercialista can view financial, crop, field, document and comparison analytics.
- Consulente del lavoro can view labor-related analytics.
- Lavoratore must not see farm-wide analytics.
- Frontend visibility is UX only, not security.

## Sections

- Overview: high-level KPIs and insights.
- Financial: revenue, expenses and net result.
- Crops: profitability and cost/revenue contribution.
- Fields: performance per field and productivity signals.
- Labor: worker cost, workdays and balances.
- Expenses: categories, suppliers and missing documents.
- Sales: customers, products/crops and receivables signals.
- Documents: completeness, open requests and missing information.
- Comparison: current vs previous period.
- Advanced metrics: management ratios and warning indicators.
- Tables: detailed source data views.

## Performance Notes

The current implementation uses server-side farm-scoped aggregations. Future scale work should add:

- materialized monthly summaries;
- pagination for heavy tables;
- caching for common filters;
- async exports through `report_exports`;
- composite indexes on `farm_id` and operational dates.
