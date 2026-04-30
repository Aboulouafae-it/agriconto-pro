from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.api.v1.resource_helpers import create_resource, get_resource, list_resource, patch_resource
from app.models import Expense
from app.schemas.common import Page, PaginationParams
from app.schemas.domain import ExpenseIn, ExpenseOut, ExpenseUpdate

router = APIRouter(prefix="/farms/{farm_id}/expenses", tags=["expenses"])


@router.get("", response_model=Page[ExpenseOut])
def list_expenses(
    farm_id: UUID,
    db: DbDep,
    current_user: CurrentUser,
    pagination: Annotated[PaginationParams, Depends()],
):
    return list_resource(db, current_user, farm_id, Expense, pagination)


@router.post("", response_model=ExpenseOut)
def create_expense(farm_id: UUID, payload: ExpenseIn, db: DbDep, current_user: CurrentUser):
    return create_resource(db, current_user, farm_id, Expense, payload)


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(farm_id: UUID, expense_id: UUID, db: DbDep, current_user: CurrentUser):
    return get_resource(db, current_user, farm_id, expense_id, Expense)


@router.patch("/{expense_id}", response_model=ExpenseOut)
def patch_expense(
    farm_id: UUID, expense_id: UUID, payload: ExpenseUpdate, db: DbDep, current_user: CurrentUser
):
    return patch_resource(db, current_user, farm_id, expense_id, Expense, payload)

