from typing import List, TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel

if TYPE_CHECKING:
    from app.Users.models import User


class Role(BaseModel):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="role",
        lazy="selectin"
    )
