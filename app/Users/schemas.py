import uuid
import re
from datetime import datetime
from typing import List, Dict
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    profile_image: str | None = Field(None, max_length=255)


def validate_strong_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
        raise ValueError("Password must contain at least one special character.")
    return v


class CreateUserRequest(UserBase):
    password: str
    role: str = Field(..., min_length=1, max_length=50)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_strong_password(v)


class AdminCreateUserRequest(UserBase):
    password: str
    role: str = Field(..., min_length=1, max_length=50)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_strong_password(v)


class UpdateUserRequest(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    profile_image: str | None = Field(None, max_length=255)
    role: str | None = Field(None, min_length=1, max_length=50)
    is_active: bool | None = None
    password: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_strong_password(v)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone: str | None
    profile_image: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: datetime | None
    role: RoleResponse

    model_config = ConfigDict(from_attributes=True)


class UserStatisticsResponse(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    roles: Dict[str, int]


class PaginationResponse(BaseModel):
    total_records: int
    total_pages: int
    current_page: int
    page_size: int


class UserListResponse(BaseModel):
    data: List[UserResponse]
    pagination: PaginationResponse
