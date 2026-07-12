import uuid
from datetime import date, timedelta
from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, and_, asc, desc

from app.Vehicles.models import Vehicle, VehicleDocument, VehicleType, VehicleStatus, DocumentType
from app.Vehicles.schemas import CreateVehicleRequest, VehicleDocumentRequest


class VehicleRepository:
    @staticmethod
    def create_vehicle(db: Session, vehicle_data: CreateVehicleRequest) -> Vehicle:
        """
        Create and add a new vehicle to the database. Does NOT commit.
        """
        db_vehicle = Vehicle(
            registration_number=vehicle_data.registration_number,
            vehicle_name=vehicle_data.vehicle_name,
            vehicle_model=vehicle_data.vehicle_model,
            vehicle_type=vehicle_data.vehicle_type,
            maximum_load_capacity=vehicle_data.maximum_load_capacity,
            odometer_reading=vehicle_data.odometer_reading,
            acquisition_cost=vehicle_data.acquisition_cost,
            purchase_date=vehicle_data.purchase_date,
            region=vehicle_data.region,
            status=vehicle_data.status
        )
        db.add(db_vehicle)
        db.flush()
        return db_vehicle

    @staticmethod
    def get_vehicle(db: Session, vehicle_id: uuid.UUID) -> Vehicle | None:
        """
        Fetch vehicle by ID (excluding soft-deleted).
        """
        stmt = select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def get_vehicle_by_registration(db: Session, reg_num: str) -> Vehicle | None:
        """
        Fetch vehicle by registration number (excluding soft-deleted).
        """
        stmt = select(Vehicle).where(Vehicle.registration_number == reg_num, Vehicle.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def get_paginated_vehicles(
        db: Session,
        page: int,
        page_size: int,
        search: str | None,
        vehicle_type: VehicleType | None,
        status: VehicleStatus | None,
        region: str | None,
        sort_by: str,
        sort_order: str
    ) -> Tuple[List[Vehicle], int]:
        """
        Query and return paginated vehicles with filtering, searching, and sorting.
        """
        stmt = select(Vehicle).where(Vehicle.is_deleted == False)

        # Filters
        if vehicle_type:
            stmt = stmt.where(Vehicle.vehicle_type == vehicle_type)
        if status:
            stmt = stmt.where(Vehicle.status == status)
        if region:
            stmt = stmt.where(Vehicle.region.ilike(f"%{region}%"))

        # Search
        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    Vehicle.registration_number.ilike(search_pattern),
                    Vehicle.vehicle_name.ilike(search_pattern),
                    Vehicle.vehicle_model.ilike(search_pattern)
                )
            )

        # Sorting
        sort_column = Vehicle.created_at
        if sort_by == "vehicle_name":
            sort_column = Vehicle.vehicle_name
        elif sort_by == "acquisition_cost":
            sort_column = Vehicle.acquisition_cost
        elif sort_by == "odometer_reading":
            sort_column = Vehicle.odometer_reading
        elif sort_by == "purchase_date":
            sort_column = Vehicle.purchase_date

        if sort_order == "desc":
            stmt = stmt.order_by(sort_column.desc())
        else:
            stmt = stmt.order_by(sort_column.asc())

        # Get total records
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_records = db.scalar(count_stmt) or 0

        # Paginate
        offset_val = (page - 1) * page_size
        stmt = stmt.offset(offset_val).limit(page_size)

        vehicles = list(db.scalars(stmt).all())
        return vehicles, total_records

    @staticmethod
    def get_vehicles_statistics(db: Session) -> dict:
        """
        Retrieve fleet aggregated statistics grouped by status and vehicle type.
        """
        total_stmt = select(func.count(Vehicle.id)).where(Vehicle.is_deleted == False)
        total_vehicles = db.scalar(total_stmt) or 0

        # Status counts
        status_stmt = select(Vehicle.status, func.count(Vehicle.id)).where(Vehicle.is_deleted == False).group_by(Vehicle.status)
        status_counts = db.execute(status_stmt).all()
        status_dict = {status.value: count for status, count in status_counts}
        for s in VehicleStatus:
            if s.value not in status_dict:
                status_dict[s.value] = 0

        # Type counts
        type_stmt = select(Vehicle.vehicle_type, func.count(Vehicle.id)).where(Vehicle.is_deleted == False).group_by(Vehicle.vehicle_type)
        type_counts = db.execute(type_stmt).all()
        type_dict = {vtype.value: count for vtype, count in type_counts}
        for t in VehicleType:
            if t.value not in type_dict:
                type_dict[t.value] = 0

        return {
            "total_vehicles": total_vehicles,
            "available": status_dict[VehicleStatus.AVAILABLE.value],
            "on_trip": status_dict[VehicleStatus.ON_TRIP.value],
            "in_shop": status_dict[VehicleStatus.IN_SHOP.value],
            "retired": status_dict[VehicleStatus.RETIRED.value],
            "vehicle_types": type_dict
        }

    @staticmethod
    def update_vehicle(db: Session, vehicle: Vehicle, updates: dict) -> Vehicle:
        """
        Apply updates to the vehicle. Does NOT commit.
        """
        for key, value in updates.items():
            setattr(vehicle, key, value)
        db.flush()
        return vehicle

    @staticmethod
    def soft_delete_vehicle(db: Session, vehicle: Vehicle) -> Vehicle:
        """
        Soft delete the vehicle. Does NOT commit.
        """
        vehicle.is_deleted = True
        db.flush()
        return vehicle

    @staticmethod
    def create_vehicle_document(
        db: Session,
        vehicle_id: uuid.UUID,
        document_name: str,
        document_type: DocumentType,
        document_number: str,
        file_name: str,
        file_path: str,
        issue_date: date,
        expiry_date: date,
        uploaded_by: uuid.UUID,
        remarks: Optional[str] = None
    ) -> VehicleDocument:
        """
        Create a new vehicle document with expanded fields. Does NOT commit.
        """
        db_doc = VehicleDocument(
            vehicle_id=vehicle_id,
            document_name=document_name,
            document_type=document_type,
            document_number=document_number,
            file_name=file_name,
            file_path=file_path,
            issue_date=issue_date,
            expiry_date=expiry_date,
            uploaded_by=uploaded_by,
            remarks=remarks
        )
        db.add(db_doc)
        db.flush()
        return db_doc

    @staticmethod
    def update_vehicle_document(db: Session, doc: VehicleDocument, updates: dict) -> VehicleDocument:
        """
        Update fields on a document. Does NOT commit.
        """
        for key, value in updates.items():
            if value is not None:
                setattr(doc, key, value)
        db.flush()
        return doc

    @staticmethod
    def get_vehicle_documents(db: Session, vehicle_id: uuid.UUID) -> List[VehicleDocument]:
        """
        List active documents for a vehicle.
        """
        stmt = select(VehicleDocument).where(
            VehicleDocument.vehicle_id == vehicle_id,
            VehicleDocument.is_deleted == False
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_vehicle_document_by_type(db: Session, vehicle_id: uuid.UUID, doc_type: DocumentType) -> VehicleDocument | None:
        """
        Retrieve an active document for a vehicle matching the document type.
        """
        stmt = select(VehicleDocument).where(
            VehicleDocument.vehicle_id == vehicle_id,
            VehicleDocument.document_type == doc_type,
            VehicleDocument.is_deleted == False
        )
        return db.scalar(stmt)

    @staticmethod
    def get_vehicle_document_by_id(db: Session, doc_id: uuid.UUID) -> VehicleDocument | None:
        """
        Retrieve an active vehicle document by ID.
        """
        stmt = select(VehicleDocument).where(
            VehicleDocument.id == doc_id,
            VehicleDocument.is_deleted == False
        )
        return db.scalar(stmt)

    @staticmethod
    def soft_delete_vehicle_document(db: Session, doc: VehicleDocument) -> VehicleDocument:
        """
        Soft delete the document. Does NOT commit.
        """
        doc.is_deleted = True
        db.flush()
        return doc

    @staticmethod
    def get_all_vehicle_documents(
        db: Session,
        search: Optional[str] = None,
        vehicle_id: Optional[uuid.UUID] = None,
        document_type: Optional[DocumentType] = None,
        expired: Optional[bool] = None,
        expiring_soon: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> List[VehicleDocument]:
        """
        Query and search vehicle documents with pagination parameters.
        """
        query = select(VehicleDocument).join(Vehicle, VehicleDocument.vehicle_id == Vehicle.id).where(
            VehicleDocument.is_deleted == False
        )

        # Filters
        if vehicle_id:
            query = query.where(VehicleDocument.vehicle_id == vehicle_id)
        if document_type:
            query = query.where(VehicleDocument.document_type == document_type)

        today_dt = date.today()
        if expired:
            query = query.where(VehicleDocument.expiry_date < today_dt)
        elif expiring_soon:
            query = query.where(
                and_(
                    VehicleDocument.expiry_date >= today_dt,
                    VehicleDocument.expiry_date <= today_dt + timedelta(days=30)
                )
            )

        if search:
            query = query.where(
                or_(
                    Vehicle.registration_number.ilike(f"%{search}%"),
                    Vehicle.vehicle_name.ilike(f"%{search}%"),
                    VehicleDocument.document_number.ilike(f"%{search}%")
                )
            )

        # Sorting
        sort_field = getattr(VehicleDocument, sort_by, VehicleDocument.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_field))
        else:
            query = query.order_by(desc(sort_field))

        return list(db.scalars(query).all())
