from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import ValidationError

from app.analytics.schemas import AnalyticsFilters, AnalyticsResponse
from app.analytics.services.center import AnalyticsCenterService
from app.api.deps import CurrentUser, DbDep
from app.core.exceptions import ValidationError as ApiValidationError

router = APIRouter(prefix="/farms/{farm_id}/analytics", tags=["analytics"])


def build_filters(
    start_date: date | None = None,
    end_date: date | None = None,
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    quarter: int | None = Query(default=None, ge=1, le=4),
    season: str | None = Query(default=None, max_length=80),
    crop_id: UUID | None = None,
    field_id: UUID | None = None,
    worker_id: UUID | None = None,
    supplier_id: UUID | None = None,
    customer_id: UUID | None = None,
    expense_category: str | None = Query(default=None, max_length=120),
    payment_status: str | None = Query(default=None, max_length=40),
    document_status: str | None = Query(default=None, max_length=40),
    compare_previous: bool = False,
) -> AnalyticsFilters:
    try:
        return AnalyticsFilters(
            start_date=start_date,
            end_date=end_date,
            year=year,
            month=month,
            quarter=quarter,
            season=season,
            crop_id=crop_id,
            field_id=field_id,
            worker_id=worker_id,
            supplier_id=supplier_id,
            customer_id=customer_id,
            expense_category=expense_category,
            payment_status=payment_status,
            document_status=document_status,
            compare_previous=compare_previous,
        )
    except ValidationError as exc:
        raise ApiValidationError("Filtri analytics non validi") from exc


def response(farm_id: UUID, section: str, filters: AnalyticsFilters, data: dict) -> dict:
    return {"farm_id": farm_id, "section": section, "filters": filters, "data": data}


@router.get("/overview", response_model=AnalyticsResponse)
def overview(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).overview(farm_id, current_user, filters)
    return response(farm_id, "overview", filters, data)


@router.get("/financial", response_model=AnalyticsResponse)
def financial(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).financial(farm_id, current_user, filters)
    return response(farm_id, "financial", filters, data)


@router.get("/crops", response_model=AnalyticsResponse)
def crops(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).crops(farm_id, current_user, filters)
    return response(farm_id, "crops", filters, data)


@router.get("/fields", response_model=AnalyticsResponse)
def fields(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).fields(farm_id, current_user, filters)
    return response(farm_id, "fields", filters, data)


@router.get("/labor", response_model=AnalyticsResponse)
def labor(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).labor(farm_id, current_user, filters)
    return response(farm_id, "labor", filters, data)


@router.get("/expenses", response_model=AnalyticsResponse)
def expenses(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).expenses(farm_id, current_user, filters)
    return response(farm_id, "expenses", filters, data)


@router.get("/sales", response_model=AnalyticsResponse)
def sales(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).sales(farm_id, current_user, filters)
    return response(farm_id, "sales", filters, data)


@router.get("/documents", response_model=AnalyticsResponse)
def documents(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).documents(farm_id, current_user, filters)
    return response(farm_id, "documents", filters, data)


@router.get("/comparison", response_model=AnalyticsResponse)
def comparison(farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)):
    data = AnalyticsCenterService(db).comparison(farm_id, current_user, filters)
    return response(farm_id, "comparison", filters, data)


@router.get("/advanced-metrics", response_model=AnalyticsResponse)
def advanced_metrics(
    farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)
):
    data = AnalyticsCenterService(db).advanced_metrics(farm_id, current_user, filters)
    return response(farm_id, "advanced_metrics", filters, data)


@router.get("/tables", response_model=AnalyticsResponse)
def detailed_tables(
    farm_id: UUID, db: DbDep, current_user: CurrentUser, filters: AnalyticsFilters = Depends(build_filters)
):
    data = AnalyticsCenterService(db).detailed_tables(farm_id, current_user, filters)
    return response(farm_id, "tables", filters, data)
