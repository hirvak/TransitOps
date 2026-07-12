import uuid
from datetime import datetime, date, time
from typing import List, Tuple, Optional
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.orm import Session

from app.Trips.models import Trip, TripStatus
from app.Vehicles.models import Vehicle, VehicleStatus
from app.Drivers.models import Driver, DriverStatus


class TripRepository:
    @staticmethod
    def get_trip(db: Session, trip_id: uuid.UUID) -> Optional[Trip]:
        return db.scalar(
            select(Trip).where(
                Trip.id == trip_id,
                Trip.is_deleted == False
            )
        )

    @staticmethod
    def get_trip_by_number(db: Session, trip_number: str) -> Optional[Trip]:
        return db.scalar(
            select(Trip).where(
                Trip.trip_number == trip_number,
                Trip.is_deleted == False
            )
        )

    @staticmethod
    def get_max_trip_number(db: Session) -> Optional[str]:
        # Lock rows to prevent concurrent generator collisions
        return db.scalar(
            select(Trip.trip_number)
            .order_by(desc(Trip.trip_number))
            .limit(1)
            .with_for_update()
        )

    @staticmethod
    def create_trip(
        db: Session,
        trip_data: dict,
        creator_id: uuid.UUID,
        start_odometer: float,
        trip_number: str
    ) -> Trip:
        trip = Trip(
            trip_number=trip_number,
            created_by_id=creator_id,
            start_odometer=start_odometer,
            **trip_data
        )
        db.add(trip)
        return trip

    @staticmethod
    def update_trip(db: Session, trip: Trip, updates: dict) -> Trip:
        for key, value in updates.items():
            setattr(trip, key, value)
        return trip

    @staticmethod
    def soft_delete_trip(db: Session, trip: Trip) -> Trip:
        trip.is_deleted = True
        return trip

    @staticmethod
    def get_paginated_trips(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None,
        trip_status: Optional[TripStatus] = None,
        vehicle_id: Optional[uuid.UUID] = None,
        driver_id: Optional[uuid.UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Trip], int]:
        query = select(Trip).where(Trip.is_deleted == False)

        # Filters
        if trip_status:
            query = query.where(Trip.status == trip_status)
        if vehicle_id:
            query = query.where(Trip.vehicle_id == vehicle_id)
        if driver_id:
            query = query.where(Trip.driver_id == driver_id)

        # Date Range (checks planned_departure)
        if start_date:
            start_dt = datetime.combine(start_date, time.min)
            query = query.where(Trip.planned_departure >= start_dt)
        if end_date:
            end_dt = datetime.combine(end_date, time.max)
            query = query.where(Trip.planned_departure <= end_dt)

        # Search
        if search:
            # Join relationships to search on registration_number, vehicle_model, and driver name
            query = query.join(Trip.vehicle).join(Trip.driver)
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Trip.origin.ilike(search_pattern),
                    Trip.destination.ilike(search_pattern),
                    Trip.trip_number.ilike(search_pattern),
                    Vehicle.registration_number.ilike(search_pattern),
                    Vehicle.vehicle_model.ilike(search_pattern),
                    Driver.full_name.ilike(search_pattern)
                )
            )

        # Sorting
        sort_attr = getattr(Trip, sort_by, Trip.created_at)
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
    def get_trip_statistics(db: Session) -> dict:
        # Base counts by status
        status_stmt = (
            select(Trip.status, func.count(Trip.id))
            .where(Trip.is_deleted == False)
            .group_by(Trip.status)
        )
        status_rows = db.execute(status_stmt).all()
        status_counts = {s.value: 0 for s in TripStatus}
        for status_val, count_val in status_rows:
            status_counts[status_val.value] = count_val

        # Today's trips
        today_start = datetime.combine(date.today(), time.min)
        today_end = datetime.combine(date.today(), time.max)
        today_stmt = (
            select(func.count(Trip.id))
            .where(
                Trip.is_deleted == False,
                Trip.created_at >= today_start,
                Trip.created_at <= today_end
            )
        )
        todays_trips = db.scalar(today_stmt) or 0

        # Totals
        total_trips = sum(status_counts.values())

        # Distances and revenues
        sums_stmt = (
            select(
                func.sum(Trip.actual_distance),
                func.sum(Trip.revenue),
                func.sum(Trip.cargo_weight),
                func.avg(Trip.actual_distance),
                func.avg(Trip.revenue)
            )
            .where(
                Trip.is_deleted == False,
                Trip.status == TripStatus.COMPLETED
            )
        )
        sums_row = db.execute(sums_stmt).first()
        
        total_distance = float(sums_row[0]) if sums_row and sums_row[0] is not None else 0.0
        total_revenue = float(sums_row[1]) if sums_row and sums_row[1] is not None else 0.0
        total_cargo = float(sums_row[2]) if sums_row and sums_row[2] is not None else 0.0
        avg_distance = float(sums_row[3]) if sums_row and sums_row[3] is not None else 0.0
        avg_revenue = float(sums_row[4]) if sums_row and sums_row[4] is not None else 0.0

        # Active counts
        active_trips = status_counts.get(TripStatus.DISPATCHED.value, 0)

        # Active vehicles (status ON_TRIP)
        active_vehicles_stmt = (
            select(func.count(Vehicle.id))
            .where(
                Vehicle.is_deleted == False,
                Vehicle.status == VehicleStatus.ON_TRIP
            )
        )
        active_vehicles = db.scalar(active_vehicles_stmt) or 0

        # Active drivers (status ON_TRIP)
        active_drivers_stmt = (
            select(func.count(Driver.id))
            .where(
                Driver.is_deleted == False,
                Driver.status == DriverStatus.ON_TRIP
            )
        )
        active_drivers = db.scalar(active_drivers_stmt) or 0

        # Fleet Utilization Calculation
        total_vehicles = db.scalar(
            select(func.count(Vehicle.id)).where(Vehicle.is_deleted == False)
        ) or 0
        fleet_utilization = (active_vehicles / total_vehicles * 100.0) if total_vehicles > 0 else 0.0

        # Average Trip Duration Calculation
        duration_stmt = select(Trip.dispatch_time, Trip.completion_time).where(
            Trip.is_deleted == False,
            Trip.status == TripStatus.COMPLETED,
            Trip.dispatch_time.is_not(None),
            Trip.completion_time.is_not(None)
        )
        duration_rows = db.execute(duration_stmt).all()
        if duration_rows:
            total_duration_secs = sum((r.completion_time - r.dispatch_time).total_seconds() for r in duration_rows)
            average_trip_duration = total_duration_secs / len(duration_rows)
        else:
            average_trip_duration = 0.0

        return {
            "total_trips": total_trips,
            "draft": status_counts.get(TripStatus.DRAFT.value, 0),
            "dispatched": status_counts.get(TripStatus.DISPATCHED.value, 0),
            "completed": status_counts.get(TripStatus.COMPLETED.value, 0),
            "cancelled": status_counts.get(TripStatus.CANCELLED.value, 0),
            "active_trips": active_trips,
            "today's_trips": todays_trips,
            "total_distance": total_distance,
            "total_revenue": total_revenue,
            "average_trip_distance": avg_distance,
            "average_revenue": avg_revenue,
            "total_cargo_weight": total_cargo,
            "active_vehicles": active_vehicles,
            "active_drivers": active_drivers,
            "fleet_utilization": fleet_utilization,
            "average_trip_duration": average_trip_duration
        }
