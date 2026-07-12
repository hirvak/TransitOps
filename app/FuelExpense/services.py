import uuid
from datetime import date
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.FuelExpense.models import FuelLog, Expense, FuelType, ExpenseType
from app.FuelExpense.repository import FuelExpenseRepository
from app.Vehicles.models import Vehicle
from app.Trips.models import Trip, TripStatus
from app.Maintenance.models import MaintenanceLog
from app.FuelExpense.schemas import CreateFuelLogRequest, UpdateFuelLogRequest, CreateExpenseRequest, UpdateExpenseRequest


class FuelExpenseService:

    # --- Fuel Log Services ---

    @staticmethod
    def create_fuel_log(db: Session, request: CreateFuelLogRequest, current_user_id: uuid.UUID) -> FuelLog:
        # Validate Vehicle
        vehicle = db.scalar(select(Vehicle).where(Vehicle.id == request.vehicle_id, Vehicle.is_deleted == False))
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found."
            )

        # Validate Trip
        trip = db.scalar(select(Trip).where(Trip.id == request.trip_id, Trip.is_deleted == False))
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found."
            )

        # Validate completed status
        if trip.status != TripStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fuel logs can only be created for completed trips."
            )

        # Duplicate Fuel Log check
        existing = db.scalar(
            select(FuelLog).where(
                FuelLog.trip_id == request.trip_id,
                FuelLog.is_deleted == False
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fuel log already exists for this trip."
            )

        # Date validation: fuel_date cannot be earlier than trip completion date
        if trip.completion_time:
            trip_comp_date = trip.completion_time.date()
            if request.fuel_date < trip_comp_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fuel date cannot be earlier than the trip completion date."
                )

        # Odometer reading validation
        if request.odometer_reading < vehicle.odometer_reading:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Odometer reading cannot be lower than the vehicle's current odometer reading."
            )

        # Auto-calculate total_cost
        total_cost = request.fuel_quantity * request.price_per_liter

        fuel_log = FuelLog(
            id=uuid.uuid4(),
            vehicle_id=request.vehicle_id,
            trip_id=request.trip_id,
            fuel_type=request.fuel_type,
            station_name=request.station_name,
            location=request.location,
            fuel_quantity=request.fuel_quantity,
            price_per_liter=request.price_per_liter,
            total_cost=total_cost,
            odometer_reading=request.odometer_reading,
            fuel_date=request.fuel_date,
            notes=request.notes,
            created_by_id=current_user_id
        )

        try:
            # Update vehicle odometer reading
            vehicle.odometer_reading = request.odometer_reading

            FuelExpenseRepository.create_fuel_log(db, fuel_log)
            db.commit()
            logger.info(
                f"Fuel Log created: ID={fuel_log.id}, Vehicle={vehicle.registration_number}, "
                f"Trip={trip.trip_number}, Amount={fuel_log.total_cost}, User={current_user_id}"
            )
            return fuel_log
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating Fuel Log: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create fuel log."
            )

    @staticmethod
    def get_fuel_log(db: Session, id: uuid.UUID) -> FuelLog:
        fuel_log = FuelExpenseRepository.get_fuel_log(db, id)
        if not fuel_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fuel log not found."
            )
        # Calculate single trip fuel efficiency
        if fuel_log.trip and fuel_log.trip.actual_distance and fuel_log.fuel_quantity > 0:
            fuel_log.fuel_efficiency = fuel_log.trip.actual_distance / fuel_log.fuel_quantity
        return fuel_log

    @staticmethod
    def get_paginated_fuel_logs(
        db: Session,
        search: Optional[str] = None,
        fuel_type: Optional[FuelType] = None,
        vehicle_id: Optional[uuid.UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "fuel_date",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[FuelLog], int]:
        logs, total = FuelExpenseRepository.get_paginated_fuel_logs(
            db, search, fuel_type, vehicle_id, start_date, end_date, sort_by, sort_order, page, page_size
        )
        for log in logs:
            if log.trip and log.trip.actual_distance and log.fuel_quantity > 0:
                log.fuel_efficiency = log.trip.actual_distance / log.fuel_quantity
        return logs, total

    @staticmethod
    def update_fuel_log(db: Session, id: uuid.UUID, request: UpdateFuelLogRequest, current_user_id: uuid.UUID) -> FuelLog:
        fuel_log = FuelExpenseRepository.get_fuel_log(db, id)
        if not fuel_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fuel log not found."
            )

        update_dict = request.model_dump(exclude_unset=True)

        # Validate Vehicle if changing
        if request.vehicle_id and request.vehicle_id != fuel_log.vehicle_id:
            vehicle = db.scalar(select(Vehicle).where(Vehicle.id == request.vehicle_id, Vehicle.is_deleted == False))
            if not vehicle:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vehicle not found."
                )

        # Validate Trip if changing
        if request.trip_id and request.trip_id != fuel_log.trip_id:
            trip = db.scalar(select(Trip).where(Trip.id == request.trip_id, Trip.is_deleted == False))
            if not trip:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Trip not found."
                )
            if trip.status != TripStatus.COMPLETED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fuel logs can only be created for completed trips."
                )
            existing = db.scalar(
                select(FuelLog).where(
                    FuelLog.trip_id == request.trip_id,
                    FuelLog.is_deleted == False,
                    FuelLog.id != id
                )
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fuel log already exists for this trip."
                )
            if trip.completion_time and (request.fuel_date or fuel_log.fuel_date) < trip.completion_time.date():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fuel date cannot be earlier than the trip completion date."
                )

        # Recalculate total_cost if quantity or price changes
        qty = request.fuel_quantity if request.fuel_quantity is not None else fuel_log.fuel_quantity
        prc = request.price_per_liter if request.price_per_liter is not None else fuel_log.price_per_liter
        update_dict["total_cost"] = qty * prc

        try:
            FuelExpenseRepository.update_fuel_log(db, fuel_log, update_dict)
            db.commit()
            logger.info(
                f"Fuel Log updated: ID={fuel_log.id}, Vehicle={fuel_log.vehicle.registration_number}, "
                f"Trip={fuel_log.trip.trip_number}, Amount={fuel_log.total_cost}, User={current_user_id}"
            )
            if fuel_log.trip and fuel_log.trip.actual_distance and fuel_log.fuel_quantity > 0:
                fuel_log.fuel_efficiency = fuel_log.trip.actual_distance / fuel_log.fuel_quantity
            return fuel_log
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating Fuel Log: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update fuel log."
            )

    @staticmethod
    def soft_delete_fuel_log(db: Session, id: uuid.UUID, current_user_id: uuid.UUID) -> FuelLog:
        fuel_log = FuelExpenseRepository.get_fuel_log(db, id)
        if not fuel_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fuel log not found."
            )

        try:
            FuelExpenseRepository.soft_delete_fuel_log(db, fuel_log)
            db.commit()
            logger.info(
                f"Fuel Log deleted: ID={fuel_log.id}, Vehicle={fuel_log.vehicle.registration_number}, "
                f"Trip={fuel_log.trip.trip_number}, Amount={fuel_log.total_cost}, User={current_user_id}"
            )
            return fuel_log
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting Fuel Log: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete fuel log."
            )

    # --- Expense Services ---

    @staticmethod
    def create_expense(db: Session, request: CreateExpenseRequest, current_user_id: uuid.UUID) -> Expense:
        # Validate Vehicle
        vehicle = db.scalar(select(Vehicle).where(Vehicle.id == request.vehicle_id, Vehicle.is_deleted == False))
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found."
            )

        # Validate Trip if provided
        if request.trip_id:
            trip = db.scalar(select(Trip).where(Trip.id == request.trip_id, Trip.is_deleted == False))
            if not trip:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Trip not found."
                )

        expense = Expense(
            id=uuid.uuid4(),
            vehicle_id=request.vehicle_id,
            trip_id=request.trip_id,
            expense_type=request.expense_type,
            amount=request.amount,
            expense_date=request.expense_date,
            description=request.description,
            created_by_id=current_user_id
        )

        try:
            FuelExpenseRepository.create_expense(db, expense)
            db.commit()
            logger.info(
                f"Expense created: ID={expense.id}, Vehicle={vehicle.registration_number}, "
                f"Type={expense.expense_type}, Amount={expense.amount}, User={current_user_id}"
            )
            return expense
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating Expense: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create expense."
            )

    @staticmethod
    def get_expense(db: Session, id: uuid.UUID) -> Expense:
        expense = FuelExpenseRepository.get_expense(db, id)
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found."
            )
        return expense

    @staticmethod
    def get_paginated_expenses(
        db: Session,
        search: Optional[str] = None,
        expense_type: Optional[ExpenseType] = None,
        vehicle_id: Optional[uuid.UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "expense_date",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[Expense], int]:
        return FuelExpenseRepository.get_paginated_expenses(
            db, search, expense_type, vehicle_id, start_date, end_date, sort_by, sort_order, page, page_size
        )

    @staticmethod
    def update_expense(db: Session, id: uuid.UUID, request: UpdateExpenseRequest, current_user_id: uuid.UUID) -> Expense:
        expense = FuelExpenseRepository.get_expense(db, id)
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found."
            )

        update_dict = request.model_dump(exclude_unset=True)

        if request.vehicle_id and request.vehicle_id != expense.vehicle_id:
            vehicle = db.scalar(select(Vehicle).where(Vehicle.id == request.vehicle_id, Vehicle.is_deleted == False))
            if not vehicle:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vehicle not found."
                )

        if request.trip_id and request.trip_id != expense.trip_id:
            trip = db.scalar(select(Trip).where(Trip.id == request.trip_id, Trip.is_deleted == False))
            if not trip:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Trip not found."
                )

        try:
            FuelExpenseRepository.update_expense(db, expense, update_dict)
            db.commit()
            logger.info(
                f"Expense updated: ID={expense.id}, Vehicle={expense.vehicle.registration_number}, "
                f"Type={expense.expense_type}, Amount={expense.amount}, User={current_user_id}"
            )
            return expense
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating Expense: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update expense."
            )

    @staticmethod
    def soft_delete_expense(db: Session, id: uuid.UUID, current_user_id: uuid.UUID) -> Expense:
        expense = FuelExpenseRepository.get_expense(db, id)
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found."
            )

        try:
            FuelExpenseRepository.soft_delete_expense(db, expense)
            db.commit()
            logger.info(
                f"Expense deleted: ID={expense.id}, Vehicle={expense.vehicle.registration_number}, "
                f"Type={expense.expense_type}, Amount={expense.amount}, User={current_user_id}"
            )
            return expense
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting Expense: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete expense."
            )

    # --- Analytics summaries ---

    @staticmethod
    def get_statistics(db: Session) -> dict:
        return FuelExpenseRepository.get_statistics(db)

    @staticmethod
    def get_vehicle_financial_summary(db: Session, vehicle_id: uuid.UUID) -> dict:
        vehicle = db.scalar(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.is_deleted == False))
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found."
            )

        # Aggregate calculations for this vehicle specifically
        total_trips = db.scalar(
            select(func.count(Trip.id)).where(Trip.vehicle_id == vehicle_id, Trip.is_deleted == False, Trip.status == TripStatus.COMPLETED)
        ) or 0

        total_distance = db.scalar(
            select(func.sum(Trip.actual_distance)).where(Trip.vehicle_id == vehicle_id, Trip.is_deleted == False, Trip.status == TripStatus.COMPLETED)
        ) or 0.0

        total_fuel_quantity = db.scalar(
            select(func.sum(FuelLog.fuel_quantity)).where(FuelLog.vehicle_id == vehicle_id, FuelLog.is_deleted == False)
        ) or 0.0

        total_fuel_cost = db.scalar(
            select(func.sum(FuelLog.total_cost)).where(FuelLog.vehicle_id == vehicle_id, FuelLog.is_deleted == False)
        ) or 0.0

        total_expenses = db.scalar(
            select(func.sum(Expense.amount)).where(Expense.vehicle_id == vehicle_id, Expense.is_deleted == False)
        ) or 0.0

        try:
            maintenance_cost = db.scalar(
                select(func.sum(MaintenanceLog.cost)).where(MaintenanceLog.vehicle_id == vehicle_id, MaintenanceLog.is_deleted == False)
            ) or 0.0
        except Exception:
            maintenance_cost = 0.0

        operational_cost = float(total_fuel_cost) + float(total_expenses) + float(maintenance_cost)

        # fuel efficiency: total completed distance for which we have fuel logs / fuel quantity
        eff_stmt = (
            select(func.sum(Trip.actual_distance), func.sum(FuelLog.fuel_quantity))
            .join(FuelLog, Trip.id == FuelLog.trip_id)
            .where(
                Trip.vehicle_id == vehicle_id,
                Trip.is_deleted == False,
                FuelLog.is_deleted == False,
                Trip.status == TripStatus.COMPLETED
            )
        )
        eff_row = db.execute(eff_stmt).first()
        fuel_efficiency = None
        if eff_row and eff_row[1] and float(eff_row[1]) > 0:
            fuel_efficiency = float(eff_row[0] or 0.0) / float(eff_row[1])

        cost_per_km = None
        if float(total_distance) > 0:
            cost_per_km = operational_cost / float(total_distance)

        return {
            "vehicle_registration": vehicle.registration_number,
            "total_trips": total_trips,
            "total_distance": float(total_distance),
            "total_fuel_quantity": float(total_fuel_quantity),
            "total_fuel_cost": float(total_fuel_cost),
            "total_expenses": float(total_expenses),
            "maintenance_cost": float(maintenance_cost),
            "operational_cost": operational_cost,
            "fuel_efficiency": fuel_efficiency,
            "cost_per_km": cost_per_km
        }
