from sqlalchemy.orm import Session

from app.models import Farm, FarmMember, User
from app.models.enums import FarmMemberStatus, FarmRole
from app.schemas.farm import FarmCreate


class FarmService:
    def __init__(self, db: Session):
        self.db = db

    def create_farm(self, payload: FarmCreate, user: User) -> Farm:
        farm = Farm(**payload.model_dump(), owner_id=user.id)
        self.db.add(farm)
        self.db.flush()
        self.db.add(
            FarmMember(
                farm_id=farm.id,
                user_id=user.id,
                role=FarmRole.OWNER,
                status=FarmMemberStatus.ACTIVE,
            )
        )
        return farm
