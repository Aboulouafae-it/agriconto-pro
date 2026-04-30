from types import SimpleNamespace
from uuid import uuid4

from app.core.security import verify_password
from app.models.enums import FarmMemberStatus, FarmRole
from scripts.seed_demo import DEMO_PASSWORD, ensure_demo_membership, ensure_demo_user


class FakeDb:
    def __init__(self, scalar_result=None):
        self.scalar_result = scalar_result
        self.added = []
        self.flushed = False

    def scalar(self, _statement):
        return self.scalar_result

    def add(self, row):
        self.added.append(row)

    def flush(self):
        self.flushed = True
        for row in self.added:
            if getattr(row, "id", None) is None:
                row.id = uuid4()


def test_demo_seed_repairs_existing_user_password_and_active_flag() -> None:
    user = SimpleNamespace(
        id=uuid4(),
        email="demo@example.com",
        full_name="Mario Rossi",
        password_hash="broken-hash",
        is_active=False,
    )

    repaired = ensure_demo_user(FakeDb(user))

    assert repaired is user
    assert repaired.is_active is True
    assert repaired.password_hash != "broken-hash"
    assert verify_password(DEMO_PASSWORD, repaired.password_hash)


def test_demo_seed_repairs_existing_membership_to_owner_active() -> None:
    membership = SimpleNamespace(
        id=uuid4(),
        farm_id=uuid4(),
        user_id=uuid4(),
        role=FarmRole.ACCOUNTANT,
        status=FarmMemberStatus.SUSPENDED,
    )
    user = SimpleNamespace(id=membership.user_id)
    farm = SimpleNamespace(id=membership.farm_id)

    repaired = ensure_demo_membership(FakeDb(membership), user, farm)

    assert repaired.role == FarmRole.OWNER
    assert repaired.status == FarmMemberStatus.ACTIVE
