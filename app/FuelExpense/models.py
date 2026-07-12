import uuid
from enum import Enum
from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import String, Numeric, Date, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Vehicles.models import Vehicle
    from app.Trips.models import Trip
    from app.Users.models import User


class FuelType(str, Enum):
    PETROL = "PETROL"
    DIESEL = "DIESEL"
    CNG = "CNG"
    ELECTRIC = "ELECTRIC"


class ExpenseType(str, Enum):
    TOLL = "TOLL"
    PARKING = "PARKING"
    REPAIR = "REPAIR"
    INSURANCE = "INSURANCE"
    FINE = "FINE"
    MAINTENANCE = "MAINTENANCE"
    OTHER = "OTHER"


class FuelLog(BaseModel):
    __tablename__ = "fuel_logs"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    fuel_type: Mapped[FuelType] = mapped_column(
        SQLEnum(FuelType, name="fuel_type_enum"),
        nullable=False,
        default=FuelType.DIESEL
    )
    station_name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fuel_quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_per_liter: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    odometer_reading: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    fuel_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="fuel_logs",
        lazy="selectin"
    )
    trip: Mapped["Trip"] = relationship(
        "Trip",
        back_populates="fuel_logs",
        lazy="selectin"
    )
    creator: Mapped["User"] = relationship(
        "User",
        lazy="selectin"
    )


class Expense(BaseModel):
    __tablename__ = "expenses"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    trip_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    expense_type: Mapped[ExpenseType] = mapped_column(
        SQLEnum(ExpenseType, name="expense_type_enum"),
        nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="expenses",
        lazy="selectin"
    )
    trip: Mapped["Trip | None"] = relationship(
        "Trip",
        lazy="selectin"
    )
    creator: Mapped["User"] = relationship(
        "User",
        lazy="selectin"
    )
