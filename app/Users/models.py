import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Auth.models import Role
    from app.Trips.models import Trip


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    profile_image: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="users",
        lazy="selectin"
    )
    created_trips: Mapped[List["Trip"]] = relationship(
        "Trip",
        back_populates="creator",
        lazy="selectin"
    )
