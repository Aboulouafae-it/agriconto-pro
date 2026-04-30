from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.audit import audit_custom_event
from app.core.permissions import require_role
from app.models import (
    AuditLog,
    Crop,
    Customer,
    Document,
    DocumentRequest,
    Expense,
    Farm,
    ReportExport,
    Sale,
    Supplier,
    WorkdayEntry,
    Worker,
    WorkerAdvance,
    WorkerPayment,
)
from app.models.enums import DocumentStatus, FarmRole, ReportExportStatus
from app.models.user import User

FINANCIAL_REPORT_ROLES = {FarmRole.OWNER, FarmRole.ACCOUNTANT}
LABOR_REPORT_ROLES = {FarmRole.OWNER, FarmRole.LABOR_CONSULTANT}
ACCOUNTANT_PACK_ROLES = {FarmRole.OWNER, FarmRole.ACCOUNTANT}


def money(value: Decimal | int | float | None) -> float:
    return float(value or Decimal("0"))


def _month_range(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    end = date(year + int(month == 12), 1 if month == 12 else month + 1, 1)
    return start, end


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def monthly_summary(self, farm_id: UUID, user: User, year: int, month: int) -> dict:
        self._require_financial_report(farm_id, user)
        start, end = _month_range(year, month)

        expenses = self.db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.farm_id == farm_id,
                Expense.deleted_at.is_(None),
                Expense.expense_date >= start,
                Expense.expense_date < end,
            )
        )
        sales = self.db.scalar(
            select(func.coalesce(func.sum(Sale.amount), 0)).where(
                Sale.farm_id == farm_id,
                Sale.deleted_at.is_(None),
                Sale.sale_date >= start,
                Sale.sale_date < end,
            )
        )
        missing_documents = self._missing_documents_payload(farm_id)
        wage_summary = self._worker_wage_payload(farm_id)
        unpaid_worker_balances = sum(
            Decimal(str(worker["remaining_balance"])) for worker in wage_summary["workers"]
        )

        result = {
            "period": f"{year}-{month:02d}",
            "total_sales": money(sales),
            "total_expenses": money(expenses),
            "net_result": money(Decimal(sales or 0) - Decimal(expenses or 0)),
            "unpaid_sales": {
                "amount": 0,
                "tracking": "not_tracked",
                "note": "Lo schema iniziale non include ancora lo stato incasso delle vendite.",
            },
            "unpaid_expenses": {
                "amount": 0,
                "tracking": "not_tracked",
                "note": "Lo schema iniziale non include ancora lo stato pagamento delle spese.",
            },
            "unpaid_worker_balances": money(unpaid_worker_balances),
            "missing_documents_count": missing_documents["total_count"],
        }
        self._audit_report_generate(farm_id, user, "monthly_summary", {"period": result["period"]})
        return result

    def worker_wage_summary(self, farm_id: UUID, user: User) -> dict:
        self._require_labor_report(farm_id, user)
        result = self._worker_wage_payload(farm_id)
        self._audit_report_generate(farm_id, user, "worker_wage_summary")
        return result

    def crop_profitability(self, farm_id: UUID, user: User) -> dict:
        self._require_financial_report(farm_id, user)
        result = self._crop_profitability_payload(farm_id)
        self._audit_report_generate(farm_id, user, "crop_profitability")
        return result

    def missing_documents(self, farm_id: UUID, user: User) -> dict:
        self._require_financial_report(farm_id, user)
        result = self._missing_documents_payload(farm_id)
        self._audit_report_generate(farm_id, user, "missing_documents")
        return result

    def expenses(self, farm_id: UUID, user: User) -> dict:
        self._require_financial_report(farm_id, user)
        result = {
            "summary": self._expense_summary_payload(farm_id),
            "expenses": self._expenses_payload(farm_id),
            "missing_documents": self._missing_documents_payload(farm_id)["expenses_without_documents"],
        }
        self._audit_report_generate(farm_id, user, "expenses")
        return result

    def sales(self, farm_id: UUID, user: User) -> dict:
        self._require_financial_report(farm_id, user)
        result = {"summary": self._sales_summary_payload(farm_id), "sales": self._sales_payload(farm_id)}
        self._audit_report_generate(farm_id, user, "sales")
        return result

    def annual_summary(self, farm_id: UUID, user: User, year: int | None = None) -> dict:
        self._require_financial_report(farm_id, user)
        selected_year = year or date.today().year
        monthly = [self._monthly_totals(farm_id, selected_year, month) for month in range(1, 13)]
        result = {
            "year": selected_year,
            "annual_revenue": money(sum(Decimal(str(row["sales"])) for row in monthly)),
            "annual_expenses": money(sum(Decimal(str(row["expenses"])) for row in monthly)),
            "annual_net_result": money(sum(Decimal(str(row["net_result"])) for row in monthly)),
            "monthly_trend": monthly,
            "crop_profitability": self._crop_profitability_payload(farm_id),
            "worker_costs": self._worker_wage_payload(farm_id)["totals"],
            "document_completeness": self._document_completeness_payload(farm_id),
        }
        self._audit_report_generate(farm_id, user, "annual_summary", {"year": selected_year})
        return result

    def document_index(self, farm_id: UUID, user: User) -> dict:
        self._require_financial_report(farm_id, user)
        result = {"documents": self._document_references_payload(farm_id)}
        self._audit_report_generate(farm_id, user, "document_index")
        return result

    def audit_summary(self, farm_id: UUID, user: User) -> dict:
        self._require_financial_report(farm_id, user)
        result = self._audit_summary_payload(farm_id)
        self._audit_report_generate(farm_id, user, "audit_summary")
        return result

    def accountant_pack(self, farm_id: UUID, user: User) -> dict:
        self._require_accountant_pack(farm_id, user)
        today = date.today()
        monthly = self.monthly_summary(farm_id, user, today.year, today.month)
        wage_balances = self._worker_wage_payload(farm_id)
        crop_profitability = self._crop_profitability_payload(farm_id)
        missing_documents = self._missing_documents_payload(farm_id)

        export = ReportExport(
            farm_id=farm_id,
            requested_by=user.id,
            report_type="accountant_pack",
            date_range={"month": f"{today.year}-{today.month:02d}"},
            status=ReportExportStatus.READY,
            file_reference=None,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        self.db.add(export)
        self.db.flush()

        data = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "positioning_note": (
                "Dati organizzati per commercialista. Nessun calcolo fiscale, IVA, "
                "INPS, INAIL o payroll ufficiale incluso."
            ),
            "monthly_summary": monthly,
            "expenses": self._expenses_payload(farm_id),
            "sales": self._sales_payload(farm_id),
            "workers": self._workers_payload(farm_id),
            "wage_balances": wage_balances,
            "crop_profitability": crop_profitability,
            "missing_documents": missing_documents,
            "audit_summary": self._audit_summary_payload(farm_id),
            "attached_document_references": self._document_references_payload(farm_id),
            "export": {
                "id": str(export.id),
                "status": export.status,
                "expires_at": export.expires_at.isoformat() if export.expires_at else None,
                "file_reference": None,
                "note": "JSON generato lato server; nessun percorso interno viene esposto.",
            },
        }
        audit_custom_event(
            self.db,
            farm_id,
            user.id,
            "report_export",
            "ReportExport",
            export.id,
            new_value={
                "report_type": export.report_type,
                "date_range": export.date_range,
                "status": export.status,
                "expires_at": export.expires_at,
                "file_reference": None,
            },
        )
        self.db.commit()
        return data

    def _require_financial_report(self, farm_id: UUID, user: User) -> None:
        require_role(self.db, user.id, farm_id, FINANCIAL_REPORT_ROLES)

    def _require_labor_report(self, farm_id: UUID, user: User) -> None:
        require_role(self.db, user.id, farm_id, LABOR_REPORT_ROLES)

    def _require_accountant_pack(self, farm_id: UUID, user: User) -> None:
        require_role(self.db, user.id, farm_id, ACCOUNTANT_PACK_ROLES)

    def _audit_report_generate(
        self,
        farm_id: UUID,
        user: User,
        report_type: str,
        details: dict | None = None,
    ) -> None:
        audit_custom_event(
            self.db,
            farm_id,
            user.id,
            "report_generate",
            "ReportExport",
            None,
            new_value={"report_type": report_type, **(details or {})},
        )
        self.db.commit()

    def _worker_wage_payload(self, farm_id: UUID) -> dict:
        workers = self.db.scalars(
            select(Worker).where(Worker.farm_id == farm_id, Worker.deleted_at.is_(None)).order_by(Worker.last_name)
        ).all()
        items = []
        totals = {
            "total_earned": Decimal("0"),
            "total_advances": Decimal("0"),
            "total_payments": Decimal("0"),
            "remaining_balance": Decimal("0"),
        }
        for worker in workers:
            earned = self.db.scalar(
                select(func.coalesce(func.sum(WorkdayEntry.hours * func.coalesce(WorkdayEntry.hourly_rate, worker.hourly_rate, 0)), 0)).where(
                    WorkdayEntry.farm_id == farm_id,
                    WorkdayEntry.deleted_at.is_(None),
                    WorkdayEntry.worker_id == worker.id,
                )
            )
            advances = self.db.scalar(
                select(func.coalesce(func.sum(WorkerAdvance.amount), 0)).where(
                    WorkerAdvance.farm_id == farm_id,
                    WorkerAdvance.deleted_at.is_(None),
                    WorkerAdvance.worker_id == worker.id,
                )
            )
            payments = self.db.scalar(
                select(func.coalesce(func.sum(WorkerPayment.amount), 0)).where(
                    WorkerPayment.farm_id == farm_id,
                    WorkerPayment.deleted_at.is_(None),
                    WorkerPayment.worker_id == worker.id,
                )
            )
            remaining = Decimal(earned or 0) - Decimal(advances or 0) - Decimal(payments or 0)
            totals["total_earned"] += Decimal(earned or 0)
            totals["total_advances"] += Decimal(advances or 0)
            totals["total_payments"] += Decimal(payments or 0)
            totals["remaining_balance"] += remaining
            items.append(
                {
                    "worker_id": str(worker.id),
                    "worker_name": f"{worker.first_name} {worker.last_name}",
                    "total_earned": money(earned),
                    "total_advances": money(advances),
                    "total_payments": money(payments),
                    "remaining_balance": money(remaining),
                }
            )
        return {"workers": items, "totals": {key: money(value) for key, value in totals.items()}}

    def _crop_profitability_payload(self, farm_id: UUID) -> dict:
        crops = self.db.scalars(
            select(Crop).where(Crop.farm_id == farm_id, Crop.deleted_at.is_(None)).order_by(Crop.name)
        ).all()
        items = []
        for crop in crops:
            expenses = self.db.scalar(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(
                    Expense.farm_id == farm_id,
                    Expense.deleted_at.is_(None),
                    Expense.crop_id == crop.id,
                )
            )
            sales = self.db.scalar(
                select(func.coalesce(func.sum(Sale.amount), 0)).where(
                    Sale.farm_id == farm_id,
                    Sale.deleted_at.is_(None),
                    Sale.crop_id == crop.id,
                )
            )
            labor_cost = self.db.scalar(
                select(
                    func.coalesce(
                        func.sum(
                            WorkdayEntry.hours
                            * func.coalesce(WorkdayEntry.hourly_rate, Worker.hourly_rate, 0)
                        ),
                        0,
                    )
                )
                .join(Worker, Worker.id == WorkdayEntry.worker_id)
                .where(
                    WorkdayEntry.farm_id == farm_id,
                    Worker.farm_id == farm_id,
                    WorkdayEntry.deleted_at.is_(None),
                    Worker.deleted_at.is_(None),
                    WorkdayEntry.crop_id == crop.id,
                )
            )
            estimated_profit = Decimal(sales or 0) - Decimal(expenses or 0) - Decimal(labor_cost or 0)
            items.append(
                {
                    "crop_id": str(crop.id),
                    "crop_name": crop.name,
                    "linked_sales": money(sales),
                    "linked_expenses": money(expenses),
                    "linked_labor_cost": money(labor_cost),
                    "estimated_profit": money(estimated_profit),
                    "cost_per_unit": None,
                    "quantity_tracking": "not_tracked",
                }
            )
        return {"crops": items}

    def _missing_documents_payload(self, farm_id: UUID) -> dict:
        expenses = self.db.scalars(
            select(Expense).where(Expense.farm_id == farm_id, Expense.deleted_at.is_(None)).order_by(Expense.expense_date.desc())
        ).all()
        expense_ids_with_documents = set(
            self.db.scalars(
                select(Document.related_entity_id).where(
                    Document.farm_id == farm_id,
                    Document.deleted_at.is_(None),
                    func.lower(Document.related_entity_type) == "expense",
                    Document.related_entity_id.is_not(None),
                )
            ).all()
        )
        expenses_without_documents = [
            {
                "expense_id": str(expense.id),
                "expense_date": expense.expense_date.isoformat(),
                "category": expense.category,
                "amount": money(expense.amount),
            }
            for expense in expenses
            if expense.id not in expense_ids_with_documents
        ]
        workers_missing_fiscal_code = self.db.scalars(
            select(Worker).where(
                Worker.farm_id == farm_id,
                Worker.deleted_at.is_(None),
                or_(Worker.fiscal_code.is_(None), Worker.fiscal_code == ""),
            )
        ).all()
        open_requests = self.db.scalars(
            select(DocumentRequest).where(
                DocumentRequest.farm_id == farm_id,
                DocumentRequest.deleted_at.is_(None),
                DocumentRequest.status.in_([DocumentStatus.REQUESTED, DocumentStatus.MISSING]),
            )
        ).all()
        sales = self.db.scalars(
            select(Sale).where(Sale.farm_id == farm_id, Sale.deleted_at.is_(None)).order_by(Sale.sale_date.desc())
        ).all()
        result = {
            "expenses_without_documents": expenses_without_documents,
            "sales_without_invoice_number": {
                "items": [],
                "count": 0,
                "tracking": "not_tracked",
                "note": "Lo schema iniziale non include ancora invoice_number sulle vendite.",
                "sale_count_in_scope": len(sales),
            },
            "workers_missing_codice_fiscale": [
                {"worker_id": str(worker.id), "worker_name": f"{worker.first_name} {worker.last_name}"}
                for worker in workers_missing_fiscal_code
            ],
            "open_document_requests": [
                {
                    "id": str(row.id),
                    "title": row.title,
                    "due_date": row.due_date.isoformat() if row.due_date else None,
                    "status": row.status,
                }
                for row in open_requests
            ],
        }
        result["total_count"] = (
            len(result["expenses_without_documents"])
            + result["sales_without_invoice_number"]["count"]
            + len(result["workers_missing_codice_fiscale"])
            + len(result["open_document_requests"])
        )
        return result

    def _expenses_payload(self, farm_id: UUID) -> list[dict]:
        return [
            {
                "id": str(expense.id),
                "date": expense.expense_date.isoformat(),
                "category": expense.category,
                "amount": money(expense.amount),
                "crop_id": str(expense.crop_id) if expense.crop_id else None,
                "supplier_id": str(expense.supplier_id) if expense.supplier_id else None,
                "description": expense.description,
            }
            for expense in self.db.scalars(
                select(Expense).where(Expense.farm_id == farm_id, Expense.deleted_at.is_(None)).order_by(Expense.expense_date.desc())
            ).all()
        ]

    def _sales_payload(self, farm_id: UUID) -> list[dict]:
        return [
            {
                "id": str(sale.id),
                "date": sale.sale_date.isoformat(),
                "amount": money(sale.amount),
                "crop_id": str(sale.crop_id) if sale.crop_id else None,
                "customer_id": str(sale.customer_id) if sale.customer_id else None,
                "description": sale.description,
                "invoice_number": None,
                "invoice_tracking": "not_tracked",
            }
            for sale in self.db.scalars(
                select(Sale).where(Sale.farm_id == farm_id, Sale.deleted_at.is_(None)).order_by(Sale.sale_date.desc())
            ).all()
        ]

    def _workers_payload(self, farm_id: UUID) -> list[dict]:
        return [
            {
                "id": str(worker.id),
                "name": f"{worker.first_name} {worker.last_name}",
                "codice_fiscale_present": bool(worker.fiscal_code),
                "contract_type": worker.contract_type,
            }
            for worker in self.db.scalars(
                select(Worker).where(Worker.farm_id == farm_id, Worker.deleted_at.is_(None)).order_by(Worker.last_name)
            ).all()
        ]

    def _audit_summary_payload(self, farm_id: UUID) -> dict:
        rows = self.db.execute(
            select(AuditLog.action, AuditLog.entity_type, func.count(AuditLog.id))
            .where(AuditLog.farm_id == farm_id)
            .group_by(AuditLog.action, AuditLog.entity_type)
            .order_by(AuditLog.action, AuditLog.entity_type)
        ).all()
        latest = self.db.scalars(
            select(AuditLog).where(AuditLog.farm_id == farm_id).order_by(AuditLog.created_at.desc()).limit(20)
        ).all()
        return {
            "counts": [
                {"action": action, "entity_type": entity_type, "count": count}
                for action, entity_type, count in rows
            ],
            "latest": [
                {
                    "id": str(row.id),
                    "action": row.action,
                    "entity_type": row.entity_type,
                    "entity_id": str(row.entity_id) if row.entity_id else None,
                    "created_at": row.created_at.isoformat(),
                }
                for row in latest
            ],
        }

    def _document_references_payload(self, farm_id: UUID) -> list[dict]:
        documents = self.db.scalars(
            select(Document).where(Document.farm_id == farm_id, Document.deleted_at.is_(None)).order_by(Document.uploaded_at.desc())
        ).all()
        return [
            {
                "id": str(document.id),
                "title": document.title,
                "document_type": document.document_type,
                "related_entity_type": document.related_entity_type,
                "related_entity_id": str(document.related_entity_id) if document.related_entity_id else None,
                "mime_type": document.mime_type,
                "size_bytes": document.size_bytes,
                "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
            }
            for document in documents
        ]

    def farm_profile(self, farm_id: UUID) -> dict:
        farm = self.db.get(Farm, farm_id)
        if not farm:
            return {}
        return {
            "id": str(farm.id),
            "name": farm.name,
            "legal_name": farm.legal_name,
            "partita_iva": farm.partita_iva,
            "codice_fiscale": farm.codice_fiscale,
            "city": farm.city,
            "province": farm.province,
            "region": farm.region,
            "fiscal_profile": farm.fiscal_profile,
        }

    def _monthly_totals(self, farm_id: UUID, year: int, month: int) -> dict:
        start, end = _month_range(year, month)
        expenses = self.db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.farm_id == farm_id,
                Expense.deleted_at.is_(None),
                Expense.expense_date >= start,
                Expense.expense_date < end,
            )
        )
        sales = self.db.scalar(
            select(func.coalesce(func.sum(Sale.amount), 0)).where(
                Sale.farm_id == farm_id,
                Sale.deleted_at.is_(None),
                Sale.sale_date >= start,
                Sale.sale_date < end,
            )
        )
        return {
            "month": f"{year}-{month:02d}",
            "sales": money(sales),
            "expenses": money(expenses),
            "net_result": money(Decimal(sales or 0) - Decimal(expenses or 0)),
        }

    def _expense_summary_payload(self, farm_id: UUID) -> dict:
        expenses = self._expenses_payload(farm_id)
        by_category: dict[str, Decimal] = {}
        by_supplier: dict[str, Decimal] = {}
        supplier_names = {
            str(row.id): row.name
            for row in self.db.scalars(select(Supplier).where(Supplier.farm_id == farm_id)).all()
        }
        for expense in expenses:
            amount = Decimal(str(expense["amount"]))
            by_category[expense["category"]] = by_category.get(expense["category"], Decimal("0")) + amount
            supplier = supplier_names.get(str(expense.get("supplier_id")), "Non indicato")
            by_supplier[supplier] = by_supplier.get(supplier, Decimal("0")) + amount
        return {
            "total_expenses": money(sum(Decimal(str(row["amount"])) for row in expenses)),
            "count": len(expenses),
            "by_category": [{"label": key, "amount": money(value)} for key, value in by_category.items()],
            "by_supplier": [{"label": key, "amount": money(value)} for key, value in by_supplier.items()],
        }

    def _sales_summary_payload(self, farm_id: UUID) -> dict:
        sales = self._sales_payload(farm_id)
        customer_names = {
            str(row.id): row.name
            for row in self.db.scalars(select(Customer).where(Customer.farm_id == farm_id)).all()
        }
        by_customer: dict[str, Decimal] = {}
        for sale in sales:
            customer = customer_names.get(str(sale.get("customer_id")), "Non indicato")
            by_customer[customer] = by_customer.get(customer, Decimal("0")) + Decimal(str(sale["amount"]))
        return {
            "total_sales": money(sum(Decimal(str(row["amount"])) for row in sales)),
            "count": len(sales),
            "paid_sales": {"amount": 0, "tracking": "not_tracked"},
            "unpaid_sales": {"amount": 0, "tracking": "not_tracked"},
            "by_customer": [{"label": key, "amount": money(value)} for key, value in by_customer.items()],
        }

    def _document_completeness_payload(self, farm_id: UUID) -> dict:
        missing = self._missing_documents_payload(farm_id)
        documents_count = self.db.scalar(
            select(func.count(Document.id)).where(Document.farm_id == farm_id, Document.deleted_at.is_(None))
        )
        total_items = int(documents_count or 0) + int(missing["total_count"] or 0)
        completeness = 100 if total_items == 0 else round((int(documents_count or 0) / total_items) * 100, 1)
        return {
            "documents_present": int(documents_count or 0),
            "missing_items": missing["total_count"],
            "completeness_rate": completeness,
        }
