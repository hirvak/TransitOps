import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Maintenance.schemas import (
    CreateMaintenanceRequest,
    UpdateMaintenanceRequest,
    CompleteMaintenanceRequest,
    MaintenanceResponse,
    MaintenanceListResponse,
    MaintenanceStatisticsResponse,
)
from app.Maintenance.models import MaintenanceStatus
from app.Maintenance.services import MaintenanceService
from app.Security.permissions import require_maintenance_write, require_maintenance_read

router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance Management"],
)


@router.get(
    "/statistics",
    response_model=MaintenanceStatisticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get maintenance statistics",
    description=(
        "Retrieve aggregated maintenance statistics including total records, "
        "count per status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED), "
        "and total estimated vs actual costs. "
        "Accessible by ADMIN, FLEET_MANAGER, SAFETY_OFFICER, FINANCIAL_ANALYST."
    ),
    dependencies=[Depends(require_maintenance_read)],
)
def get_statistics(db: Session = Depends(get_db)):
    return MaintenanceService.get_statistics(db)


@router.post(
    "",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a maintenance record",
    description=(
        "Create a new vehicle maintenance record. "
        "The vehicle must be AVAILABLE (not ON_TRIP or RETIRED) and must not already "
        "have an active (PENDING or IN_PROGRESS) maintenance entry. "
        "On success, vehicle status is automatically set to IN_SHOP. "
        "Accessible by ADMIN and FLEET_MANAGER only."
    ),
    dependencies=[Depends(require_maintenance_write)],
)
def create_maintenance(request: CreateMaintenanceRequest, db: Session = Depends(get_db)):
    return MaintenanceService.create_maintenance(db, request)


@router.get(
    "",
    response_model=MaintenanceListResponse,
    status_code=status.HTTP_200_OK,
    summary="List maintenance records",
    description=(
        "Retrieve a paginated list of maintenance records. "
        "Supports searching by vehicle registration number, vehicle name, or maintenance type. "
        "Supports filtering by status, vehicle ID, and scheduled date range. "
        "Supports sorting by created_at, scheduled_date, completion_date, estimated_cost, or actual_cost. "
        "Accessible by ADMIN, FLEET_MANAGER, SAFETY_OFFICER, FINANCIAL_ANALYST."
    ),
    dependencies=[Depends(require_maintenance_read)],
)
def list_maintenance(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Number of records per page"),
    search: Optional[str] = Query(None, description="Search by vehicle registration, vehicle name, or maintenance type"),
    status_filter: Optional[MaintenanceStatus] = Query(None, alias="status", description="Filter by maintenance status"),
    vehicle_id: Optional[uuid.UUID] = Query(None, description="Filter by vehicle UUID"),
    date_from: Optional[date] = Query(None, description="Filter records with scheduled_date >= this date"),
    date_to: Optional[date] = Query(None, description="Filter records with scheduled_date <= this date"),
    sort_by: str = Query(
        "created_at",
        enum=["created_at", "scheduled_date", "completion_date", "estimated_cost", "actual_cost"],
        description="Sort field"
    ),
    sort_order: str = Query("asc", enum=["asc", "desc"], description="Sort direction"),
    db: Session = Depends(get_db),
):
    return MaintenanceService.list_maintenance(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
        vehicle_id=vehicle_id,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{id}",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get maintenance record by ID",
    description=(
        "Retrieve a single maintenance record by its UUID. "
        "Returns 404 if not found or soft-deleted. "
        "Accessible by ADMIN, FLEET_MANAGER, SAFETY_OFFICER, FINANCIAL_ANALYST."
    ),
    dependencies=[Depends(require_maintenance_read)],
)
def get_maintenance(id: uuid.UUID, db: Session = Depends(get_db)):
    return MaintenanceService.get_maintenance(db, id)


@router.put(
    "/{id}",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update maintenance details",
    description=(
        "Update modifiable fields of a maintenance record (maintenance_type, description, "
        "estimated_cost, scheduled_date). Only allowed while the record is PENDING or IN_PROGRESS. "
        "Accessible by ADMIN and FLEET_MANAGER only."
    ),
    dependencies=[Depends(require_maintenance_write)],
)
def update_maintenance(id: uuid.UUID, request: UpdateMaintenanceRequest, db: Session = Depends(get_db)):
    return MaintenanceService.update_maintenance(db, id, request)


@router.patch(
    "/{id}/start",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Start maintenance",
    description=(
        "Transition a PENDING maintenance record to IN_PROGRESS. "
        "The vehicle remains IN_SHOP. "
        "Accessible by ADMIN and FLEET_MANAGER only."
    ),
    dependencies=[Depends(require_maintenance_write)],
)
def start_maintenance(id: uuid.UUID, db: Session = Depends(get_db)):
    return MaintenanceService.start_maintenance(db, id)


@router.patch(
    "/{id}/complete",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete maintenance",
    description=(
        "Mark a maintenance record as COMPLETED. Requires providing the completion date, "
        "actual cost, and optional remarks. Completion date must not be earlier than the scheduled date. "
        "Vehicle status is automatically restored to AVAILABLE. "
        "Accessible by ADMIN and FLEET_MANAGER only."
    ),
    dependencies=[Depends(require_maintenance_write)],
)
def complete_maintenance(id: uuid.UUID, request: CompleteMaintenanceRequest, db: Session = Depends(get_db)):
    return MaintenanceService.complete_maintenance(db, id, request)


@router.patch(
    "/{id}/cancel",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel maintenance",
    description=(
        "Cancel a PENDING or IN_PROGRESS maintenance record. "
        "Vehicle status is automatically restored to AVAILABLE. "
        "Accessible by ADMIN and FLEET_MANAGER only."
    ),
    dependencies=[Depends(require_maintenance_write)],
)
def cancel_maintenance(id: uuid.UUID, db: Session = Depends(get_db)):
    return MaintenanceService.cancel_maintenance(db, id)


@router.delete(
    "/{id}",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft delete maintenance record",
    description=(
        "Soft-delete a maintenance record by setting is_deleted=True. "
        "Only COMPLETED or CANCELLED records can be deleted. "
        "Attempting to delete an active (PENDING or IN_PROGRESS) record returns 400. "
        "Accessible by ADMIN and FLEET_MANAGER only."
    ),
    dependencies=[Depends(require_maintenance_write)],
)
def delete_maintenance(id: uuid.UUID, db: Session = Depends(get_db)):
    return MaintenanceService.delete_maintenance(db, id)
