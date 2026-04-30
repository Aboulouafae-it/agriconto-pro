from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.models import AuditLog

REDACTED_FIELDS = {"password", "password_hash", "token", "access_token"}
DOCUMENT_CONTENT_FIELDS = {"content", "file", "bytes", "raw", "document_content"}


@dataclass(frozen=True)
class AuditContext:
    ip_address: str | None = None
    user_agent: str | None = None


def audit_custom_event(
    db: Session,
    farm_id: UUID,
    user_id: UUID,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    context: AuditContext | None = None,
) -> None:
    context = context or AuditContext()
    db.add(
        AuditLog(
            farm_id=farm_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=jsonable_encoder(_redact(old_value)),
            new_value=jsonable_encoder(_redact(new_value)),
            ip_address=context.ip_address,
            user_agent=context.user_agent,
        )
    )


def audit_create(
    db: Session,
    farm_id: UUID,
    user_id: UUID,
    entity: Any,
    context: AuditContext | None = None,
) -> None:
    audit_custom_event(
        db,
        farm_id,
        user_id,
        "create",
        entity.__class__.__name__,
        getattr(entity, "id", None),
        new_value=snapshot(entity),
        context=context,
    )


def audit_update(
    db: Session,
    farm_id: UUID,
    user_id: UUID,
    entity: Any,
    old_value: dict[str, Any],
    context: AuditContext | None = None,
    action: str = "update",
) -> None:
    audit_custom_event(
        db,
        farm_id,
        user_id,
        action,
        entity.__class__.__name__,
        getattr(entity, "id", None),
        old_value=old_value,
        new_value=snapshot(entity),
        context=context,
    )


def audit_delete(
    db: Session,
    farm_id: UUID,
    user_id: UUID,
    entity: Any,
    context: AuditContext | None = None,
) -> None:
    audit_custom_event(
        db,
        farm_id,
        user_id,
        "delete",
        entity.__class__.__name__,
        getattr(entity, "id", None),
        old_value=snapshot(entity),
        context=context,
    )


def audit(
    db: Session,
    farm_id: UUID,
    actor_id: UUID,
    action: str,
    entity: Any,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> None:
    audit_custom_event(
        db,
        farm_id,
        actor_id,
        action,
        entity.__class__.__name__,
        getattr(entity, "id", None),
        old_value=before,
        new_value=after,
    )


def snapshot(entity: Any) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for column in entity.__table__.columns:
        name = column.name
        if name in REDACTED_FIELDS:
            continue
        values[name] = getattr(entity, name)
    return jsonable_encoder(values)


def _redact(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if payload is None:
        return None
    return {
        key: ("[REDACTED]" if key in REDACTED_FIELDS or key in DOCUMENT_CONTENT_FIELDS else value)
        for key, value in payload.items()
    }
