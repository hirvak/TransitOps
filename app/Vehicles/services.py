import os
import uuid
import math
from datetime import date, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from loguru import logger

from app.Vehicles.models import Vehicle, VehicleDocument, VehicleType, VehicleStatus, DocumentType
from app.Vehicles.schemas import CreateVehicleRequest, UpdateVehicleRequest, VehicleDocumentRequest, UpdateVehicleDocumentRequest
from app.Vehicles.repository import VehicleRepository


class VehicleService:
    @staticmethod
    def create_vehicle(db: Session, request: CreateVehicleRequest) -> Vehicle:
        """
        Create a new vehicle after validating uniqueness and business rules.
        """
        if request.purchase_date > date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Purchase date cannot be in the future."
            )

        existing = VehicleRepository.get_vehicle_by_registration(db, request.registration_number)
        if existing:
            logger.warning(f"Vehicle creation failed: Registration {request.registration_number} already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration number {request.registration_number} already exists."
            )

        try:
            db_vehicle = VehicleRepository.create_vehicle(db, request)
            db.commit()
            db.refresh(db_vehicle)
            logger.info(f"Vehicle registered successfully: {db_vehicle.registration_number} (ID: {db_vehicle.id})")
            return db_vehicle
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during vehicle creation for {request.registration_number}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating the vehicle."
            )

    @staticmethod
    def get_vehicle(db: Session, vehicle_id: uuid.UUID) -> Vehicle:
        """
        Fetch an active vehicle by ID, or raise 404.
        """
        vehicle = VehicleRepository.get_vehicle(db, vehicle_id)
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found."
            )
        return vehicle

    @staticmethod
    def get_all_vehicles(
        db: Session,
        page: int,
        page_size: int,
        search: str | None,
        vehicle_type: VehicleType | None,
        status_val: VehicleStatus | None,
        region: str | None,
        sort_by: str,
        sort_order: str
    ) -> dict:
        """
        List, filter, sort, and paginate vehicles.
        """
        vehicles, total_records = VehicleRepository.get_paginated_vehicles(
            db=db,
            page=page,
            page_size=page_size,
            search=search,
            vehicle_type=vehicle_type,
            status=status_val,
            region=region,
            sort_by=sort_by,
            sort_order=sort_order
        )
        total_pages = math.ceil(total_records / page_size) if total_records > 0 else 0
        return {
            "data": vehicles,
            "pagination": {
                "total_records": total_records,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size
            }
        }

    @staticmethod
    def update_vehicle(db: Session, vehicle_id: uuid.UUID, request: UpdateVehicleRequest) -> Vehicle:
        """
        Update vehicle fields. Implements specifications restrictions for retired vehicles.
        """
        vehicle = VehicleService.get_vehicle(db, vehicle_id)

        # Retired Constraints check
        if vehicle.status == VehicleStatus.RETIRED:
            blocked_fields = [
                "registration_number", "vehicle_name", "vehicle_model", 
                "vehicle_type", "maximum_load_capacity", "odometer_reading", 
                "acquisition_cost", "purchase_date"
            ]
            for field in blocked_fields:
                if getattr(request, field) is not None:
                    logger.warning(f"Vehicle update failed: Cannot update retired vehicle specification '{field}'.")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot update specifications of a retired vehicle."
                    )

        updates = {}
        # Apply updates if not None
        if request.registration_number is not None:
            if request.registration_number != vehicle.registration_number:
                existing = VehicleRepository.get_vehicle_by_registration(db, request.registration_number)
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Registration number {request.registration_number} already exists."
                    )
            updates["registration_number"] = request.registration_number

        if request.vehicle_name is not None:
            updates["vehicle_name"] = request.vehicle_name
        if request.vehicle_model is not None:
            updates["vehicle_model"] = request.vehicle_model
        if request.vehicle_type is not None:
            updates["vehicle_type"] = request.vehicle_type
        if request.maximum_load_capacity is not None:
            updates["maximum_load_capacity"] = request.maximum_load_capacity
        if request.odometer_reading is not None:
            updates["odometer_reading"] = request.odometer_reading
        if request.acquisition_cost is not None:
            updates["acquisition_cost"] = request.acquisition_cost
        if request.purchase_date is not None:
            if request.purchase_date > date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Purchase date cannot be in the future."
                )
            updates["purchase_date"] = request.purchase_date
        if request.region is not None:
            updates["region"] = request.region
        if request.status is not None:
            updates["status"] = request.status

        try:
            VehicleRepository.update_vehicle(db, vehicle, updates)
            db.commit()
            db.refresh(vehicle)
            logger.info(f"Vehicle updated successfully: {vehicle.registration_number} (ID: {vehicle.id})")
            return vehicle
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during vehicle update for {vehicle.registration_number}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating the vehicle."
            )

    @staticmethod
    def delete_vehicle(db: Session, vehicle_id: uuid.UUID) -> Vehicle:
        """
        Soft delete vehicle after checking status limits.
        """
        vehicle = VehicleService.get_vehicle(db, vehicle_id)
        if vehicle.status in [VehicleStatus.ON_TRIP, VehicleStatus.IN_SHOP]:
            logger.warning(f"Delete failed: Vehicle {vehicle.registration_number} has status {vehicle.status.value}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle cannot be deleted while it is On Trip or In Shop."
            )

        try:
            VehicleRepository.soft_delete_vehicle(db, vehicle)
            db.commit()
            db.refresh(vehicle)
            logger.info(f"Vehicle soft-deleted successfully: {vehicle.registration_number} (ID: {vehicle.id})")
            return vehicle
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during vehicle deletion for {vehicle.registration_number}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while deleting the vehicle."
            )

    @staticmethod
    def get_vehicle_statistics(db: Session) -> dict:
        """
        Retrieve fleet aggregated statistics.
        """
        return VehicleRepository.get_vehicles_statistics(db)

    @staticmethod
    async def upload_document(
        db: Session,
        vehicle_id: uuid.UUID,
        document_name: str,
        document_type: DocumentType,
        expiry_date: date,
        file: UploadFile
    ) -> VehicleDocument:
        """
        Upload vehicle document checking validation, duplicate limits, and saving physical file.
        """
        # Validate vehicle exists
        vehicle = VehicleService.get_vehicle(db, vehicle_id)

        # Expiry Check
        if expiry_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has already expired."
            )

        # Duplicate Check
        existing_doc = VehicleRepository.get_vehicle_document_by_type(db, vehicle_id, document_type)
        if existing_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{document_type.value} already exists for this vehicle."
            )

        # File validation
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file uploaded."
            )

        # Check allowed file extensions: PDF, JPG, JPEG, PNG
        ext = file.filename.split(".")[-1].lower()
        if ext not in ["pdf", "jpg", "jpeg", "png"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed."
            )

        # Generate unique filename: uuid_suffix.ext
        unique_filename = f"{uuid.uuid4().hex[:8]}_{document_type.value.lower()}.{ext}"
        relative_dir = os.path.join("uploads", "vehicle_documents")
        os.makedirs(relative_dir, exist_ok=True)
        file_path_str = f"uploads/vehicle_documents/{unique_filename}"
        save_path = os.path.join(relative_dir, unique_filename)

        try:
            # Save file to filesystem
            contents = await file.read()
            with open(save_path, "wb") as buffer:
                buffer.write(contents)
        except Exception as e:
            logger.error(f"Failed to save document file to disk: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save document file on disk."
            )

        try:
            # Create database entry
            db_doc = VehicleRepository.create_vehicle_document(
                db=db,
                vehicle_id=vehicle_id,
                document_name=document_name,
                document_type=document_type,
                file_path=file_path_str,
                expiry_date=expiry_date
            )
            db.commit()
            db.refresh(db_doc)
            logger.info(f"Document uploaded: {db_doc.document_type.value} added for vehicle {vehicle.registration_number}")
            return db_doc
        except Exception as e:
            db.rollback()
            # Clean up the file if DB save fails
            if os.path.exists(save_path):
                try:
                    os.remove(save_path)
                except Exception as cleanup_err:
                    logger.error(f"Failed to clean up file {save_path} after DB rollback: {cleanup_err}")
            logger.error(f"Database error during document upload for vehicle {vehicle_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while uploading the document."
            )

    @staticmethod
    def list_documents(db: Session, vehicle_id: uuid.UUID) -> List[VehicleDocument]:
        """
        Retrieve all active documents of a vehicle.
        """
        # Validate vehicle exists
        VehicleService.get_vehicle(db, vehicle_id)
        return VehicleRepository.get_vehicle_documents(db, vehicle_id)

    @staticmethod
    def delete_document(db: Session, document_id: uuid.UUID) -> VehicleDocument:
        """
        Soft delete a document.
        """
        doc = VehicleRepository.get_vehicle_document_by_id(db, document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )

        try:
            VehicleRepository.soft_delete_vehicle_document(db, doc)
            db.commit()
            db.refresh(doc)
            logger.info(f"Document soft-deleted successfully: ID {doc.id}")
            return doc
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during document deletion for ID {document_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while deleting the document."
            )

    @staticmethod
    def get_document_by_id(db: Session, doc_id: uuid.UUID) -> VehicleDocument:
        doc = VehicleRepository.get_vehicle_document_by_id(db, doc_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found."
            )
        return doc

    @staticmethod
    def create_document(
        db: Session,
        req: VehicleDocumentRequest,
        user_id: uuid.UUID
    ) -> VehicleDocument:
        # Validate vehicle exists and is active
        vehicle = VehicleService.get_vehicle(db, req.vehicle_id)
        if vehicle.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is deleted."
            )

        # Issue date <= Expiry date
        if req.issue_date > req.expiry_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Issue date cannot be later than expiry date."
            )

        # No duplicate active document
        existing = VehicleRepository.get_vehicle_document_by_type(db, req.vehicle_id, req.document_type)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active document of type {req.document_type.value} already exists for this vehicle."
            )

        try:
            doc = VehicleRepository.create_vehicle_document(
                db=db,
                vehicle_id=req.vehicle_id,
                document_name=req.document_name,
                document_type=req.document_type,
                document_number=req.document_number,
                file_name=req.file_name,
                file_path=req.file_path,
                issue_date=req.issue_date,
                expiry_date=req.expiry_date,
                uploaded_by=user_id,
                remarks=req.remarks
            )
            db.commit()
            db.refresh(doc)
            logger.info(f"Vehicle document created: {doc.id}")
            return doc
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating vehicle document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create vehicle document."
            )

    @staticmethod
    def update_document(
        db: Session,
        doc_id: uuid.UUID,
        req: UpdateVehicleDocumentRequest
    ) -> VehicleDocument:
        doc = VehicleService.get_document_by_id(db, doc_id)

        updates = req.model_dump(exclude_unset=True)
        # Check date validation if both or either updated
        issue_d = updates.get("issue_date", doc.issue_date)
        expiry_d = updates.get("expiry_date", doc.expiry_date)
        if issue_d and expiry_d and issue_d > expiry_d:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Issue date cannot be later than expiry date."
            )

        # Check duplicate if type is updated
        if "document_type" in updates and updates["document_type"] != doc.document_type:
            existing = VehicleRepository.get_vehicle_document_by_type(db, doc.vehicle_id, updates["document_type"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An active document of type {updates['document_type'].value} already exists for this vehicle."
                )

        try:
            doc = VehicleRepository.update_vehicle_document(db, doc, updates)
            db.commit()
            db.refresh(doc)
            logger.info(f"Vehicle document updated: {doc.id}")
            return doc
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating vehicle document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update vehicle document."
            )

    @staticmethod
    def get_document_statistics(db: Session) -> Dict[str, Any]:
        today_dt = date.today()
        # Query all active documents
        docs = db.scalars(select(VehicleDocument).where(VehicleDocument.is_deleted == False)).all()

        total = len(docs)
        expired = sum(1 for d in docs if d.expiry_date < today_dt)
        exp_7 = sum(1 for d in docs if today_dt <= d.expiry_date <= today_dt + timedelta(days=7))
        exp_30 = sum(1 for d in docs if today_dt <= d.expiry_date <= today_dt + timedelta(days=30))
        valid = sum(1 for d in docs if d.expiry_date >= today_dt)

        type_counts = {t.value: 0 for t in DocumentType}
        for d in docs:
            type_counts[d.document_type.value] = type_counts.get(d.document_type.value, 0) + 1

        return {
            "total_documents": total,
            "expired": expired,
            "expiring_7_days": exp_7,
            "expiring_30_days": exp_30,
            "valid": valid,
            "documents_per_type": type_counts
        }

    @staticmethod
    def get_all_documents_paginated(
        db: Session,
        search: Optional[str] = None,
        vehicle_id: Optional[uuid.UUID] = None,
        document_type: Optional[DocumentType] = None,
        expired: Optional[bool] = None,
        expiring_soon: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[VehicleDocument], Dict[str, int]]:
        docs = VehicleRepository.get_all_vehicle_documents(
            db, search, vehicle_id, document_type, expired, expiring_soon, sort_by, sort_order
        )
        total = len(docs)
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        paginated_docs = docs[offset:offset + page_size]
        return paginated_docs, {
            "total_records": total,
            "total_pages": pages,
            "current_page": page,
            "page_size": page_size
        }
