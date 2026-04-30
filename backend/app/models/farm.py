from uuid import UUID as PyUUID

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import FarmMemberStatus, FarmRole, FiscalProfile
from app.models.mixins import IdMixin, TimestampMixin


class Farm(IdMixin, TimestampMixin, Base):
    __tablename__ = "farms"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(255))
    partita_iva: Mapped[str | None] = mapped_column(String(32))
    codice_fiscale: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(120))
    province: Mapped[str | None] = mapped_column(String(2))
    region: Mapped[str | None] = mapped_column(String(120))
    fiscal_profile: Mapped[FiscalProfile] = mapped_column(Enum(FiscalProfile), nullable=False)
    owner_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    members = relationship("FarmMember", back_populates="farm", cascade="all, delete-orphan")


class FarmMember(IdMixin, TimestampMixin, Base):
    __tablename__ = "farm_members"
    __table_args__ = (UniqueConstraint("farm_id", "user_id"),)

    farm_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[FarmRole] = mapped_column(Enum(FarmRole), nullable=False)
    status: Mapped[FarmMemberStatus] = mapped_column(
        Enum(FarmMemberStatus), default=FarmMemberStatus.ACTIVE, nullable=False
    )

    farm = relationship("Farm", back_populates="members")
    user = relationship("User", back_populates="memberships")
