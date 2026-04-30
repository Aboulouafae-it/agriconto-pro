from typing import Any, Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class Repository(Generic[ModelT]):
    def __init__(self, db: Session, model: type[ModelT]):
        self.db = db
        self.model = model

    def get(self, object_id: UUID) -> ModelT | None:
        return self.db.get(self.model, object_id)

    def list_for_farm(self, farm_id: UUID, limit: int = 50, offset: int = 0) -> list[ModelT]:
        statement: Select[Any] = (
            select(self.model)
            .where(self.model.farm_id == farm_id)
            .order_by(self.model.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.scalars(statement))

    def count_for_farm(self, farm_id: UUID) -> int:
        statement = select(func.count()).select_from(self.model).where(self.model.farm_id == farm_id)
        return int(self.db.scalar(statement) or 0)

    def create(self, data: dict[str, Any]) -> ModelT:
        item = self.model(**data)
        self.db.add(item)
        self.db.flush()
        return item

    def update(self, item: ModelT, data: dict[str, Any]) -> ModelT:
        for key, value in data.items():
            setattr(item, key, value)
        self.db.flush()
        return item

    def delete(self, item: ModelT) -> None:
        self.db.delete(item)
        self.db.flush()
