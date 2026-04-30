from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AnalyticsFilters(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    year: int | None = Field(default=None, ge=2000, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)
    quarter: int | None = Field(default=None, ge=1, le=4)
    season: str | None = Field(default=None, max_length=80)
    crop_id: UUID | None = None
    field_id: UUID | None = None
    worker_id: UUID | None = None
    supplier_id: UUID | None = None
    customer_id: UUID | None = None
    expense_category: str | None = Field(default=None, max_length=120)
    payment_status: str | None = Field(default=None, max_length=40)
    document_status: str | None = Field(default=None, max_length=40)
    compare_previous: bool = False

    @model_validator(mode="after")
    def validate_range(self) -> "AnalyticsFilters":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date deve essere successiva o uguale a start_date")
        if self.month and not self.year:
            raise ValueError("year e richiesto quando month e valorizzato")
        if self.quarter and not self.year:
            raise ValueError("year e richiesto quando quarter e valorizzato")
        return self


class AnalyticsResponse(BaseModel):
    farm_id: UUID
    section: str
    filters: AnalyticsFilters
    data: dict
