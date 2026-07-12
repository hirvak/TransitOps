import csv
import io
import uuid
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from io import BytesIO

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.Analytics.repository import AnalyticsRepository
from app.Trips.models import TripStatus, Trip
from app.Vehicles.models import Vehicle, VehicleStatus, VehicleDocument
from app.Drivers.models import Driver, DriverStatus
from app.FuelExpense.models import FuelLog, Expense
from app.Maintenance.models import MaintenanceLog, MaintenanceStatus
from app.Notifications.models import Notification
from sqlalchemy import select, func


class AnalyticsService:

    @staticmethod
    def get_dashboard(db) -> Dict[str, Any]:
        kpis = AnalyticsService.get_dashboard_kpis(db)
        charts = AnalyticsService.get_dashboard_charts(db)
        alerts = AnalyticsService.get_dashboard_alerts(db)
        summary = {
            "total_vehicles": kpis["fleet"]["total_vehicles"],
            "total_drivers": kpis["drivers"]["total_drivers"],
            "total_trips": kpis["trips"]["total_trips"],
            "net_profit": kpis["financial"]["net_profit"]
        }
        return {
            "kpis": kpis,
            "charts": charts,
            "alerts": alerts,
            "summary": summary
        }

    @staticmethod
    def get_dashboard_alerts(db) -> Dict[str, Any]:
        today = date.today()
        # License expiring (within 7 days or expired)
        license_exp = db.scalar(
            select(func.count(Driver.id)).where(
                Driver.is_deleted == False,
                Driver.license_expiry <= today + timedelta(days=7)
            )
        ) or 0

        # Maintenance overdue
        maint_overdue = db.scalar(
            select(func.count(MaintenanceLog.id)).where(
                MaintenanceLog.is_deleted == False,
                MaintenanceLog.scheduled_date < today,
                MaintenanceLog.status.notin_([MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED])
            )
        ) or 0

        # Vehicle Documents Expiring (expiring in 30 days or expired)
        docs_exp = db.scalar(
            select(func.count(VehicleDocument.id)).where(
                VehicleDocument.is_deleted == False,
                VehicleDocument.expiry_date <= today + timedelta(days=30)
            )
        ) or 0

        # Available vehicles count
        avail_veh = db.scalar(
            select(func.count(Vehicle.id)).where(
                Vehicle.status == VehicleStatus.AVAILABLE,
                Vehicle.is_deleted == False
            )
        ) or 0

        # Active trips count
        active_trips = db.scalar(
            select(func.count(Trip.id)).where(
                Trip.status == TripStatus.DISPATCHED,
                Trip.is_deleted == False
            )
        ) or 0

        return {
            "critical": [
                {
                    "type": "LICENSE",
                    "title": "Driver License Expiring",
                    "count": license_exp
                },
                {
                    "type": "MAINTENANCE",
                    "title": "Maintenance Overdue",
                    "count": maint_overdue
                }
            ],
            "warning": [
                {
                    "type": "DOCUMENT",
                    "title": "Vehicle Documents Expiring",
                    "count": docs_exp
                }
            ],
            "info": [
                {
                    "type": "AVAILABLE_VEHICLES",
                    "value": avail_veh
                },
                {
                    "type": "ACTIVE_TRIPS",
                    "value": active_trips
                }
            ]
        }

    @staticmethod
    def get_dashboard_kpis(db) -> Dict[str, Any]:
        fleet = AnalyticsRepository.get_fleet_counts(db)
        drivers = AnalyticsRepository.get_driver_counts(db)
        trips = AnalyticsRepository.get_trip_counts(db)
        maint = AnalyticsRepository.get_maintenance_counts(db)
        financials = AnalyticsRepository.get_financial_sums(db)

        # Calculations
        total_veh = sum(fleet.values())
        total_drv = sum(drivers.values())
        total_trips = sum(trips.values())

        # Active elements
        active_trips = trips.get(TripStatus.DISPATCHED.value, 0)
        # Today's trips
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())
        todays_trips = db.scalar(
            select(func.count(Trip.id)).where(
                Trip.is_deleted == False,
                Trip.created_at >= today_start,
                Trip.created_at <= today_end
            )
        ) or 0

        # Efficiencies and operational cost
        fuel_qty = financials["fuel_quantity"]
        fuel_cost = financials["fuel_cost"]
        expenses = financials["expenses"]
        maint_cost = financials["maintenance_cost"]
        revenue = financials["revenue"]
        distance = financials["distance"]

        avg_fuel_eff = (distance / fuel_qty) if fuel_qty > 0 else 0.0
        operational_cost = fuel_cost + expenses + maint_cost
        net_profit = revenue - operational_cost

        # Ratios
        fleet_util = (fleet.get(VehicleStatus.ON_TRIP.value, 0) / total_veh * 100.0) if total_veh > 0 else 0.0
        vehicle_util = fleet_util
        driver_util = (drivers.get(DriverStatus.ON_TRIP.value, 0) / total_drv * 100.0) if total_drv > 0 else 0.0

        # Maintenance sub-kpis
        # Status groups: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
        return {
            "fleet": {
                "total_vehicles": total_veh,
                "available": fleet.get(VehicleStatus.AVAILABLE.value, 0),
                "on_trip": fleet.get(VehicleStatus.ON_TRIP.value, 0),
                "in_shop": fleet.get(VehicleStatus.IN_SHOP.value, 0),
                "retired": fleet.get(VehicleStatus.RETIRED.value, 0)
            },
            "drivers": {
                "total_drivers": total_drv,
                "available": drivers.get(DriverStatus.AVAILABLE.value, 0),
                "on_trip": drivers.get(DriverStatus.ON_TRIP.value, 0),
                "suspended": drivers.get(DriverStatus.SUSPENDED.value, 0),
                "off_duty": drivers.get(DriverStatus.OFF_DUTY.value, 0)
            },
            "trips": {
                "total_trips": total_trips,
                "draft": trips.get(TripStatus.DRAFT.value, 0),
                "dispatched": trips.get(TripStatus.DISPATCHED.value, 0),
                "completed": trips.get(TripStatus.COMPLETED.value, 0),
                "cancelled": trips.get(TripStatus.CANCELLED.value, 0),
                "active_trips": active_trips,
                "todays_trips": todays_trips
            },
            "maintenance": {
                "pending": maint.get("PENDING", 0),
                "in_progress": maint.get("IN_PROGRESS", 0),
                "completed": maint.get("COMPLETED", 0),
                "cancelled": maint.get("CANCELLED", 0)
            },
            "fuel": {
                "total_fuel_quantity": fuel_qty,
                "total_fuel_cost": fuel_cost,
                "average_fuel_efficiency": avg_fuel_eff
            },
            "expenses": {
                "total_expenses": expenses,
                "maintenance_cost": maint_cost,
                "operational_cost": operational_cost
            },
            "financial": {
                "total_revenue": revenue,
                "net_profit": net_profit
            },
            "utilization": {
                "fleet_utilization_pct": fleet_util,
                "vehicle_utilization_pct": vehicle_util,
                "driver_utilization_pct": driver_util
            }
        }

    @staticmethod
    def get_dashboard_charts(db) -> Dict[str, Any]:
        monthly_trips = AnalyticsRepository.get_monthly_trip_chart_data(db)
        monthly_revenue, monthly_expenses, monthly_fuel_cost = AnalyticsRepository.get_monthly_financial_chart_data(db)
        maintenance_trend = AnalyticsRepository.get_monthly_maintenance_chart_data(db)

        # Vehicle Status Pie Chart
        v_counts = AnalyticsRepository.get_fleet_counts(db)
        vehicle_pie = [{"status": k, "count": v} for k, v in v_counts.items()]

        # Driver Status Pie Chart
        d_counts = AnalyticsRepository.get_driver_counts(db)
        driver_pie = [{"status": k, "count": v} for k, v in d_counts.items()]

        # Format mappings
        # Ensure we return lists
        return {
            "monthly_trips": monthly_trips,
            "monthly_revenue": monthly_revenue,
            "monthly_expenses": monthly_expenses,
            "monthly_fuel_cost": monthly_fuel_cost,
            "maintenance_trend": maintenance_trend,
            "vehicle_status_pie": vehicle_pie,
            "driver_status_pie": driver_pie
        }

    @staticmethod
    def get_financial_report(
        db,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        # Sums within date range
        fuel_stmt = select(func.sum(FuelLog.total_cost)).where(FuelLog.is_deleted == False)
        if start_date:
            fuel_stmt = fuel_stmt.where(FuelLog.fuel_date >= start_date)
        if end_date:
            fuel_stmt = fuel_stmt.where(FuelLog.fuel_date <= end_date)
        fuel_cost = float(db.scalar(fuel_stmt) or 0.0)

        exp_stmt = select(func.sum(Expense.amount)).where(Expense.is_deleted == False)
        if start_date:
            exp_stmt = exp_stmt.where(Expense.expense_date >= start_date)
        if end_date:
            exp_stmt = exp_stmt.where(Expense.expense_date <= end_date)
        expenses = float(db.scalar(exp_stmt) or 0.0)

        maint_stmt = select(func.sum(func.coalesce(MaintenanceLog.actual_cost, MaintenanceLog.estimated_cost))).where(
            MaintenanceLog.is_deleted == False
        )
        if start_date:
            maint_stmt = maint_stmt.where(MaintenanceLog.scheduled_date >= start_date)
        if end_date:
            maint_stmt = maint_stmt.where(MaintenanceLog.scheduled_date <= end_date)
        maintenance_cost = float(db.scalar(maint_stmt) or 0.0)

        trip_stmt = select(func.sum(Trip.revenue), func.sum(Trip.actual_distance)).where(
            Trip.is_deleted == False,
            Trip.status == TripStatus.COMPLETED
        )
        if start_date:
            trip_stmt = trip_stmt.where(Trip.completion_time >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            trip_stmt = trip_stmt.where(Trip.completion_time <= datetime.combine(end_date, datetime.max.time()))
        rev_row = db.execute(trip_stmt).first()
        revenue = float(rev_row[0] or 0.0) if rev_row else 0.0
        distance = float(rev_row[1] or 0.0) if rev_row else 0.0

        operational_cost = fuel_cost + expenses + maintenance_cost
        net_profit = revenue - operational_cost
        profit_margin = (net_profit / revenue * 100.0) if revenue > 0 else 0.0

        cost_per_km = (operational_cost / distance) if distance > 0 else None
        revenue_per_km = (revenue / distance) if distance > 0 else None

        return {
            "revenue": revenue,
            "fuel_cost": fuel_cost,
            "maintenance_cost": maintenance_cost,
            "expenses": expenses,
            "operational_cost": operational_cost,
            "net_profit": net_profit,
            "profit_margin": profit_margin,
            "cost_per_km": cost_per_km,
            "revenue_per_km": revenue_per_km
        }

    # --- Pagination & Exporters ---

    @staticmethod
    def get_paginated_list(data: List[Any], page: int, page_size: int) -> Tuple[List[Any], Dict[str, int]]:
        total = len(data)
        pages = (total + page_size - 1) // page_size
        offset = (page - 1) * page_size
        paginated_data = data[offset:offset + page_size]
        return paginated_data, {
            "total_records": total,
            "total_pages": pages,
            "current_page": page,
            "page_size": page_size
        }

    @staticmethod
    def export_csv(headers: List[str], rows: List[List[Any]]) -> str:
        output = io.StringIO()
        # Add UTF-8 BOM signature for Excel compatibility
        output.write('\ufeff')
        writer = csv.writer(output)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return output.getvalue()

    @staticmethod
    def export_pdf(
        title: str,
        filters: Dict[str, str],
        headers: List[str],
        rows: List[List[Any]],
        user_name: str
    ) -> bytes:
        buffer = BytesIO()
        # Adjusted right and left margins to match 540 width limit
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=40, bottomMargin=40)
        story = []
        styles = getSampleStyleSheet()

        # Styles definition
        title_style = ParagraphStyle(
            name="DocTitle",
            parent=styles["Title"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#2C3E50"),
            spaceAfter=15
        )
        meta_style = ParagraphStyle(
            name="MetaText",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#7F8C8D"),
            spaceAfter=10
        )

        story.append(Paragraph(f"<b>{title}</b>", title_style))
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        story.append(Paragraph(f"Generated at: {timestamp} | Generated by: {user_name}", meta_style))

        if filters:
            filter_items = [f"<b>{k}:</b> {v}" for k, v in filters.items() if v]
            if filter_items:
                filter_text = " | ".join(filter_items)
                story.append(Paragraph(f"Filters applied: {filter_text}", meta_style))
        story.append(Spacer(1, 10))

        # Format header text and cells as Paragraph elements to allow correct text wrapping in tables
        header_paras = [Paragraph(f"<b>{h}</b>", ParagraphStyle('H', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.whitesmoke)) for h in headers]
        table_rows = [header_paras]
        for row in rows:
            formatted_row = [Paragraph(str(cell), ParagraphStyle('C', parent=styles['Normal'], fontSize=7, leading=9)) for cell in row]
            table_rows.append(formatted_row)

        col_width = 540.0 / len(headers)
        t = Table(table_rows, colWidths=[col_width] * len(headers))
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2C3E50")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#F8F9F9")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(t)

        doc.build(story)
        pdf_data = buffer.getvalue()
        buffer.close()
        return pdf_data
