from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.exceptions import ForbiddenError
from app.models.enums import FarmMemberStatus, FarmRole
from app.reports.services import ReportService


class FakeDb:
    def __init__(self, membership=None):
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


def test_cross_farm_report_access_requires_membership() -> None:
    current_user = user()

    with pytest.raises(ForbiddenError):
        ReportService(FakeDb()).monthly_summary(uuid4(), current_user, 2026, 4)


def test_worker_cannot_access_farm_level_reports() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.WORKER))

    with pytest.raises(ForbiddenError):
        ReportService(db).monthly_summary(farm_id, current_user, 2026, 4)


def test_labor_consultant_cannot_access_financial_reports() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.LABOR_CONSULTANT))

    with pytest.raises(ForbiddenError):
        ReportService(db).crop_profitability(farm_id, current_user)


def test_accountant_cannot_access_labor_only_wage_report() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.ACCOUNTANT))

    with pytest.raises(ForbiddenError):
        ReportService(db).worker_wage_summary(farm_id, current_user)
