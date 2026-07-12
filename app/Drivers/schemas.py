import uuid
import re
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

from app.Drivers.models import DriverStatus


def clean_and_validate_phone(v: str) -> str:
    """
    Validate that phone contains standard formatting characters and between 7 and 15 digits.
    """
    if not re.match(r"^\+?[\d\s\-\(\)]+$", v):
        raise ValueError("Phone number contains invalid characters.")
    digits = re.sub(r"\D", "", v)
    if len(digits) < 7 or len(digits) > 15:
        raise ValueError("Phone number must contain between 7 and 15 digits.")
    return v


class CreateDriverRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., max_length=20)
    license_number: str = Field(..., min_length=1, max_length=50)
    license_category: str = Field(..., min_length=1, max_length=50)
    license_expiry: date
    safety_score: Optional[float] = Field(100.0, ge=0.0, le=100.0)
    status: Optional[DriverStatus] = DriverStatus.AVAILABLE

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return clean_and_validate_phone(v)

    @field_validator("license_expiry")
    @classmethod
    def validate_license_expiry(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("License expiry date cannot be in the past.")
        return v


class UpdateDriverRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    license_number: Optional[str] = Field(None, min_length=1, max_length=50)
    license_category: Optional[str] = Field(None, min_length=1, max_length=50)
    license_expiry: Optional[date] = None
    safety_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    status: Optional[DriverStatus] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return clean_and_validate_phone(v)

    @field_validator("license_expiry")
    @classmethod
    def validate_license_expiry(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        if v < date.today():
            raise ValueError("License expiry date cannot be in the past.")
        return v


class DriverResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str
    license_number: str
    license_category: str
    license_expiry: date
    safety_score: float
    status: DriverStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginationResponse(BaseModel):
    total_records: int
    total_pages: int
    current_page: int
    page_size: int


class DriverListResponse(BaseModel):
    data: List[DriverResponse]
    pagination: PaginationResponse
