from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError
from app.models import (
    Crop,
    Customer,
    Document,
    DocumentRequest,
    Expense,
    FarmMember,
    Field,
    ReportExport,
    Sale,
    Supplier,
    User,
    Workday,
    WorkdayEntry,
    Worker,
    WorkerAdvance,
    WorkerPayment,
)
from app.models.enums import FarmMemberStatus, FarmRole

FINANCIAL_MODELS = {
    "Customer",
    "Document",
    "DocumentRequest",
    "Expense",
    "ReportExport",
    "Sale",
    "Supplier",
}
LABOR_MODELS = {"Worker", "Workday", "WorkdayEntry", "WorkerAdvance", "WorkerPayment"}
WORKER_SELF_MODELS = {"Worker", "WorkdayEntry", "WorkerAdvance", "WorkerPayment"}
DOCUMENT_MODELS = {"Document", "DocumentRequest"}
REPORT_MODELS = {"ReportExport"}
ALL_ROLE_MODELS = {
    "Crop",
    "Customer",
    "Document",
    "DocumentRequest",
    "Expense",
    "Field",
    "ReportExport",
    "Sale",
    "Supplier",
    "Workday",
    "WorkdayEntry",
    "Worker",
    "WorkerAdvance",
    "WorkerPayment",
}
WRITE_ROLES = {FarmRole.OWNER}
ENTITY_MODELS = {
    "Crop": Crop,
    "Customer": Customer,
    "Document": Document,
    "DocumentRequest": DocumentRequest,
    "Expense": Expense,
    "Field": Field,
    "ReportExport": ReportExport,
    "Sale": Sale,
    "Supplier": Supplier,
    "Workday": Workday,
    "WorkdayEntry": WorkdayEntry,
    "Worker": Worker,
    "WorkerAdvance": WorkerAdvance,
    "WorkerPayment": WorkerPayment,
}

ROLE_READ_ALLOWLIST = {
    FarmRole.OWNER: ALL_ROLE_MODELS,
    FarmRole.ACCOUNTANT: FINANCIAL_MODELS,
    FarmRole.LABOR_CONSULTANT: LABOR_MODELS,
    FarmRole.WORKER: WORKER_SELF_MODELS,
}

ROLE_CREATE_ALLOWLIST = {
    FarmRole.OWNER: ALL_ROLE_MODELS,
    FarmRole.ACCOUNTANT: {"DocumentRequest", "ReportExport"},
    FarmRole.LABOR_CONSULTANT: set(),
    FarmRole.WORKER: set(),
}

ROLE_UPDATE_ALLOWLIST = {
    FarmRole.OWNER: ALL_ROLE_MODELS,
    FarmRole.ACCOUNTANT: set(),
    FarmRole.LABOR_CONSULTANT: set(),
    FarmRole.WORKER: set(),
}

ROLE_DELETE_ALLOWLIST = {
    FarmRole.OWNER: ALL_ROLE_MODELS,
    FarmRole.ACCOUNTANT: set(),
    FarmRole.LABOR_CONSULTANT: set(),
    FarmRole.WORKER: set(),
}


def require_authenticated_user(user: User | None) -> User:
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utente non valido")
    return user


def get_membership(db: Session, farm_id: UUID, user: User) -> FarmMember:
    require_authenticated_user(user)
    membership = db.scalar(
        select(FarmMember).where(FarmMember.farm_id == farm_id, FarmMember.user_id == user.id)
    )
    if not membership or membership.status != FarmMemberStatus.ACTIVE:
        raise ForbiddenError("Accesso azienda negato")
    return membership


def require_farm_member(db: Session, user_id: UUID, farm_id: UUID) -> FarmMember:
    membership = db.scalar(
        select(FarmMember).where(FarmMember.farm_id == farm_id, FarmMember.user_id == user_id)
    )
    if not membership or membership.status != FarmMemberStatus.ACTIVE:
        raise ForbiddenError("Accesso azienda negato")
    return membership


def require_role(
    db: Session, user_id: UUID, farm_id: UUID, allowed_roles: set[FarmRole] | tuple[FarmRole, ...]
) -> FarmMember:
    membership = require_farm_member(db, user_id, farm_id)
    if membership.role not in set(allowed_roles):
        raise ForbiddenError("Ruolo non autorizzato")
    return membership


def require_farm_access_to_entity(
    db: Session, user_id: UUID, farm_id: UUID, entity_type: str, entity_id: UUID
):
    membership = require_farm_member(db, user_id, farm_id)
    if entity_type not in ROLE_READ_ALLOWLIST[membership.role]:
        raise ForbiddenError("Dato non autorizzato")
    if membership.role == FarmRole.WORKER:
        raise ForbiddenError("Accesso lavoratore self-service non ancora implementato")
    model = ENTITY_MODELS.get(entity_type)
    if not model:
        raise ForbiddenError("Tipo risorsa non autorizzato")
    entity = db.get(model, entity_id)
    if not entity or getattr(entity, "farm_id", None) != farm_id:
        raise ForbiddenError("Risorsa fuori azienda")
    return entity


def assert_accountant_read_only(role: FarmRole, action: str, resource_name: str) -> None:
    if role != FarmRole.ACCOUNTANT:
        return
    if action in {"update", "delete"}:
        raise ForbiddenError("Il commercialista ha accesso in sola lettura")
    if action == "create" and resource_name not in ROLE_CREATE_ALLOWLIST[FarmRole.ACCOUNTANT]:
        raise ForbiddenError("Il commercialista non puo modificare i dati sorgente")


def assert_worker_self_access(
    user_id: UUID,
    entity: object,
    linked_user_id: UUID | None = None,
) -> None:
    if linked_user_id is None or linked_user_id != user_id:
        raise ForbiddenError("Il lavoratore puo accedere solo ai propri dati")


def ensure_can_read(db: Session, farm_id: UUID, user: User, resource_name: str) -> FarmMember:
    membership = get_membership(db, farm_id, user)
    if resource_name not in ROLE_READ_ALLOWLIST[membership.role]:
        raise ForbiddenError("Dato non autorizzato")
    if membership.role == FarmRole.WORKER:
        raise ForbiddenError("Accesso lavoratore self-service non ancora implementato")
    return membership


def ensure_can_create(db: Session, farm_id: UUID, user: User, resource_name: str) -> FarmMember:
    membership = get_membership(db, farm_id, user)
    assert_accountant_read_only(membership.role, "create", resource_name)
    if resource_name not in ROLE_CREATE_ALLOWLIST[membership.role]:
        raise ForbiddenError("Creazione non autorizzata")
    return membership


def ensure_can_update(db: Session, farm_id: UUID, user: User, resource_name: str) -> FarmMember:
    membership = get_membership(db, farm_id, user)
    assert_accountant_read_only(membership.role, "update", resource_name)
    if resource_name not in ROLE_UPDATE_ALLOWLIST[membership.role]:
        raise ForbiddenError("Modifica non autorizzata")
    return membership


def ensure_can_delete(db: Session, farm_id: UUID, user: User, resource_name: str) -> FarmMember:
    membership = get_membership(db, farm_id, user)
    assert_accountant_read_only(membership.role, "delete", resource_name)
    if resource_name not in ROLE_DELETE_ALLOWLIST[membership.role]:
        raise ForbiddenError("Eliminazione non autorizzata")
    return membership


def ensure_can_write(db: Session, farm_id: UUID, user: User, resource_name: str) -> FarmMember:
    membership = ensure_can_update(db, farm_id, user, resource_name)
    return membership
