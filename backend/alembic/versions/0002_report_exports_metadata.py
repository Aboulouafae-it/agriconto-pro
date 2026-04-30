"""report exports metadata

Revision ID: 0002_report_exports_metadata
Revises: 0001_foundation
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_report_exports_metadata"
down_revision: str | None = "0001_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("report_exports", sa.Column("period_start", sa.Date(), nullable=True))
    op.add_column("report_exports", sa.Column("period_end", sa.Date(), nullable=True))
    op.add_column("report_exports", sa.Column("checksum", sa.String(length=128), nullable=True))
    op.add_column("report_exports", sa.Column("qr_payload", postgresql.JSONB(), nullable=True))
    op.create_index("ix_report_exports_report_type", "report_exports", ["report_type"])
    op.create_index("ix_report_exports_period_start", "report_exports", ["period_start"])


def downgrade() -> None:
    op.drop_index("ix_report_exports_period_start", table_name="report_exports")
    op.drop_index("ix_report_exports_report_type", table_name="report_exports")
    op.drop_column("report_exports", "qr_payload")
    op.drop_column("report_exports", "checksum")
    op.drop_column("report_exports", "period_end")
    op.drop_column("report_exports", "period_start")

