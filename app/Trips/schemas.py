import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.Trips.models import TripStatus
from app.Vehicles.schemas import VehicleResponse
from app.Drivers.schemas import DriverResponse
from app.Users.schemas import UserResponse


class TripBase(BaseModel):
    origin: str = Field(..., min_length=1, max_length=255, description="Source/origin location of the trip")
    destination: str = Field(..., min_length=1, max_length=255, description="Destination location of the trip")
    vehicle_id: uuid.UUID = Field(..., description="ID of the assigned vehicle")
    driver_id: uuid.UUID = Field(..., description="ID of the assigned driver")
    cargo_weight: float = Field(..., description="Weight of cargo in kg")
    planned_distance: float = Field(..., description="Planned distance in km")
    planned_departure: datetime = Field(..., description="Planned departure date and time")
    remarks: Optional[str] = Field(None, max_length=500, description="Remarks or notes about the trip")


class CreateTripRequest(TripBase):
    @field_validator("cargo_weight")
    @classmethod
    def validate_cargo_weight(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("cargo_weight must be greater than 0")
        return v

    @field_validator("planned_distance")
    @classmethod
    def validate_planned_distance(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("planned_distance must be greater than 0")
        return v

    @field_validator("planned_departure")
    @classmethod
    def validate_planned_departure(cls, v: datetime) -> datetime:
        now = datetime.now(v.tzinfo) if v.tzinfo else datetime.now()
        if v < now:
            raise ValueError("planned_departure cannot be in the past")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "origin": "Chicago, IL",
                "destination": "Detroit, MI",
                "vehicle_id": "5b8ec938-5587-4f4a-a103-981cb6a23d04",
                "driver_id": "001dd5d7-2f13-47a8-9a1f-e2bd5be76b3e",
                "cargo_weight": 15000.0,
                "planned_distance": 450.0,
                "planned_departure": "2026-07-13T10:00:00Z",
                "remarks": "Standard freight shipment."
            }
        }
    )


class UpdateTripRequest(BaseModel):
    origin: Optional[str] = Field(None, min_length=1, max_length=255)
    destination: Optional[str] = Field(None, min_length=1, max_length=255)
    vehicle_id: Optional[uuid.UUID] = None
    driver_id: Optional[uuid.UUID] = None
    cargo_weight: Optional[float] = None
    planned_distance: Optional[float] = None
    planned_departure: Optional[datetime] = None
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("cargo_weight")
    @classmethod
    def validate_cargo_weight(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("cargo_weight must be greater than 0")
        return v

    @field_validator("planned_distance")
    @classmethod
    def validate_planned_distance(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("planned_distance must be greater than 0")
        return v

    @field_validator("planned_departure")
    @classmethod
    def validate_planned_departure(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            now = datetime.now(v.tzinfo) if v.tzinfo else datetime.now()
            if v < now:
                raise ValueError("planned_departure cannot be in the past")
        return v


class CompleteTripRequest(BaseModel):
    end_odometer: float = Field(..., description="Ending odometer reading of the vehicle")
    actual_distance: float = Field(..., description="Actual distance traveled in km")
    fuel_consumed: float = Field(..., description="Fuel consumed in liters")
    revenue: float = Field(..., description="Revenue generated from the trip")
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("end_odometer")
    @classmethod
    def validate_end_odometer(cls, v: float) -> float:
        if v < 0:
            raise ValueError("end_odometer must be non-negative")
        return v

    @field_validator("actual_distance")
    @classmethod
    def validate_actual_distance(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("actual_distance must be greater than 0")
        return v

    @field_validator("fuel_consumed")
    @classmethod
    def validate_fuel_consumed(cls, v: float) -> float:
        if v < 0:
            raise ValueError("fuel_consumed must be non-negative")
        return v

    @field_validator("revenue")
    @classmethod
    def validate_revenue(cls, v: float) -> float:
        if v < 0:
            raise ValueError("revenue must be non-negative")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "end_odometer": 10450.0,
                "actual_distance": 450.0,
                "fuel_consumed": 90.0,
                "revenue": 1200.0,
                "remarks": "Delivery completed on schedule."
            }
        }
    )


class TripResponse(BaseModel):
    id: uuid.UUID
    trip_number: str
    origin: str
    destination: str
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID
    created_by_id: uuid.UUID
    cargo_weight: float
    planned_distance: float
    actual_distance: Optional[float] = None
    fuel_consumed: Optional[float] = None
    revenue: Optional[float] = None
    start_odometer: float
    end_odometer: Optional[float] = None
    status: TripStatus
    planned_departure: datetime
    dispatch_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    actual_departure: Optional[datetime] = None
    actual_arrival: Optional[datetime] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    vehicle: Optional[VehicleResponse] = None
    driver: Optional[DriverResponse] = None
    creator: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class PaginationResponse(BaseModel):
    total_records: int
    total_pages: int
    current_page: int
    page_size: int


class TripListResponse(BaseModel):
    data: List[TripResponse]
    pagination: PaginationResponse


class TripStatisticsResponse(BaseModel):
    total_trips: int
    draft: int
    dispatched: int
    completed: int
    cancelled: int
    active_trips: int
    todays_trips: int = Field(..., alias="today's_trips")
    total_distance: float
    total_revenue: float
    average_trip_distance: float
    average_revenue: float
    total_cargo_weight: float
    active_vehicles: int
    active_drivers: int
    fleet_utilization: float
    average_trip_duration: float

    model_config = ConfigDict(populate_by_name=True)
