from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_access_token_ttl_seconds,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models import User


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def generic_login_error() -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali non valide",
        )

    def register(self, email: str, full_name: str, password: str) -> User:
        existing = self.db.scalar(select(User).where(User.email == email.lower()))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email gia registrata")
        try:
            validate_password_strength(password)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
        user = User(email=email.lower(), full_name=full_name, password_hash=hash_password(password))
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def login(self, email: str, password: str) -> str:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if not user:
            raise self.generic_login_error()
        if not verify_password(password, user.password_hash):
            raise self.generic_login_error()
        if not user.is_active:
            raise self.generic_login_error()
        return create_access_token(user.id)

    def token_response(self, email: str, password: str) -> dict[str, int | str]:
        return {
            "access_token": self.login(email, password),
            "token_type": "bearer",
            "expires_in": get_access_token_ttl_seconds(),
        }
