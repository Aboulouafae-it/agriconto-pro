from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import delete_resource, get_resource, list_resource, patch_resource
from app.core.audit import audit_create, audit_custom_event
from app.core.exceptions import ValidationError
from app.core.permissions import ensure_can_create, ensure_can_read, require_farm_access_to_entity
from app.models import Document
from app.models.enums import DocumentStatus
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import DocumentOut, DocumentUpdate
from app.storage.local import LocalDocumentStorage

router = APIRouter(prefix="/farms/{farm_id}/documents", tags=["documents"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
}
RELATED_ENTITY_TYPES = {
    "crop": "Crop",
    "expense": "Expense",
    "sale": "Sale",
    "supplier": "Supplier",
    "customer": "Customer",
    "worker": "Worker",
    "worker_advance": "WorkerAdvance",
    "worker_payment": "WorkerPayment",
    "workday": "Workday",
}


def safe_original_name(filename: str | None) -> str:
    safe_name = Path(filename or "document").name.replace("\r", "").replace("\n", "")
    return safe_name[:255] or "document"


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    farm_id: UUID,
    title: Annotated[str, Form(min_length=1, max_length=255)],
    document_type: Annotated[str, Form(min_length=1, max_length=120)],
    file: Annotated[UploadFile, File()],
    db: DbDep,
    current_user: CurrentUser,
    related_entity_type: Annotated[str | None, Form(max_length=80)] = None,
    related_entity_id: Annotated[UUID | None, Form()] = None,
    notes: Annotated[str | None, Form(max_length=4000)] = None,
):
    ensure_can_create(db, farm_id, current_user, "Document")
    if related_entity_type or related_entity_id:
        entity_type = RELATED_ENTITY_TYPES.get(str(related_entity_type))
        if not entity_type or not related_entity_id:
            raise ValidationError("Riferimento documento non valido")
        require_farm_access_to_entity(db, current_user.id, farm_id, entity_type, related_entity_id)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError("Tipo file non consentito")
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValidationError("File troppo grande")
    stored_file = LocalDocumentStorage().save(file.filename or "document", content)
    document = Document(
        farm_id=farm_id,
        created_by_id=current_user.id,
        title=title,
        document_type=document_type,
        original_file_name=safe_original_name(file.filename),
        stored_file_name=stored_file.stored_file_name,
        storage_key=stored_file.storage_key,
        mime_type=file.content_type,
        size_bytes=stored_file.size_bytes,
        uploaded_by=current_user.id,
        uploaded_at=datetime.now(timezone.utc),
        status=DocumentStatus.RECEIVED,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        notes=notes,
    )
    db.add(document)
    db.flush()
    audit_create(db, farm_id, current_user.id, document)
    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=Page[DocumentOut])
def list_documents(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, Document, pagination)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(farm_id: UUID, document_id: UUID, db: DbDep, current_user: CurrentUser):
    return get_resource(db, current_user, farm_id, document_id, Document)


@router.patch("/{document_id}", response_model=DocumentOut)
def patch_document(
    farm_id: UUID,
    document_id: UUID,
    payload: DocumentUpdate,
    db: DbDep,
    current_user: CurrentUser,
):
    data = payload.model_dump(exclude_unset=True)
    related_entity_type = data.get("related_entity_type")
    related_entity_id = data.get("related_entity_id")
    if related_entity_type or related_entity_id:
        entity_type = RELATED_ENTITY_TYPES.get(str(related_entity_type))
        if not entity_type or not related_entity_id:
            raise ValidationError("Riferimento documento non valido")
        require_farm_access_to_entity(db, current_user.id, farm_id, entity_type, related_entity_id)
    return patch_resource(db, current_user, farm_id, document_id, Document, payload)


@router.get("/{document_id}/download")
def download_document(farm_id: UUID, document_id: UUID, db: DbDep, current_user: CurrentUser):
    ensure_can_read(db, farm_id, current_user, "Document")
    document = require_farm_access_to_entity(db, current_user.id, farm_id, "Document", document_id)
    if not document.storage_key:
        raise ValidationError("Documento senza file allegato")
    content = LocalDocumentStorage().read(document.storage_key)
    audit_custom_event(
        db,
        farm_id,
        current_user.id,
        "download",
        "Document",
        document.id,
        new_value={
            "document_id": document.id,
            "title": document.title,
            "mime_type": document.mime_type,
            "size_bytes": document.size_bytes,
        },
    )
    db.commit()
    download_name = safe_original_name(document.original_file_name or document.title)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )


@router.delete("/{document_id}", status_code=204)
def delete_document(farm_id: UUID, document_id: UUID, db: DbDep, current_user: CurrentUser):
    delete_resource(db, current_user, farm_id, document_id, Document)
