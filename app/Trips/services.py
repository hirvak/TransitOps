import uuid
from datetime import datetime, date, timezone
from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.Trips.models import Trip, TripStatus
from app.Trips.repository import TripRepository
from app.Trips.schemas import CreateTripRequest, UpdateTripRequest, CompleteTripRequest
from app.Vehicles.models import Vehicle, VehicleStatus
from app.Drivers.models import Driver, DriverStatus
from app.Maintenance.models import MaintenanceLog, MaintenanceStatus


class TripService:
    @staticmethod
    def create_trip(db: Session, request: CreateTripRequest, creator_id: uuid.UUID) -> Trip:
        # Start Transaction (handled by caller or session context, but we execute operations in order)
        # Generate trip number sequentially inside the transaction with a row lock on max trip number
        max_num = TripRepository.get_max_trip_number(db)
        if not max_num:
            new_trip_num = "TRIP-000001"
        else:
            suffix = max_num.replace("TRIP-", "")
            try:
                new_seq = int(suffix) + 1
            except ValueError:
                new_seq = 1
            new_trip_num = f"TRIP-{new_seq:06d}"

        # 1. Fetch & Validate Vehicle
        vehicle = db.scalar(
            select(Vehicle).where(
                Vehicle.id == request.vehicle_id,
                Vehicle.is_deleted == False
            )
        )
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found."
            )
        if vehicle.status != VehicleStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle is not available (Status: {vehicle.status.value})."
            )
        
        # 1b. Active Maintenance check
        active_maint = db.scalar(
            select(func.count(MaintenanceLog.id)).where(
                MaintenanceLog.vehicle_id == vehicle.id,
                MaintenanceLog.status == MaintenanceStatus.OPEN,
                MaintenanceLog.is_deleted == False
            )
        )
        if active_maint and active_maint > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle has active maintenance record."
            )

        # 2. Fetch & Validate Driver
        driver = db.scalar(
            select(Driver).where(
                Driver.id == request.driver_id,
                Driver.is_deleted == False
            )
        )
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found."
            )
        if driver.status != DriverStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver is not available (Status: {driver.status.value})."
            )
        if not driver.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver is inactive."
            )
        if driver.license_expiry < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver license expired."
            )

        # 3. Cargo Limit check
        if request.cargo_weight > float(vehicle.maximum_load_capacity):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cargo exceeds vehicle capacity."
            )

        # 4. Duplicate assignment check (active dispatched trips)
        dup_vehicle = db.scalar(
            select(func.count(Trip.id)).where(
                Trip.vehicle_id == vehicle.id,
                Trip.status == TripStatus.DISPATCHED,
                Trip.is_deleted == False
            )
        )
        if dup_vehicle and dup_vehicle > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is already assigned to another dispatched trip."
            )

        dup_driver = db.scalar(
            select(func.count(Trip.id)).where(
                Trip.driver_id == driver.id,
                Trip.status == TripStatus.DISPATCHED,
                Trip.is_deleted == False
            )
        )
        if dup_driver and dup_driver > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver is already assigned to another dispatched trip."
            )

        # Get current odometer
        start_odo = float(vehicle.odometer_reading)

        # Save Trip
        trip = TripRepository.create_trip(
            db=db,
            trip_data=request.model_dump(),
            creator_id=creator_id,
            start_odometer=start_odo,
            trip_number=new_trip_num
        )

        db.commit()
        db.refresh(trip)

        logger.info(
            f"Trip {trip.trip_number} created by User {creator_id}. "
            f"Vehicle {vehicle.registration_number} assigned, "
            f"Driver {driver.full_name} assigned."
        )
        return trip

    @staticmethod
    def get_trip(db: Session, trip_id: uuid.UUID) -> Trip:
        trip = TripRepository.get_trip(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found."
            )
        return trip

    @staticmethod
    def get_paginated_trips(db: Session, **kwargs) -> dict:
        trips, total = TripRepository.get_paginated_trips(db, **kwargs)
        page_size = kwargs.get("page_size", 10)
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        return {
            "data": trips,
            "pagination": {
                "total_records": total,
                "total_pages": total_pages,
                "current_page": kwargs.get("page", 1),
                "page_size": page_size
            }
        }

    @staticmethod
    def get_trip_statistics(db: Session) -> dict:
        return TripRepository.get_trip_statistics(db)

    @staticmethod
    def update_trip(db: Session, trip_id: uuid.UUID, request: UpdateTripRequest) -> Trip:
        trip = TripRepository.get_trip(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found."
            )

        if trip.status != TripStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only DRAFT trips can be updated."
            )

        # Validate changes if vehicle/driver are being updated
        updates = request.model_dump(exclude_unset=True)

        if "vehicle_id" in updates and updates["vehicle_id"] != trip.vehicle_id:
            vehicle = db.scalar(
                select(Vehicle).where(
                    Vehicle.id == updates["vehicle_id"],
                    Vehicle.is_deleted == False
                )
            )
            if not vehicle:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vehicle not found."
                )
            if vehicle.status != VehicleStatus.AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vehicle is not available."
                )
            active_maint = db.scalar(
                select(func.count(MaintenanceLog.id)).where(
                    MaintenanceLog.vehicle_id == vehicle.id,
                    MaintenanceLog.status == MaintenanceStatus.OPEN,
                    MaintenanceLog.is_deleted == False
                )
            )
            if active_maint and active_maint > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vehicle has active maintenance record."
                )
            # Duplicate check
            dup_vehicle = db.scalar(
                select(func.count(Trip.id)).where(
                    Trip.vehicle_id == vehicle.id,
                    Trip.status == TripStatus.DISPATCHED,
                    Trip.is_deleted == False
                )
            )
            if dup_vehicle and dup_vehicle > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vehicle is already assigned to another dispatched trip."
                )
            # Cargo weight compatibility
            cargo_w = updates.get("cargo_weight", trip.cargo_weight)
            if cargo_w > float(vehicle.maximum_load_capacity):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cargo exceeds vehicle capacity."
                )
            updates["start_odometer"] = float(vehicle.odometer_reading)

        if "driver_id" in updates and updates["driver_id"] != trip.driver_id:
            driver = db.scalar(
                select(Driver).where(
                    Driver.id == updates["driver_id"],
                    Driver.is_deleted == False
                )
            )
            if not driver:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Driver not found."
                )
            if driver.status != DriverStatus.AVAILABLE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Driver is not available."
                )
            if not driver.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Driver is inactive."
                )
            if driver.license_expiry < date.today():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Driver license expired."
                )
            # Duplicate check
            dup_driver = db.scalar(
                select(func.count(Trip.id)).where(
                    Trip.driver_id == driver.id,
                    Trip.status == TripStatus.DISPATCHED,
                    Trip.is_deleted == False
                )
            )
            if dup_driver and dup_driver > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Driver is already assigned to another dispatched trip."
                )

        if "cargo_weight" in updates and "vehicle_id" not in updates:
            # Check cargo weight against current vehicle
            if updates["cargo_weight"] > float(trip.vehicle.maximum_load_capacity):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cargo exceeds vehicle capacity."
                )

        updated_trip = TripRepository.update_trip(db, trip, updates)
        db.commit()
        db.refresh(updated_trip)

        logger.info(f"Trip {updated_trip.trip_number} updated.")
        return updated_trip

    @staticmethod
    def delete_trip(db: Session, trip_id: uuid.UUID) -> Trip:
        trip = TripRepository.get_trip(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found."
            )

        if trip.status not in [TripStatus.DRAFT, TripStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only DRAFT or CANCELLED trips can be deleted."
            )

        # Financial/Operational audit validation check
        has_actual_dist = trip.actual_distance is not None and float(trip.actual_distance) > 0
        has_fuel = trip.fuel_consumed is not None and float(trip.fuel_consumed) > 0
        has_revenue = trip.revenue is not None and float(trip.revenue) > 0

        if has_actual_dist or has_fuel or has_revenue:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete trip with recorded operational or financial data."
            )

        deleted_trip = TripRepository.soft_delete_trip(db, trip)
        db.commit()

        logger.info(f"Trip {deleted_trip.trip_number} soft deleted.")
        return deleted_trip

    @staticmethod
    def dispatch_trip(db: Session, trip_id: uuid.UUID) -> Trip:
        trip = TripRepository.get_trip(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found."
            )

        if trip.status != TripStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only DRAFT trips can be dispatched."
            )

        # Race condition re-check
        vehicle = trip.vehicle
        driver = trip.driver

        if vehicle.status != VehicleStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned vehicle is no longer available."
            )
        if driver.status != DriverStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned driver is no longer available."
            )

        # Dispatch transition
        trip.status = TripStatus.DISPATCHED
        trip.dispatch_time = datetime.now(timezone.utc)

        vehicle.status = VehicleStatus.ON_TRIP
        driver.status = DriverStatus.ON_TRIP

        db.commit()
        db.refresh(trip)

        logger.info(
            f"Trip {trip.trip_number} dispatched. "
            f"Vehicle {vehicle.registration_number} assigned, "
            f"Driver {driver.full_name} assigned."
        )
        return trip

    @staticmethod
    def complete_trip(db: Session, trip_id: uuid.UUID, request: CompleteTripRequest) -> Trip:
        trip = TripRepository.get_trip(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found."
            )

        if trip.status != TripStatus.DISPATCHED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only DISPATCHED trips can be completed."
            )

        vehicle = trip.vehicle
        driver = trip.driver

        # End Odometer checks
        if request.end_odometer <= float(vehicle.odometer_reading) or request.end_odometer < float(trip.start_odometer):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End odometer must be greater than vehicle current odometer and starting odometer."
            )

        # Actual distance checks
        diff = request.end_odometer - float(trip.start_odometer)
        if request.actual_distance > diff:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Actual distance cannot exceed the difference between ending and starting odometer."
            )

        # Complete transition
        trip.status = TripStatus.COMPLETED
        trip.end_odometer = request.end_odometer
        trip.actual_distance = request.actual_distance
        trip.fuel_consumed = request.fuel_consumed
        trip.revenue = request.revenue
        if request.remarks:
            trip.remarks = request.remarks
        trip.completion_time = datetime.now(timezone.utc)

        vehicle.status = VehicleStatus.AVAILABLE
        vehicle.odometer_reading = request.end_odometer

        driver.status = DriverStatus.AVAILABLE

        db.commit()
        db.refresh(trip)

        logger.info(
            f"Trip {trip.trip_number} completed. "
            f"End odometer: {request.end_odometer}, "
            f"Actual distance: {request.actual_distance}, "
            f"Revenue: {request.revenue}."
        )
        return trip

    @staticmethod
    def cancel_trip(db: Session, trip_id: uuid.UUID) -> Trip:
        trip = TripRepository.get_trip(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found."
            )

        if trip.status in [TripStatus.COMPLETED, TripStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Completed or Cancelled trips cannot be cancelled again."
            )

        vehicle = trip.vehicle
        driver = trip.driver

        # If it was active, restore assigned resources
        if trip.status == TripStatus.DISPATCHED:
            vehicle.status = VehicleStatus.AVAILABLE
            driver.status = DriverStatus.AVAILABLE

        trip.status = TripStatus.CANCELLED
        # Store cancellation time in updated_at, but we commit the state change
        db.commit()
        db.refresh(trip)

        logger.info(f"Trip {trip.trip_number} cancelled.")
        return trip
