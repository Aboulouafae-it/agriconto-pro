from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.audit import audit_custom_event
from app.models import ReportExport
from app.models.enums import FarmRole, ReportExportStatus
from app.models.user import User
from app.reports.components.formatting import date_it, h, money
from app.reports.components.html import (
    Column,
    checklist,
    cover,
    data_table,
    disclaimer,
    document,
    kpi_grid,
    metadata_block,
    page_header,
)
from app.reports.components.qr import checksum, qr_payload, verification_svg
from app.reports.services import ReportService


REPORT_DEFINITIONS: dict[str, dict] = {
    "monthly": {
        "title": "Report Gestionale Mensile",
        "subtitle": "Sintesi amministrativa mensile di ricavi, costi, saldi, documenti e indicatori gestionali.",
        "roles": "OWNER, ACCOUNTANT",
    },
    "workers": {
        "title": "Report Lavoratori e Compensi",
        "subtitle": "Riepilogo gestionale di giornate, compensi maturati, anticipi, pagamenti e saldi residui.",
        "roles": "OWNER, LABOR_CONSULTANT",
    },
    "crops": {
        "title": "Report Redditività Colture",
        "subtitle": "Analisi gestionale del margine stimato per coltura, stagione e costi collegati.",
        "roles": "OWNER, ACCOUNTANT",
    },
    "expenses": {
        "title": "Report Spese",
        "subtitle": "Elenco amministrativo delle spese con categorie, fornitori, importi e documentazione.",
        "roles": "OWNER, ACCOUNTANT",
    },
    "sales": {
        "title": "Report Vendite e Incassi",
        "subtitle": "Riepilogo vendite, clienti, riferimenti fattura e stato incassi gestionale.",
        "roles": "OWNER, ACCOUNTANT",
    },
    "missing-documents": {
        "title": "Report Documenti Mancanti",
        "subtitle": "Elenco operativo delle informazioni e dei documenti da completare per la revisione.",
        "roles": "OWNER, ACCOUNTANT",
    },
    "accountant-pack": {
        "title": "Pacchetto Commercialista",
        "subtitle": "Pacchetto premium con riepiloghi, movimenti, documenti, audit e checklist finale.",
        "roles": "OWNER, ACCOUNTANT",
        "flagship": True,
    },
    "annual": {
        "title": "Riepilogo Annuale Azienda Agricola",
        "subtitle": "Vista gestionale annuale per analisi interna e confronto con professionisti abilitati.",
        "roles": "OWNER, ACCOUNTANT",
    },
    "document-index": {
        "title": "Indice Documenti",
        "subtitle": "Indice archivistico dei documenti caricati e dei riferimenti collegati.",
        "roles": "OWNER, ACCOUNTANT",
    },
    "audit-summary": {
        "title": "Riepilogo Log di Audit",
        "subtitle": "Sintesi tecnica e leggibile degli eventi rilevanti e delle esportazioni.",
        "roles": "OWNER, ACCOUNTANT",
    },
}


class ReportExporter:
    def __init__(self, db: Session):
        self.db = db
        self.reports = ReportService(db)

    def payload(self, report_type: str, farm_id: UUID, user: User, year: int | None, month: int | None) -> dict:
        if report_type == "monthly":
            today = date.today()
            return self.reports.monthly_summary(farm_id, user, year or today.year, month or today.month)
        if report_type == "workers":
            return self.reports.worker_wage_summary(farm_id, user)
        if report_type == "crops":
            return self.reports.crop_profitability(farm_id, user)
        if report_type == "expenses":
            return self.reports.expenses(farm_id, user)
        if report_type == "sales":
            return self.reports.sales(farm_id, user)
        if report_type == "missing-documents":
            return self.reports.missing_documents(farm_id, user)
        if report_type == "accountant-pack":
            return self.reports.accountant_pack(farm_id, user)
        if report_type == "annual":
            return self.reports.annual_summary(farm_id, user, year)
        if report_type == "document-index":
            return self.reports.document_index(farm_id, user)
        if report_type == "audit-summary":
            return self.reports.audit_summary(farm_id, user)
        raise ValueError("Report non supportato")

    def export_html(
        self,
        report_type: str,
        farm_id: UUID,
        user: User,
        year: int | None = None,
        month: int | None = None,
    ) -> tuple[str, ReportExport]:
        data = self.payload(report_type, farm_id, user, year, month)
        farm = self.reports.farm_profile(farm_id)
        now = datetime.now(timezone.utc)
        period = _period_label(report_type, year, month, data)
        digest = checksum({"report_type": report_type, "farm_id": str(farm_id), "generated_at": now, "data": data})
        export = ReportExport(
            farm_id=farm_id,
            requested_by=user.id,
            report_type=report_type,
            date_range={"period": period, "year": year, "month": month},
            period_start=_period_start(year, month),
            period_end=_period_end(year, month),
            status=ReportExportStatus.READY,
            checksum=digest,
            qr_payload=qr_payload_placeholder(farm_id, now, digest),
            file_reference=None,
            expires_at=now + timedelta(days=14),
        )
        self.db.add(export)
        self.db.flush()
        export.qr_payload = qr_payload(export.id, farm_id, now, digest)

        html = self._render(report_type, farm, user, data, export, period, now)
        audit_custom_event(
            self.db,
            farm_id,
            user.id,
            "report_export",
            "ReportExport",
            export.id,
            new_value={
                "report_type": report_type,
                "status": export.status,
                "checksum": digest[:24],
                "period": period,
                "file_reference": None,
            },
        )
        self.db.commit()
        return html, export

    def _render(
        self,
        report_type: str,
        farm: dict,
        user: User,
        data: dict,
        export: ReportExport,
        period: str,
        generated_at: datetime,
    ) -> str:
        definition = REPORT_DEFINITIONS[report_type]
        title = definition["title"]
        farm_name = farm.get("name") or "Azienda agricola"
        cover_html = cover(
            title=title,
            subtitle=definition["subtitle"],
            farm_name=farm_name,
            period=period,
            report_id=str(export.id),
            generated_at=date_it(generated_at),
            generated_by=user.full_name,
            qr_svg=verification_svg(export.checksum or ""),
            checksum=export.checksum or "",
            status="Generato",
        )
        header = page_header(title, farm_name, period, str(export.id), date_it(generated_at))
        content = self._sections(report_type, farm, data)
        body = f"{cover_html}<main class=\"sheet\">{header}{self._metadata(definition, farm, user, export, period)}{content}{disclaimer()}</main>"
        return document(title, body)

    def _metadata(self, definition: dict, farm: dict, user: User, export: ReportExport, period: str) -> str:
        return (
            "<h2>Dati report</h2>"
            + metadata_block(
                [
                    ("Tipo report", definition["title"]),
                    ("Azienda", farm.get("legal_name") or farm.get("name") or "-"),
                    ("Periodo", period),
                    ("Profilo fiscale", farm.get("fiscal_profile") or "-"),
                    ("Generato da", user.full_name),
                    ("Stato", "Generato"),
                    ("Ruoli autorizzati", definition["roles"]),
                    ("Checksum", (export.checksum or "")[:24]),
                ]
            )
        )

    def _sections(self, report_type: str, farm: dict, data: dict) -> str:
        if report_type == "monthly":
            return _monthly_sections(data)
        if report_type == "workers":
            return _workers_sections(data)
        if report_type == "crops":
            return _crops_sections(data)
        if report_type == "expenses":
            return _expenses_sections(data)
        if report_type == "sales":
            return _sales_sections(data)
        if report_type == "missing-documents":
            return _missing_sections(data)
        if report_type == "accountant-pack":
            return _accountant_pack_sections(data)
        if report_type == "annual":
            return _annual_sections(data)
        if report_type == "document-index":
            return _document_index_sections(data)
        if report_type == "audit-summary":
            return _audit_sections(data)
        return "<p>Report non disponibile.</p>"


def qr_payload_placeholder(farm_id: UUID, generated_at: datetime, digest: str) -> dict[str, str]:
    return {"report_id": "pending", "farm_id": str(farm_id), "generated_at": generated_at.isoformat(), "checksum": digest[:24]}


def _period_label(report_type: str, year: int | None, month: int | None, data: dict) -> str:
    if report_type == "monthly":
        if year and month:
            return f"{month:02d}/{year}"
        return str(data.get("period", "Mese corrente"))
    if report_type == "annual":
        return str(year or data.get("year") or date.today().year)
    return "Periodo corrente"


def _period_start(year: int | None, month: int | None) -> date | None:
    if year and month:
        return date(year, month, 1)
    if year:
        return date(year, 1, 1)
    return None


def _period_end(year: int | None, month: int | None) -> date | None:
    if year and month:
        next_month = date(year + int(month == 12), 1 if month == 12 else month + 1, 1)
        return next_month - timedelta(days=1)
    if year:
        return date(year, 12, 31)
    return None


def _monthly_sections(data: dict) -> str:
    return (
        "<h2>Sintesi del mese</h2>"
        + kpi_grid(
            [
                ("Ricavi", data.get("total_sales"), "money"),
                ("Spese", data.get("total_expenses"), "money"),
                ("Risultato netto", data.get("net_result"), "money"),
                ("Documenti mancanti", data.get("missing_documents_count"), "number"),
            ]
        )
        + "<h2>Saldi e avvisi</h2>"
        + data_table(
            [Column("label", "Voce"), Column("value", "Valore", "money"), Column("note", "Nota")],
            [
                {"label": "Vendite non incassate", "value": data.get("unpaid_sales", {}).get("amount"), "note": data.get("unpaid_sales", {}).get("note")},
                {"label": "Spese non pagate", "value": data.get("unpaid_expenses", {}).get("amount"), "note": data.get("unpaid_expenses", {}).get("note")},
                {"label": "Saldi lavoratori aperti", "value": data.get("unpaid_worker_balances"), "note": "Dato gestionale da verificare"},
            ],
        )
    )


def _workers_sections(data: dict) -> str:
    totals = data.get("totals", {})
    return (
        "<h2>Sintesi lavoratori</h2>"
        + kpi_grid(
            [
                ("Compensi maturati", totals.get("total_earned"), "money"),
                ("Anticipi", totals.get("total_advances"), "money"),
                ("Pagamenti", totals.get("total_payments"), "money"),
                ("Saldo residuo", totals.get("remaining_balance"), "money"),
            ]
        )
        + "<h2>Compensi e saldi</h2>"
        + data_table(
            [
                Column("worker_name", "Lavoratore"),
                Column("total_earned", "Maturato", "money"),
                Column("total_advances", "Anticipi", "money"),
                Column("total_payments", "Pagamenti", "money"),
                Column("remaining_balance", "Saldo", "money"),
            ],
            data.get("workers", []),
        )
        + "<div class=\"disclaimer\">Questo documento non e una busta paga e non sostituisce gli adempimenti del consulente del lavoro.</div>"
    )


def _crops_sections(data: dict) -> str:
    return "<h2>Sintesi colture</h2>" + data_table(
        [
            Column("crop_name", "Coltura"),
            Column("linked_sales", "Ricavi", "money"),
            Column("linked_expenses", "Spese", "money"),
            Column("linked_labor_cost", "Costo lavoro", "money"),
            Column("estimated_profit", "Margine stimato", "money"),
        ],
        data.get("crops", []),
    )


def _expenses_sections(data: dict) -> str:
    summary = data.get("summary", {})
    return (
        "<h2>Sintesi spese</h2>"
        + kpi_grid([("Totale spese", summary.get("total_expenses"), "money"), ("Movimenti", summary.get("count"), "number")])
        + "<h2>Spese per categoria</h2>"
        + data_table([Column("label", "Categoria"), Column("amount", "Importo", "money")], summary.get("by_category", []))
        + "<h2>Dettaglio movimenti</h2>"
        + data_table(
            [
                Column("date", "Data", "date"),
                Column("category", "Categoria"),
                Column("description", "Descrizione"),
                Column("amount", "Importo", "money"),
            ],
            data.get("expenses", []),
        )
    )


def _sales_sections(data: dict) -> str:
    summary = data.get("summary", {})
    return (
        "<h2>Sintesi vendite</h2>"
        + kpi_grid([("Totale vendite", summary.get("total_sales"), "money"), ("Movimenti", summary.get("count"), "number")])
        + "<h2>Vendite per cliente</h2>"
        + data_table([Column("label", "Cliente"), Column("amount", "Importo", "money")], summary.get("by_customer", []))
        + "<h2>Dettaglio movimenti</h2>"
        + data_table(
            [
                Column("date", "Data", "date"),
                Column("description", "Descrizione"),
                Column("amount", "Importo", "money"),
                Column("invoice_number", "Fattura"),
            ],
            data.get("sales", []),
        )
    )


def _missing_sections(data: dict) -> str:
    return (
        "<h2>Sintesi criticità</h2>"
        + kpi_grid([("Elementi mancanti", data.get("total_count"), "number")])
        + "<h2>Spese senza documento</h2>"
        + data_table(
            [Column("expense_date", "Data", "date"), Column("category", "Categoria"), Column("amount", "Importo", "money")],
            data.get("expenses_without_documents", []),
        )
        + "<h2>Dati lavoratori incompleti</h2>"
        + data_table([Column("worker_name", "Lavoratore"), Column("priority", "Priorità", "badge")], [_with_priority(row) for row in data.get("workers_missing_codice_fiscale", [])])
        + "<h2>Richieste documenti aperte</h2>"
        + data_table([Column("title", "Richiesta"), Column("due_date", "Scadenza", "date"), Column("status", "Stato", "badge")], data.get("open_document_requests", []))
    )


def _accountant_pack_sections(data: dict) -> str:
    return (
        "<h2>Indice</h2>"
        + "<div class=\"toc\"><div><span>Ricavi e vendite</span><span>Sezione 1</span></div><div><span>Spese e costi</span><span>Sezione 2</span></div><div><span>Lavoratori</span><span>Sezione 3</span></div><div><span>Documenti e audit</span><span>Sezione 4</span></div></div>"
        + "<h2>Sintesi esecutiva</h2>"
        + _monthly_sections(data.get("monthly_summary", {}))
        + "<h2>Spese e costi</h2>"
        + data_table([Column("date", "Data", "date"), Column("category", "Categoria"), Column("description", "Descrizione"), Column("amount", "Importo", "money")], data.get("expenses", []))
        + "<h2>Ricavi e vendite</h2>"
        + data_table([Column("date", "Data", "date"), Column("description", "Descrizione"), Column("amount", "Importo", "money")], data.get("sales", []))
        + "<h2>Lavoratori e saldi</h2>"
        + _workers_sections(data.get("wage_balances", {}))
        + "<h2>Colture e redditività</h2>"
        + _crops_sections(data.get("crop_profitability", {}))
        + "<h2>Documenti allegati</h2>"
        + _document_index_sections({"documents": data.get("attached_document_references", [])})
        + "<h2>Checklist finale</h2>"
        + checklist([
            "Tutte le spese hanno documento?",
            "Tutte le vendite hanno riferimento fattura?",
            "I dati dei lavoratori sono completi?",
            "Ci sono saldi lavoratori aperti?",
            "Ci sono incassi non ricevuti?",
            "Ci sono note da verificare?",
        ])
    )


def _annual_sections(data: dict) -> str:
    return (
        "<h2>Sintesi annuale</h2>"
        + kpi_grid(
            [
                ("Ricavi annuali", data.get("annual_revenue"), "money"),
                ("Spese annuali", data.get("annual_expenses"), "money"),
                ("Risultato annuale", data.get("annual_net_result"), "money"),
            ]
        )
        + "<h2>Andamento mensile</h2>"
        + data_table([Column("month", "Mese"), Column("sales", "Ricavi", "money"), Column("expenses", "Spese", "money"), Column("net_result", "Risultato", "money")], data.get("monthly_trend", []))
    )


def _document_index_sections(data: dict) -> str:
    return data_table(
        [
            Column("uploaded_at", "Caricato il", "date"),
            Column("title", "Titolo"),
            Column("document_type", "Tipo"),
            Column("related_entity_type", "Collegamento"),
            Column("mime_type", "Formato"),
        ],
        data.get("documents", []),
    )


def _audit_sections(data: dict) -> str:
    return (
        "<h2>Conteggi eventi</h2>"
        + data_table([Column("action", "Azione"), Column("entity_type", "Entità"), Column("count", "Conteggio")], data.get("counts", []))
        + "<h2>Eventi recenti</h2>"
        + data_table([Column("created_at", "Data", "date"), Column("action", "Azione"), Column("entity_type", "Entità"), Column("entity_id", "Riferimento")], data.get("latest", []))
    )


def _with_priority(row: dict) -> dict:
    return {**row, "priority": "Media"}

