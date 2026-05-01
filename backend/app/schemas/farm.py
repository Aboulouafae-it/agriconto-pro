from pydantic import BaseModel, Field
from uuid import UUID

from app.models.enums import FarmRole, FiscalProfile


class FarmCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    legal_name: str | None = Field(default=None, max_length=255)
    partita_iva: str | None = Field(default=None, max_length=32)
    codice_fiscale: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    province: str | None = Field(default=None, max_length=2)
    region: str | None = Field(default=None, max_length=120)
    fiscal_profile: FiscalProfile


class FarmRead(FarmCreate):
    id: UUID
    role: FarmRole | None = None

    model_config = {"from_attributes": True}


class FarmUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    legal_name: str | None = Field(default=None, max_length=255)
    partita_iva: str | None = Field(default=None, max_length=32)
    codice_fiscale: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    province: str | None = Field(default=None, max_length=2)
    region: str | None = Field(default=None, max_length=120)
    fiscal_profile: FiscalProfile | None = None


class FarmMemberRead(BaseModel):
    id: UUID
    user_id: UUID
    farm_id: UUID
    role: FarmRole

    model_config = {"from_attributes": True}
