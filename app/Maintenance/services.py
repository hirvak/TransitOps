import uuid
import math
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from loguru import logger

from app.Maintenance.models import MaintenanceLog, MaintenanceStatus
from app.Maintenance.repository import MaintenanceRepository
from app.Maintenance.schemas import (
    CreateMaintenanceRequest,
    UpdateMaintenanceRequest,
    CompleteMaintenanceRequest,
)
from app.Vehicles.models import Vehicle, VehicleStatus


def _get_vehicle_or_404(db: Session, vehicle_id: uuid.UUID) -> Vehicle:
    """Helper to fetch a vehicle by ID or raise 404."""
    stmt = select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False)
    vehicle = db.scalar(stmt)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found."
        )
    return vehicle


class MaintenanceService:

    @staticmethod
    def get_maintenance(db: Session, maintenance_id: uuid.UUID) -> MaintenanceLog:
        """
        Fetch a single non-deleted maintenance record or raise 404.
        """
        record = MaintenanceRepository.get_maintenance_by_id(db, maintenance_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Maintenance record not found."
            )
        return record

    @staticmethod
    def create_maintenance(db: Session, request: CreateMaintenanceRequest) -> MaintenanceLog:
        """
        Create a new maintenance record.
        Business rules enforced:
          - Vehicle must exist and not be ON_TRIP or RETIRED.
          - Vehicle must not already have an active PENDING or IN_PROGRESS maintenance.
          - On success, vehicle status is changed to IN_SHOP.
        """
        vehicle = _get_vehicle_or_404(db, request.vehicle_id)

        if vehicle.status == VehicleStatus.ON_TRIP:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is currently on a trip and cannot undergo maintenance."
            )
        if vehicle.status == VehicleStatus.RETIRED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Retired vehicles cannot undergo maintenance."
            )

        existing = MaintenanceRepository.get_active_maintenance_for_vehicle(db, request.vehicle_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle already has an active maintenance record (PENDING or IN_PROGRESS)."
            )

        try:
            # Create the maintenance record
            record = MaintenanceRepository.create_maintenance(db, request.vehicle_id, {
                "maintenance_type": request.maintenance_type,
                "description": request.description,
                "estimated_cost": request.estimated_cost,
                "scheduled_date": request.scheduled_date,
            })
            # Transition vehicle to IN_SHOP
            vehicle.status = VehicleStatus.IN_SHOP
            db.flush()
            db.commit()
            db.refresh(record)
            logger.info(f"Maintenance created: ID={record.id}, Vehicle={vehicle.registration_number} → IN_SHOP")
            return record
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating maintenance for vehicle {request.vehicle_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating the maintenance record."
            )

    @staticmethod
    def start_maintenance(db: Session, maintenance_id: uuid.UUID) -> MaintenanceLog:
        """
        Transition maintenance from PENDING → IN_PROGRESS.
        Vehicle remains IN_SHOP.
        """
        record = MaintenanceService.get_maintenance(db, maintenance_id)

        if record.status != MaintenanceStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot start maintenance that is in '{record.status}' status. Only PENDING records can be started."
            )
        try:
            MaintenanceRepository.update_maintenance(db, record, {"status": MaintenanceStatus.IN_PROGRESS})
            db.commit()
            db.refresh(record)
            logger.info(f"Maintenance started: ID={record.id} → IN_PROGRESS")
            return record
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error starting maintenance {maintenance_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while starting the maintenance."
            )

    @staticmethod
    def complete_maintenance(db: Session, maintenance_id: uuid.UUID, request: CompleteMaintenanceRequest) -> MaintenanceLog:
        """
        Transition maintenance from IN_PROGRESS → COMPLETED.
        Business rules:
          - Completion date cannot be earlier than scheduled_date.
          - Vehicle status → AVAILABLE (unless it is RETIRED).
        """
        record = MaintenanceService.get_maintenance(db, maintenance_id)

        if record.status not in [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete maintenance that is already '{record.status}'."
            )
        if request.completion_date < record.scheduled_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Completion date cannot be earlier than the scheduled date."
            )

        vehicle = _get_vehicle_or_404(db, record.vehicle_id)

        try:
            MaintenanceRepository.update_maintenance(db, record, {
                "status": MaintenanceStatus.COMPLETED,
                "completion_date": request.completion_date,
                "actual_cost": request.actual_cost,
                "remarks": request.remarks,
            })
            # Restore vehicle to AVAILABLE unless it has since been RETIRED
            if vehicle.status != VehicleStatus.RETIRED:
                vehicle.status = VehicleStatus.AVAILABLE
                db.flush()

            db.commit()
            db.refresh(record)
            logger.info(f"Maintenance completed: ID={record.id}, Vehicle={vehicle.registration_number} → AVAILABLE")
            return record
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error completing maintenance {maintenance_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while completing the maintenance."
            )

    @staticmethod
    def cancel_maintenance(db: Session, maintenance_id: uuid.UUID) -> MaintenanceLog:
        """
        Cancel a PENDING or IN_PROGRESS maintenance record.
        Vehicle status → AVAILABLE (unless RETIRED).
        """
        record = MaintenanceService.get_maintenance(db, maintenance_id)

        if record.status not in [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel maintenance that is already '{record.status}'."
            )

        vehicle = _get_vehicle_or_404(db, record.vehicle_id)

        try:
            MaintenanceRepository.update_maintenance(db, record, {"status": MaintenanceStatus.CANCELLED})
            if vehicle.status != VehicleStatus.RETIRED:
                vehicle.status = VehicleStatus.AVAILABLE
                db.flush()

            db.commit()
            db.refresh(record)
            logger.info(f"Maintenance cancelled: ID={record.id}, Vehicle={vehicle.registration_number} → AVAILABLE")
            return record
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error cancelling maintenance {maintenance_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while cancelling the maintenance."
            )

    @staticmethod
    def update_maintenance(db: Session, maintenance_id: uuid.UUID, request: UpdateMaintenanceRequest) -> MaintenanceLog:
        """
        Update maintenance details. Only allowed on PENDING or IN_PROGRESS records.
        """
        record = MaintenanceService.get_maintenance(db, maintenance_id)

        if record.status in [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot update a maintenance record that is already '{record.status}'."
            )

        updates = {}
        if request.maintenance_type is not None:
            updates["maintenance_type"] = request.maintenance_type
        if request.description is not None:
            updates["description"] = request.description
        if request.estimated_cost is not None:
            updates["estimated_cost"] = request.estimated_cost
        if request.scheduled_date is not None:
            updates["scheduled_date"] = request.scheduled_date

        if not updates:
            return record

        try:
            MaintenanceRepository.update_maintenance(db, record, updates)
            db.commit()
            db.refresh(record)
            logger.info(f"Maintenance updated: ID={record.id}")
            return record
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating maintenance {maintenance_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating the maintenance."
            )

    @staticmethod
    def delete_maintenance(db: Session, maintenance_id: uuid.UUID) -> MaintenanceLog:
        """
        Soft-delete a maintenance record.
        Only COMPLETED or CANCELLED records may be deleted.
        """
        record = MaintenanceService.get_maintenance(db, maintenance_id)

        if record.status not in [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only COMPLETED or CANCELLED maintenance records can be deleted."
            )
        try:
            MaintenanceRepository.soft_delete_maintenance(db, record)
            db.commit()
            db.refresh(record)
            logger.info(f"Maintenance soft-deleted: ID={record.id}")
            return record
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting maintenance {maintenance_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while deleting the maintenance."
            )

    @staticmethod
    def list_maintenance(
        db: Session,
        page: int,
        page_size: int,
        search: Optional[str],
        status_filter: Optional[MaintenanceStatus],
        vehicle_id: Optional[uuid.UUID],
        date_from: Optional[date],
        date_to: Optional[date],
        sort_by: str,
        sort_order: str,
    ) -> dict:
        """
        Return paginated maintenance records with metadata.
        """
        records, total = MaintenanceRepository.get_all_maintenance(
            db=db,
            page=page,
            page_size=page_size,
            search=search,
            status=status_filter,
            vehicle_id=vehicle_id,
            date_from=date_from,
            date_to=date_to,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return {
            "data": records,
            "pagination": {
                "total_records": total,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
            }
        }

    @staticmethod
    def get_statistics(db: Session) -> dict:
        """
        Return aggregated maintenance statistics.
        """
        return MaintenanceRepository.get_statistics(db)
