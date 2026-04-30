from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import create_resource, delete_resource, get_resource, list_resource, patch_resource
from app.models import Field
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import FieldIn, FieldOut, FieldUpdate

router = APIRouter(prefix="/farms/{farm_id}/fields", tags=["fields"])


@router.get("", response_model=Page[FieldOut])
def list_fields(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, Field, pagination)


@router.post("", response_model=FieldOut)
def create_field(farm_id: UUID, payload: FieldIn, db: DbDep, current_user: CurrentUser):
    return create_resource(db, current_user, farm_id, Field, payload)


@router.get("/{field_id}", response_model=FieldOut)
def get_field(farm_id: UUID, field_id: UUID, db: DbDep, current_user: CurrentUser):
    return get_resource(db, current_user, farm_id, field_id, Field)


@router.patch("/{field_id}", response_model=FieldOut)
def patch_field(farm_id: UUID, field_id: UUID, payload: FieldUpdate, db: DbDep, current_user: CurrentUser):
    return patch_resource(db, current_user, farm_id, field_id, Field, payload)


@router.delete("/{field_id}", status_code=204)
def delete_field(farm_id: UUID, field_id: UUID, db: DbDep, current_user: CurrentUser):
    delete_resource(db, current_user, farm_id, field_id, Field)
