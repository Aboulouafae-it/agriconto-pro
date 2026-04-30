from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import create_resource, get_resource, list_resource, patch_resource
from app.models import Sale
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import SaleIn, SaleOut, SaleUpdate

router = APIRouter(prefix="/farms/{farm_id}/sales", tags=["sales"])


@router.get("", response_model=Page[SaleOut])
def list_sales(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, Sale, pagination)


@router.post("", response_model=SaleOut)
def create_sale(farm_id: UUID, payload: SaleIn, db: DbDep, current_user: CurrentUser):
    return create_resource(db, current_user, farm_id, Sale, payload)


@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(farm_id: UUID, sale_id: UUID, db: DbDep, current_user: CurrentUser):
    return get_resource(db, current_user, farm_id, sale_id, Sale)


@router.patch("/{sale_id}", response_model=SaleOut)
def patch_sale(farm_id: UUID, sale_id: UUID, payload: SaleUpdate, db: DbDep, current_user: CurrentUser):
    return patch_resource(db, current_user, farm_id, sale_id, Sale, payload)

