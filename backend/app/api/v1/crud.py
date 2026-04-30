from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbDep
from app.models import (
    Crop,
    Customer,
    Document,
    DocumentRequest,
    Expense,
    Field,
    ReportExport,
    Sale,
    Supplier,
    Workday,
    WorkdayEntry,
    Worker,
    WorkerAdvance,
    WorkerPayment,
)
from app.schemas.domain import (
    CropIn,
    CropOut,
    DocumentIn,
    DocumentOut,
    DocumentRequestIn,
    DocumentRequestOut,
    ExpenseIn,
    ExpenseOut,
    FieldIn,
    FieldOut,
    PartyIn,
    PartyOut,
    SaleIn,
    SaleOut,
    WorkdayEntryIn,
    WorkdayEntryOut,
    WorkdayIn,
    WorkdayOut,
    WorkerIn,
    WorkerOut,
    WorkerAdvanceIn,
    WorkerAdvanceOut,
    WorkerPaymentIn,
    WorkerPaymentOut,
    ReportExportIn,
    ReportExportOut,
)
from app.services.crud import FarmCrudService

router = APIRouter(prefix="/farms/{farm_id}", tags=["farm data"])

RESOURCES = [
    ("workers", Worker, WorkerIn, WorkerOut),
    ("fields", Field, FieldIn, FieldOut),
    ("crops", Crop, CropIn, CropOut),
    ("workdays", Workday, WorkdayIn, WorkdayOut),
    ("workday-entries", WorkdayEntry, WorkdayEntryIn, WorkdayEntryOut),
    ("worker-advances", WorkerAdvance, WorkerAdvanceIn, WorkerAdvanceOut),
    ("worker-payments", WorkerPayment, WorkerPaymentIn, WorkerPaymentOut),
    ("expenses", Expense, ExpenseIn, ExpenseOut),
    ("sales", Sale, SaleIn, SaleOut),
    ("suppliers", Supplier, PartyIn, PartyOut),
    ("customers", Customer, PartyIn, PartyOut),
    ("documents", Document, DocumentIn, DocumentOut),
    ("document-requests", DocumentRequest, DocumentRequestIn, DocumentRequestOut),
    ("report-exports", ReportExport, ReportExportIn, ReportExportOut),
]


def register_resource(path: str, model: type, input_schema: type, output_schema: type) -> None:
    @router.get(f"/{path}", response_model=list[output_schema], name=f"list_{path}")
    def list_items(farm_id: UUID, db: DbDep, current_user: CurrentUser):
        return FarmCrudService(db, model).list(farm_id, current_user)

    @router.post(f"/{path}", response_model=output_schema, name=f"create_{path}")
    def create_item(farm_id: UUID, payload: input_schema, db: DbDep, current_user: CurrentUser):
        return FarmCrudService(db, model).create(farm_id, current_user, payload.model_dump())

    @router.put(f"/{path}/{{object_id}}", response_model=output_schema, name=f"update_{path}")
    def update_item(
        farm_id: UUID, object_id: UUID, payload: input_schema, db: DbDep, current_user: CurrentUser
    ):
        return FarmCrudService(db, model).update(
            farm_id, object_id, current_user, payload.model_dump()
        )

    @router.delete(f"/{path}/{{object_id}}", status_code=204, name=f"delete_{path}")
    def delete_item(farm_id: UUID, object_id: UUID, db: DbDep, current_user: CurrentUser):
        FarmCrudService(db, model).delete(farm_id, object_id, current_user)


for resource in RESOURCES:
    register_resource(*resource)
