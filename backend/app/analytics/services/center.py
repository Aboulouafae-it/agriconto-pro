from collections import defaultdict
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.schemas import AnalyticsFilters
from app.core.exceptions import ForbiddenError
from app.core.permissions import require_farm_member
from app.models import (
    Crop,
    Customer,
    Document,
    DocumentRequest,
    Expense,
    Field,
    Sale,
    Supplier,
    Workday,
    WorkdayEntry,
    Worker,
    WorkerAdvance,
    WorkerPayment,
)
from app.models.enums import DocumentStatus, FarmRole
from app.models.user import User

FINANCIAL_ANALYTICS_ROLES = {FarmRole.OWNER, FarmRole.ACCOUNTANT}
LABOR_ANALYTICS_ROLES = {FarmRole.OWNER, FarmRole.LABOR_CONSULTANT}
BUSINESS_ANALYTICS_ROLES = {FarmRole.OWNER, FarmRole.ACCOUNTANT}
OVERVIEW_ANALYTICS_ROLES = {FarmRole.OWNER, FarmRole.ACCOUNTANT, FarmRole.LABOR_CONSULTANT}


def money(value: Decimal | int | float | None) -> float:
    return float(value or Decimal("0"))


def percent(numerator: Decimal | int | float, denominator: Decimal | int | float) -> float:
    denominator_decimal = Decimal(str(denominator or 0))
    if denominator_decimal == 0:
        return 0.0
    return float((Decimal(str(numerator or 0)) / denominator_decimal) * Decimal("100"))


def month_key(value: date) -> str:
    return f"{value.year}-{value.month:02d}"


class AnalyticsCenterService:
    def __init__(self, db: Session):
        self.db = db

    def overview(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        role = self._require_role(farm_id, user, OVERVIEW_ANALYTICS_ROLES)
        if role == FarmRole.LABOR_CONSULTANT:
            labor = self.labor(farm_id, user, filters)
            return {
                "role_scope": "labor_only",
                "allowed_sections": ["labor"],
                "kpis": {
                    "labor_cost": labor["totals"]["total_earned"],
                    "total_workdays": labor["totals"]["total_workdays"],
                    "total_hours": labor["totals"]["total_hours"],
                    "workers_with_missing_data": len(labor["workers_with_missing_data"]),
                },
                "labor_preview": labor["worker_ranking"][:10],
                "security_note": "Il consulente del lavoro non riceve dati di vendita o spese non lavoristiche.",
            }

        financial = self.financial(farm_id, user, filters)
        crops = self.crops(farm_id, user, filters)
        fields = self.fields(farm_id, user, filters)
        labor = self._labor_payload(farm_id, filters)
        documents = self._document_payload(farm_id)
        total_sales = Decimal(str(financial["totals"]["total_revenue"]))
        total_expenses = Decimal(str(financial["totals"]["total_expenses"]))
        labor_cost = Decimal(str(labor["totals"]["total_earned"]))
        net_result = total_sales - total_expenses
        best_crop = crops["ranking"][0] if crops["ranking"] else None
        best_field = fields["ranking"][0] if fields["ranking"] else None
        return {
            "role_scope": "business_intelligence",
            "allowed_sections": [
                "financial",
                "crops",
                "fields",
                "labor_summary",
                "expenses",
                "sales",
                "documents",
                "comparison",
                "advanced_metrics",
            ],
            "kpis": {
                "total_revenue": money(total_sales),
                "total_expenses": money(total_expenses),
                "net_result": money(net_result),
                "labor_cost": money(labor_cost),
                "unpaid_sales": 0,
                "unpaid_expenses": 0,
                "missing_documents": documents["totals"]["missing_documents"],
                "most_profitable_crop": best_crop,
                "most_profitable_field": best_field,
                "average_margin": percent(net_result, total_sales),
                "labor_cost_ratio": percent(labor_cost, total_sales),
                "document_completeness_rate": documents["totals"]["completeness_rate"],
            },
            "timeline": financial["timeline"],
            "top_insights": self._insights(financial, crops, labor, documents),
        }

    def financial(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, FINANCIAL_ANALYTICS_ROLES)
        sales = self._sales(farm_id, filters)
        expenses = self._expenses(farm_id, filters)
        revenue_by_month = self._sum_by_month(sales, "sale_date", "amount")
        expenses_by_month = self._sum_by_month(expenses, "expense_date", "amount")
        months = sorted(set(revenue_by_month) | set(expenses_by_month))
        cumulative_revenue = Decimal("0")
        cumulative_expense = Decimal("0")
        timeline = []
        for key in months:
            revenue = revenue_by_month[key]
            expense = expenses_by_month[key]
            cumulative_revenue += revenue
            cumulative_expense += expense
            timeline.append(
                {
                    "period": key,
                    "revenue": money(revenue),
                    "expenses": money(expense),
                    "net_result": money(revenue - expense),
                    "cumulative_revenue": money(cumulative_revenue),
                    "cumulative_expenses": money(cumulative_expense),
                }
            )
        total_revenue = sum((Decimal(row.amount) for row in sales), Decimal("0"))
        total_expenses = sum((Decimal(row.amount) for row in expenses), Decimal("0"))
        net_result = total_revenue - total_expenses
        return {
            "totals": {
                "total_revenue": money(total_revenue),
                "total_expenses": money(total_expenses),
                "net_result": money(net_result),
                "average_monthly_revenue": money(total_revenue / max(len(months), 1)),
                "average_monthly_expense": money(total_expenses / max(len(months), 1)),
                "revenue_growth_pct": self._period_delta(timeline, "revenue"),
                "expense_growth_pct": self._period_delta(timeline, "expenses"),
                "net_margin_pct": percent(net_result, total_revenue),
            },
            "timeline": timeline,
            "monthly_revenues": [{"period": key, "value": money(value)} for key, value in revenue_by_month.items()],
            "monthly_expenses": [{"period": key, "value": money(value)} for key, value in expenses_by_month.items()],
            "waterfall": [
                {"label": "Ricavi", "value": money(total_revenue), "kind": "positive"},
                {"label": "Spese", "value": money(-total_expenses), "kind": "negative"},
                {"label": "Risultato netto", "value": money(net_result), "kind": "total"},
            ],
            "comparisons": self._comparison_cards(total_revenue, total_expenses, net_result),
        }

    def crops(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, BUSINESS_ANALYTICS_ROLES)
        crops = self._crops(farm_id, filters)
        expenses = self._expenses(farm_id, filters)
        sales = self._sales(farm_id, filters)
        labor_by_crop = self._labor_cost_by_crop(farm_id, filters)
        rows = []
        for crop in crops:
            crop_sales = sum((Decimal(row.amount) for row in sales if row.crop_id == crop.id), Decimal("0"))
            crop_expenses = sum(
                (Decimal(row.amount) for row in expenses if row.crop_id == crop.id), Decimal("0")
            )
            labor_cost = labor_by_crop[crop.id]
            total_cost = crop_expenses + labor_cost
            profit = crop_sales - total_cost
            rows.append(
                {
                    "id": str(crop.id),
                    "name": crop.name,
                    "season": crop.season,
                    "field_id": str(crop.field_id) if crop.field_id else None,
                    "linked_sales": money(crop_sales),
                    "linked_expenses": money(crop_expenses),
                    "linked_labor_cost": money(labor_cost),
                    "total_cost": money(total_cost),
                    "estimated_profit": money(profit),
                    "margin_pct": percent(profit, crop_sales),
                    "cost_per_unit": None,
                    "revenue_per_unit": None,
                    "status": self._profitability_status(profit, crop_sales),
                }
            )
        rows.sort(key=lambda item: item["estimated_profit"], reverse=True)
        return {
            "ranking": rows,
            "profit_by_crop": [{"label": row["name"], "value": row["estimated_profit"]} for row in rows],
            "revenue_contribution": [{"label": row["name"], "value": row["linked_sales"]} for row in rows],
            "cost_stack": [
                {
                    "label": row["name"],
                    "sales": row["linked_sales"],
                    "expenses": row["linked_expenses"],
                    "labor": row["linked_labor_cost"],
                }
                for row in rows
            ],
            "top_insights": {
                "most_profitable_crop": rows[0] if rows else None,
                "least_profitable_crop": rows[-1] if rows else None,
                "highest_labor_ratio_crop": max(
                    rows,
                    key=lambda row: percent(row["linked_labor_cost"], row["linked_sales"]),
                    default=None,
                ),
                "best_revenue_per_unit_crop": None,
                "quantity_tracking": "not_tracked",
            },
        }

    def fields(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, BUSINESS_ANALYTICS_ROLES)
        fields = self._fields(farm_id, filters)
        crops = self._crops(farm_id, filters)
        crop_payload = self.crops(farm_id, user, filters)["ranking"]
        crop_by_field = defaultdict(list)
        for crop in crops:
            crop_by_field[crop.field_id].append(crop)
        crop_metrics = {row["id"]: row for row in crop_payload}
        rows = []
        for field in fields:
            linked_crops = crop_by_field[field.id]
            revenue = sum(Decimal(str(crop_metrics.get(str(crop.id), {}).get("linked_sales", 0))) for crop in linked_crops)
            expenses = sum(
                Decimal(str(crop_metrics.get(str(crop.id), {}).get("linked_expenses", 0)))
                for crop in linked_crops
            )
            labor = sum(
                Decimal(str(crop_metrics.get(str(crop.id), {}).get("linked_labor_cost", 0)))
                for crop in linked_crops
            )
            net = revenue - expenses - labor
            area = Decimal(field.area_hectares or 0)
            rows.append(
                {
                    "id": str(field.id),
                    "name": field.name,
                    "area_hectares": money(area),
                    "linked_crops": [crop.name for crop in linked_crops],
                    "total_revenue": money(revenue),
                    "total_cost": money(expenses + labor),
                    "labor_cost": money(labor),
                    "net_result": money(net),
                    "productivity_per_hectare": money(revenue / area) if area > 0 else None,
                    "cost_per_hectare": money((expenses + labor) / area) if area > 0 else None,
                    "map": None,
                }
            )
        rows.sort(key=lambda item: item["net_result"], reverse=True)
        return {
            "ranking": rows,
            "profit_by_field": [{"label": row["name"], "value": row["net_result"]} for row in rows],
            "crop_field_matrix": [
                {"field": row["name"], "crops": row["linked_crops"], "net_result": row["net_result"]}
                for row in rows
            ],
            "map_available": False,
            "map_note": "Coordinate geografiche non ancora presenti nel modello dati.",
        }

    def labor(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, LABOR_ANALYTICS_ROLES)
        return self._labor_payload(farm_id, filters)

    def expenses(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, FINANCIAL_ANALYTICS_ROLES)
        expenses = self._expenses(farm_id, filters)
        suppliers = {supplier.id: supplier for supplier in self._suppliers(farm_id, filters)}
        by_category = defaultdict(Decimal)
        by_supplier = defaultdict(Decimal)
        by_month_category: dict[str, dict[str, float]] = defaultdict(dict)
        for expense in expenses:
            by_category[expense.category] += Decimal(expense.amount)
            supplier_name = suppliers.get(expense.supplier_id).name if expense.supplier_id in suppliers else "Non assegnato"
            by_supplier[supplier_name] += Decimal(expense.amount)
            by_month_category[month_key(expense.expense_date)][expense.category] = money(
                Decimal(str(by_month_category[month_key(expense.expense_date)].get(expense.category, 0)))
                + Decimal(expense.amount)
            )
        total = sum(by_category.values(), Decimal("0"))
        top_supplier = max(by_supplier.items(), key=lambda row: row[1], default=None)
        top_category = max(by_category.items(), key=lambda row: row[1], default=None)
        return {
            "totals": {
                "total_expenses": money(total),
                "average_expense": money(total / max(len(expenses), 1)),
                "highest_expense_category": top_category[0] if top_category else None,
                "top_supplier_by_spend": top_supplier[0] if top_supplier else None,
                "unpaid_expense_count": 0,
                "vat_total": None,
                "vat_note": "IVA trattata solo come metadato: nessun calcolo fiscale ufficiale.",
            },
            "by_category": [{"label": key, "value": money(value)} for key, value in by_category.items()],
            "by_supplier": [{"label": key, "value": money(value)} for key, value in by_supplier.items()],
            "trend": [{"period": key, "value": money(value)} for key, value in self._sum_by_month(expenses, "expense_date", "amount").items()],
            "category_heatmap": [
                {"period": period, "category": category, "value": value}
                for period, categories in by_month_category.items()
                for category, value in categories.items()
            ],
            "top_expenses": [
                {
                    "id": str(expense.id),
                    "date": expense.expense_date.isoformat(),
                    "category": expense.category,
                    "amount": money(expense.amount),
                    "description": expense.description,
                }
                for expense in sorted(expenses, key=lambda row: row.amount, reverse=True)[:20]
            ],
            "pareto": self._pareto(by_supplier),
        }

    def sales(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, FINANCIAL_ANALYTICS_ROLES)
        sales = self._sales(farm_id, filters)
        customers = {customer.id: customer for customer in self._customers(farm_id, filters)}
        crops = {crop.id: crop for crop in self._crops(farm_id, filters)}
        by_customer = defaultdict(Decimal)
        by_crop = defaultdict(Decimal)
        for sale in sales:
            customer_name = customers.get(sale.customer_id).name if sale.customer_id in customers else "Non assegnato"
            crop_name = crops.get(sale.crop_id).name if sale.crop_id in crops else "Non assegnata"
            by_customer[customer_name] += Decimal(sale.amount)
            by_crop[crop_name] += Decimal(sale.amount)
        total = sum(by_customer.values(), Decimal("0"))
        top_customer = max(by_customer.items(), key=lambda row: row[1], default=None)
        top_crop = max(by_crop.items(), key=lambda row: row[1], default=None)
        return {
            "totals": {
                "total_sales": money(total),
                "paid_sales": money(total),
                "unpaid_sales": 0,
                "receivables_total": 0,
                "average_sale_value": money(total / max(len(sales), 1)),
                "top_customer": top_customer[0] if top_customer else None,
                "top_product_or_crop": top_crop[0] if top_crop else None,
                "collection_rate_pct": 100 if total > 0 else 0,
            },
            "trend": [{"period": key, "value": money(value)} for key, value in self._sum_by_month(sales, "sale_date", "amount").items()],
            "by_customer": [{"label": key, "value": money(value)} for key, value in by_customer.items()],
            "paid_vs_unpaid": [
                {"label": "Incassate", "value": money(total)},
                {"label": "Non incassate", "value": 0},
            ],
            "by_crop": [{"label": key, "value": money(value)} for key, value in by_crop.items()],
            "receivables_aging": [],
            "alerts": [
                {
                    "type": "invoice_tracking",
                    "tone": "warning",
                    "message": "Il numero fattura non e ancora presente nello schema vendite iniziale.",
                }
            ],
        }

    def documents(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, BUSINESS_ANALYTICS_ROLES)
        return self._document_payload(farm_id)

    def comparison(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, BUSINESS_ANALYTICS_ROLES)
        financial = self.financial(farm_id, user, filters)
        current = financial["totals"]
        return {
            "mode": "current_vs_previous_period",
            "current_period": current,
            "previous_period": {
                "total_revenue": 0,
                "total_expenses": 0,
                "net_result": 0,
                "labor_cost": self._labor_payload(farm_id, filters)["totals"]["total_earned"],
                "document_completeness_rate": self._document_payload(farm_id)["totals"]["completeness_rate"],
            },
            "deltas": {
                "revenue_difference": current["total_revenue"],
                "expense_difference": current["total_expenses"],
                "margin_difference": current["net_margin_pct"],
                "labor_cost_difference": 0,
                "completeness_difference": 0,
            },
            "note": "La comparazione storica completa e pronta per essere estesa con finestre periodo dedicate.",
        }

    def advanced_metrics(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, BUSINESS_ANALYTICS_ROLES)
        financial = self.financial(farm_id, user, filters)
        labor = self._labor_payload(farm_id, filters)
        fields = self.fields(farm_id, user, filters)
        expenses = self.expenses(farm_id, user, filters)
        sales = self.sales(farm_id, user, filters)
        documents = self._document_payload(farm_id)
        total_area = sum(Decimal(str(row["area_hectares"])) for row in fields["ranking"])
        total_revenue = Decimal(str(financial["totals"]["total_revenue"]))
        total_expenses = Decimal(str(financial["totals"]["total_expenses"]))
        net_result = Decimal(str(financial["totals"]["net_result"]))
        labor_cost = Decimal(str(labor["totals"]["total_earned"]))
        indicators = [
            {"label": "Redditivita lorda", "value": percent(total_revenue - total_expenses, total_revenue), "unit": "%"},
            {"label": "Redditivita netta", "value": percent(net_result, total_revenue), "unit": "%"},
            {"label": "Incidenza lavoro", "value": percent(labor_cost, total_revenue), "unit": "%"},
            {"label": "Ricavi per ettaro", "value": money(total_revenue / total_area) if total_area > 0 else None, "unit": "EUR/ha"},
            {"label": "Costi per ettaro", "value": money((total_expenses + labor_cost) / total_area) if total_area > 0 else None, "unit": "EUR/ha"},
            {
                "label": "Ricavi per lavoratore",
                "value": money(total_revenue / max(len(labor["worker_ranking"]), 1)),
                "unit": "EUR",
            },
            {"label": "Valore medio vendita", "value": sales["totals"]["average_sale_value"], "unit": "EUR"},
            {"label": "Spesa media", "value": expenses["totals"]["average_expense"], "unit": "EUR"},
            {"label": "Completezza documentale", "value": documents["totals"]["completeness_rate"], "unit": "%"},
            {"label": "Tasso incasso", "value": sales["totals"]["collection_rate_pct"], "unit": "%"},
            {"label": "Concentrazione fornitori", "value": expenses["pareto"]["top_20_share_pct"], "unit": "%"},
            {"label": "Concentrazione clienti", "value": percent(max([row["value"] for row in sales["by_customer"]] or [0]), total_revenue), "unit": "%"},
        ]
        alerts = []
        if percent(labor_cost, total_revenue) > 35:
            alerts.append({"tone": "warning", "title": "Costi lavoro elevati", "detail": "Incidenza lavoro sopra soglia gestionale."})
        if documents["totals"]["missing_documents"] > 0:
            alerts.append({"tone": "warning", "title": "Documentazione incompleta", "detail": "Sono presenti elementi da completare."})
        if financial["totals"]["net_margin_pct"] < 10 and total_revenue > 0:
            alerts.append({"tone": "danger", "title": "Margine da monitorare", "detail": "Risultato netto basso rispetto ai ricavi."})
        return {"indicators": indicators, "alerts": alerts}

    def detailed_tables(self, farm_id: UUID, user: User, filters: AnalyticsFilters) -> dict:
        self._require_role(farm_id, user, BUSINESS_ANALYTICS_ROLES)
        return {
            "revenue_table": self.sales(farm_id, user, filters)["by_customer"],
            "expense_table": self.expenses(farm_id, user, filters)["top_expenses"],
            "worker_table": self._labor_payload(farm_id, filters)["worker_ranking"],
            "crop_table": self.crops(farm_id, user, filters)["ranking"],
            "field_table": self.fields(farm_id, user, filters)["ranking"],
            "missing_documents_table": self._document_payload(farm_id)["missing_items"],
            "pagination": {"limit": 50, "offset": 0, "note": "Le tabelle pesanti vanno paginate lato API nelle prossime iterazioni."},
        }

    def _require_role(self, farm_id: UUID, user: User, allowed_roles: set[FarmRole]) -> FarmRole:
        membership = require_farm_member(self.db, user.id, farm_id)
        if membership.role not in allowed_roles:
            raise ForbiddenError("Analytics non autorizzate per questo ruolo")
        return membership.role

    def _sales(self, farm_id: UUID, filters: AnalyticsFilters) -> list[Sale]:
        statement = select(Sale).where(Sale.farm_id == farm_id, Sale.deleted_at.is_(None))
        if filters.start_date:
            statement = statement.where(Sale.sale_date >= filters.start_date)
        if filters.end_date:
            statement = statement.where(Sale.sale_date <= filters.end_date)
        if filters.crop_id:
            statement = statement.where(Sale.crop_id == filters.crop_id)
        if filters.customer_id:
            statement = statement.where(Sale.customer_id == filters.customer_id)
        return list(self.db.scalars(statement.order_by(Sale.sale_date)).all())

    def _expenses(self, farm_id: UUID, filters: AnalyticsFilters) -> list[Expense]:
        statement = select(Expense).where(Expense.farm_id == farm_id, Expense.deleted_at.is_(None))
        if filters.start_date:
            statement = statement.where(Expense.expense_date >= filters.start_date)
        if filters.end_date:
            statement = statement.where(Expense.expense_date <= filters.end_date)
        if filters.crop_id:
            statement = statement.where(Expense.crop_id == filters.crop_id)
        if filters.supplier_id:
            statement = statement.where(Expense.supplier_id == filters.supplier_id)
        if filters.expense_category:
            statement = statement.where(Expense.category == filters.expense_category)
        return list(self.db.scalars(statement.order_by(Expense.expense_date)).all())

    def _crops(self, farm_id: UUID, filters: AnalyticsFilters) -> list[Crop]:
        statement = select(Crop).where(Crop.farm_id == farm_id, Crop.deleted_at.is_(None))
        if filters.crop_id:
            statement = statement.where(Crop.id == filters.crop_id)
        if filters.field_id:
            statement = statement.where(Crop.field_id == filters.field_id)
        if filters.season:
            statement = statement.where(Crop.season == filters.season)
        return list(self.db.scalars(statement.order_by(Crop.name)).all())

    def _fields(self, farm_id: UUID, filters: AnalyticsFilters) -> list[Field]:
        statement = select(Field).where(Field.farm_id == farm_id, Field.deleted_at.is_(None))
        if filters.field_id:
            statement = statement.where(Field.id == filters.field_id)
        return list(self.db.scalars(statement.order_by(Field.name)).all())

    def _suppliers(self, farm_id: UUID, filters: AnalyticsFilters) -> list[Supplier]:
        statement = select(Supplier).where(Supplier.farm_id == farm_id, Supplier.deleted_at.is_(None))
        if filters.supplier_id:
            statement = statement.where(Supplier.id == filters.supplier_id)
        return list(self.db.scalars(statement.order_by(Supplier.name)).all())

    def _customers(self, farm_id: UUID, filters: AnalyticsFilters) -> list[Customer]:
        statement = select(Customer).where(Customer.farm_id == farm_id, Customer.deleted_at.is_(None))
        if filters.customer_id:
            statement = statement.where(Customer.id == filters.customer_id)
        return list(self.db.scalars(statement.order_by(Customer.name)).all())

    def _labor_payload(self, farm_id: UUID, filters: AnalyticsFilters) -> dict:
        workers = list(
            self.db.scalars(
                select(Worker).where(Worker.farm_id == farm_id, Worker.deleted_at.is_(None)).order_by(Worker.last_name)
            ).all()
        )
        entries_statement = (
            select(WorkdayEntry, Workday)
            .join(Workday, Workday.id == WorkdayEntry.workday_id)
            .where(
                WorkdayEntry.farm_id == farm_id,
                WorkdayEntry.deleted_at.is_(None),
                Workday.farm_id == farm_id,
                Workday.deleted_at.is_(None),
            )
        )
        if filters.start_date:
            entries_statement = entries_statement.where(Workday.work_date >= filters.start_date)
        if filters.end_date:
            entries_statement = entries_statement.where(Workday.work_date <= filters.end_date)
        if filters.worker_id:
            entries_statement = entries_statement.where(WorkdayEntry.worker_id == filters.worker_id)
        if filters.crop_id:
            entries_statement = entries_statement.where(WorkdayEntry.crop_id == filters.crop_id)
        rows = self.db.execute(entries_statement).all()
        worker_by_id = {worker.id: worker for worker in workers}
        advances = self.db.scalars(
            select(WorkerAdvance).where(WorkerAdvance.farm_id == farm_id, WorkerAdvance.deleted_at.is_(None))
        ).all()
        payments = self.db.scalars(
            select(WorkerPayment).where(WorkerPayment.farm_id == farm_id, WorkerPayment.deleted_at.is_(None))
        ).all()
        earned_by_worker = defaultdict(Decimal)
        hours_by_worker = defaultdict(Decimal)
        by_task = defaultdict(Decimal)
        heatmap = defaultdict(Decimal)
        cost_by_crop = defaultdict(Decimal)
        for entry, workday in rows:
            worker = worker_by_id.get(entry.worker_id)
            rate = Decimal(entry.hourly_rate or (worker.hourly_rate if worker else 0) or 0)
            cost = Decimal(entry.hours) * rate
            earned_by_worker[entry.worker_id] += cost
            hours_by_worker[entry.worker_id] += Decimal(entry.hours)
            by_task[entry.activity or "Non specificata"] += cost
            heatmap[workday.work_date.isoformat()] += Decimal(entry.hours)
            if entry.crop_id:
                cost_by_crop[entry.crop_id] += cost
        advances_by_worker = defaultdict(Decimal)
        payments_by_worker = defaultdict(Decimal)
        for advance in advances:
            advances_by_worker[advance.worker_id] += Decimal(advance.amount)
        for payment in payments:
            payments_by_worker[payment.worker_id] += Decimal(payment.amount)
        ranking = []
        for worker in workers:
            earned = earned_by_worker[worker.id]
            ranking.append(
                {
                    "id": str(worker.id),
                    "name": f"{worker.first_name} {worker.last_name}",
                    "total_earned": money(earned),
                    "total_hours": money(hours_by_worker[worker.id]),
                    "advances": money(advances_by_worker[worker.id]),
                    "payments": money(payments_by_worker[worker.id]),
                    "remaining_balance": money(earned - advances_by_worker[worker.id] - payments_by_worker[worker.id]),
                    "missing_data": not bool(worker.fiscal_code),
                }
            )
        ranking.sort(key=lambda row: row["total_earned"], reverse=True)
        total_hours = sum(hours_by_worker.values(), Decimal("0"))
        total_earned = sum(earned_by_worker.values(), Decimal("0"))
        return {
            "totals": {
                "total_workdays": len({workday.id for _, workday in rows}),
                "total_hours": money(total_hours),
                "total_earned": money(total_earned),
                "average_labor_cost_per_day": money(total_earned / max(len({workday.id for _, workday in rows}), 1)),
                "average_labor_cost_per_crop": money(total_earned / max(len(cost_by_crop), 1)),
                "remaining_balances": money(sum(Decimal(str(row["remaining_balance"])) for row in ranking)),
            },
            "worker_ranking": ranking,
            "earnings_by_worker": [{"label": row["name"], "value": row["total_earned"]} for row in ranking],
            "task_distribution": [{"label": key, "value": money(value)} for key, value in by_task.items()],
            "workday_heatmap": [{"date": key, "value": money(value)} for key, value in heatmap.items()],
            "wage_type_distribution": [{"label": "Oraria", "value": len(workers)}, {"label": "Giornaliera", "value": 0}, {"label": "A cottimo", "value": 0}],
            "labor_pyramid": self._pareto(by_task),
            "workers_with_unpaid_balances": [row for row in ranking if row["remaining_balance"] > 0],
            "workers_with_missing_data": [row for row in ranking if row["missing_data"]],
        }

    def _document_payload(self, farm_id: UUID) -> dict:
        documents = self.db.scalars(
            select(Document).where(Document.farm_id == farm_id, Document.deleted_at.is_(None))
        ).all()
        requests = self.db.scalars(
            select(DocumentRequest).where(DocumentRequest.farm_id == farm_id, DocumentRequest.deleted_at.is_(None))
        ).all()
        expenses = self.db.scalars(
            select(Expense).where(Expense.farm_id == farm_id, Expense.deleted_at.is_(None))
        ).all()
        workers = self.db.scalars(
            select(Worker).where(Worker.farm_id == farm_id, Worker.deleted_at.is_(None))
        ).all()
        document_expense_ids = {
            doc.related_entity_id
            for doc in documents
            if doc.related_entity_type and doc.related_entity_type.lower() == "expense"
        }
        missing_expenses = [expense for expense in expenses if expense.id not in document_expense_ids]
        workers_missing_fiscal_code = [worker for worker in workers if not worker.fiscal_code]
        open_requests = [
            request
            for request in requests
            if request.status in {DocumentStatus.REQUESTED, DocumentStatus.MISSING}
        ]
        missing_items = [
            {
                "type": "expense",
                "label": expense.description or expense.category,
                "amount": money(expense.amount),
                "status": "Mancante",
                "priority": "Alta",
            }
            for expense in missing_expenses
        ] + [
            {
                "type": "worker",
                "label": f"{worker.first_name} {worker.last_name}",
                "amount": None,
                "status": "Da verificare",
                "priority": "Media",
            }
            for worker in workers_missing_fiscal_code
        ] + [
            {
                "type": "request",
                "label": request.title,
                "amount": None,
                "status": request.status.value if hasattr(request.status, "value") else str(request.status),
                "priority": "Alta",
            }
            for request in open_requests
        ]
        complete_count = len(documents)
        missing_count = len(missing_items)
        total = complete_count + missing_count
        by_status = defaultdict(int)
        for document in documents:
            by_status[str(document.status.value if hasattr(document.status, "value") else document.status)] += 1
        for request in requests:
            by_status[str(request.status.value if hasattr(request.status, "value") else request.status)] += 1
        return {
            "totals": {
                "complete_documents": complete_count,
                "missing_documents": missing_count,
                "open_requests": len(open_requests),
                "sales_without_invoice_number": 0,
                "expenses_without_attachments": len(missing_expenses),
                "workers_missing_codice_fiscale": len(workers_missing_fiscal_code),
                "completeness_rate": percent(complete_count, total),
            },
            "completeness_donut": [
                {"label": "Completo", "value": complete_count},
                {"label": "Mancante", "value": missing_count},
            ],
            "missing_items": missing_items,
            "priority_matrix": [
                {"priority": "Alta", "count": len([item for item in missing_items if item["priority"] == "Alta"])},
                {"priority": "Media", "count": len([item for item in missing_items if item["priority"] == "Media"])},
            ],
            "status_distribution": [{"label": key, "value": value} for key, value in by_status.items()],
            "trend": [],
        }

    def _labor_cost_by_crop(self, farm_id: UUID, filters: AnalyticsFilters) -> defaultdict[UUID, Decimal]:
        labor = self._labor_payload(farm_id, filters)
        cost_by_crop: defaultdict[UUID, Decimal] = defaultdict(Decimal)
        entries = self.db.scalars(
            select(WorkdayEntry).where(WorkdayEntry.farm_id == farm_id, WorkdayEntry.deleted_at.is_(None))
        ).all()
        workers = {worker.id: worker for worker in self._workers(farm_id)}
        for entry in entries:
            if not entry.crop_id:
                continue
            worker = workers.get(entry.worker_id)
            rate = Decimal(entry.hourly_rate or (worker.hourly_rate if worker else 0) or 0)
            cost_by_crop[entry.crop_id] += Decimal(entry.hours) * rate
        _ = labor
        return cost_by_crop

    def _workers(self, farm_id: UUID) -> list[Worker]:
        return list(
            self.db.scalars(
                select(Worker).where(Worker.farm_id == farm_id, Worker.deleted_at.is_(None))
            ).all()
        )

    def _sum_by_month(self, rows: list, date_field: str, amount_field: str) -> dict[str, Decimal]:
        totals: dict[str, Decimal] = defaultdict(Decimal)
        for row in rows:
            totals[month_key(getattr(row, date_field))] += Decimal(getattr(row, amount_field))
        return dict(sorted(totals.items()))

    def _period_delta(self, timeline: list[dict], field: str) -> float:
        if len(timeline) < 2:
            return 0.0
        previous = Decimal(str(timeline[-2][field]))
        current = Decimal(str(timeline[-1][field]))
        return percent(current - previous, previous)

    def _comparison_cards(self, total_revenue: Decimal, total_expenses: Decimal, net_result: Decimal) -> list[dict]:
        return [
            {"label": "vs mese precedente", "revenue_delta": money(total_revenue), "expense_delta": money(total_expenses), "net_delta": money(net_result)},
            {"label": "vs trimestre precedente", "revenue_delta": 0, "expense_delta": 0, "net_delta": 0},
            {"label": "vs stesso periodo anno scorso", "revenue_delta": 0, "expense_delta": 0, "net_delta": 0},
        ]

    def _profitability_status(self, profit: Decimal, revenue: Decimal) -> str:
        margin = percent(profit, revenue)
        if profit < 0:
            return "Critica"
        if margin < 10:
            return "Da monitorare"
        if margin < 20:
            return "In equilibrio"
        return "Positiva"

    def _pareto(self, data: dict[str, Decimal]) -> dict:
        ordered = sorted(data.items(), key=lambda row: row[1], reverse=True)
        total = sum((value for _, value in ordered), Decimal("0"))
        top_count = max(1, round(len(ordered) * 0.2)) if ordered else 0
        top_total = sum((value for _, value in ordered[:top_count]), Decimal("0"))
        return {
            "items": [{"label": key, "value": money(value)} for key, value in ordered],
            "top_20_share_pct": percent(top_total, total),
            "note": "Analisi concentrazione costi/ricavi, non una regola fiscale.",
        }

    def _insights(self, financial: dict, crops: dict, labor: dict, documents: dict) -> list[dict]:
        insights = []
        if crops["ranking"]:
            insights.append(
                {
                    "tone": "success",
                    "title": "Coltura piu redditizia",
                    "detail": crops["ranking"][0]["name"],
                }
            )
        if labor["workers_with_unpaid_balances"]:
            insights.append(
                {
                    "tone": "warning",
                    "title": "Saldi lavoratori aperti",
                    "detail": f"{len(labor['workers_with_unpaid_balances'])} profili con saldo residuo.",
                }
            )
        if documents["totals"]["missing_documents"] > 0:
            insights.append(
                {
                    "tone": "warning",
                    "title": "Documenti mancanti",
                    "detail": f"{documents['totals']['missing_documents']} elementi da completare.",
                }
            )
        if financial["totals"]["net_result"] < 0:
            insights.append(
                {
                    "tone": "danger",
                    "title": "Risultato netto negativo",
                    "detail": "Verificare costi, ricavi e allocazioni per coltura.",
                }
            )
        return insights
