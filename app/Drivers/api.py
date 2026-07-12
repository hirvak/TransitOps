import uuid
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Drivers.schemas import (
    CreateDriverRequest,
    UpdateDriverRequest,
    DriverResponse,
    DriverListResponse,
)
from app.Drivers.models import DriverStatus
from app.Drivers.services import DriverService
from app.Security.permissions import require_admin_or_safety_officer

# Protect all Driver Management routes so that only ADMIN and SAFETY_OFFICER can access them
router = APIRouter(
    prefix="/drivers",
    tags=["Driver Management"],
    dependencies=[Depends(require_admin_or_safety_officer)]
)


@router.post(
    "",
    response_model=DriverResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new driver",
    description="Create a new driver record in the database. Validates that email and license number are unique globally."
)
def create_driver(request: CreateDriverRequest, db: Session = Depends(get_db)):
    return DriverService.create_driver(db, request)


@router.get(
    "",
    response_model=DriverListResponse,
    status_code=status.HTTP_200_OK,
    summary="List and search drivers",
    description="Retrieve a paginated list of active (non-deleted) drivers. Supports searching by name, email, and license number, filtering by status and license category, and sorting."
)
def list_drivers(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    search: str | None = Query(None, description="Search pattern matching driver name, email, or license number"),
    status_filter: DriverStatus | None = Query(None, alias="status", description="Filter by driver status"),
    license_category: str | None = Query(None, description="Filter by license category"),
    sort_by: str = Query("created_at", enum=["created_at", "name", "license_expiry", "safety_score"], description="Sort field"),
    sort_order: str = Query("asc", enum=["asc", "desc"], description="Sort direction"),
    db: Session = Depends(get_db)
):
    return DriverService.list_drivers(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
        license_category=license_category,
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.get(
    "/{id}",
    response_model=DriverResponse,
    status_code=status.HTTP_200_OK,
    summary="Get driver by ID",
    description="Fetch a single driver's details by their primary key UUID. Returns 404 if the driver is not found or has been soft-deleted."
)
def get_driver(id: uuid.UUID, db: Session = Depends(get_db)):
    return DriverService.get_driver(db, id)


@router.put(
    "/{id}",
    response_model=DriverResponse,
    status_code=status.HTTP_200_OK,
    summary="Update driver details",
    description="Update fields on an existing driver. Validates email and license uniqueness if they are modified."
)
def update_driver(id: uuid.UUID, request: UpdateDriverRequest, db: Session = Depends(get_db)):
    return DriverService.update_driver(db, id, request)


@router.delete(
    "/{id}",
    response_model=DriverResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft delete driver",
    description="Perform a soft-delete on a driver record. This sets the driver's is_deleted flag to true so they no longer appear in query listings."
)
def delete_driver(id: uuid.UUID, db: Session = Depends(get_db)):
    return DriverService.delete_driver(db, id)


@router.patch(
    "/{id}/available",
    response_model=DriverResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark driver as AVAILABLE",
    description="Set the status of the specified driver to AVAILABLE."
)
def mark_available(id: uuid.UUID, db: Session = Depends(get_db)):
    return DriverService.activate_driver(db, id)


@router.patch(
    "/{id}/suspend",
    response_model=DriverResponse,
    status_code=status.HTTP_200_OK,
    summary="Suspend driver",
    description="Set the status of the specified driver to SUSPENDED."
)
def suspend_driver(id: uuid.UUID, db: Session = Depends(get_db)):
    return DriverService.suspend_driver(db, id)
