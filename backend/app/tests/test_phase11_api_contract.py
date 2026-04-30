from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.deps import get_current_user
from app.api.v1.farms import get_farm
from app.api.v1.resource_helpers import page_response
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.enums import FarmMemberStatus, FarmRole
from app.schemas.auth import LoginRequest
from app.schemas.common import PaginationParams


class FakeDb:
    def __init__(self, membership=None):
        self.membership = membership

    def scalar(self, _statement):
        return self.membership

    def get(self, _model, _object_id):
        return None


def user(user_id=None):
    return SimpleNamespace(id=user_id or uuid4(), is_active=True)


def membership(user_id, farm_id, role):
    return SimpleNamespace(
        user_id=user_id,
        farm_id=farm_id,
        role=role,
        status=FarmMemberStatus.ACTIVE,
    )


def test_pagination_response_shape_is_consistent() -> None:
    pagination = PaginationParams(limit=2, offset=4)

    response = page_response(["a", "b"], total=10, pagination=pagination)

    assert response == {"items": ["a", "b"], "limit": 2, "offset": 4, "total": 10}


def test_unauthenticated_api_returns_401_with_detail() -> None:
    with pytest.raises(HTTPException) as exc:
        get_current_user(FakeDb(), None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Token mancante"


def test_validation_error_format_is_consistent() -> None:
    with pytest.raises(ValueError) as exc:
        LoginRequest.model_validate({"email": "not-an-email", "password": "x"})

    assert "email" in str(exc.value)


def test_unauthorized_api_returns_403_with_detail() -> None:
    current_user = user()
    farm_id = uuid4()

    with pytest.raises(ForbiddenError) as exc:
        get_farm(farm_id, FakeDb(), current_user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Accesso azienda negato"


def test_404_for_missing_member_visible_farm_uses_generic_message() -> None:
    current_user = user()
    farm_id = uuid4()
    member = membership(current_user.id, farm_id, FarmRole.OWNER)

    with pytest.raises(NotFoundError) as exc:
        get_farm(farm_id, FakeDb(member), current_user)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Azienda non trovata"
