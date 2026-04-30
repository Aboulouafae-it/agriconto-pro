from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import create_resource, list_resource, patch_resource
from app.models import DocumentRequest
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import DocumentRequestIn, DocumentRequestOut, DocumentRequestUpdate

router = APIRouter(prefix="/farms/{farm_id}/document-requests", tags=["document requests"])


@router.get("", response_model=Page[DocumentRequestOut])
def list_document_requests(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, DocumentRequest, pagination)


@router.post("", response_model=DocumentRequestOut)
def create_document_request(
    farm_id: UUID, payload: DocumentRequestIn, db: DbDep, current_user: CurrentUser
):
    return create_resource(db, current_user, farm_id, DocumentRequest, payload)


@router.patch("/{request_id}", response_model=DocumentRequestOut)
def patch_document_request(
    farm_id: UUID,
    request_id: UUID,
    payload: DocumentRequestUpdate,
    db: DbDep,
    current_user: CurrentUser,
):
    return patch_resource(db, current_user, farm_id, request_id, DocumentRequest, payload)

