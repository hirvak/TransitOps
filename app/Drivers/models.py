from enum import Enum
from datetime import date
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Numeric, Date, Enum as SQLEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Trips.models import Trip


class DriverStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    OFF_DUTY = "OFF_DUTY"
    SUSPENDED = "SUSPENDED"


class Driver(BaseModel):
    __tablename__ = "drivers"

    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    license_number: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False
    )
    license_category: Mapped[str] = mapped_column(String(50), nullable=False)
    license_expiry: Mapped[date] = mapped_column(Date, nullable=False)
    safety_score: Mapped[float] = mapped_column(
        Numeric(5, 2), 
        nullable=False, 
        default=100.0
    )
    status: Mapped[DriverStatus] = mapped_column(
        SQLEnum(DriverStatus, name="driver_status_enum"),
        nullable=False,
        default=DriverStatus.AVAILABLE
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    trips: Mapped[List["Trip"]] = relationship(
        "Trip",
        back_populates="driver",
        lazy="selectin"
    )
