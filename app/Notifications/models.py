import uuid
from enum import Enum
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, Enum as SQLEnum, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.Database.database import BaseModel


class NotificationType(str, Enum):
    LICENSE_EXPIRY = "LICENSE_EXPIRY"
    VEHICLE_DOCUMENT_EXPIRY = "VEHICLE_DOCUMENT_EXPIRY"
    MAINTENANCE_DUE = "MAINTENANCE_DUE"
    MAINTENANCE_OVERDUE = "MAINTENANCE_OVERDUE"
    GENERAL = "GENERAL"


class Notification(BaseModel):
    __tablename__ = "notifications"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType, name="notification_type_enum"),
        nullable=False,
        default=NotificationType.GENERAL
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    maintenance_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("maintenance_logs.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships (Optional)
    user = relationship("User", lazy="selectin")
    vehicle = relationship("Vehicle", lazy="selectin")
    driver = relationship("Driver", lazy="selectin")
    maintenance = relationship("MaintenanceLog", lazy="selectin")
