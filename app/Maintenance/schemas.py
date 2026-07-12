import uuid
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.Maintenance.models import MaintenanceStatus


class CreateMaintenanceRequest(BaseModel):
    vehicle_id: uuid.UUID
    maintenance_type: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    estimated_cost: float = Field(..., gt=0, description="Estimated cost must be greater than 0")
    scheduled_date: date


class UpdateMaintenanceRequest(BaseModel):
    maintenance_type: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    estimated_cost: Optional[float] = Field(None, gt=0, description="Estimated cost must be greater than 0")
    scheduled_date: Optional[date] = None


class CompleteMaintenanceRequest(BaseModel):
    completion_date: date
    actual_cost: float = Field(..., ge=0, description="Actual cost must be 0 or greater")
    remarks: Optional[str] = Field(None, max_length=500)


class VehicleBasicResponse(BaseModel):
    id: uuid.UUID
    registration_number: str
    vehicle_name: str

    model_config = ConfigDict(from_attributes=True)


class MaintenanceResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    maintenance_type: str
    description: str
    estimated_cost: float
    actual_cost: Optional[float]
    status: MaintenanceStatus
    scheduled_date: date
    completion_date: Optional[date]
    remarks: Optional[str]
    created_at: datetime
    updated_at: datetime
    vehicle: VehicleBasicResponse

    model_config = ConfigDict(from_attributes=True)


class PaginationResponse(BaseModel):
    total_records: int
    total_pages: int
    current_page: int
    page_size: int


class MaintenanceListResponse(BaseModel):
    data: List[MaintenanceResponse]
    pagination: PaginationResponse


class MaintenanceStatisticsResponse(BaseModel):
    total_records: int
    pending: int
    in_progress: int
    completed: int
    cancelled: int
    total_estimated_cost: float
    total_actual_cost: float
