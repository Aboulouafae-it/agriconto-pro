from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbDep
from app.schemas.auth import LoginRequest, LogoutResponse, RegisterRequest, TokenResponse, UserRead
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
def register(payload: RegisterRequest, db: DbDep):
    return AuthService(db).register(payload.email, payload.full_name, payload.password)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbDep):
    return TokenResponse(**AuthService(db).token_response(payload.email, payload.password))


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser):
    return current_user


@router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK)
def logout(_current_user: CurrentUser):
    return LogoutResponse()
