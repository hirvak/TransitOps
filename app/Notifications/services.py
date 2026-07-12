import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.Notifications.models import Notification, NotificationType
from app.Notifications.repository import NotificationRepository
from app.Drivers.models import Driver, DriverStatus
from app.Vehicles.models import Vehicle, VehicleDocument
from app.Maintenance.models import MaintenanceLog, MaintenanceStatus


class NotificationService:

    @staticmethod
    def get_all_notifications(db: Session, unread_only: bool = False) -> List[Notification]:
        return NotificationRepository.get_all(db, unread_only)

    @staticmethod
    def mark_notification_as_read(db: Session, notification_id: uuid.UUID) -> Optional[Notification]:
        notif = NotificationRepository.mark_as_read(db, notification_id)
        if notif:
            db.commit()
        return notif

    @staticmethod
    def mark_all_notifications_as_read(db: Session) -> int:
        count = NotificationRepository.mark_all_as_read(db)
        if count > 0:
            db.commit()
        return count

    @staticmethod
    def delete_notification(db: Session, notification_id: uuid.UUID) -> bool:
        success = NotificationRepository.soft_delete(db, notification_id)
        if success:
            db.commit()
        return success

    @staticmethod
    def generate_notifications(db: Session) -> int:
        today = date.today()
        created_count = 0

        # --- 1. Driver License Expiry ---
        drivers = db.scalars(select(Driver).where(Driver.is_deleted == False)).all()
        for drv in drivers:
            diff = (drv.license_expiry - today).days
            title = None
            message = None

            if diff > 15 and diff <= 30:
                title = f"Driver License Expiry (30 Days) - {drv.full_name}"
                message = f"Driver {drv.full_name}'s license will expire in {diff} days on {drv.license_expiry}."
            elif diff > 7 and diff <= 15:
                title = f"Driver License Expiry (15 Days) - {drv.full_name}"
                message = f"Driver {drv.full_name}'s license will expire in {diff} days on {drv.license_expiry}."
            elif diff > 0 and diff <= 7:
                title = f"Driver License Expiry (7 Days) - {drv.full_name}"
                message = f"Driver {drv.full_name}'s license will expire in {diff} days on {drv.license_expiry}."
            elif diff == 0:
                title = f"Driver License Expiry (Today) - {drv.full_name}"
                message = f"Driver {drv.full_name}'s license expires today."
            elif diff < 0:
                title = f"Driver License Expired - {drv.full_name}"
                message = f"Driver {drv.full_name}'s license expired on {drv.license_expiry}."

            if title:
                # Check duplicate
                existing = db.scalar(
                    select(Notification).where(
                        Notification.driver_id == drv.id,
                        Notification.title == title,
                        Notification.is_deleted == False
                    )
                )
                if not existing:
                    NotificationRepository.create_notification(
                        db=db,
                        title=title,
                        message=message,
                        notification_type=NotificationType.LICENSE_EXPIRY,
                        driver_id=drv.id
                    )
                    created_count += 1

        # --- 2. Vehicle Document Expiry ---
        docs = db.scalars(select(VehicleDocument).where(VehicleDocument.is_deleted == False)).all()
        for doc in docs:
            diff = (doc.expiry_date - today).days
            title = None
            message = None
            doc_type_val = doc.document_type.value

            if diff > 15 and diff <= 30:
                title = f"Vehicle Document Expiring (30 Days) - {doc_type_val} ({doc.vehicle.registration_number})"
                message = f"{doc_type_val} for vehicle {doc.vehicle.registration_number} expires in {diff} days on {doc.expiry_date}."
            elif diff > 7 and diff <= 15:
                title = f"Vehicle Document Expiring (15 Days) - {doc_type_val} ({doc.vehicle.registration_number})"
                message = f"{doc_type_val} for vehicle {doc.vehicle.registration_number} expires in {diff} days on {doc.expiry_date}."
            elif diff > 0 and diff <= 7:
                title = f"Vehicle Document Expiring (7 Days) - {doc_type_val} ({doc.vehicle.registration_number})"
                message = f"{doc_type_val} for vehicle {doc.vehicle.registration_number} expires in {diff} days on {doc.expiry_date}."
            elif diff == 0:
                title = f"Vehicle Document Expiring (Today) - {doc_type_val} ({doc.vehicle.registration_number})"
                message = f"{doc_type_val} for vehicle {doc.vehicle.registration_number} expires today."
            elif diff < 0:
                title = f"Vehicle Document Expired - {doc_type_val} ({doc.vehicle.registration_number})"
                message = f"{doc_type_val} for vehicle {doc.vehicle.registration_number} expired on {doc.expiry_date}."

            if title:
                # Check duplicate
                existing = db.scalar(
                    select(Notification).where(
                        Notification.vehicle_id == doc.vehicle_id,
                        Notification.title == title,
                        Notification.is_deleted == False
                    )
                )
                if not existing:
                    NotificationRepository.create_notification(
                        db=db,
                        title=title,
                        message=message,
                        notification_type=NotificationType.VEHICLE_DOCUMENT_EXPIRY,
                        vehicle_id=doc.vehicle_id
                    )
                    created_count += 1

        # --- 3. Maintenance Due / Overdue ---
        logs = db.scalars(select(MaintenanceLog).where(MaintenanceLog.is_deleted == False)).all()
        for log in logs:
            if log.status in [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED]:
                continue

            diff = (log.scheduled_date - today).days
            title = None
            message = None
            notif_type = None

            # Overdue
            if diff < 0:
                title = f"Maintenance Overdue Alert - {log.maintenance_type} ({log.vehicle.registration_number})"
                message = f"Maintenance task '{log.maintenance_type}' for vehicle {log.vehicle.registration_number} was scheduled for {log.scheduled_date} and is overdue."
                notif_type = NotificationType.MAINTENANCE_OVERDUE
            # Due in 7 days
            elif diff >= 0 and diff <= 7:
                title = f"Maintenance Due Reminder - {log.maintenance_type} ({log.vehicle.registration_number})"
                message = f"Maintenance task '{log.maintenance_type}' for vehicle {log.vehicle.registration_number} is scheduled on {log.scheduled_date} ({diff} days remaining)."
                notif_type = NotificationType.MAINTENANCE_DUE

            if title and notif_type:
                # Check duplicate
                existing = db.scalar(
                    select(Notification).where(
                        Notification.maintenance_id == log.id,
                        Notification.title == title,
                        Notification.is_deleted == False
                    )
                )
                if not existing:
                    NotificationRepository.create_notification(
                        db=db,
                        title=title,
                        message=message,
                        notification_type=notif_type,
                        vehicle_id=log.vehicle_id,
                        maintenance_id=log.id
                    )
                    created_count += 1

        if created_count > 0:
            db.commit()

        return created_count
