from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import create_resource, delete_resource, get_resource, list_resource, patch_resource
from app.core.audit import audit_update, snapshot
from app.core.exceptions import ValidationError
from app.core.permissions import ensure_can_update, require_farm_access_to_entity
from app.models import Workday, WorkdayEntry
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import WorkdayEntryIn, WorkdayEntryOut, WorkdayIn, WorkdayOut, WorkdayUpdate
from app.services.crud import FarmCrudService

router = APIRouter(prefix="/farms/{farm_id}/workdays", tags=["workdays"])


@router.get("", response_model=Page[WorkdayOut])
def list_workdays(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, Workday, pagination)


@router.post("", response_model=WorkdayOut)
def create_workday(farm_id: UUID, payload: WorkdayIn, db: DbDep, current_user: CurrentUser):
    return create_resource(db, current_user, farm_id, Workday, payload)


@router.get("/{workday_id}", response_model=WorkdayOut)
def get_workday(farm_id: UUID, workday_id: UUID, db: DbDep, current_user: CurrentUser):
    return get_resource(db, current_user, farm_id, workday_id, Workday)


@router.patch("/{workday_id}", response_model=WorkdayOut)
def patch_workday(farm_id: UUID, workday_id: UUID, payload: WorkdayUpdate, db: DbDep, current_user: CurrentUser):
    return patch_resource(db, current_user, farm_id, workday_id, Workday, payload)


@router.delete("/{workday_id}", status_code=204)
def delete_workday(farm_id: UUID, workday_id: UUID, db: DbDep, current_user: CurrentUser):
    delete_resource(db, current_user, farm_id, workday_id, Workday)


@router.post("/{workday_id}/entries", response_model=WorkdayEntryOut)
def add_workday_entry(
    farm_id: UUID,
    workday_id: UUID,
    payload: WorkdayEntryIn,
    db: DbDep,
    current_user: CurrentUser,
):
    if payload.workday_id != workday_id:
        raise ValidationError("workday_id non corrisponde al percorso")
    require_farm_access_to_entity(db, current_user.id, farm_id, "Workday", workday_id)
    return FarmCrudService(db, WorkdayEntry).create(farm_id, current_user, payload.model_dump())


@router.post("/{workday_id}/close", response_model=WorkdayOut)
def close_workday(farm_id: UUID, workday_id: UUID, db: DbDep, current_user: CurrentUser):
    ensure_can_update(db, farm_id, current_user, "Workday")
    workday = require_farm_access_to_entity(db, current_user.id, farm_id, "Workday", workday_id)
    before = snapshot(workday)
    workday.is_closed = True
    db.flush()
    audit_update(db, farm_id, current_user.id, workday, before, action="close")
    db.commit()
    db.refresh(workday)
    return workday
