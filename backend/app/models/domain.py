from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID as PyUUID

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import DocumentStatus, ReportExportStatus
from app.models.mixins import FarmScopedMixin, IdMixin, SoftDeleteMixin, TimestampMixin


class Worker(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "workers"
    __table_args__ = (
        CheckConstraint("hourly_rate IS NULL OR hourly_rate >= 0", name="hourly_rate_non_negative"),
    )

    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    fiscal_code: Mapped[str | None] = mapped_column(String(32))
    contract_type: Mapped[str | None] = mapped_column(String(120))
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    notes: Mapped[str | None] = mapped_column(Text)


class Field(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "fields"
    __table_args__ = (
        CheckConstraint(
            "area_hectares IS NULL OR area_hectares >= 0", name="area_non_negative"
        ),
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    cadastral_reference: Mapped[str | None] = mapped_column(String(160))
    area_hectares: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))


class Crop(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "crops"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    season: Mapped[str | None] = mapped_column(String(80))
    field_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("fields.id"))


class Workday(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "workdays"

    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_closed: Mapped[bool] = mapped_column(default=False, nullable=False)


class WorkdayEntry(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "workday_entries"
    __table_args__ = (
        CheckConstraint("hours > 0 AND hours <= 24", name="hours_range"),
        CheckConstraint("hourly_rate IS NULL OR hourly_rate >= 0", name="rate_non_negative"),
    )

    workday_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workdays.id", ondelete="CASCADE"))
    worker_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workers.id"))
    crop_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("crops.id"))
    hours: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    activity: Mapped[str | None] = mapped_column(String(180))


class WorkerAdvance(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "worker_advances"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)

    worker_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workers.id"))
    advance_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)


class WorkerPayment(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "worker_payments"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)

    worker_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workers.id"))
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)


class Expense(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "expenses"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)

    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    supplier_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"))
    crop_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("crops.id"))
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class Sale(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "sales"
    __table_args__ = (CheckConstraint("amount > 0", name="amount_positive"),)

    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
    customer_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    crop_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("crops.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class Supplier(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "suppliers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vat_number: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))


class Customer(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vat_number: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))


class Document(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "documents"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(120), nullable=False)
    original_file_name: Mapped[str | None] = mapped_column(String(255))
    stored_file_name: Mapped[str | None] = mapped_column(String(255))
    storage_key: Mapped[str | None] = mapped_column(String(500))
    mime_type: Mapped[str | None] = mapped_column(String(120))
    size_bytes: Mapped[int | None] = mapped_column()
    uploaded_by: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.RECEIVED)
    related_entity_type: Mapped[str | None] = mapped_column(String(80))
    related_entity_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True))
    notes: Mapped[str | None] = mapped_column(Text)


class DocumentRequest(IdMixin, TimestampMixin, SoftDeleteMixin, FarmScopedMixin, Base):
    __tablename__ = "document_requests"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_from: Mapped[str | None] = mapped_column(String(255))
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.REQUESTED)


class AuditLog(IdMixin, Base):
    __tablename__ = "audit_logs"

    farm_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True))
    old_value: Mapped[dict | None] = mapped_column(JSONB)
    new_value: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


class ReportExport(IdMixin, Base):
    __tablename__ = "report_exports"

    farm_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), index=True)
    requested_by: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    report_type: Mapped[str] = mapped_column(String(120), nullable=False)
    date_range: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    status: Mapped[ReportExportStatus] = mapped_column(Enum(ReportExportStatus), nullable=False)
    checksum: Mapped[str | None] = mapped_column(String(128))
    qr_payload: Mapped[dict | None] = mapped_column(JSONB)
    file_reference: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
