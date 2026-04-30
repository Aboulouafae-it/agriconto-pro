from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.audit import audit_create, audit_delete, audit_update, snapshot
from app.core.exceptions import ValidationError
from app.core.permissions import (
    ensure_can_create,
    ensure_can_delete,
    ensure_can_read,
    ensure_can_update,
    require_farm_access_to_entity,
)
from app.models import (
    Crop,
    Customer,
    Expense,
    Field,
    ReportExport,
    Sale,
    Supplier,
    User,
    Workday,
    Worker,
    WorkerAdvance,
    WorkerPayment,
)
from app.models.enums import FarmRole
from app.repositories.base import Repository

FARM_REFERENCE_RULES = {
    "Crop": {"field_id": Field},
    "WorkdayEntry": {"workday_id": Workday, "worker_id": Worker, "crop_id": Crop},
    "WorkerAdvance": {"worker_id": Worker},
    "WorkerPayment": {"worker_id": Worker},
    "Expense": {"supplier_id": Supplier, "crop_id": Crop},
    "Sale": {"customer_id": Customer, "crop_id": Crop},
}
DOCUMENT_REFERENCE_MODELS = {
    "crop": Crop,
    "expense": Expense,
    "sale": Sale,
    "supplier": Supplier,
    "customer": Customer,
    "worker": Worker,
    "worker_advance": WorkerAdvance,
    "worker_payment": WorkerPayment,
    "workday": Workday,
    "report_export": ReportExport,
}


class FarmCrudService:
    def __init__(self, db: Session, model: type):
        self.db = db
        self.model = model
        self.repo = Repository(db, model)

    def list(self, farm_id: UUID, user: User, limit: int = 50, offset: int = 0) -> tuple[list[Any], int]:
        ensure_can_read(self.db, farm_id, user, self.model.__name__)
        return self.repo.list_for_farm(farm_id, limit, offset), self.repo.count_for_farm(farm_id)

    def get(self, farm_id: UUID, object_id: UUID, user: User) -> Any:
        return require_farm_access_to_entity(self.db, user.id, farm_id, self.model.__name__, object_id)

    def create(self, farm_id: UUID, user: User, data: dict[str, Any]) -> Any:
        membership = ensure_can_create(self.db, farm_id, user, self.model.__name__)
        if (
            self.model.__name__ == "ReportExport"
            and membership.role == FarmRole.ACCOUNTANT
            and data.get("report_type") != "accountant_pack"
        ):
            raise ValidationError("Il commercialista puo esportare solo il pacchetto commercialista")
        self._validate_farm_references(farm_id, data)
        create_data = {**data, "farm_id": farm_id}
        model_columns = self.model.__table__.columns
        if "created_by_id" in model_columns:
            create_data["created_by_id"] = user.id
        if "requested_by" in model_columns:
            create_data["requested_by"] = user.id
        item = self.repo.create(create_data)
        audit_create(self.db, farm_id, user.id, item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update(self, farm_id: UUID, object_id: UUID, user: User, data: dict[str, Any]) -> Any:
        ensure_can_update(self.db, farm_id, user, self.model.__name__)
        self._validate_farm_references(farm_id, data)
        item = require_farm_access_to_entity(self.db, user.id, farm_id, self.model.__name__, object_id)
        before = snapshot(item)
        self.repo.update(item, data)
        audit_update(self.db, farm_id, user.id, item, before)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, farm_id: UUID, object_id: UUID, user: User) -> None:
        ensure_can_delete(self.db, farm_id, user, self.model.__name__)
        item = require_farm_access_to_entity(self.db, user.id, farm_id, self.model.__name__, object_id)
        audit_delete(self.db, farm_id, user.id, item)
        self.repo.delete(item)
        self.db.commit()

    def _validate_farm_references(self, farm_id: UUID, data: dict[str, Any]) -> None:
        for field_name, reference_model in FARM_REFERENCE_RULES.get(self.model.__name__, {}).items():
            reference_id = data.get(field_name)
            if reference_id is None:
                continue
            reference = self.db.get(reference_model, reference_id)
            if not reference or reference.farm_id != farm_id:
                raise ValidationError(f"Riferimento non valido per {field_name}")
        if self.model.__name__ != "Document":
            return
        related_type = data.get("related_entity_type")
        related_id = data.get("related_entity_id")
        if not related_type and not related_id:
            return
        reference_model = DOCUMENT_REFERENCE_MODELS.get(str(related_type))
        if not related_type or not related_id or not reference_model:
            raise ValidationError("Riferimento documento non valido")
        reference = self.db.get(reference_model, related_id)
        if not reference or reference.farm_id != farm_id:
            raise ValidationError("Riferimento documento fuori azienda")
