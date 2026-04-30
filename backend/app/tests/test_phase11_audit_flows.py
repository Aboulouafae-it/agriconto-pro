from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.api.v1.documents import upload_document
from app.models import AuditLog, Expense
from app.models.enums import FarmMemberStatus, FarmRole
from app.reports.services import ReportService
from app.services.crud import FarmCrudService
from app.storage.local import StoredFile


@pytest.fixture
def anyio_backend():
    return "asyncio"


class FakeUploadFile:
    filename = "receipt.txt"
    content_type = "text/plain"

    async def read(self):
        return b"ok"


class FakeDb:
    def __init__(self, membership=None, entity=None):
        self.membership = membership
        self.entity = entity
        self.rows = []
        self.deleted = []
        self.commits = 0

    def scalar(self, _statement):
        return self.membership

    def get(self, _model, _entity_id):
        return self.entity

    def add(self, row):
        self.rows.append(row)
        if isinstance(row, Expense):
            self.entity = row

    def flush(self):
        for row in self.rows:
            if getattr(row, "id", None) is None:
                row.id = uuid4()

    def commit(self):
        self.commits += 1

    def refresh(self, _row):
        return None

    def delete(self, row):
        self.deleted.append(row)


def user(user_id=None):
    return SimpleNamespace(id=user_id or uuid4(), is_active=True)


def membership(user_id, farm_id, role):
    return SimpleNamespace(
        user_id=user_id,
        farm_id=farm_id,
        role=role,
        status=FarmMemberStatus.ACTIVE,
    )


def audit_actions(db: FakeDb) -> list[str]:
    return [row.action for row in db.rows if isinstance(row, AuditLog)]


def test_create_update_delete_create_audit_logs() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER))
    service = FarmCrudService(db, Expense)

    expense = service.create(
        farm_id,
        current_user,
        {
            "expense_date": date.today(),
            "category": "Semi",
            "amount": Decimal("10.00"),
        },
    )
    service.update(farm_id, expense.id, current_user, {"amount": Decimal("12.00")})
    service.delete(farm_id, expense.id, current_user)

    assert {"create", "update", "delete"}.issubset(set(audit_actions(db)))


def test_report_export_creates_audit_log() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER))
    service = ReportService(db)
    service.monthly_summary = lambda *_args: {"period": "2026-04"}
    service._worker_wage_payload = lambda _farm_id: {"workers": [], "totals": {}}
    service._crop_profitability_payload = lambda _farm_id: {"crops": []}
    service._missing_documents_payload = lambda _farm_id: {"total_count": 0}
    service._expenses_payload = lambda _farm_id: []
    service._sales_payload = lambda _farm_id: []
    service._workers_payload = lambda _farm_id: []
    service._audit_summary_payload = lambda _farm_id: {"counts": [], "latest": []}
    service._document_references_payload = lambda _farm_id: []

    service.accountant_pack(farm_id, current_user)

    assert "report_export" in audit_actions(db)


@pytest.mark.anyio
async def test_document_upload_creates_audit_log(monkeypatch) -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER))

    class FakeStorage:
        def save(self, _filename, content):
            return StoredFile(
                storage_key="opaque.txt",
                stored_file_name="opaque.txt",
                size_bytes=len(content),
            )

    monkeypatch.setattr("app.api.v1.documents.LocalDocumentStorage", lambda: FakeStorage())

    await upload_document(
        farm_id=farm_id,
        title="Ricevuta",
        document_type="receipt",
        file=FakeUploadFile(),
        db=db,
        current_user=current_user,
    )

    assert "create" in audit_actions(db)
