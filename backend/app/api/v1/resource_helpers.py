from typing import Any
from uuid import UUID

from app.api.deps import CurrentUser, DbDep
from app.schemas.common import PaginationParams
from app.services.crud import FarmCrudService


def page_response(items: list[Any], total: int, pagination: PaginationParams) -> dict[str, Any]:
    return {
        "items": items,
        "limit": pagination.limit,
        "offset": pagination.offset,
        "total": total,
    }


def list_resource(
    db: DbDep,
    current_user: CurrentUser,
    farm_id: UUID,
    model: type,
    pagination: PaginationParams,
) -> dict[str, Any]:
    items, total = FarmCrudService(db, model).list(
        farm_id, current_user, pagination.limit, pagination.offset
    )
    return page_response(items, total, pagination)


def get_resource(db: DbDep, current_user: CurrentUser, farm_id: UUID, object_id: UUID, model: type):
    return FarmCrudService(db, model).get(farm_id, object_id, current_user)


def create_resource(db: DbDep, current_user: CurrentUser, farm_id: UUID, model: type, payload):
    return FarmCrudService(db, model).create(farm_id, current_user, payload.model_dump())


def patch_resource(db: DbDep, current_user: CurrentUser, farm_id: UUID, object_id: UUID, model: type, payload):
    return FarmCrudService(db, model).update(
        farm_id, object_id, current_user, payload.model_dump(exclude_unset=True)
    )


def delete_resource(db: DbDep, current_user: CurrentUser, farm_id: UUID, object_id: UUID, model: type):
    FarmCrudService(db, model).delete(farm_id, object_id, current_user)
