from uuid import UUID

from fastapi import APIRouter
from fastapi.responses import Response

from app.api.deps import CurrentUser, DbDep
from app.schemas.domain import ReportOut
from app.reports.report_exporter import REPORT_DEFINITIONS, ReportExporter
from app.reports.pdf_renderer import html_to_pdf_bytes
from app.reports.services import ReportService

router = APIRouter(prefix="/farms/{farm_id}/reports", tags=["reports"])


@router.get("/monthly", response_model=ReportOut)
def monthly_summary(farm_id: UUID, year: int, month: int, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "monthly_summary", "data": ReportService(db).monthly_summary(farm_id, current_user, year, month)}


@router.get("/workers", response_model=ReportOut)
def worker_wage_summary(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "worker_wage_summary", "data": ReportService(db).worker_wage_summary(farm_id, current_user)}


@router.get("/crops", response_model=ReportOut)
def crop_profitability(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "crop_profitability", "data": ReportService(db).crop_profitability(farm_id, current_user)}


@router.get("/missing-documents", response_model=ReportOut)
def missing_documents(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "missing_documents", "data": ReportService(db).missing_documents(farm_id, current_user)}


@router.get("/accountant-pack", response_model=ReportOut)
def accountant_pack(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "accountant_pack", "data": ReportService(db).accountant_pack(farm_id, current_user)}


@router.get("/expenses", response_model=ReportOut)
def expenses_report(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "expenses", "data": ReportService(db).expenses(farm_id, current_user)}


@router.get("/sales", response_model=ReportOut)
def sales_report(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "sales", "data": ReportService(db).sales(farm_id, current_user)}


@router.get("/annual", response_model=ReportOut)
def annual_report(farm_id: UUID, db: DbDep, current_user: CurrentUser, year: int | None = None):
    return {"farm_id": farm_id, "report": "annual", "data": ReportService(db).annual_summary(farm_id, current_user, year)}


@router.get("/document-index", response_model=ReportOut)
def document_index_report(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "document_index", "data": ReportService(db).document_index(farm_id, current_user)}


@router.get("/audit-summary", response_model=ReportOut)
def audit_summary_report(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    return {"farm_id": farm_id, "report": "audit_summary", "data": ReportService(db).audit_summary(farm_id, current_user)}


@router.get("/{report_type}/pdf")
def report_pdf(
    farm_id: UUID,
    report_type: str,
    db: DbDep,
    current_user: CurrentUser,
    year: int | None = None,
    month: int | None = None,
):
    if report_type not in REPORT_DEFINITIONS:
        return Response("Report non supportato", status_code=404, media_type="text/plain")
    html, export = ReportExporter(db).export_html(report_type, farm_id, current_user, year, month)
    title = REPORT_DEFINITIONS[report_type]["title"]
    pdf = html_to_pdf_bytes(html, title=title, report_id=str(export.id))
    filename = f"agriconto-{report_type}-{export.id}.pdf"
    return Response(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Report-Id": str(export.id),
            "X-Report-Checksum": export.checksum or "",
        },
    )
