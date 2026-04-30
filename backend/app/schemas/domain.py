from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field  # type: ignore[import]

from app.models.enums import DocumentStatus, ReportExportStatus


class ApiModel(BaseModel):
    model_config = {"from_attributes": True}


class WorkerIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    fiscal_code: str | None = Field(default=None, max_length=32)
    contract_type: str | None = Field(default=None, max_length=120)
    hourly_rate: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=4000)


class WorkerOut(WorkerIn, ApiModel):
    id: UUID


class WorkerUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=120)
    last_name: str | None = Field(default=None, min_length=1, max_length=120)
    fiscal_code: str | None = Field(default=None, max_length=32)
    contract_type: str | None = Field(default=None, max_length=120)
    hourly_rate: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    notes: str | None = Field(default=None, max_length=4000)


class FieldIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    cadastral_reference: str | None = Field(default=None, max_length=160)
    area_hectares: Decimal | None = Field(default=None, ge=0, decimal_places=4)


class FieldOut(FieldIn, ApiModel):
    id: UUID


class FieldUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    cadastral_reference: str | None = Field(default=None, max_length=160)
    area_hectares: Decimal | None = Field(default=None, ge=0, decimal_places=4)


class CropIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    season: str | None = Field(default=None, max_length=80)
    field_id: UUID | None = None


class CropOut(CropIn, ApiModel):
    id: UUID


class CropUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    season: str | None = Field(default=None, max_length=80)
    field_id: UUID | None = None


class WorkdayIn(BaseModel):
    work_date: date
    description: str | None = Field(default=None, max_length=4000)


class WorkdayOut(WorkdayIn, ApiModel):
    id: UUID
    is_closed: bool = False


class WorkdayUpdate(BaseModel):
    work_date: date | None = None
    description: str | None = Field(default=None, max_length=4000)
    is_closed: bool | None = None


class WorkdayEntryIn(BaseModel):
    workday_id: UUID
    worker_id: UUID
    crop_id: UUID | None = None
    hours: Decimal = Field(gt=0, le=24, decimal_places=2)
    hourly_rate: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    activity: str | None = Field(default=None, max_length=180)


class WorkdayEntryOut(WorkdayEntryIn, ApiModel):
    id: UUID


class WorkerPaymentIn(BaseModel):
    worker_id: UUID
    payment_date: date
    amount: Decimal = Field(gt=0, decimal_places=2)
    note: str | None = Field(default=None, max_length=4000)


class WorkerPaymentOut(WorkerPaymentIn, ApiModel):
    id: UUID


class WorkerAdvanceIn(BaseModel):
    worker_id: UUID
    advance_date: date
    amount: Decimal = Field(gt=0, decimal_places=2)
    note: str | None = Field(default=None, max_length=4000)


class WorkerAdvanceOut(WorkerAdvanceIn, ApiModel):
    id: UUID


class ExpenseIn(BaseModel):
    expense_date: date
    supplier_id: UUID | None = None
    crop_id: UUID | None = None
    category: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: str | None = Field(default=None, max_length=4000)


class ExpenseOut(ExpenseIn, ApiModel):
    id: UUID


class ExpenseUpdate(BaseModel):
    expense_date: date | None = None
    supplier_id: UUID | None = None
    crop_id: UUID | None = None
    category: str | None = Field(default=None, min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    description: str | None = Field(default=None, max_length=4000)


class SaleIn(BaseModel):
    sale_date: date
    customer_id: UUID | None = None
    crop_id: UUID | None = None
    amount: Decimal = Field(gt=0, decimal_places=2)
    description: str | None = Field(default=None, max_length=4000)


class SaleOut(SaleIn, ApiModel):
    id: UUID


class SaleUpdate(BaseModel):
    sale_date: date | None = None
    customer_id: UUID | None = None
    crop_id: UUID | None = None
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    description: str | None = Field(default=None, max_length=4000)


class PartyIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    vat_number: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None


class PartyOut(PartyIn, ApiModel):
    id: UUID


class DocumentIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    document_type: str = Field(min_length=1, max_length=120)
    status: DocumentStatus = DocumentStatus.RECEIVED
    related_entity_type: str | None = Field(default=None, max_length=80)
    related_entity_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=4000)


class DocumentOut(DocumentIn, ApiModel):
    id: UUID
    original_file_name: str | None = None
    stored_file_name: str | None = None
    mime_type: str | None = None
    size_bytes: int | None = None
    uploaded_by: UUID | None = None
    uploaded_at: datetime | None = None


class DocumentRequestIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    requested_from: str | None = Field(default=None, max_length=255)
    due_date: date | None = None
    status: DocumentStatus = DocumentStatus.REQUESTED


class DocumentRequestOut(DocumentRequestIn, ApiModel):
    id: UUID


class DocumentRequestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    requested_from: str | None = Field(default=None, max_length=255)
    due_date: date | None = None
    status: DocumentStatus | None = None


class ReportOut(BaseModel):
    farm_id: UUID
    report: str
    data: dict[str, Any]


class ReportExportIn(BaseModel):
    report_type: str = Field(min_length=1, max_length=120)
    date_range: dict[str, Any] = Field(default_factory=dict)
    period_start: date | None = None
    period_end: date | None = None
    status: ReportExportStatus = ReportExportStatus.REQUESTED
    checksum: str | None = Field(default=None, max_length=128)
    qr_payload: dict[str, Any] | None = None
    file_reference: str | None = Field(default=None, max_length=500)
    expires_at: datetime | None = None


class ReportExportOut(ReportExportIn, ApiModel):
    id: UUID
    requested_by: UUID
    created_at: datetime
