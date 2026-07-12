import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.Notifications.models import Notification, NotificationType


class NotificationRepository:

    @staticmethod
    def get_all(db: Session, unread_only: bool = False) -> List[Notification]:
        stmt = select(Notification).where(Notification.is_deleted == False)
        if unread_only:
            stmt = stmt.where(Notification.is_read == False)
        # Order by created_at desc
        stmt = stmt.order_by(Notification.created_at.desc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, notification_id: uuid.UUID) -> Optional[Notification]:
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.is_deleted == False
        )
        return db.scalar(stmt)

    @staticmethod
    def mark_as_read(db: Session, notification_id: uuid.UUID) -> Optional[Notification]:
        notif = NotificationRepository.get_by_id(db, notification_id)
        if notif:
            notif.is_read = True
        return notif

    @staticmethod
    def mark_all_as_read(db: Session) -> int:
        stmt = (
            update(Notification)
            .where(Notification.is_deleted == False, Notification.is_read == False)
            .values(is_read=True)
        )
        result = db.execute(stmt)
        return result.rowcount

    @staticmethod
    def soft_delete(db: Session, notification_id: uuid.UUID) -> bool:
        notif = NotificationRepository.get_by_id(db, notification_id)
        if notif:
            notif.is_deleted = True
            return True
        return False

    @staticmethod
    def create_notification(
        db: Session,
        title: str,
        message: str,
        notification_type: NotificationType,
        user_id: Optional[uuid.UUID] = None,
        vehicle_id: Optional[uuid.UUID] = None,
        driver_id: Optional[uuid.UUID] = None,
        maintenance_id: Optional[uuid.UUID] = None,
        expires_at: Optional[datetime] = None
    ) -> Notification:
        # Import datetime inline if not available
        from datetime import datetime
        notif = Notification(
            title=title,
            message=message,
            notification_type=notification_type,
            user_id=user_id,
            vehicle_id=vehicle_id,
            driver_id=driver_id,
            maintenance_id=maintenance_id,
            expires_at=expires_at,
            is_read=False
        )
        db.add(notif)
        return notif
