import uuid
from datetime import date
from typing import List, Optional, Tuple
from sqlalchemy import select, func, desc, asc, and_, or_
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.FuelExpense.models import FuelLog, Expense, FuelType, ExpenseType
from app.Vehicles.models import Vehicle
from app.Trips.models import Trip, TripStatus
from app.Maintenance.models import MaintenanceLog


class FuelExpenseRepository:

    # --- Fuel Log CRUD ---

    @staticmethod
    def create_fuel_log(db: Session, fuel_log: FuelLog) -> FuelLog:
        db.add(fuel_log)
        return fuel_log

    @staticmethod
    def get_fuel_log(db: Session, id: uuid.UUID) -> Optional[FuelLog]:
        return db.scalar(
            select(FuelLog).where(
                FuelLog.id == id,
                FuelLog.is_deleted == False
            )
        )

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
        query = select(FuelLog).join(Vehicle, FuelLog.vehicle_id == Vehicle.id).join(Trip, FuelLog.trip_id == Trip.id).where(
            FuelLog.is_deleted == False
        )

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Vehicle.registration_number.ilike(search_filter),
                    Vehicle.vehicle_name.ilike(search_filter),
                    Trip.trip_number.ilike(search_filter)
                )
            )

        if fuel_type:
            query = query.where(FuelLog.fuel_type == fuel_type)
        if vehicle_id:
            query = query.where(FuelLog.vehicle_id == vehicle_id)
        if start_date:
            query = query.where(FuelLog.fuel_date >= start_date)
        if end_date:
            query = query.where(FuelLog.fuel_date <= end_date)

        # Sorting
        sort_attr = getattr(FuelLog, sort_by, FuelLog.fuel_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total_records = db.scalar(count_stmt) or 0

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        results = db.scalars(query).all()

        return list(results), total_records

    @staticmethod
    def update_fuel_log(db: Session, fuel_log: FuelLog, update_data: dict) -> FuelLog:
        for key, value in update_data.items():
            if value is not None:
                setattr(fuel_log, key, value)
        return fuel_log

    @staticmethod
    def soft_delete_fuel_log(db: Session, fuel_log: FuelLog) -> FuelLog:
        fuel_log.is_deleted = True
        return fuel_log

    # --- Expense CRUD ---

    @staticmethod
    def create_expense(db: Session, expense: Expense) -> Expense:
        db.add(expense)
        return expense

    @staticmethod
    def get_expense(db: Session, id: uuid.UUID) -> Optional[Expense]:
        return db.scalar(
            select(Expense).where(
                Expense.id == id,
                Expense.is_deleted == False
            )
        )

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
        query = select(Expense).join(Vehicle, Expense.vehicle_id == Vehicle.id).where(
            Expense.is_deleted == False
        )

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Vehicle.registration_number.ilike(search_filter),
                    Expense.expense_type.cast(sa.String).ilike(search_filter),
                    Expense.description.ilike(search_filter)
                )
            )

        if expense_type:
            query = query.where(Expense.expense_type == expense_type)
        if vehicle_id:
            query = query.where(Expense.vehicle_id == vehicle_id)
        if start_date:
            query = query.where(Expense.expense_date >= start_date)
        if end_date:
            query = query.where(Expense.expense_date <= end_date)

        # Sorting
        sort_attr = getattr(Expense, sort_by, Expense.expense_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total_records = db.scalar(count_stmt) or 0

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        results = db.scalars(query).all()

        return list(results), total_records

    @staticmethod
    def update_expense(db: Session, expense: Expense, update_data: dict) -> Expense:
        for key, value in update_data.items():
            if value is not None:
                setattr(expense, key, value)
        return expense

    @staticmethod
    def soft_delete_expense(db: Session, expense: Expense) -> Expense:
        expense.is_deleted = True
        return expense

    # --- Statistics & vehicle summaries ---

    @staticmethod
    def get_statistics(db: Session) -> dict:
        import sqlalchemy as sa
        # Fuel Costs
        total_fuel_cost = db.scalar(
            select(func.sum(FuelLog.total_cost)).where(FuelLog.is_deleted == False)
        ) or 0.0

        total_fuel_quantity = db.scalar(
            select(func.sum(FuelLog.fuel_quantity)).where(FuelLog.is_deleted == False)
        ) or 0.0

        # Other Expenses
        total_other_expenses = db.scalar(
            select(func.sum(Expense.amount)).where(Expense.is_deleted == False)
        ) or 0.0

        # Maintenance Cost (from module)
        try:
            maintenance_cost = db.scalar(
                select(func.sum(MaintenanceLog.cost)).where(MaintenanceLog.is_deleted == False)
            ) or 0.0
        except Exception:
            maintenance_cost = 0.0

        # Operational Cost
        operational_cost = float(total_fuel_cost) + float(total_other_expenses) + float(maintenance_cost)

        # Fuel Efficiency: total actual distance of trips with fuel logs / total fuel logs quantity
        efficiency_stmt = (
            select(func.sum(Trip.actual_distance), func.sum(FuelLog.fuel_quantity))
            .join(FuelLog, Trip.id == FuelLog.trip_id)
            .where(
                Trip.is_deleted == False,
                FuelLog.is_deleted == False,
                Trip.status == TripStatus.COMPLETED
            )
        )
        eff_row = db.execute(efficiency_stmt).first()
        avg_fuel_efficiency = None
        if eff_row and eff_row[1] and float(eff_row[1]) > 0:
            avg_fuel_efficiency = float(eff_row[0] or 0.0) / float(eff_row[1])

        # Cost per KM: operational cost / total completed distance of all completed trips
        total_dist_stmt = select(func.sum(Trip.actual_distance)).where(
            Trip.is_deleted == False,
            Trip.status == TripStatus.COMPLETED
        )
        total_distance = db.scalar(total_dist_stmt) or 0.0
        cost_per_km = None
        if total_distance > 0:
            cost_per_km = operational_cost / float(total_distance)

        # Count parameters
        total_fuel_logs = db.scalar(
            select(func.count(FuelLog.id)).where(FuelLog.is_deleted == False)
        ) or 0

        total_expenses_count = db.scalar(
            select(func.count(Expense.id)).where(Expense.is_deleted == False)
        ) or 0

        # Highest Expense Vehicle
        # Aggregate fuel + expenses + maintenance cost per vehicle
        # Let's run raw calculations or separate queries to find it
        vehicles = db.scalars(select(Vehicle).where(Vehicle.is_deleted == False)).all()
        highest_expense_vehicle = None
        max_veh_cost = -1.0
        for veh in vehicles:
            fuel_sum = db.scalar(select(func.sum(FuelLog.total_cost)).where(FuelLog.vehicle_id == veh.id, FuelLog.is_deleted == False)) or 0.0
            exp_sum = db.scalar(select(func.sum(Expense.amount)).where(Expense.vehicle_id == veh.id, Expense.is_deleted == False)) or 0.0
            try:
                maint_sum = db.scalar(select(func.sum(MaintenanceLog.cost)).where(MaintenanceLog.vehicle_id == veh.id, MaintenanceLog.is_deleted == False)) or 0.0
            except Exception:
                maint_sum = 0.0
            veh_total = float(fuel_sum) + float(exp_sum) + float(maint_sum)
            if veh_total > max_veh_cost:
                max_veh_cost = veh_total
                highest_expense_vehicle = veh.registration_number

        # Highest Fuel Consuming Vehicle
        highest_fuel_consuming_vehicle = None
        max_fuel_cons = -1.0
        for veh in vehicles:
            fuel_cons = db.scalar(select(func.sum(FuelLog.fuel_quantity)).where(FuelLog.vehicle_id == veh.id, FuelLog.is_deleted == False)) or 0.0
            if float(fuel_cons) > max_fuel_cons:
                max_fuel_cons = float(fuel_cons)
                highest_fuel_consuming_vehicle = veh.registration_number

        # Highest Cost Trip: Trip with highest combined (fuel total cost + expense amount)
        trips = db.scalars(select(Trip).where(Trip.is_deleted == False)).all()
        highest_cost_trip = None
        max_trip_cost = -1.0
        for t in trips:
            fuel_sum = db.scalar(select(func.sum(FuelLog.total_cost)).where(FuelLog.trip_id == t.id, FuelLog.is_deleted == False)) or 0.0
            exp_sum = db.scalar(select(func.sum(Expense.amount)).where(Expense.trip_id == t.id, Expense.is_deleted == False)) or 0.0
            trip_total = float(fuel_sum) + float(exp_sum)
            if trip_total > max_trip_cost:
                max_trip_cost = trip_total
                highest_cost_trip = t.trip_number

        # Average cost per trip: operational cost / total completed trips
        completed_trips_count = db.scalar(
            select(func.count(Trip.id)).where(Trip.is_deleted == False, Trip.status == TripStatus.COMPLETED)
        ) or 0
        average_cost_per_trip = (operational_cost / completed_trips_count) if completed_trips_count > 0 else 0.0

        return {
            "total_fuel_cost": float(total_fuel_cost),
            "total_other_expenses": float(total_other_expenses),
            "maintenance_cost": float(maintenance_cost),
            "operational_cost": operational_cost,
            "total_fuel_quantity": float(total_fuel_quantity),
            "average_fuel_efficiency": avg_fuel_efficiency,
            "cost_per_km": cost_per_km,
            "highest_expense_vehicle": highest_expense_vehicle,
            "highest_fuel_consuming_vehicle": highest_fuel_consuming_vehicle,
            "total_expenses_count": total_expenses_count,
            "total_fuel_logs": total_fuel_logs,
            "highest_cost_trip": highest_cost_trip,
            "average_cost_per_trip": average_cost_per_trip
        }
