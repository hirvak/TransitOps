import uuid
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy import select, func, desc, asc, and_, or_, extract
from sqlalchemy.orm import Session

from app.Vehicles.models import Vehicle, VehicleStatus, VehicleDocument
from app.Drivers.models import Driver, DriverStatus
from app.Trips.models import Trip, TripStatus
from app.FuelExpense.models import FuelLog, Expense, FuelType, ExpenseType
from app.Maintenance.models import MaintenanceLog, MaintenanceStatus
from app.Notifications.models import Notification


class AnalyticsRepository:

    @staticmethod
    def get_fleet_counts(db: Session) -> Dict[str, int]:
        stmt = (
            select(Vehicle.status, func.count(Vehicle.id))
            .where(Vehicle.is_deleted == False)
            .group_by(Vehicle.status)
        )
        rows = db.execute(stmt).all()
        counts = {status.value: 0 for status in VehicleStatus}
        for status_obj, count in rows:
            counts[status_obj.value] = count
        return counts

    @staticmethod
    def get_driver_counts(db: Session) -> Dict[str, int]:
        stmt = (
            select(Driver.status, func.count(Driver.id))
            .where(Driver.is_deleted == False)
            .group_by(Driver.status)
        )
        rows = db.execute(stmt).all()
        counts = {status.value: 0 for status in DriverStatus}
        for status_obj, count in rows:
            counts[status_obj.value] = count
        return counts

    @staticmethod
    def get_trip_counts(db: Session) -> Dict[str, int]:
        stmt = (
            select(Trip.status, func.count(Trip.id))
            .where(Trip.is_deleted == False)
            .group_by(Trip.status)
        )
        rows = db.execute(stmt).all()
        counts = {status.value: 0 for status in TripStatus}
        for status_obj, count in rows:
            counts[status_obj.value] = count
        return counts

    @staticmethod
    def get_maintenance_counts(db: Session) -> Dict[str, int]:
        stmt = (
            select(MaintenanceLog.status, func.count(MaintenanceLog.id))
            .where(MaintenanceLog.is_deleted == False)
            .group_by(MaintenanceLog.status)
        )
        rows = db.execute(stmt).all()
        counts = {status.value: 0 for status in MaintenanceStatus}
        for status_obj, count in rows:
            counts[status_obj.value] = count
        return counts

    @staticmethod
    def get_financial_sums(db: Session) -> Dict[str, float]:
        # Fuel
        fuel_stmt = select(func.sum(FuelLog.fuel_quantity), func.sum(FuelLog.total_cost)).where(FuelLog.is_deleted == False)
        fuel_qty, fuel_cost = db.execute(fuel_stmt).first() or (0.0, 0.0)

        # Expenses
        exp_stmt = select(func.sum(Expense.amount)).where(Expense.is_deleted == False)
        exp_total = db.scalar(exp_stmt) or 0.0

        # Maintenance
        maint_stmt = select(func.sum(MaintenanceLog.actual_cost), func.sum(MaintenanceLog.estimated_cost)).where(
            MaintenanceLog.is_deleted == False
        )
        actual_maint, est_maint = db.execute(maint_stmt).first() or (0.0, 0.0)
        maint_total = float(actual_maint if actual_maint is not None else est_maint if est_maint is not None else 0.0)

        # Revenue and distance
        trip_stmt = select(func.sum(Trip.revenue), func.sum(Trip.actual_distance)).where(
            Trip.is_deleted == False,
            Trip.status == TripStatus.COMPLETED
        )
        revenue, distance = db.execute(trip_stmt).first() or (0.0, 0.0)

        return {
            "fuel_quantity": float(fuel_qty or 0.0),
            "fuel_cost": float(fuel_cost or 0.0),
            "expenses": float(exp_total or 0.0),
            "maintenance_cost": maint_total,
            "revenue": float(revenue or 0.0),
            "distance": float(distance or 0.0)
        }

    # --- Charts Grouping Queries ---

    @staticmethod
    def get_monthly_trip_chart_data(db: Session) -> List[Dict[str, Any]]:
        # Query monthly completed and other trips
        # Format month as 'YYYY-MM'
        month_expr = func.to_char(Trip.created_at, 'YYYY-MM')
        stmt = (
            select(month_expr, func.count(Trip.id))
            .where(Trip.is_deleted == False)
            .group_by(month_expr)
            .order_by(month_expr)
        )
        rows = db.execute(stmt).all()
        return [{"month": r[0] if r[0] is not None else "Unknown", "trips": r[1]} for r in rows]

    @staticmethod
    def get_monthly_financial_chart_data(db: Session) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        # Revenue
        rev_month = func.to_char(Trip.completion_time, 'YYYY-MM')
        rev_stmt = (
            select(rev_month, func.sum(Trip.revenue))
            .where(Trip.is_deleted == False, Trip.status == TripStatus.COMPLETED)
            .group_by(rev_month)
            .order_by(rev_month)
        )
        rev_rows = db.execute(rev_stmt).all()
        monthly_revenue = [{"month": r[0] if r[0] is not None else "Unknown", "revenue": float(r[1] or 0.0)} for r in rev_rows]

        # Expenses
        exp_month = func.to_char(Expense.expense_date, 'YYYY-MM')
        exp_stmt = (
            select(exp_month, func.sum(Expense.amount))
            .where(Expense.is_deleted == False)
            .group_by(exp_month)
            .order_by(exp_month)
        )
        exp_rows = db.execute(exp_stmt).all()
        monthly_expenses = [{"month": r[0] if r[0] is not None else "Unknown", "expenses": float(r[1] or 0.0)} for r in exp_rows]

        # Fuel Cost
        fuel_month = func.to_char(FuelLog.fuel_date, 'YYYY-MM')
        fuel_stmt = (
            select(fuel_month, func.sum(FuelLog.total_cost))
            .where(FuelLog.is_deleted == False)
            .group_by(fuel_month)
            .order_by(fuel_month)
        )
        fuel_rows = db.execute(fuel_stmt).all()
        monthly_fuel = [{"month": r[0] if r[0] is not None else "Unknown", "fuel_cost": float(r[1] or 0.0)} for r in fuel_rows]

        return monthly_revenue, monthly_expenses, monthly_fuel

    @staticmethod
    def get_monthly_maintenance_chart_data(db: Session) -> List[Dict[str, Any]]:
        month_expr = func.to_char(MaintenanceLog.scheduled_date, 'YYYY-MM')
        stmt = (
            select(
                month_expr,
                func.count(func.nullif(MaintenanceLog.status == MaintenanceStatus.COMPLETED, False)),
                func.count(func.nullif(MaintenanceLog.status == MaintenanceStatus.PENDING, False)),
                func.count(func.nullif(MaintenanceLog.status == MaintenanceStatus.CANCELLED, False))
            )
            .where(MaintenanceLog.is_deleted == False)
            .group_by(month_expr)
            .order_by(month_expr)
        )
        rows = db.execute(stmt).all()
        return [
            {
                "month": r[0] if r[0] is not None else "Unknown",
                "completed": r[1],
                "pending": r[2],
                "cancelled": r[3]
            }
            for r in rows
        ]

    # --- Reports Query Builders ---

    @staticmethod
    def get_vehicles_report(
        db: Session,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "registration_number",
        sort_order: str = "asc"
    ) -> List[Dict[str, Any]]:
        # Fetch all active vehicles
        query = select(Vehicle).where(Vehicle.is_deleted == False)
        if search:
            query = query.where(
                or_(
                    Vehicle.registration_number.ilike(f"%{search}%"),
                    Vehicle.vehicle_name.ilike(f"%{search}%")
                )
            )

        vehicles = db.scalars(query).all()
        data = []

        for veh in vehicles:
            # Query completed trips metrics in date range
            trip_query = select(
                func.count(Trip.id),
                func.sum(Trip.actual_distance),
                func.sum(Trip.revenue)
            ).where(
                Trip.vehicle_id == veh.id,
                Trip.is_deleted == False,
                Trip.status == TripStatus.COMPLETED
            )
            if start_date:
                trip_query = trip_query.where(Trip.completion_time >= datetime.combine(start_date, datetime.min.time()))
            if end_date:
                trip_query = trip_query.where(Trip.completion_time <= datetime.combine(end_date, datetime.max.time()))

            trips_completed, distance, revenue = db.execute(trip_query).first() or (0, 0.0, 0.0)
            trips_completed = trips_completed or 0
            distance = float(distance or 0.0)
            revenue = float(revenue or 0.0)

            # Fuel Logs
            fuel_query = select(func.sum(FuelLog.total_cost)).where(
                FuelLog.vehicle_id == veh.id,
                FuelLog.is_deleted == False
            )
            if start_date:
                fuel_query = fuel_query.where(FuelLog.fuel_date >= start_date)
            if end_date:
                fuel_query = fuel_query.where(FuelLog.fuel_date <= end_date)
            fuel_cost = float(db.scalar(fuel_query) or 0.0)

            # Maintenance cost
            maint_query = select(func.sum(func.coalesce(MaintenanceLog.actual_cost, MaintenanceLog.estimated_cost))).where(
                MaintenanceLog.vehicle_id == veh.id,
                MaintenanceLog.is_deleted == False
            )
            if start_date:
                maint_query = maint_query.where(MaintenanceLog.scheduled_date >= start_date)
            if end_date:
                maint_query = maint_query.where(MaintenanceLog.scheduled_date <= end_date)
            maint_cost = float(db.scalar(maint_query) or 0.0)

            # Other Expenses
            exp_query = select(func.sum(Expense.amount)).where(
                Expense.vehicle_id == veh.id,
                Expense.is_deleted == False
            )
            if start_date:
                exp_query = exp_query.where(Expense.expense_date >= start_date)
            if end_date:
                exp_query = exp_query.where(Expense.expense_date <= end_date)
            exp_cost = float(db.scalar(exp_query) or 0.0)

            total_cost = fuel_cost + maint_cost + exp_cost
            profit = revenue - total_cost

            # Fuel efficiency (total distance of completed trips / total fuel logs quantity)
            fuel_qty_query = select(func.sum(FuelLog.fuel_quantity)).where(
                FuelLog.vehicle_id == veh.id,
                FuelLog.is_deleted == False
            )
            if start_date:
                fuel_qty_query = fuel_qty_query.where(FuelLog.fuel_date >= start_date)
            if end_date:
                fuel_qty_query = fuel_qty_query.where(FuelLog.fuel_date <= end_date)
            fuel_qty = float(db.scalar(fuel_qty_query) or 0.0)

            fuel_eff = None
            if fuel_qty > 0:
                fuel_eff = distance / fuel_qty

            cost_per_km = None
            if distance > 0:
                cost_per_km = total_cost / distance

            # Vehicle Utilization %
            total_completed_trips = db.scalar(
                select(func.count(Trip.id)).where(Trip.is_deleted == False, Trip.status == TripStatus.COMPLETED)
            ) or 0
            utilization_pct = (trips_completed / total_completed_trips * 100.0) if total_completed_trips > 0 else 0.0

            # Alert KPIs & Health score
            today = date.today()
            notification_count = db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.vehicle_id == veh.id,
                    Notification.is_deleted == False
                )
            ) or 0

            expired_documents_count = db.scalar(
                select(func.count(VehicleDocument.id)).where(
                    VehicleDocument.vehicle_id == veh.id,
                    VehicleDocument.expiry_date < today,
                    VehicleDocument.is_deleted == False
                )
            ) or 0

            maintenance_due_count = db.scalar(
                select(func.count(MaintenanceLog.id)).where(
                    MaintenanceLog.vehicle_id == veh.id,
                    MaintenanceLog.is_deleted == False,
                    MaintenanceLog.status.in_([MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS])
                )
            ) or 0

            operational_health_score = max(0.0, 100.0 - (10.0 * expired_documents_count) - (15.0 * maintenance_due_count))

            data.append({
                "vehicle_id": veh.id,
                "registration_number": veh.registration_number,
                "vehicle_name": veh.vehicle_name,
                "trips_completed": trips_completed,
                "distance": distance,
                "fuel_cost": fuel_cost,
                "maintenance_cost": maint_cost,
                "expense_cost": exp_cost,
                "total_cost": total_cost,
                "revenue": revenue,
                "profit": profit,
                "fuel_efficiency": fuel_eff,
                "cost_per_km": cost_per_km,
                "utilization_pct": utilization_pct,
                "notification_count": notification_count,
                "expired_documents_count": expired_documents_count,
                "maintenance_due_count": maintenance_due_count,
                "license_status": "N/A",
                "operational_health_score": operational_health_score
            })

        # Apply python sort based on sort_by
        reverse = sort_order.lower() == "desc"
        data.sort(key=lambda x: x.get(sort_by, 0) if x.get(sort_by) is not None else 0, reverse=reverse)
        return data

    @staticmethod
    def get_drivers_report(
        db: Session,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "full_name",
        sort_order: str = "asc"
    ) -> List[Dict[str, Any]]:
        query = select(Driver).where(Driver.is_deleted == False)
        if search:
            query = query.where(Driver.full_name.ilike(f"%{search}%"))

        drivers = db.scalars(query).all()
        data = []

        for drv in drivers:
            trip_query = select(
                func.count(Trip.id),
                func.sum(Trip.actual_distance),
                func.sum(Trip.revenue),
                func.sum(Trip.fuel_consumed),
                func.avg(Trip.actual_distance)
            ).where(
                Trip.driver_id == drv.id,
                Trip.is_deleted == False,
                Trip.status == TripStatus.COMPLETED
            )
            if start_date:
                trip_query = trip_query.where(Trip.completion_time >= datetime.combine(start_date, datetime.min.time()))
            if end_date:
                trip_query = trip_query.where(Trip.completion_time <= datetime.combine(end_date, datetime.max.time()))

            trips, dist, rev, fuel, avg_dist = db.execute(trip_query).first() or (0, 0.0, 0.0, 0.0, 0.0)

            # Average trip duration
            avg_dur_stmt = select(Trip.dispatch_time, Trip.completion_time).where(
                Trip.driver_id == drv.id,
                Trip.is_deleted == False,
                Trip.status == TripStatus.COMPLETED,
                Trip.dispatch_time.is_not(None),
                Trip.completion_time.is_not(None)
            )
            dur_rows = db.execute(avg_dur_stmt).all()
            avg_dur = 0.0
            if dur_rows:
                total_hours = sum((r.completion_time - r.dispatch_time).total_seconds() / 3600.0 for r in dur_rows)
                avg_dur = total_hours / len(dur_rows)

            # Alert KPIs & Health score
            today = date.today()
            notification_count = db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.driver_id == drv.id,
                    Notification.is_deleted == False
                )
            ) or 0

            if drv.license_expiry < today:
                license_status = "EXPIRED"
                operational_health_score = 0.0
            elif drv.license_expiry <= today + timedelta(days=30):
                license_status = "EXPIRING_SOON"
                operational_health_score = 50.0
            else:
                license_status = "VALID"
                operational_health_score = 100.0

            data.append({
                "driver_id": drv.id,
                "full_name": drv.full_name,
                "trips_completed": trips or 0,
                "distance": float(dist or 0.0),
                "revenue_generated": float(rev or 0.0),
                "fuel_used": float(fuel or 0.0),
                "average_trip_distance": float(avg_dist or 0.0),
                "average_trip_duration": avg_dur,
                "current_status": drv.status.value,
                "notification_count": notification_count,
                "expired_documents_count": 0,
                "maintenance_due_count": 0,
                "license_status": license_status,
                "operational_health_score": operational_health_score
            })

        reverse = sort_order.lower() == "desc"
        data.sort(key=lambda x: x.get(sort_by, 0) if x.get(sort_by) is not None else 0, reverse=reverse)
        return data

    @staticmethod
    def get_trips_report(
        db: Session,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "trip_number",
        sort_order: str = "asc"
    ) -> List[Dict[str, Any]]:
        query = select(Trip).join(Vehicle, Trip.vehicle_id == Vehicle.id).join(Driver, Trip.driver_id == Driver.id).where(
            Trip.is_deleted == False
        )
        if search:
            query = query.where(
                or_(
                    Trip.trip_number.ilike(f"%{search}%"),
                    Trip.origin.ilike(f"%{search}%"),
                    Trip.destination.ilike(f"%{search}%"),
                    Vehicle.registration_number.ilike(f"%{search}%"),
                    Driver.full_name.ilike(f"%{search}%")
                )
            )
        if start_date:
            query = query.where(Trip.planned_departure >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            query = query.where(Trip.planned_departure <= datetime.combine(end_date, datetime.max.time()))

        sort_attr = getattr(Trip, sort_by, Trip.trip_number)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        trips = db.scalars(query).all()
        data = []
        for t in trips:
            dur = 0.0
            if t.completion_time and t.dispatch_time:
                dur = (t.completion_time - t.dispatch_time).total_seconds() / 3600.0

            data.append({
                "trip_number": t.trip_number,
                "vehicle_registration": t.vehicle.registration_number,
                "driver_name": t.driver.full_name,
                "origin": t.origin,
                "destination": t.destination,
                "distance": float(t.actual_distance if t.actual_distance is not None else t.planned_distance),
                "revenue": float(t.revenue or 0.0),
                "fuel": float(t.fuel_consumed or 0.0),
                "status": t.status.value,
                "duration": dur
            })
        return data

    @staticmethod
    def get_fuel_report(
        db: Session,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "fuel_date",
        sort_order: str = "desc"
    ) -> List[Dict[str, Any]]:
        query = select(FuelLog).join(Vehicle, FuelLog.vehicle_id == Vehicle.id).join(Trip, FuelLog.trip_id == Trip.id).where(
            FuelLog.is_deleted == False
        )
        if search:
            query = query.where(
                or_(
                    Vehicle.registration_number.ilike(f"%{search}%"),
                    Trip.trip_number.ilike(f"%{search}%"),
                    FuelLog.station_name.ilike(f"%{search}%")
                )
            )
        if start_date:
            query = query.where(FuelLog.fuel_date >= start_date)
        if end_date:
            query = query.where(FuelLog.fuel_date <= end_date)

        sort_attr = getattr(FuelLog, sort_by, FuelLog.fuel_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        logs = db.scalars(query).all()
        data = []
        for l in logs:
            eff = None
            if l.trip and l.trip.actual_distance and l.fuel_quantity > 0:
                eff = l.trip.actual_distance / l.fuel_quantity

            data.append({
                "id": l.id,
                "vehicle_registration": l.vehicle.registration_number,
                "trip_number": l.trip.trip_number,
                "fuel_quantity": float(l.fuel_quantity),
                "fuel_cost": float(l.total_cost),
                "fuel_efficiency": eff,
                "station": l.station_name,
                "fuel_type": l.fuel_type.value
            })
        return data

    @staticmethod
    def get_expense_report(
        db: Session,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "expense_date",
        sort_order: str = "desc"
    ) -> List[Dict[str, Any]]:
        query = select(Expense).join(Vehicle, Expense.vehicle_id == Vehicle.id).where(
            Expense.is_deleted == False
        )
        if search:
            query = query.where(
                or_(
                    Vehicle.registration_number.ilike(f"%{search}%"),
                    Expense.description.ilike(f"%{search}%")
                )
            )
        if start_date:
            query = query.where(Expense.expense_date >= start_date)
        if end_date:
            query = query.where(Expense.expense_date <= end_date)

        sort_attr = getattr(Expense, sort_by, Expense.expense_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        expenses = db.scalars(query).all()
        data = []
        for e in expenses:
            data.append({
                "id": e.id,
                "vehicle_registration": e.vehicle.registration_number,
                "trip_number": e.trip.trip_number if e.trip else None,
                "expense_type": e.expense_type.value,
                "amount": float(e.amount),
                "date": e.expense_date,
                "description": e.description
            })
        return data

    @staticmethod
    def get_maintenance_report(
        db: Session,
        search: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "scheduled_date",
        sort_order: str = "desc"
    ) -> List[Dict[str, Any]]:
        query = select(MaintenanceLog).join(Vehicle, MaintenanceLog.vehicle_id == Vehicle.id).where(
            MaintenanceLog.is_deleted == False
        )
        if search:
            query = query.where(
                or_(
                    Vehicle.registration_number.ilike(f"%{search}%"),
                    MaintenanceLog.maintenance_type.ilike(f"%{search}%")
                )
            )
        if start_date:
            query = query.where(MaintenanceLog.scheduled_date >= start_date)
        if end_date:
            query = query.where(MaintenanceLog.scheduled_date <= end_date)

        sort_attr = getattr(MaintenanceLog, sort_by, MaintenanceLog.scheduled_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        logs = db.scalars(query).all()
        data = []
        for l in logs:
            downtime = 0
            if l.completion_date and l.scheduled_date:
                downtime = (l.completion_date - l.scheduled_date).days

            # Alert KPIs & Health score
            notification_count = db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.maintenance_id == l.id,
                    Notification.is_deleted == False
                )
            ) or 0

            maint_due = 1 if l.status in [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] else 0
            if l.status == MaintenanceStatus.COMPLETED:
                health = 100.0
            elif l.status == MaintenanceStatus.IN_PROGRESS:
                health = 70.0
            elif l.status == MaintenanceStatus.PENDING:
                health = 50.0
            else:
                health = 0.0

            data.append({
                "id": l.id,
                "vehicle_registration": l.vehicle.registration_number,
                "maintenance_type": l.maintenance_type,
                "status": l.status.value,
                "estimated_cost": float(l.estimated_cost),
                "actual_cost": float(l.actual_cost) if l.actual_cost is not None else None,
                "scheduled_date": l.scheduled_date,
                "completion_date": l.completion_date,
                "downtime": downtime,
                "notification_count": notification_count,
                "expired_documents_count": 0,
                "maintenance_due_count": maint_due,
                "license_status": "N/A",
                "operational_health_score": health
            })
        return data
