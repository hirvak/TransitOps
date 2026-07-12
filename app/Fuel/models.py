import uuid
from datetime import date
from typing import TYPE_CHECKING
from sqlalchemy import String, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Vehicles.models import Vehicle
    from app.Trips.models import Trip


class FuelLog(BaseModel):
    __tablename__ = "fuel_logs"

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
    refuel_date: Mapped[date] = mapped_column(Date, nullable=False)
    fuel_amount_liters: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_per_liter: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    odometer_reading: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    fuel_station: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="fuel_logs",
        lazy="selectin"
    )
    trip: Mapped["Trip | None"] = relationship(
        "Trip",
        back_populates="fuel_logs",
        lazy="selectin"
    )
