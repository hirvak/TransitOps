import uuid
from typing import List
from datetime import date
from fastapi import APIRouter, Depends, status, Query, Form, File, UploadFile
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Vehicles.models import VehicleType, VehicleStatus, DocumentType
from app.Vehicles.schemas import (
    CreateVehicleRequest,
    UpdateVehicleRequest,
    VehicleResponse,
    VehicleListResponse,
    VehicleStatisticsResponse,
    VehicleDocumentRequest,
    VehicleDocumentResponse,
)
from app.Vehicles.services import VehicleService
from app.Security.permissions import require_admin_or_fleet_manager

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicle Management"],
    dependencies=[Depends(require_admin_or_fleet_manager)]
)


@router.get(
    "/statistics",
    response_model=VehicleStatisticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get vehicle statistics",
    description="Retrieve aggregated vehicle KPIs including status counts and breakdown counts by type."
)
def get_vehicle_statistics(db: Session = Depends(get_db)):
    return VehicleService.get_vehicle_statistics(db)


@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create vehicle",
    description="Register a new vehicle in the system. Requires ADMIN or FLEET_MANAGER role."
)
def create_vehicle(request: CreateVehicleRequest, db: Session = Depends(get_db)):
    return VehicleService.create_vehicle(db, request)


@router.get(
    "",
    response_model=VehicleListResponse,
    status_code=status.HTTP_200_OK,
    summary="List vehicles",
    description="Search, filter, sort, and paginate active vehicles in the fleet registry."
)
def list_vehicles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    search: str | None = Query(None, description="Search pattern matching name, model, or registration number"),
    vehicle_type: VehicleType | None = Query(None, description="Filter by vehicle type"),
    status_val: VehicleStatus | None = Query(None, alias="status", description="Filter by vehicle status"),
    region: str | None = Query(None, description="Filter by region"),
    sort_by: str = Query("created_at", enum=["vehicle_name", "created_at", "acquisition_cost", "odometer_reading", "purchase_date"], description="Sort field"),
    sort_order: str = Query("asc", enum=["asc", "desc"], description="Sort order"),
    db: Session = Depends(get_db)
):
    return VehicleService.get_all_vehicles(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        vehicle_type=vehicle_type,
        status_val=status_val,
        region=region,
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.get(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get vehicle by ID",
    description="Retrieve details of a single vehicle profile."
)
def get_vehicle(vehicle_id: uuid.UUID, db: Session = Depends(get_db)):
    return VehicleService.get_vehicle(db, vehicle_id)


@router.put(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    status_code=status.HTTP_200_OK,
    summary="Update vehicle details",
    description="Modify vehicle registry records. Update restrictions apply if vehicle is retired."
)
def update_vehicle(vehicle_id: uuid.UUID, request: UpdateVehicleRequest, db: Session = Depends(get_db)):
    return VehicleService.update_vehicle(db, vehicle_id, request)


@router.delete(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft delete vehicle",
    description="Flag vehicle registry as deleted. Vehicles currently ON_TRIP or IN_SHOP cannot be deleted."
)
def delete_vehicle(vehicle_id: uuid.UUID, db: Session = Depends(get_db)):
    return VehicleService.delete_vehicle(db, vehicle_id)


# Vehicle Documents Endpoints

@router.post(
    "/{vehicle_id}/documents",
    response_model=VehicleDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload vehicle document",
    description="Add an active document (RC_BOOK, INSURANCE, PUC, etc.) to a vehicle. Validates document expiry, prevents duplicate types, and uploads the document file."
)
async def upload_document(
    vehicle_id: uuid.UUID,
    document_name: str = Form(..., min_length=1, max_length=100),
    document_type: DocumentType = Form(...),
    expiry_date: date = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await VehicleService.upload_document(
        db=db,
        vehicle_id=vehicle_id,
        document_name=document_name,
        document_type=document_type,
        expiry_date=expiry_date,
        file=file
    )


@router.get(
    "/{vehicle_id}/documents",
    response_model=List[VehicleDocumentResponse],
    status_code=status.HTTP_200_OK,
    summary="List vehicle documents",
    description="Retrieve list of all active documents stored for a specific vehicle."
)
def list_documents(vehicle_id: uuid.UUID, db: Session = Depends(get_db)):
    return VehicleService.list_documents(db, vehicle_id)


@router.delete(
    "/documents/{document_id}",
    response_model=VehicleDocumentResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete vehicle document",
    description="Soft-delete a vehicle document from the system."
)
def delete_document(document_id: uuid.UUID, db: Session = Depends(get_db)):
    return VehicleService.delete_document(db, document_id)
