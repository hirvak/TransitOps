import uuid
from enum import Enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Vehicles.models import Vehicle
    from app.Drivers.models import Driver
    from app.Users.models import User


class TripStatus(str, Enum):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Trip(BaseModel):
    __tablename__ = "trips"

    trip_number: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("drivers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    origin: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    cargo_weight: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    planned_distance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    actual_distance: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    fuel_consumed: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    revenue: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    planned_departure: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    dispatch_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[TripStatus] = mapped_column(
        SQLEnum(TripStatus, name="trip_status_enum"),
        nullable=False,
        default=TripStatus.DRAFT
    )
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="trips",
        lazy="selectin"
    )
    driver: Mapped["Driver"] = relationship(
        "Driver",
        back_populates="trips",
        lazy="selectin"
    )
    creator: Mapped["User"] = relationship(
        "User",
        back_populates="created_trips",
        lazy="selectin"
    )
