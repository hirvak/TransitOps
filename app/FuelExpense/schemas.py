import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.FuelExpense.models import FuelType, ExpenseType
from app.Vehicles.schemas import VehicleResponse
from app.Trips.schemas import TripResponse


# --- Fuel Log Schemas ---

class FuelLogBase(BaseModel):
    vehicle_id: uuid.UUID
    trip_id: uuid.UUID
    fuel_type: FuelType
    station_name: str = Field(..., min_length=1, max_length=100)
    location: Optional[str] = Field(None, max_length=255)
    fuel_quantity: float = Field(..., description="Quantity in liters")
    price_per_liter: float
    odometer_reading: float
    fuel_date: date
    notes: Optional[str] = Field(None, max_length=500)


class CreateFuelLogRequest(FuelLogBase):
    @field_validator("fuel_quantity")
    @classmethod
    def validate_fuel_quantity(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("fuel_quantity must be greater than 0")
        return v

    @field_validator("price_per_liter")
    @classmethod
    def validate_price_per_liter(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("price_per_liter must be greater than 0")
        return v

    @field_validator("odometer_reading")
    @classmethod
    def validate_odometer_reading(cls, v: float) -> float:
        if v < 0:
            raise ValueError("odometer_reading must be non-negative")
        return v

    @field_validator("fuel_date")
    @classmethod
    def validate_fuel_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("fuel_date cannot be in the future")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vehicle_id": "5b8ec938-5587-4f4a-a103-981cb6a23d04",
                "trip_id": "00a5d5d7-2f13-47a8-9a1f-e2bd5be76b3e",
                "fuel_type": "DIESEL",
                "station_name": "Shell Express",
                "location": "100 Interstate 90, Chicago, IL",
                "fuel_quantity": 80.0,
                "price_per_liter": 1.50,
                "odometer_reading": 10520.0,
                "fuel_date": "2026-07-12",
                "notes": "Filled up before parking."
            }
        }
    )


class UpdateFuelLogRequest(BaseModel):
    vehicle_id: Optional[uuid.UUID] = None
    trip_id: Optional[uuid.UUID] = None
    fuel_type: Optional[FuelType] = None
    station_name: Optional[str] = Field(None, min_length=1, max_length=100)
    location: Optional[str] = Field(None, max_length=255)
    fuel_quantity: Optional[float] = None
    price_per_liter: Optional[float] = None
    odometer_reading: Optional[float] = None
    fuel_date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("fuel_quantity")
    @classmethod
    def validate_fuel_quantity(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("fuel_quantity must be greater than 0")
        return v

    @field_validator("price_per_liter")
    @classmethod
    def validate_price_per_liter(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("price_per_liter must be greater than 0")
        return v

    @field_validator("odometer_reading")
    @classmethod
    def validate_odometer_reading(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("odometer_reading must be non-negative")
        return v

    @field_validator("fuel_date")
    @classmethod
    def validate_fuel_date(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("fuel_date cannot be in the future")
        return v


class FuelLogResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    trip_id: uuid.UUID
    fuel_type: FuelType
    station_name: str
    location: Optional[str]
    fuel_quantity: float
    price_per_liter: float
    total_cost: float
    odometer_reading: float
    fuel_date: date
    notes: Optional[str]
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    vehicle: Optional[VehicleResponse] = None
    trip: Optional[TripResponse] = None
    fuel_efficiency: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class FuelLogListResponse(BaseModel):
    data: List[FuelLogResponse]
    pagination: dict


# --- Expense Schemas ---

class ExpenseBase(BaseModel):
    vehicle_id: uuid.UUID
    trip_id: Optional[uuid.UUID] = None
    expense_type: ExpenseType
    amount: float
    expense_date: date
    description: str = Field(..., min_length=1, max_length=500)


class CreateExpenseRequest(ExpenseBase):
    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("expense_date")
    @classmethod
    def validate_expense_date(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("expense_date cannot be in the future")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vehicle_id": "5b8ec938-5587-4f4a-a103-981cb6a23d04",
                "trip_id": "00a5d5d7-2f13-47a8-9a1f-e2bd5be76b3e",
                "expense_type": "TOLL",
                "amount": 25.50,
                "expense_date": "2026-07-12",
                "description": "I-90 East highway toll booth."
            }
        }
    )


class UpdateExpenseRequest(BaseModel):
    vehicle_id: Optional[uuid.UUID] = None
    trip_id: Optional[uuid.UUID] = None
    expense_type: Optional[ExpenseType] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("expense_date")
    @classmethod
    def validate_expense_date(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("expense_date cannot be in the future")
        return v


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    trip_id: Optional[uuid.UUID]
    expense_type: ExpenseType
    amount: float
    expense_date: date
    description: str
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    vehicle: Optional[VehicleResponse] = None
    trip: Optional[TripResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ExpenseListResponse(BaseModel):
    data: List[ExpenseResponse]
    pagination: dict


# --- Statistics and Summary Schemas ---

class FuelExpenseStatisticsResponse(BaseModel):
    total_fuel_cost: float
    total_other_expenses: float
    maintenance_cost: float
    operational_cost: float
    total_fuel_quantity: float
    average_fuel_efficiency: Optional[float] = None
    cost_per_km: Optional[float] = None
    highest_expense_vehicle: Optional[str] = None
    highest_fuel_consuming_vehicle: Optional[str] = None
    total_expenses_count: int
    total_fuel_logs: int
    highest_cost_trip: Optional[str] = None
    average_cost_per_trip: float


class VehicleFinancialSummaryResponse(BaseModel):
    vehicle_registration: str
    total_trips: int
    total_distance: float
    total_fuel_quantity: float
    total_fuel_cost: float
    total_expenses: float
    maintenance_cost: float
    operational_cost: float
    fuel_efficiency: Optional[float] = None
    cost_per_km: Optional[float] = None
