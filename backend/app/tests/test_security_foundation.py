from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.exceptions import ForbiddenError
from app.core.permissions import (
    FINANCIAL_MODELS,
    LABOR_MODELS,
    WRITE_ROLES,
    assert_accountant_read_only,
    assert_worker_self_access,
    ensure_can_create,
    ensure_can_delete,
    ensure_can_read,
    ensure_can_update,
    require_farm_access_to_entity,
    require_farm_member,
    require_role,
)
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models import User
from app.models.enums import FarmMemberStatus, FarmRole
from app.services.auth import AuthService


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


def test_access_token_round_trip_contains_valid_subject() -> None:
    user_id = uuid4()
    token = create_access_token(user_id)

    assert decode_access_token(token) == user_id


def test_expired_access_token_is_rejected() -> None:
    token = create_access_token(uuid4(), expires_delta=timedelta(seconds=-1))

    assert decode_access_token(token) is None


@pytest.mark.parametrize("password", ["short", "alllowercase123", "ALLUPPERCASE123", "NoDigitsHere"])
def test_password_policy_rejects_weak_passwords(password: str) -> None:
    with pytest.raises(ValueError):
        validate_password_strength(password)


def test_password_policy_accepts_baseline_strong_password() -> None:
    validate_password_strength("Password123!")


def test_password_hash_does_not_store_plaintext() -> None:
    password = "Password123!"
    password_hash = hash_password(password)

    assert password_hash != password
    assert verify_password(password, password_hash)


def test_read_only_external_roles_are_not_write_roles() -> None:
    assert FarmRole.ACCOUNTANT not in WRITE_ROLES
    assert FarmRole.LABOR_CONSULTANT not in WRITE_ROLES
    assert FarmRole.WORKER not in WRITE_ROLES


def test_labor_consultant_scope_excludes_financial_documents() -> None:
    assert "Expense" not in LABOR_MODELS
    assert "Sale" not in LABOR_MODELS
    assert "Document" not in LABOR_MODELS


def test_accountant_scope_is_financial_and_document_oriented() -> None:
    assert {
        "Expense",
        "Sale",
        "Supplier",
        "Customer",
        "Document",
        "DocumentRequest",
        "ReportExport",
    }.issubset(FINANCIAL_MODELS)
    assert "Worker" not in FINANCIAL_MODELS


def test_require_farm_member_rejects_missing_membership() -> None:
    with pytest.raises(ForbiddenError):
        require_farm_member(FakeDb(), uuid4(), uuid4())


def test_require_role_rejects_wrong_role() -> None:
    user_id = uuid4()
    farm_id = uuid4()
    db = FakeDb(membership(user_id, farm_id, FarmRole.ACCOUNTANT))

    with pytest.raises(ForbiddenError):
        require_role(db, user_id, farm_id, {FarmRole.OWNER})


def test_accountant_can_read_financial_but_cannot_update_or_delete() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.ACCOUNTANT))

    ensure_can_read(db, farm_id, current_user, "Expense")
    with pytest.raises(ForbiddenError):
        ensure_can_update(db, farm_id, current_user, "Expense")
    with pytest.raises(ForbiddenError):
        ensure_can_delete(db, farm_id, current_user, "Expense")


def test_accountant_can_request_documents_and_accountant_pack_export() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.ACCOUNTANT))

    ensure_can_create(db, farm_id, current_user, "DocumentRequest")
    ensure_can_create(db, farm_id, current_user, "ReportExport")


def test_labor_consultant_cannot_access_sales_or_expenses() -> None:
    current_user = user()
    farm_id = uuid4()
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.LABOR_CONSULTANT))

    ensure_can_read(db, farm_id, current_user, "Worker")
    with pytest.raises(ForbiddenError):
        ensure_can_read(db, farm_id, current_user, "Sale")
    with pytest.raises(ForbiddenError):
        ensure_can_read(db, farm_id, current_user, "Expense")


def test_entity_access_rejects_cross_farm_entity() -> None:
    current_user = user()
    farm_id = uuid4()
    other_farm_id = uuid4()
    entity = SimpleNamespace(farm_id=other_farm_id)
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.OWNER), entity)

    with pytest.raises(ForbiddenError):
        require_farm_access_to_entity(db, current_user.id, farm_id, "Expense", uuid4())


def test_entity_access_rejects_entity_type_outside_role_scope() -> None:
    current_user = user()
    farm_id = uuid4()
    entity = SimpleNamespace(farm_id=farm_id)
    db = FakeDb(membership(current_user.id, farm_id, FarmRole.ACCOUNTANT), entity)

    with pytest.raises(ForbiddenError):
        require_farm_access_to_entity(db, current_user.id, farm_id, "Worker", uuid4())


def test_accountant_read_only_assertion_blocks_source_record_writes() -> None:
    with pytest.raises(ForbiddenError):
        assert_accountant_read_only(FarmRole.ACCOUNTANT, "create", "Expense")
    with pytest.raises(ForbiddenError):
        assert_accountant_read_only(FarmRole.ACCOUNTANT, "update", "DocumentRequest")


def test_worker_self_access_requires_matching_user_link() -> None:
    current_user_id = uuid4()

    assert_worker_self_access(current_user_id, object(), linked_user_id=current_user_id)
    with pytest.raises(ForbiddenError):
        assert_worker_self_access(current_user_id, object(), linked_user_id=uuid4())


class FakeAuthDb:
    def __init__(self, user_record=None):
        self.user_record = user_record

    def scalar(self, _statement):
        return self.user_record


def test_login_uses_generic_error_for_unknown_user() -> None:
    with pytest.raises(HTTPException) as exc:
        AuthService(FakeAuthDb()).login("missing@example.com", "Password123!")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Credenziali non valide"


def test_login_uses_generic_error_for_bad_password() -> None:
    user_record = User(
        email="demo@example.com",
        full_name="Demo User",
        password_hash=hash_password("Password123!"),
    )

    with pytest.raises(HTTPException) as exc:
        AuthService(FakeAuthDb(user_record)).login("demo@example.com", "WrongPassword123!")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Credenziali non valide"


def test_login_uses_generic_error_for_disabled_account() -> None:
    user_record = User(
        email="disabled@example.com",
        full_name="Disabled User",
        password_hash=hash_password("Password123!"),
        is_active=False,
    )

    with pytest.raises(HTTPException) as exc:
        AuthService(FakeAuthDb(user_record)).login("disabled@example.com", "Password123!")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Credenziali non valide"


def test_login_returns_expiring_bearer_token_response() -> None:
    user_id = uuid4()
    user_record = User(
        id=user_id,
        email="demo@example.com",
        full_name="Demo User",
        password_hash=hash_password("Password123!"),
        is_active=True,
    )
    response = AuthService(FakeAuthDb(user_record)).token_response(
        "demo@example.com", "Password123!"
    )

    assert response["token_type"] == "bearer"
    assert response["expires_in"] > 0
    assert decode_access_token(response["access_token"]) == user_id
