from datetime import date
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.api.v1.documents import MAX_UPLOAD_BYTES, upload_document
from app.core.exceptions import ValidationError
from app.models.enums import FarmMemberStatus, FarmRole
from app.schemas.domain import ExpenseIn, WorkerIn
from app.schemas.farm import FarmMemberRead


@pytest.fixture
def anyio_backend():
    return "asyncio"


class FakeDb:
    def __init__(self, membership):
        self.membership = membership

    def scalar(self, _statement):
        return self.membership


def user(user_id=None):
    return SimpleNamespace(id=user_id or uuid4(), is_active=True)


def membership(user_id, farm_id, role):
    return SimpleNamespace(
        user_id=user_id,
        farm_id=farm_id,
        role=role,
        status=FarmMemberStatus.ACTIVE,
    )


class FakeUploadFile:
    def __init__(self, filename: str, content_type: str, content: bytes):
        self.filename = filename
        self.content_type = content_type
        self.content = content

    async def read(self):
        return self.content


def upload_file(name: str, content_type: str, content: bytes) -> FakeUploadFile:
    return FakeUploadFile(name, content_type, content)


def test_invalid_amounts_are_rejected() -> None:
    with pytest.raises(ValueError):
        ExpenseIn(
            expense_date=date.today(),
            category="Concime",
            amount=0,
        )


def test_negative_values_are_rejected_where_inappropriate() -> None:
    with pytest.raises(ValueError):
        WorkerIn(first_name="Ada", last_name="Bianchi", hourly_rate=-1)


def test_invalid_dates_are_rejected() -> None:
    with pytest.raises(ValueError):
        ExpenseIn.model_validate(
            {
                "expense_date": "not-a-date",
                "category": "Carburante",
                "amount": "10.00",
            }
        )


def test_invalid_role_is_rejected() -> None:
    with pytest.raises(ValueError):
        FarmMemberRead.model_validate(
            {
                "id": uuid4(),
                "user_id": uuid4(),
                "farm_id": uuid4(),
                "role": "SUPERUSER",
            }
        )


@pytest.mark.anyio
async def test_unsafe_file_type_is_rejected() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER))

    with pytest.raises(ValidationError):
        await upload_document(
            farm_id=farm_id,
            title="Malware",
            document_type="invoice",
            file=upload_file("invoice.exe", "application/x-msdownload", b"binary"),
            db=db,
            current_user=current_user,
        )


@pytest.mark.anyio
async def test_oversized_file_is_rejected() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER))

    with pytest.raises(ValidationError):
        await upload_document(
            farm_id=farm_id,
            title="Troppo grande",
            document_type="photo",
            file=upload_file("large.txt", "text/plain", b"x" * (MAX_UPLOAD_BYTES + 1)),
            db=db,
            current_user=current_user,
        )
