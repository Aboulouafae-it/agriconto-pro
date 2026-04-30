"""foundation

Revision ID: 0001_foundation
Revises:
Create Date: 2026-04-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_foundation"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

farm_role = postgresql.ENUM(
    "OWNER", "ACCOUNTANT", "LABOR_CONSULTANT", "WORKER", name="farmrole", create_type=False
)
farm_member_status = postgresql.ENUM(
    "INVITED", "ACTIVE", "SUSPENDED", name="farmmemberstatus", create_type=False
)
fiscal_profile = postgresql.ENUM(
    "REGIME_SPECIALE_AGRICOLO",
    "REGIME_ORDINARIO",
    "REGIME_ESONERO",
    name="fiscalprofile",
    create_type=False,
)
document_status = postgresql.ENUM(
    "REQUESTED", "RECEIVED", "MISSING", "ARCHIVED", name="documentstatus", create_type=False
)
report_export_status = postgresql.ENUM(
    "REQUESTED",
    "PROCESSING",
    "READY",
    "FAILED",
    "EXPIRED",
    name="reportexportstatus",
    create_type=False,
)


def ids() -> list[sa.Column]:
    return [
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        )
    ]


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def soft_delete() -> list[sa.Column]:
    return [sa.Column("deleted_at", sa.DateTime(timezone=True))]


def farm_scope() -> list[sa.Column]:
    return [
        sa.Column(
            "farm_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("farms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
    ]


def index_common(table: str, *columns: str) -> None:
    for column in columns:
        op.create_index(f"ix_{table}_{column}", table, [column])


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    farm_role.create(op.get_bind(), checkfirst=True)
    farm_member_status.create(op.get_bind(), checkfirst=True)
    fiscal_profile.create(op.get_bind(), checkfirst=True)
    document_status.create(op.get_bind(), checkfirst=True)
    report_export_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        *ids(),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        *timestamps(),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    index_common("users", "created_at")

    op.create_table(
        "farms",
        *ids(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("legal_name", sa.String(255)),
        sa.Column("partita_iva", sa.String(32)),
        sa.Column("codice_fiscale", sa.String(32)),
        sa.Column("address", sa.String(255)),
        sa.Column("city", sa.String(120)),
        sa.Column("province", sa.String(2)),
        sa.Column("region", sa.String(120)),
        sa.Column("fiscal_profile", fiscal_profile, nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        *timestamps(),
    )
    index_common("farms", "owner_id", "created_at")

    op.create_table(
        "farm_members",
        *ids(),
        sa.Column(
            "farm_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("farms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", farm_role, nullable=False),
        sa.Column("status", farm_member_status, server_default="ACTIVE", nullable=False),
        *timestamps(),
        sa.UniqueConstraint("farm_id", "user_id", name="uq_farm_members_farm_id_user_id"),
    )
    index_common("farm_members", "farm_id", "user_id", "created_at")

    op.create_table(
        "fields",
        *ids(),
        *farm_scope(),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("cadastral_reference", sa.String(160)),
        sa.Column("area_hectares", sa.Numeric(12, 4)),
        *timestamps(),
        *soft_delete(),
        sa.CheckConstraint("area_hectares IS NULL OR area_hectares >= 0", name="area_non_negative"),
    )
    index_common("fields", "farm_id", "created_by_id", "created_at")

    op.create_table(
        "crops",
        *ids(),
        *farm_scope(),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("season", sa.String(80)),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fields.id", ondelete="RESTRICT")),
        *timestamps(),
        *soft_delete(),
    )
    index_common("crops", "farm_id", "created_by_id", "field_id", "created_at")

    op.create_table(
        "workers",
        *ids(),
        *farm_scope(),
        sa.Column("first_name", sa.String(120), nullable=False),
        sa.Column("last_name", sa.String(120), nullable=False),
        sa.Column("fiscal_code", sa.String(32)),
        sa.Column("contract_type", sa.String(120)),
        sa.Column("hourly_rate", sa.Numeric(12, 2)),
        sa.Column("notes", sa.Text()),
        *timestamps(),
        *soft_delete(),
        sa.CheckConstraint("hourly_rate IS NULL OR hourly_rate >= 0", name="hourly_rate_non_negative"),
    )
    index_common("workers", "farm_id", "created_by_id", "created_at")

    op.create_table(
        "workdays",
        *ids(),
        *farm_scope(),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_closed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        *timestamps(),
        *soft_delete(),
    )
    index_common("workdays", "farm_id", "created_by_id", "created_at")

    op.create_table(
        "workday_entries",
        *ids(),
        *farm_scope(),
        sa.Column(
            "workday_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workdays.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("worker_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("crop_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("crops.id", ondelete="RESTRICT")),
        sa.Column("hours", sa.Numeric(8, 2), nullable=False),
        sa.Column("hourly_rate", sa.Numeric(12, 2)),
        sa.Column("activity", sa.String(180)),
        *timestamps(),
        *soft_delete(),
        sa.CheckConstraint("hours > 0 AND hours <= 24", name="hours_range"),
        sa.CheckConstraint("hourly_rate IS NULL OR hourly_rate >= 0", name="rate_non_negative"),
    )
    index_common("workday_entries", "farm_id", "created_by_id", "workday_id", "worker_id", "crop_id", "created_at")

    op.create_table(
        "worker_advances",
        *ids(),
        *farm_scope(),
        sa.Column("worker_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("advance_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("note", sa.Text()),
        *timestamps(),
        *soft_delete(),
        sa.CheckConstraint("amount > 0", name="amount_positive"),
    )
    index_common("worker_advances", "farm_id", "created_by_id", "worker_id", "created_at")

    op.create_table(
        "worker_payments",
        *ids(),
        *farm_scope(),
        sa.Column("worker_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("note", sa.Text()),
        *timestamps(),
        *soft_delete(),
        sa.CheckConstraint("amount > 0", name="amount_positive"),
    )
    index_common("worker_payments", "farm_id", "created_by_id", "worker_id", "created_at")

    op.create_table(
        "suppliers",
        *ids(),
        *farm_scope(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("vat_number", sa.String(32)),
        sa.Column("email", sa.String(255)),
        *timestamps(),
        *soft_delete(),
    )
    index_common("suppliers", "farm_id", "created_by_id", "created_at")

    op.create_table(
        "customers",
        *ids(),
        *farm_scope(),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("vat_number", sa.String(32)),
        sa.Column("email", sa.String(255)),
        *timestamps(),
        *soft_delete(),
    )
    index_common("customers", "farm_id", "created_by_id", "created_at")

    op.create_table(
        "expenses",
        *ids(),
        *farm_scope(),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id", ondelete="RESTRICT")),
        sa.Column("crop_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("crops.id", ondelete="RESTRICT")),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.Text()),
        *timestamps(),
        *soft_delete(),
        sa.CheckConstraint("amount > 0", name="amount_positive"),
    )
    index_common("expenses", "farm_id", "created_by_id", "supplier_id", "crop_id", "created_at")

    op.create_table(
        "sales",
        *ids(),
        *farm_scope(),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="RESTRICT")),
        sa.Column("crop_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("crops.id", ondelete="RESTRICT")),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.Text()),
        *timestamps(),
        *soft_delete(),
        sa.CheckConstraint("amount > 0", name="amount_positive"),
    )
    index_common("sales", "farm_id", "created_by_id", "customer_id", "crop_id", "created_at")

    op.create_table(
        "documents",
        *ids(),
        *farm_scope(),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("document_type", sa.String(120), nullable=False),
        sa.Column("original_file_name", sa.String(255)),
        sa.Column("stored_file_name", sa.String(255)),
        sa.Column("storage_key", sa.String(500)),
        sa.Column("mime_type", sa.String(120)),
        sa.Column("size_bytes", sa.Integer()),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("uploaded_at", sa.DateTime(timezone=True)),
        sa.Column("status", document_status, server_default="RECEIVED", nullable=False),
        sa.Column("related_entity_type", sa.String(80)),
        sa.Column("related_entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("notes", sa.Text()),
        *timestamps(),
        *soft_delete(),
    )
    index_common("documents", "farm_id", "created_by_id", "uploaded_by", "created_at")

    op.create_table(
        "document_requests",
        *ids(),
        *farm_scope(),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("requested_from", sa.String(255)),
        sa.Column("due_date", sa.Date()),
        sa.Column("status", document_status, server_default="REQUESTED", nullable=False),
        *timestamps(),
        *soft_delete(),
    )
    index_common("document_requests", "farm_id", "created_by_id", "created_at")

    op.create_table(
        "audit_logs",
        *ids(),
        sa.Column(
            "farm_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("farms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("entity_type", sa.String(120), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("old_value", postgresql.JSONB()),
        sa.Column("new_value", postgresql.JSONB()),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("user_agent", sa.String(512)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    index_common("audit_logs", "farm_id", "user_id", "created_at")

    op.create_table(
        "report_exports",
        *ids(),
        sa.Column(
            "farm_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("farms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("report_type", sa.String(120), nullable=False),
        sa.Column("date_range", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("status", report_export_status, server_default="REQUESTED", nullable=False),
        sa.Column("file_reference", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
    )
    index_common("report_exports", "farm_id", "requested_by", "created_at")


def downgrade() -> None:
    for table in [
        "report_exports",
        "audit_logs",
        "document_requests",
        "documents",
        "sales",
        "expenses",
        "customers",
        "suppliers",
        "worker_payments",
        "worker_advances",
        "workday_entries",
        "workdays",
        "workers",
        "crops",
        "fields",
        "farm_members",
        "farms",
        "users",
    ]:
        op.drop_table(table)
    report_export_status.drop(op.get_bind(), checkfirst=True)
    document_status.drop(op.get_bind(), checkfirst=True)
    fiscal_profile.drop(op.get_bind(), checkfirst=True)
    farm_member_status.drop(op.get_bind(), checkfirst=True)
    farm_role.drop(op.get_bind(), checkfirst=True)
