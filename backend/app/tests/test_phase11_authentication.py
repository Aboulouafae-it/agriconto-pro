from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.deps import get_current_user
from app.core.security import create_access_token, decode_access_token, verify_password
from app.models import User
from app.schemas.auth import UserRead
from app.services.auth import AuthService


class FakeAuthDb:
    def __init__(self, existing_user=None):
        self.existing_user = existing_user
        self.added = None
        self.committed = False
        self.refreshed = None

    def scalar(self, _statement):
        return self.existing_user

    def add(self, row):
        self.added = row

    def commit(self):
        self.committed = True

    def refresh(self, row):
        if getattr(row, "id", None) is None:
            row.id = uuid4()
        if getattr(row, "is_active", None) is None:
            row.is_active = True
        self.refreshed = row


class FakeCredentials:
    def __init__(self, token: str):
        self.credentials = token


class FakeCurrentUserDb:
    def __init__(self, user_record=None):
        self.user_record = user_record

    def get(self, _model, _user_id):
        return self.user_record


def test_register_works_and_hashes_password() -> None:
    db = FakeAuthDb()

    user = AuthService(db).register("new@example.com", "New User", "Password123!")

    assert db.committed is True
    assert user.email == "new@example.com"
    assert user.password_hash != "Password123!"
    assert verify_password("Password123!", user.password_hash)


def test_login_works_with_valid_credentials() -> None:
    db = FakeAuthDb()
    user = AuthService(db).register("login@example.com", "Login User", "Password123!")
    login_db = FakeAuthDb(user)

    token = AuthService(login_db).login("login@example.com", "Password123!")

    assert isinstance(token, str)
    assert len(token) > 20
    assert decode_access_token(token) == user.id


def test_wrong_password_fails() -> None:
    user = AuthService(FakeAuthDb()).register("bad@example.com", "Bad User", "Password123!")

    with pytest.raises(HTTPException) as exc:
        AuthService(FakeAuthDb(user)).login("bad@example.com", "WrongPassword123!")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Credenziali non valide"


def test_inactive_user_cannot_login() -> None:
    user = AuthService(FakeAuthDb()).register("inactive@example.com", "Inactive User", "Password123!")
    user.is_active = False

    with pytest.raises(HTTPException) as exc:
        AuthService(FakeAuthDb(user)).login("inactive@example.com", "Password123!")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Credenziali non valide"


def test_me_works_with_valid_token() -> None:
    user_id = uuid4()
    user_record = User(
        id=user_id,
        email="me@example.com",
        full_name="Me User",
        password_hash="not-returned",
        is_active=True,
    )
    token = create_access_token(user_id)

    current_user = get_current_user(FakeCurrentUserDb(user_record), FakeCredentials(token))

    assert current_user.id == user_id
    assert current_user.email == "me@example.com"


def test_protected_route_dependency_rejects_invalid_token() -> None:
    with pytest.raises(HTTPException) as exc:
        get_current_user(FakeCurrentUserDb(), FakeCredentials("invalid.jwt.token"))

    assert exc.value.status_code == 401
    assert exc.value.detail == "Token non valido"


def test_password_hash_is_never_part_of_public_user_schema() -> None:
    assert "password_hash" not in UserRead.model_fields
    public = UserRead.model_validate(
        User(
            id=uuid4(),
            email="public@example.com",
            full_name="Public User",
            password_hash="secret-hash",
        )
    )

    assert "password_hash" not in public.model_dump()
