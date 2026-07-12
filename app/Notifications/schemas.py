import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.Notifications.models import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    message: str
    notification_type: NotificationType
    user_id: Optional[uuid.UUID] = None
    vehicle_id: Optional[uuid.UUID] = None
    driver_id: Optional[uuid.UUID] = None
    maintenance_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime
    expires_at: Optional[datetime] = None
