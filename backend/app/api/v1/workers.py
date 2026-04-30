from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import create_resource, delete_resource, get_resource, list_resource, patch_resource
from app.models import Worker
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import WorkerIn, WorkerOut, WorkerUpdate

router = APIRouter(prefix="/farms/{farm_id}/workers", tags=["workers"])


@router.get("", response_model=Page[WorkerOut])
def list_workers(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, Worker, pagination)


@router.post("", response_model=WorkerOut)
def create_worker(farm_id: UUID, payload: WorkerIn, db: DbDep, current_user: CurrentUser):
    return create_resource(db, current_user, farm_id, Worker, payload)


@router.get("/{worker_id}", response_model=WorkerOut)
def get_worker(farm_id: UUID, worker_id: UUID, db: DbDep, current_user: CurrentUser):
    return get_resource(db, current_user, farm_id, worker_id, Worker)


@router.patch("/{worker_id}", response_model=WorkerOut)
def patch_worker(
    farm_id: UUID, worker_id: UUID, payload: WorkerUpdate, db: DbDep, current_user: CurrentUser
):
    return patch_resource(db, current_user, farm_id, worker_id, Worker, payload)


@router.delete("/{worker_id}", status_code=204)
def delete_worker(farm_id: UUID, worker_id: UUID, db: DbDep, current_user: CurrentUser):
    delete_resource(db, current_user, farm_id, worker_id, Worker)

