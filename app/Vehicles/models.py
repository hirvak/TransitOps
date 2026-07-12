import uuid
from enum import Enum
from datetime import date
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Numeric, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Trips.models import Trip
    from app.Maintenance.models import MaintenanceLog
    from app.Fuel.models import FuelLog
    from app.Expenses.models import Expense


class VehicleType(str, Enum):
    TRUCK = "TRUCK"
    VAN = "VAN"
    LORRY = "LORRY"
    CONTAINER = "CONTAINER"
    CAR = "CAR"
    BUS = "BUS"
    TRAILER = "TRAILER"
    PICKUP = "PICKUP"


class VehicleStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    IN_SHOP = "IN_SHOP"
    RETIRED = "RETIRED"


class DocumentType(str, Enum):
    RC_BOOK = "RC_BOOK"
    INSURANCE = "INSURANCE"
    PUC = "PUC"
    FITNESS_CERTIFICATE = "FITNESS_CERTIFICATE"
    OTHER = "OTHER"


class Vehicle(BaseModel):
    __tablename__ = "vehicles"

    registration_number: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        index=True, 
        nullable=False
    )
    vehicle_name: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_model: Mapped[str] = mapped_column(String(100), nullable=False)
    vehicle_type: Mapped[VehicleType] = mapped_column(
        SQLEnum(VehicleType, name="vehicle_type_enum"),
        nullable=False,
        default=VehicleType.TRUCK
    )
    maximum_load_capacity: Mapped[float] = mapped_column(
        Numeric(10, 2), 
        nullable=False
    )
    odometer_reading: Mapped[float] = mapped_column(
        Numeric(10, 2), 
        nullable=False, 
        default=0.0
    )
    acquisition_cost: Mapped[float] = mapped_column(
        Numeric(12, 2), 
        nullable=False
    )
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[VehicleStatus] = mapped_column(
        SQLEnum(VehicleStatus, name="vehicle_status_enum"),
        nullable=False,
        default=VehicleStatus.AVAILABLE
    )

    # Relationships
    trips: Mapped[List["Trip"]] = relationship(
        "Trip",
        back_populates="vehicle",
        lazy="selectin"
    )
    documents: Mapped[List["VehicleDocument"]] = relationship(
        "VehicleDocument",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    maintenance_logs: Mapped[List["MaintenanceLog"]] = relationship(
        "MaintenanceLog",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    fuel_logs: Mapped[List["FuelLog"]] = relationship(
        "FuelLog",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    expenses: Mapped[List["Expense"]] = relationship(
        "Expense",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class VehicleDocument(BaseModel):
    __tablename__ = "vehicle_documents"

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    document_name: Mapped[str] = mapped_column(String(100), nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType, name="document_type_enum"),
        nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="documents",
        lazy="selectin"
    )
