import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from app.Users.schemas import RoleResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserLoginResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserLoginResponse


class CurrentUserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone: str | None
    profile_image: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    role: RoleResponse

    model_config = ConfigDict(from_attributes=True)
