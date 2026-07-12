import uuid
from typing import Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.Drivers.models import Driver, DriverStatus
from app.Drivers.schemas import CreateDriverRequest


class DriverRepository:
    @staticmethod
    def get_driver_by_id(db: Session, driver_id: uuid.UUID) -> Driver | None:
        """
        Fetch a driver by their primary key UUID. Only returns if not soft-deleted.
        """
        stmt = select(Driver).where(Driver.id == driver_id, Driver.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def get_driver_by_license(db: Session, license_number: str, include_deleted: bool = False) -> Driver | None:
        """
        Fetch a driver by their license number.
        """
        stmt = select(Driver).where(Driver.license_number == license_number)
        if not include_deleted:
            stmt = stmt.where(Driver.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def get_driver_by_email(db: Session, email: str, include_deleted: bool = False) -> Driver | None:
        """
        Fetch a driver by their email.
        """
        stmt = select(Driver).where(Driver.email == email)
        if not include_deleted:
            stmt = stmt.where(Driver.is_deleted == False)
        return db.scalar(stmt)

    @staticmethod
    def create_driver(db: Session, driver_data: CreateDriverRequest) -> Driver:
        """
        Create and add a new driver to the database session. Does NOT commit.
        """
        db_driver = Driver(
            full_name=driver_data.full_name,
            email=driver_data.email,
            phone=driver_data.phone,
            license_number=driver_data.license_number,
            license_category=driver_data.license_category,
            license_expiry=driver_data.license_expiry,
            safety_score=driver_data.safety_score if driver_data.safety_score is not None else 100.0,
            status=driver_data.status if driver_data.status is not None else DriverStatus.AVAILABLE
        )
        db.add(db_driver)
        db.flush()
        return db_driver

    @staticmethod
    def get_all_drivers(
        db: Session,
        page: int,
        page_size: int,
        search: str | None,
        status: DriverStatus | None,
        license_category: str | None,
        sort_by: str,
        sort_order: str
    ) -> Tuple[List[Driver], int]:
        """
        Fetch a paginated list of drivers based on search, filters, and sorting parameters.
        Returns a tuple of (drivers_list, total_records).
        """
        # Base query (excluding soft-deleted drivers)
        stmt = select(Driver).where(Driver.is_deleted == False)

        # Filters
        if status is not None:
            stmt = stmt.where(Driver.status == status)
        if license_category:
            stmt = stmt.where(Driver.license_category == license_category)

        # Search (matches name, email, or license number case-insensitively)
        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                (Driver.full_name.ilike(search_pattern)) |
                (Driver.email.ilike(search_pattern)) |
                (Driver.license_number.ilike(search_pattern))
            )

        # Sorting (supports Name, License Expiry, Safety Score, Created Date)
        sort_column = Driver.created_at
        if sort_by == "name":
            sort_column = Driver.full_name
        elif sort_by == "license_expiry":
            sort_column = Driver.license_expiry
        elif sort_by == "safety_score":
            sort_column = Driver.safety_score
        elif sort_by == "created_at":
            sort_column = Driver.created_at

        if sort_order == "desc":
            stmt = stmt.order_by(sort_column.desc())
        else:
            stmt = stmt.order_by(sort_column.asc())

        # Total count query before pagination offsets are applied
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_records = db.scalar(count_stmt) or 0

        # Pagination
        offset_value = (page - 1) * page_size
        stmt = stmt.offset(offset_value).limit(page_size)

        drivers = list(db.scalars(stmt).all())
        return drivers, total_records

    @staticmethod
    def update_driver(db: Session, driver: Driver, updates: dict) -> Driver:
        """
        Update fields on an existing Driver object. Does NOT commit.
        """
        for key, value in updates.items():
            setattr(driver, key, value)
        db.flush()
        return driver

    @staticmethod
    def soft_delete_driver(db: Session, driver: Driver) -> Driver:
        """
        Perform a soft delete by marking is_deleted=True. Does NOT commit.
        """
        driver.is_deleted = True
        db.flush()
        return driver

    @staticmethod
    def change_driver_status(db: Session, driver: Driver, status: DriverStatus) -> Driver:
        """
        Modify driver's availability/duty status. Does NOT commit.
        """
        driver.status = status
        db.flush()
        return driver
