from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import ForbiddenError
from app.core.permissions import ensure_can_read, require_farm_access_to_entity
from app.models import Document, Expense, Worker
from app.models.enums import FarmMemberStatus, FarmRole
from app.reports.services import ReportService
from app.services.crud import FarmCrudService


class FakeDb:
    def __init__(self, membership=None, entity=None):
        self.membership = membership
        self.entity = entity

    def scalar(self, _statement):
        return self.membership

    def get(self, _model, _entity_id):
        return self.entity


def user(user_id=None):
    return SimpleNamespace(id=user_id or uuid4(), is_active=True)


def membership(user_id, farm_id, role):
    return SimpleNamespace(
        user_id=user_id,
        farm_id=farm_id,
        role=role,
        status=FarmMemberStatus.ACTIVE,
    )


def test_user_cannot_access_farm_where_not_member() -> None:
    with pytest.raises(ForbiddenError):
        ensure_can_read(FakeDb(), uuid4(), user(), "Expense")


def test_accountant_cannot_edit_expenses() -> None:
    current_user = user()
    farm_id = uuid4()
    expense = Expense(
        id=uuid4(),
        farm_id=farm_id,
        created_by_id=current_user.id,
        expense_date=date.today(),
        category="Semi",
        amount=Decimal("10.00"),
    )
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.ACCOUNTANT), expense)

    with pytest.raises(ForbiddenError):
        FarmCrudService(db, Expense).update(farm_id, expense.id, current_user, {"amount": Decimal("12.00")})


def test_labor_consultant_cannot_access_sales() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.LABOR_CONSULTANT))

    with pytest.raises(ForbiddenError):
        ensure_can_read(db, farm_id, current_user, "Sale")


def test_worker_cannot_access_other_workers() -> None:
    current_user = user()
    farm_id = uuid4()
    other_worker = Worker(
        id=uuid4(),
        farm_id=farm_id,
        created_by_id=uuid4(),
        first_name="Other",
        last_name="Worker",
    )
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.WORKER), other_worker)

    with pytest.raises(ForbiddenError):
        require_farm_access_to_entity(db, current_user.id, farm_id, "Worker", other_worker.id)


def test_user_cannot_access_document_from_another_farm() -> None:
    current_user = user()
    farm_id = uuid4()
    other_farm_id = uuid4()
    document = Document(
        id=uuid4(),
        farm_id=other_farm_id,
        created_by_id=uuid4(),
        title="Fattura altra azienda",
        document_type="invoice",
    )
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER), document)

    with pytest.raises(ForbiddenError):
        require_farm_access_to_entity(db, current_user.id, farm_id, "Document", document.id)


def test_user_cannot_export_report_from_another_farm() -> None:
    current_user = user()

    with pytest.raises(ForbiddenError):
        ReportService(FakeDb()).accountant_pack(uuid4(), current_user)


def test_bola_fetch_entity_by_id_from_another_farm_fails() -> None:
    current_user = user()
    farm_id = uuid4()
    expense = Expense(
        id=uuid4(),
        farm_id=uuid4(),
        created_by_id=uuid4(),
        expense_date=date.today(),
        category="Fuel",
        amount=Decimal("25.00"),
    )
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER), expense)

    with pytest.raises(ForbiddenError):
        FarmCrudService(db, Expense).get(farm_id, expense.id, current_user)


def test_bola_update_entity_by_id_from_another_farm_fails() -> None:
    current_user = user()
    farm_id = uuid4()
    expense = Expense(
        id=uuid4(),
        farm_id=uuid4(),
        created_by_id=uuid4(),
        expense_date=date.today(),
        category="Fuel",
        amount=Decimal("25.00"),
    )
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER), expense)

    with pytest.raises(ForbiddenError):
        FarmCrudService(db, Expense).update(farm_id, expense.id, current_user, {"amount": Decimal("30.00")})


def test_bola_download_document_by_id_from_another_farm_fails() -> None:
    current_user = user()
    farm_id = uuid4()
    document = Document(
        id=uuid4(),
        farm_id=uuid4(),
        created_by_id=uuid4(),
        title="Contratto privato",
        document_type="contract",
        storage_key="opaque.pdf",
    )
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER), document)

    with pytest.raises(ForbiddenError):
        require_farm_access_to_entity(db, current_user.id, farm_id, "Document", document.id)
