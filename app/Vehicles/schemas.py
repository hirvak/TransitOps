import uuid
from datetime import date, datetime
from typing import List, Dict
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.Vehicles.models import VehicleType, VehicleStatus, DocumentType


class VehicleBase(BaseModel):
    registration_number: str = Field(..., min_length=1, max_length=50)
    vehicle_name: str = Field(..., min_length=1, max_length=100)
    vehicle_model: str = Field(..., min_length=1, max_length=100)
    vehicle_type: VehicleType
    maximum_load_capacity: float
    odometer_reading: float
    acquisition_cost: float
    purchase_date: date
    region: str | None = Field(None, max_length=100)
    status: VehicleStatus


class CreateVehicleRequest(VehicleBase):
    @field_validator("acquisition_cost")
    @classmethod
    def val_cost(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Acquisition cost must be greater than zero.")
        return v

    @field_validator("maximum_load_capacity")
    @classmethod
    def val_load(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Maximum load capacity must be greater than zero.")
        return v

    @field_validator("odometer_reading")
    @classmethod
    def val_odometer(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Odometer reading cannot be negative.")
        return v

    @field_validator("purchase_date")
    @classmethod
    def val_purchase_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Purchase date cannot be in the future.")
        return v


class UpdateVehicleRequest(BaseModel):
    registration_number: str | None = Field(None, min_length=1, max_length=50)
    vehicle_name: str | None = Field(None, min_length=1, max_length=100)
    vehicle_model: str | None = Field(None, min_length=1, max_length=100)
    vehicle_type: VehicleType | None = None
    maximum_load_capacity: float | None = None
    odometer_reading: float | None = None
    acquisition_cost: float | None = None
    purchase_date: date | None = None
    region: str | None = Field(None, max_length=100)
    status: VehicleStatus | None = None

    @field_validator("acquisition_cost")
    @classmethod
    def val_cost(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("Acquisition cost must be greater than zero.")
        return v

    @field_validator("maximum_load_capacity")
    @classmethod
    def val_load(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("Maximum load capacity must be greater than zero.")
        return v

    @field_validator("odometer_reading")
    @classmethod
    def val_odometer(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Odometer reading cannot be negative.")
        return v

    @field_validator("purchase_date")
    @classmethod
    def val_purchase_date(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("Purchase date cannot be in the future.")
        return v


class VehicleResponse(VehicleBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleStatisticsResponse(BaseModel):
    total_vehicles: int
    available: int
    on_trip: int
    in_shop: int
    retired: int
    vehicle_types: Dict[str, int]


class PaginationResponse(BaseModel):
    total_records: int
    total_pages: int
    current_page: int
    page_size: int


class VehicleListResponse(BaseModel):
    data: List[VehicleResponse]
    pagination: PaginationResponse


class VehicleDocumentRequest(BaseModel):
    document_name: str = Field(..., min_length=1, max_length=100)
    document_type: DocumentType
    expiry_date: date


class VehicleDocumentResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    document_name: str
    document_type: DocumentType
    file_path: str
    expiry_date: date
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
