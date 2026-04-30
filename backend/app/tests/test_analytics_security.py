from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.analytics.schemas import AnalyticsFilters
from app.analytics.services.center import AnalyticsCenterService
from app.core.exceptions import ForbiddenError
from app.models.enums import FarmMemberStatus, FarmRole


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


def test_analytics_requires_farm_membership() -> None:
    current_user = user()

    with pytest.raises(ForbiddenError):
        AnalyticsCenterService(FakeDb()).financial(uuid4(), current_user, AnalyticsFilters())


def test_worker_cannot_access_farm_wide_analytics() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.WORKER))

    with pytest.raises(ForbiddenError):
        AnalyticsCenterService(db).overview(farm_id, current_user, AnalyticsFilters())


def test_labor_consultant_cannot_access_financial_analytics() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.LABOR_CONSULTANT))

    with pytest.raises(ForbiddenError):
        AnalyticsCenterService(db).financial(farm_id, current_user, AnalyticsFilters())


def test_accountant_cannot_access_labor_analytics() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.ACCOUNTANT))

    with pytest.raises(ForbiddenError):
        AnalyticsCenterService(db).labor(farm_id, current_user, AnalyticsFilters())


def test_invalid_date_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        AnalyticsFilters(start_date="2026-05-01", end_date="2026-04-01")
