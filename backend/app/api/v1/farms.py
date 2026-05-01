from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbDep
from app.core.audit import audit_create, audit_update, snapshot
from app.core.exceptions import NotFoundError
from app.core.permissions import require_farm_member, require_role
from app.models import Farm, FarmMember
from app.models.enums import FarmRole
from app.schemas.farm import FarmCreate, FarmRead, FarmUpdate
from app.services.farms import FarmService

router = APIRouter(prefix="/farms", tags=["farms"])


@router.get("", response_model=list[FarmRead])
def list_farms(db: DbDep, current_user: CurrentUser):
    rows = db.execute(
        select(Farm, FarmMember.role).join(FarmMember).where(FarmMember.user_id == current_user.id)
    ).all()
    farms: list[Farm] = []
    for farm, role in rows:
        setattr(farm, "role", role)
        farms.append(farm)
    return farms


@router.post("", response_model=FarmRead)
def create_farm(payload: FarmCreate, db: DbDep, current_user: CurrentUser):
    farm = FarmService(db).create_farm(payload, current_user)
    audit_create(db, farm.id, current_user.id, farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.get("/{farm_id}", response_model=FarmRead)
def get_farm(farm_id: UUID, db: DbDep, current_user: CurrentUser):
    require_farm_member(db, current_user.id, farm_id)
    farm = db.get(Farm, farm_id)
    if not farm:
        raise NotFoundError("Azienda non trovata")
    return farm


@router.patch("/{farm_id}", response_model=FarmRead)
def patch_farm(farm_id: UUID, payload: FarmUpdate, db: DbDep, current_user: CurrentUser):
    require_role(db, current_user.id, farm_id, {FarmRole.OWNER})
    farm = db.get(Farm, farm_id)
    if not farm:
        raise NotFoundError("Azienda non trovata")
    before = snapshot(farm)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(farm, key, value)
    db.flush()
    audit_update(db, farm_id, current_user.id, farm, before)
    db.commit()
    db.refresh(farm)
    return farm
