import uuid
from typing import Tuple, List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.Maintenance.models import MaintenanceLog, MaintenanceStatus
from app.Vehicles.models import Vehicle


class MaintenanceRepository:
    @staticmethod
    def get_maintenance_by_id(db: Session, maintenance_id: uuid.UUID) -> MaintenanceLog | None:
        """
        Fetch a maintenance record by its primary key UUID. Only returns non-deleted records.
        """
        stmt = select(MaintenanceLog).where(
            MaintenanceLog.id == maintenance_id,
            MaintenanceLog.is_deleted == False
        )
        return db.scalar(stmt)

    @staticmethod
    def get_active_maintenance_for_vehicle(db: Session, vehicle_id: uuid.UUID) -> MaintenanceLog | None:
        """
        Check if a vehicle already has an active (PENDING or IN_PROGRESS) maintenance record.
        """
        stmt = select(MaintenanceLog).where(
            MaintenanceLog.vehicle_id == vehicle_id,
            MaintenanceLog.status.in_([MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS]),
            MaintenanceLog.is_deleted == False
        )
        return db.scalar(stmt)

    @staticmethod
    def create_maintenance(db: Session, vehicle_id: uuid.UUID, data: dict) -> MaintenanceLog:
        """
        Create and add a new maintenance record to the database session. Does NOT commit.
        """
        db_record = MaintenanceLog(
            vehicle_id=vehicle_id,
            maintenance_type=data["maintenance_type"],
            description=data["description"],
            estimated_cost=data["estimated_cost"],
            scheduled_date=data["scheduled_date"],
            status=MaintenanceStatus.PENDING,
        )
        db.add(db_record)
        db.flush()
        return db_record

    @staticmethod
    def update_maintenance(db: Session, record: MaintenanceLog, updates: dict) -> MaintenanceLog:
        """
        Apply a dictionary of field updates to a maintenance record. Does NOT commit.
        """
        for key, value in updates.items():
            setattr(record, key, value)
        db.flush()
        return record

    @staticmethod
    def soft_delete_maintenance(db: Session, record: MaintenanceLog) -> MaintenanceLog:
        """
        Soft-delete a maintenance record by setting is_deleted=True. Does NOT commit.
        """
        record.is_deleted = True
        db.flush()
        return record

    @staticmethod
    def get_all_maintenance(
        db: Session,
        page: int,
        page_size: int,
        search: Optional[str],
        status: Optional[MaintenanceStatus],
        vehicle_id: Optional[uuid.UUID],
        date_from: Optional[date],
        date_to: Optional[date],
        sort_by: str,
        sort_order: str,
    ) -> Tuple[List[MaintenanceLog], int]:
        """
        Fetch paginated maintenance records with optional search, filters, and sorting.
        Joins to Vehicle to allow searching by registration number and vehicle name.
        Returns (records, total_count).
        """
        stmt = (
            select(MaintenanceLog)
            .join(Vehicle, MaintenanceLog.vehicle_id == Vehicle.id)
            .where(MaintenanceLog.is_deleted == False)
        )

        # Status filter
        if status is not None:
            stmt = stmt.where(MaintenanceLog.status == status)

        # Vehicle filter
        if vehicle_id is not None:
            stmt = stmt.where(MaintenanceLog.vehicle_id == vehicle_id)

        # Date range filter (on scheduled_date)
        if date_from is not None:
            stmt = stmt.where(MaintenanceLog.scheduled_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(MaintenanceLog.scheduled_date <= date_to)

        # Search: vehicle registration, vehicle name, or maintenance type
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                Vehicle.registration_number.ilike(pattern) |
                Vehicle.vehicle_name.ilike(pattern) |
                MaintenanceLog.maintenance_type.ilike(pattern)
            )

        # Sorting
        sort_map = {
            "created_at": MaintenanceLog.created_at,
            "scheduled_date": MaintenanceLog.scheduled_date,
            "completion_date": MaintenanceLog.completion_date,
            "estimated_cost": MaintenanceLog.estimated_cost,
            "actual_cost": MaintenanceLog.actual_cost,
        }
        sort_col = sort_map.get(sort_by, MaintenanceLog.created_at)
        stmt = stmt.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

        # Count before pagination
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_records = db.scalar(count_stmt) or 0

        # Pagination
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        records = list(db.scalars(stmt).all())
        return records, total_records

    @staticmethod
    def get_statistics(db: Session) -> dict:
        """
        Aggregate maintenance counts per status and sum estimated/actual costs.
        """
        total = db.scalar(
            select(func.count(MaintenanceLog.id)).where(MaintenanceLog.is_deleted == False)
        ) or 0

        def count_by_status(s: MaintenanceStatus) -> int:
            return db.scalar(
                select(func.count(MaintenanceLog.id)).where(
                    MaintenanceLog.status == s,
                    MaintenanceLog.is_deleted == False
                )
            ) or 0

        total_estimated = db.scalar(
            select(func.coalesce(func.sum(MaintenanceLog.estimated_cost), 0)).where(
                MaintenanceLog.is_deleted == False
            )
        ) or 0.0

        total_actual = db.scalar(
            select(func.coalesce(func.sum(MaintenanceLog.actual_cost), 0)).where(
                MaintenanceLog.is_deleted == False,
                MaintenanceLog.actual_cost.isnot(None)
            )
        ) or 0.0

        return {
            "total_records": total,
            "pending": count_by_status(MaintenanceStatus.PENDING),
            "in_progress": count_by_status(MaintenanceStatus.IN_PROGRESS),
            "completed": count_by_status(MaintenanceStatus.COMPLETED),
            "cancelled": count_by_status(MaintenanceStatus.CANCELLED),
            "total_estimated_cost": float(total_estimated),
            "total_actual_cost": float(total_actual),
        }
