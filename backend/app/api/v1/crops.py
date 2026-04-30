from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import create_resource, delete_resource, get_resource, list_resource, patch_resource
from app.models import Crop
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import CropIn, CropOut, CropUpdate

router = APIRouter(prefix="/farms/{farm_id}/crops", tags=["crops"])


@router.get("", response_model=Page[CropOut])
def list_crops(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, Crop, pagination)


@router.post("", response_model=CropOut)
def create_crop(farm_id: UUID, payload: CropIn, db: DbDep, current_user: CurrentUser):
    return create_resource(db, current_user, farm_id, Crop, payload)


@router.get("/{crop_id}", response_model=CropOut)
def get_crop(farm_id: UUID, crop_id: UUID, db: DbDep, current_user: CurrentUser):
    return get_resource(db, current_user, farm_id, crop_id, Crop)


@router.patch("/{crop_id}", response_model=CropOut)
def patch_crop(farm_id: UUID, crop_id: UUID, payload: CropUpdate, db: DbDep, current_user: CurrentUser):
    return patch_resource(db, current_user, farm_id, crop_id, Crop, payload)


@router.delete("/{crop_id}", status_code=204)
def delete_crop(farm_id: UUID, crop_id: UUID, db: DbDep, current_user: CurrentUser):
    delete_resource(db, current_user, farm_id, crop_id, Crop)
