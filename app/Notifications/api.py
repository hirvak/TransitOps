import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Security.permissions import require_notification_access, require_notification_write_access
from app.Notifications.schemas import NotificationResponse
from app.Notifications.services import NotificationService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get(
    "",
    response_model=List[NotificationResponse],
    summary="Get All Notifications",
    description="Returns all active (non-deleted) notifications in chronological order.",
    dependencies=[Depends(require_notification_access)]
)
def get_notifications(db: Session = Depends(get_db)):
    return NotificationService.get_all_notifications(db, unread_only=False)


@router.get(
    "/unread",
    response_model=List[NotificationResponse],
    summary="Get Unread Notifications",
    description="Returns list of all active notifications that have not been read.",
    dependencies=[Depends(require_notification_access)]
)
def get_unread_notifications(db: Session = Depends(get_db)):
    return NotificationService.get_all_notifications(db, unread_only=True)


@router.patch(
    "/{id}/read",
    response_model=NotificationResponse,
    summary="Mark Notification as Read",
    description="Marks a specific notification as read by its UUID.",
    dependencies=[Depends(require_notification_write_access)]
)
def mark_read(id: uuid.UUID, db: Session = Depends(get_db)):
    notif = NotificationService.mark_notification_as_read(db, id)
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
    return notif


@router.post(
    "/generate",
    status_code=status.HTTP_200_OK,
    summary="Trigger Notification Generation Scan",
    description="Scans drivers, vehicles, and maintenance logs to automatically generate warning/critical notifications.",
    dependencies=[Depends(require_notification_write_access)]
)
def generate_notifications(db: Session = Depends(get_db)):
    count = NotificationService.generate_notifications(db)
    return {"message": f"Successfully generated {count} new notifications."}


@router.patch(
    "/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read",
    description="Marks all active unread notifications in the system as read.",
    dependencies=[Depends(require_notification_write_access)]
)
def mark_all_read(db: Session = Depends(get_db)):
    count = NotificationService.mark_all_notifications_as_read(db)
    return {"message": f"Successfully marked {count} notifications as read."}


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft Delete Notification",
    description="Performs soft-deletion on a notification by marking its status as deleted.",
    dependencies=[Depends(require_notification_write_access)]
)
def delete_notification(id: uuid.UUID, db: Session = Depends(get_db)):
    success = NotificationService.delete_notification(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
