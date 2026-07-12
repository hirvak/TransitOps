import uuid
import math
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from loguru import logger

from app.Drivers.schemas import CreateDriverRequest, UpdateDriverRequest
from app.Drivers.repository import DriverRepository
from app.Drivers.models import Driver, DriverStatus


class DriverService:
    @staticmethod
    def get_driver(db: Session, driver_id: uuid.UUID) -> Driver:
        """
        Fetch a driver by ID, raising 404 if not found or soft-deleted.
        """
        driver = DriverRepository.get_driver_by_id(db, driver_id)
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found."
            )
        return driver

    @staticmethod
    def create_driver(db: Session, request: CreateDriverRequest) -> Driver:
        """
        Create a new driver after validating that email and license number are unique.
        Commits transaction on success, rolls back on error.
        """
        # Validate unique email (globally, including soft-deleted to avoid DB unique constraint violation)
        existing_email = DriverRepository.get_driver_by_email(db, request.email, include_deleted=True)
        if existing_email:
            logger.warning(f"Driver creation failed: Email {request.email} already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists."
            )

        # Validate unique license number (globally, including soft-deleted)
        existing_license = DriverRepository.get_driver_by_license(db, request.license_number, include_deleted=True)
        if existing_license:
            logger.warning(f"Driver creation failed: License number {request.license_number} already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="License number already exists."
            )

        try:
            db_driver = DriverRepository.create_driver(db, request)
            db.commit()
            db.refresh(db_driver)
            logger.info(f"Driver created successfully: {db_driver.email} (ID: {db_driver.id})")
            return db_driver
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during driver creation for {request.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating the driver."
            )

    @staticmethod
    def update_driver(db: Session, driver_id: uuid.UUID, request: UpdateDriverRequest) -> Driver:
        """
        Update an active driver. Validates email and license number uniqueness if they are changing.
        Commits transaction on success, rolls back on error.
        """
        driver = DriverService.get_driver(db, driver_id)
        updates = {}

        # Build update dictionary
        if request.full_name is not None:
            updates["full_name"] = request.full_name
        if request.phone is not None:
            updates["phone"] = request.phone
        if request.license_category is not None:
            updates["license_category"] = request.license_category
        if request.license_expiry is not None:
            updates["license_expiry"] = request.license_expiry
        if request.safety_score is not None:
            updates["safety_score"] = request.safety_score
        if request.status is not None:
            updates["status"] = request.status

        # Validate and update email
        if request.email is not None and request.email != driver.email:
            existing_email = DriverRepository.get_driver_by_email(db, request.email, include_deleted=True)
            if existing_email:
                logger.warning(f"Driver update failed: Email {request.email} already exists.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists."
                )
            updates["email"] = request.email

        # Validate and update license number
        if request.license_number is not None and request.license_number != driver.license_number:
            existing_license = DriverRepository.get_driver_by_license(db, request.license_number, include_deleted=True)
            if existing_license:
                logger.warning(f"Driver update failed: License number {request.license_number} already exists.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="License number already exists."
                )
            updates["license_number"] = request.license_number

        try:
            db_driver = DriverRepository.update_driver(db, driver, updates)
            db.commit()
            db.refresh(db_driver)
            logger.info(f"Driver updated successfully: {db_driver.email} (ID: {db_driver.id})")
            return db_driver
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during driver update for {driver.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating the driver."
            )

    @staticmethod
    def delete_driver(db: Session, driver_id: uuid.UUID) -> Driver:
        """
        Soft-deletes a driver by marking is_deleted = True.
        """
        driver = DriverService.get_driver(db, driver_id)
        try:
            db_driver = DriverRepository.soft_delete_driver(db, driver)
            db.commit()
            db.refresh(db_driver)
            logger.info(f"Driver soft-deleted successfully: {db_driver.email} (ID: {db_driver.id})")
            return db_driver
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during driver soft-delete for {driver.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while deleting the driver."
            )

    @staticmethod
    def activate_driver(db: Session, driver_id: uuid.UUID) -> Driver:
        """
        Mark a driver's status as AVAILABLE.
        """
        driver = DriverService.get_driver(db, driver_id)
        try:
            db_driver = DriverRepository.change_driver_status(db, driver, DriverStatus.AVAILABLE)
            db.commit()
            db.refresh(db_driver)
            logger.info(f"Driver marked AVAILABLE: {db_driver.email} (ID: {db_driver.id})")
            return db_driver
        except Exception as e:
            db.rollback()
            logger.error(f"Database error while marking driver AVAILABLE for {driver.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while changing driver status."
            )

    @staticmethod
    def suspend_driver(db: Session, driver_id: uuid.UUID) -> Driver:
        """
        Mark a driver's status as SUSPENDED.
        """
        driver = DriverService.get_driver(db, driver_id)
        try:
            db_driver = DriverRepository.change_driver_status(db, driver, DriverStatus.SUSPENDED)
            db.commit()
            db.refresh(db_driver)
            logger.info(f"Driver marked SUSPENDED: {db_driver.email} (ID: {db_driver.id})")
            return db_driver
        except Exception as e:
            db.rollback()
            logger.error(f"Database error while suspending driver for {driver.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while suspending the driver."
            )

    @staticmethod
    def list_drivers(
        db: Session,
        page: int,
        page_size: int,
        search: str | None,
        status_filter: DriverStatus | None,
        license_category: str | None,
        sort_by: str,
        sort_order: str
    ) -> dict:
        """
        Retrieve paginated lists of drivers and format the output with pagination metadata.
        """
        drivers, total_records = DriverRepository.get_all_drivers(
            db=db,
            page=page,
            page_size=page_size,
            search=search,
            status=status_filter,
            license_category=license_category,
            sort_by=sort_by,
            sort_order=sort_order
        )
        total_pages = math.ceil(total_records / page_size) if total_records > 0 else 0
        return {
            "data": drivers,
            "pagination": {
                "total_records": total_records,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size
            }
        }
