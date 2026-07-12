import uuid
from enum import Enum
from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import String, Numeric, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Vehicles.models import Vehicle


class MaintenanceStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class MaintenanceLog(BaseModel):
    __tablename__ = "maintenance_logs"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    maintenance_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[MaintenanceStatus] = mapped_column(
        SQLEnum(MaintenanceStatus, name="maintenance_status_enum"),
        nullable=False,
        default=MaintenanceStatus.OPEN
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    performed_by: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="maintenance_logs",
        lazy="selectin"
    )
