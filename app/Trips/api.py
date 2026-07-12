import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Security.permissions import require_admin_or_dispatcher
from app.Users.models import User
from app.Trips.models import TripStatus
from app.Trips.schemas import (
    TripResponse,
    TripListResponse,
    TripStatisticsResponse,
    CreateTripRequest,
    UpdateTripRequest,
    CompleteTripRequest
)
from app.Trips.services import TripService

router = APIRouter(
    prefix="/trips",
    tags=["Trip Management"],
    dependencies=[Depends(require_admin_or_dispatcher)]
)


@router.get(
    "/statistics",
    response_model=TripStatisticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get trip statistics",
    description="Retrieve comprehensive statistics including trip status breakdowns, distance and revenue sums, averages, and active driver/vehicle counts."
)
def get_trip_statistics(db: Session = Depends(get_db)):
    return TripService.get_trip_statistics(db)


@router.post(
    "",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new trip",
    description="Create a trip in DRAFT status. Validates vehicle/driver availability, active maintenance, cargo limit, and generates a unique sequential TRIP ID."
)
def create_trip(
    request: CreateTripRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_dispatcher)
):
    return TripService.create_trip(db, request, current_user.id)


@router.get(
    "",
    response_model=TripListResponse,
    status_code=status.HTTP_200_OK,
    summary="List paginated trips",
    description="Query trips using search patterns matching origin, destination, trip number, vehicle registration, vehicle model, or driver name. Supports filters and sorting."
)
def list_trips(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    search: Optional[str] = Query(None, description="Search term for origin, destination, trip_number, vehicle registration/model, or driver name"),
    status: Optional[TripStatus] = Query(None, description="Filter by trip status"),
    vehicle_id: Optional[uuid.UUID] = Query(None, description="Filter by vehicle ID"),
    driver_id: Optional[uuid.UUID] = Query(None, description="Filter by driver ID"),
    start_date: Optional[date] = Query(None, description="Filter by planned departure start date"),
    end_date: Optional[date] = Query(None, description="Filter by planned departure end date"),
    sort_by: str = Query("created_at", description="Sort field (created_at, planned_distance, cargo_weight, dispatch_time, completion_time)"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    db: Session = Depends(get_db)
):
    return TripService.get_paginated_trips(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        trip_status=status,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.get(
    "/{id}",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Get trip by ID",
    description="Retrieve a single trip record by its UUID, including nested vehicle and driver information."
)
def get_trip(id: uuid.UUID, db: Session = Depends(get_db)):
    return TripService.get_trip(db, id)


@router.put(
    "/{id}",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a trip",
    description="Update an existing trip. Only trips in DRAFT status can be modified. Validates updated assignments if vehicle or driver details change."
)
def update_trip(id: uuid.UUID, request: UpdateTripRequest, db: Session = Depends(get_db)):
    return TripService.update_trip(db, id, request)


@router.patch(
    "/{id}/dispatch",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Dispatch a trip",
    description="Transitions trip status to DISPATCHED. Changes vehicle and driver statuses to ON_TRIP. Re-checks resources availability before execution."
)
def dispatch_trip(id: uuid.UUID, db: Session = Depends(get_db)):
    return TripService.dispatch_trip(db, id)


@router.patch(
    "/{id}/complete",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete a trip",
    description="Completes a trip. Validates end odometer sequence and distance limit. Restores vehicle and driver status to AVAILABLE, updates vehicle odometer."
)
def complete_trip(id: uuid.UUID, request: CompleteTripRequest, db: Session = Depends(get_db)):
    return TripService.complete_trip(db, id, request)


@router.patch(
    "/{id}/cancel",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Cancel a trip",
    description="Cancels a trip. Restores vehicle and driver status to AVAILABLE if the trip was DISPATCHED. Completed/Cancelled trips cannot be cancelled again."
)
def cancel_trip(id: uuid.UUID, db: Session = Depends(get_db)):
    return TripService.cancel_trip(db, id)


@router.delete(
    "/{id}",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a trip",
    description="Soft-deletes a trip. Only allowed for DRAFT or CANCELLED trips. Rejects deletion if actual distance, fuel, or revenue is recorded."
)
def delete_trip(id: uuid.UUID, db: Session = Depends(get_db)):
    return TripService.delete_trip(db, id)
