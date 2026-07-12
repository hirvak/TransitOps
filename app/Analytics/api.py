import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Security.permissions import require_analytics_access
from app.Users.models import User
from app.Analytics.services import AnalyticsService
from app.Analytics.repository import AnalyticsRepository
from app.Analytics.schemas import (
    DashboardResponse,
    DashboardChartsResponse,
    VehicleReportResponse,
    DriverReportResponse,
    TripReportResponse,
    FuelReportResponse,
    ExpenseReportResponse,
    MaintenanceReportResponse,
    FinancialReportRow,
    EnhancedDashboardResponse
)

dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(require_analytics_access)]
)

reports_router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(require_analytics_access)]
)

export_router = APIRouter(
    prefix="/export",
    tags=["Export"],
    dependencies=[Depends(require_analytics_access)]
)


# --- Dashboard Endpoints ---

@dashboard_router.get(
    "",
    response_model=EnhancedDashboardResponse,
    summary="Get Dashboard Metrics",
    description="Returns high-level KPI groupings for fleets, drivers, trips, maintenance logs, fuel usages, and financial margins."
)
def get_dashboard(db: Session = Depends(get_db)):
    return AnalyticsService.get_dashboard(db)


@dashboard_router.get(
    "/summary",
    response_model=EnhancedDashboardResponse,
    summary="Get Dashboard Summary",
    description="Exposes flatter representations of dashboard metrics."
)
def get_dashboard_summary(db: Session = Depends(get_db)):
    return AnalyticsService.get_dashboard(db)


@dashboard_router.get(
    "/alerts",
    summary="Get Dashboard Alerts",
    description="Returns critical, warning, and info alerts based on expiration and status states."
)
def get_dashboard_alerts(db: Session = Depends(get_db)):
    return AnalyticsService.get_dashboard_alerts(db)


@dashboard_router.get(
    "/charts",
    response_model=DashboardChartsResponse,
    summary="Get Dashboard Chart Data",
    description="Groups trip logs, revenue milestones, expenses, fuel usages, and active fleets by month for UI chart widgets."
)
def get_dashboard_charts(db: Session = Depends(get_db)):
    return AnalyticsService.get_dashboard_charts(db)


# --- Reports Endpoints ---

@reports_router.get(
    "/vehicles",
    response_model=VehicleReportResponse,
    summary="Vehicle Operations Report",
    description="Returns operational stats per active vehicle, including total profit margins and fuel efficiency counts."
)
def get_vehicles_report(
    search: Optional[str] = Query(None, description="Search by Vehicle Reg or Name"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("registration_number", regex="^(registration_number|trips_completed|distance|total_cost|revenue|profit)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_vehicles_report(db, search, start_date, end_date, sort_by, sort_order)
    paginated_data, pag_info = AnalyticsService.get_paginated_list(data, page, page_size)
    return {"data": paginated_data, "pagination": pag_info}


@reports_router.get(
    "/drivers",
    response_model=DriverReportResponse,
    summary="Driver Performance Report",
    description="Returns metrics per active driver (trips, distances, generated revenues, average times, and current statuses)."
)
def get_drivers_report(
    search: Optional[str] = Query(None, description="Search by Driver Full Name"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("full_name", regex="^(full_name|trips_completed|distance|revenue_generated)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_drivers_report(db, search, start_date, end_date, sort_by, sort_order)
    paginated_data, pag_info = AnalyticsService.get_paginated_list(data, page, page_size)
    return {"data": paginated_data, "pagination": pag_info}


@reports_router.get(
    "/trips",
    response_model=TripReportResponse,
    summary="Trips Operations Report",
    description="Returns a list of matching trips, vehicle registrations, drivers, origins, destinations, distances, and status parameters."
)
def get_trips_report(
    search: Optional[str] = Query(None, description="Search by Trip Number, Origin, Destination, Vehicle, or Driver"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("trip_number", regex="^(trip_number|actual_distance|revenue)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_trips_report(db, search, start_date, end_date, sort_by, sort_order)
    paginated_data, pag_info = AnalyticsService.get_paginated_list(data, page, page_size)
    return {"data": paginated_data, "pagination": pag_info}


@reports_router.get(
    "/fuel",
    response_model=FuelReportResponse,
    summary="Fuel logs auditing Report",
    description="Returns quantities, costs, stations, and fuel type parameters."
)
def get_fuel_report(
    search: Optional[str] = Query(None, description="Search by Vehicle Reg, Trip, or Station"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("fuel_date", regex="^(fuel_date|fuel_quantity|total_cost)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_fuel_report(db, search, start_date, end_date, sort_by, sort_order)
    paginated_data, pag_info = AnalyticsService.get_paginated_list(data, page, page_size)
    return {"data": paginated_data, "pagination": pag_info}


@reports_router.get(
    "/expenses",
    response_model=ExpenseReportResponse,
    summary="Non-fuel Expenses Report",
    description="Returns operational expense records (parking, fines, repairs) in paginated forms."
)
def get_expenses_report(
    search: Optional[str] = Query(None, description="Search by Vehicle Reg or Description"),
    expense_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("expense_date", regex="^(expense_date|amount)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_expense_report(db, search, start_date, end_date, sort_by, sort_order)
    if expense_type:
        data = [r for r in data if r["expense_type"] == expense_type]
    paginated_data, pag_info = AnalyticsService.get_paginated_list(data, page, page_size)
    return {"data": paginated_data, "pagination": pag_info}


@reports_router.get(
    "/maintenance",
    response_model=MaintenanceReportResponse,
    summary="Maintenance Logs and Downtime Report",
    description="Returns estimated vs actual maintenance logs costs, schedules, and active downtime records."
)
def get_maintenance_report(
    search: Optional[str] = Query(None, description="Search by Vehicle Reg or Type"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("scheduled_date", regex="^(scheduled_date|estimated_cost|actual_cost)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_maintenance_report(db, search, start_date, end_date, sort_by, sort_order)
    paginated_data, pag_info = AnalyticsService.get_paginated_list(data, page, page_size)
    return {"data": paginated_data, "pagination": pag_info}


@reports_router.get(
    "/financial",
    response_model=FinancialReportRow,
    summary="System-wide Profit & Cost Ratios Report",
    description="Returns revenue sums, fuel costs, maintenance totals, profit margins, cost per KM, and revenue per KM metrics."
)
def get_financial_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_financial_report(db, start_date, end_date)


# --- Export Endpoints ---

@export_router.get(
    "/dashboard/pdf",
    summary="Export Dashboard KPIs as PDF",
    description="Generates and streams a professional PDF report containing the fleet and driver KPIs."
)
def export_dashboard_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    dashboard_data = AnalyticsService.get_dashboard(db)
    dashboard = dashboard_data["kpis"]
    headers = ["Metric Category", "Attribute", "Current Value"]
    rows = [
        ["Fleet", "Total Vehicles", dashboard["fleet"]["total_vehicles"]],
        ["Fleet", "Available Vehicles", dashboard["fleet"]["available"]],
        ["Fleet", "On Trip", dashboard["fleet"]["on_trip"]],
        ["Fleet", "In Shop", dashboard["fleet"]["in_shop"]],
        ["Drivers", "Total Drivers", dashboard["drivers"]["total_drivers"]],
        ["Drivers", "Available Drivers", dashboard["drivers"]["available"]],
        ["Drivers", "On Trip", dashboard["drivers"]["on_trip"]],
        ["Trips", "Total Trips", dashboard["trips"]["total_trips"]],
        ["Trips", "Active Trips", dashboard["trips"]["active_trips"]],
        ["Fuel", "Total Quantity (L)", dashboard["fuel"]["total_fuel_quantity"]],
        ["Fuel", "Total Cost ($)", dashboard["fuel"]["total_fuel_cost"]],
        ["Financial", "Total Revenue ($)", dashboard["financial"]["total_revenue"]],
        ["Financial", "Net Profit ($)", dashboard["financial"]["net_profit"]]
    ]
    pdf_bytes = AnalyticsService.export_pdf(
        "Executive Dashboard Report Summary",
        {},
        headers,
        rows,
        current_user.full_name
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=dashboard_summary.pdf"}
    )


@export_router.get(
    "/vehicles/csv",
    summary="Export Vehicles Report as CSV"
)
def export_vehicles_csv(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_vehicles_report(db, search, start_date, end_date)
    headers = ["Registration Number", "Vehicle Name", "Trips Completed", "Distance (KM)", "Fuel Cost ($)", "Maintenance Cost ($)", "Expense Cost ($)", "Total Cost ($)", "Revenue ($)", "Profit ($)", "Efficiency (KM/L)", "Cost/KM ($)", "Utilization (%)"]
    rows = []
    for r in data:
        rows.append([
            r["registration_number"],
            r["vehicle_name"],
            r["trips_completed"],
            r["distance"],
            r["fuel_cost"],
            r["maintenance_cost"],
            r["expense_cost"],
            r["total_cost"],
            r["revenue"],
            r["profit"],
            round(r["fuel_efficiency"], 2) if r["fuel_efficiency"] else "N/A",
            round(r["cost_per_km"], 2) if r["cost_per_km"] else "N/A",
            round(r["utilization_pct"], 2)
        ])
    csv_str = AnalyticsService.export_csv(headers, rows)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vehicles_report.csv"}
    )


@export_router.get(
    "/vehicles/pdf",
    summary="Export Vehicles Report as PDF"
)
def export_vehicles_pdf(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    data = AnalyticsRepository.get_vehicles_report(db, search, start_date, end_date)
    headers = ["Reg Number", "Name", "Trips", "Distance", "Fuel Cost", "Maint", "Expenses", "Total", "Revenue", "Profit"]
    rows = []
    for r in data:
        rows.append([
            r["registration_number"],
            r["vehicle_name"],
            r["trips_completed"],
            f"{r['distance']} km",
            f"${r['fuel_cost']}",
            f"${r['maintenance_cost']}",
            f"${r['expense_cost']}",
            f"${r['total_cost']}",
            f"${r['revenue']}",
            f"${r['profit']}"
        ])
    filters = {"Search": search or "", "Start Date": str(start_date) if start_date else "", "End Date": str(end_date) if end_date else ""}
    pdf_bytes = AnalyticsService.export_pdf("Vehicles Operations Report", filters, headers, rows, current_user.full_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=vehicles_report.pdf"}
    )


@export_router.get(
    "/drivers/csv",
    summary="Export Drivers Report as CSV"
)
def export_drivers_csv(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_drivers_report(db, search, start_date, end_date)
    headers = ["Driver Name", "Trips Completed", "Distance (KM)", "Revenue Generated ($)", "Fuel Used (L)", "Avg Distance/Trip (KM)", "Avg Duration (Hrs)", "Current Status"]
    rows = []
    for r in data:
        rows.append([
            r["full_name"],
            r["trips_completed"],
            r["distance"],
            r["revenue_generated"],
            r["fuel_used"],
            round(r["average_trip_distance"], 2),
            round(r["average_trip_duration"], 2),
            r["current_status"]
        ])
    csv_str = AnalyticsService.export_csv(headers, rows)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=drivers_report.csv"}
    )


@export_router.get(
    "/drivers/pdf",
    summary="Export Drivers Report as PDF"
)
def export_drivers_pdf(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    data = AnalyticsRepository.get_drivers_report(db, search, start_date, end_date)
    headers = ["Driver Name", "Trips", "Distance", "Revenue", "Fuel Used", "Avg Dist", "Avg Dur", "Status"]
    rows = []
    for r in data:
        rows.append([
            r["full_name"],
            r["trips_completed"],
            f"{r['distance']} km",
            f"${r['revenue_generated']}",
            f"{r['fuel_used']} L",
            f"{round(r['average_trip_distance'], 1)} km",
            f"{round(r['average_trip_duration'], 1)} hrs",
            r["current_status"]
        ])
    filters = {"Search": search or "", "Start Date": str(start_date) if start_date else "", "End Date": str(end_date) if end_date else ""}
    pdf_bytes = AnalyticsService.export_pdf("Drivers Performance Report", filters, headers, rows, current_user.full_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=drivers_report.pdf"}
    )


@export_router.get(
    "/trips/csv",
    summary="Export Trips Report as CSV"
)
def export_trips_csv(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_trips_report(db, search, start_date, end_date)
    headers = ["Trip Number", "Vehicle Registration", "Driver Name", "Origin", "Destination", "Distance (KM)", "Revenue ($)", "Fuel Consumed (L)", "Status", "Duration (Hrs)"]
    rows = []
    for r in data:
        rows.append([
            r["trip_number"],
            r["vehicle_registration"],
            r["driver_name"],
            r["origin"],
            r["destination"],
            r["distance"],
            r["revenue"],
            r["fuel"],
            r["status"],
            round(r["duration"], 2)
        ])
    csv_str = AnalyticsService.export_csv(headers, rows)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trips_report.csv"}
    )


@export_router.get(
    "/trips/pdf",
    summary="Export Trips Report as PDF"
)
def export_trips_pdf(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    data = AnalyticsRepository.get_trips_report(db, search, start_date, end_date)
    headers = ["Trip #", "Vehicle", "Driver", "Origin", "Dest", "Dist", "Rev", "Fuel", "Status", "Dur"]
    rows = []
    for r in data:
        rows.append([
            r["trip_number"],
            r["vehicle_registration"],
            r["driver_name"],
            r["origin"],
            r["destination"],
            f"{r['distance']} km",
            f"${r['revenue']}",
            f"{r['fuel']} L",
            r["status"],
            f"{round(r['duration'], 1)} hrs"
        ])
    filters = {"Search": search or "", "Start Date": str(start_date) if start_date else "", "End Date": str(end_date) if end_date else ""}
    pdf_bytes = AnalyticsService.export_pdf("Trips Operational Report", filters, headers, rows, current_user.full_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=trips_report.pdf"}
    )


@export_router.get(
    "/fuel/csv",
    summary="Export Fuel logs as CSV"
)
def export_fuel_csv(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_fuel_report(db, search, start_date, end_date)
    headers = ["Vehicle", "Trip #", "Fuel Quantity (L)", "Fuel Cost ($)", "Efficiency (KM/L)", "Station", "Fuel Type"]
    rows = []
    for r in data:
        rows.append([
            r["vehicle_registration"],
            r["trip_number"],
            r["fuel_quantity"],
            r["fuel_cost"],
            round(r["fuel_efficiency"], 2) if r["fuel_efficiency"] else "N/A",
            r["station"],
            r["fuel_type"]
        ])
    csv_str = AnalyticsService.export_csv(headers, rows)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fuel_report.csv"}
    )


@export_router.get(
    "/fuel/pdf",
    summary="Export Fuel logs as PDF"
)
def export_fuel_pdf(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    data = AnalyticsRepository.get_fuel_report(db, search, start_date, end_date)
    headers = ["Vehicle", "Trip", "Quantity", "Cost", "Efficiency", "Station", "Type"]
    rows = []
    for r in data:
        rows.append([
            r["vehicle_registration"],
            r["trip_number"],
            f"{r['fuel_quantity']} L",
            f"${r['fuel_cost']}",
            f"{round(r['fuel_efficiency'], 2)} km/L" if r["fuel_efficiency"] else "N/A",
            r["station"],
            r["fuel_type"]
        ])
    filters = {"Search": search or "", "Start Date": str(start_date) if start_date else "", "End Date": str(end_date) if end_date else ""}
    pdf_bytes = AnalyticsService.export_pdf("Fuel Logs Audit Report", filters, headers, rows, current_user.full_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=fuel_report.pdf"}
    )


@export_router.get(
    "/maintenance/csv",
    summary="Export Maintenance logs as CSV"
)
def export_maintenance_csv(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    data = AnalyticsRepository.get_maintenance_report(db, search, start_date, end_date)
    headers = ["Vehicle", "Maintenance Type", "Status", "Estimated Cost ($)", "Actual Cost ($)", "Scheduled Date", "Completion Date", "Downtime (Days)"]
    rows = []
    for r in data:
        rows.append([
            r["vehicle_registration"],
            r["maintenance_type"],
            r["status"],
            r["estimated_cost"],
            r["actual_cost"] if r["actual_cost"] else "N/A",
            str(r["scheduled_date"]),
            str(r["completion_date"]) if r["completion_date"] else "N/A",
            r["downtime"]
        ])
    csv_str = AnalyticsService.export_csv(headers, rows)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=maintenance_report.csv"}
    )


@export_router.get(
    "/maintenance/pdf",
    summary="Export Maintenance logs as PDF"
)
def export_maintenance_pdf(
    search: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    data = AnalyticsRepository.get_maintenance_report(db, search, start_date, end_date)
    headers = ["Vehicle", "Type", "Status", "Est Cost", "Act Cost", "Sched Date", "Comp Date", "Downtime"]
    rows = []
    for r in data:
        rows.append([
            r["vehicle_registration"],
            r["maintenance_type"],
            r["status"],
            f"${r['estimated_cost']}",
            f"${r['actual_cost']}" if r["actual_cost"] else "N/A",
            str(r["scheduled_date"]),
            str(r["completion_date"]) if r["completion_date"] else "N/A",
            f"{r['downtime']} days"
        ])
    filters = {"Search": search or "", "Start Date": str(start_date) if start_date else "", "End Date": str(end_date) if end_date else ""}
    pdf_bytes = AnalyticsService.export_pdf("Maintenance logs and downtime report", filters, headers, rows, current_user.full_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=maintenance_report.pdf"}
    )


@export_router.get(
    "/financial/pdf",
    summary="Export Financial performance report as PDF"
)
def export_financial_pdf(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    fin = AnalyticsService.get_financial_report(db, start_date, end_date)
    headers = ["KPI", "Value"]
    rows = [
        ["Total Revenue ($)", f"${fin['revenue']}"],
        ["Fuel Cost ($)", f"${fin['fuel_cost']}"],
        ["Maintenance Cost ($)", f"${fin['maintenance_cost']}"],
        ["Other Expenses ($)", f"${fin['expenses']}"],
        ["Operational Cost ($)", f"${fin['operational_cost']}"],
        ["Net Profit ($)", f"${fin['net_profit']}"],
        ["Profit Margin (%)", f"{round(fin['profit_margin'], 1)}%"],
        ["Cost/KM ($)", f"${round(fin['cost_per_km'], 2)}" if fin["cost_per_km"] else "N/A"],
        ["Revenue/KM ($)", f"${round(fin['revenue_per_km'], 2)}" if fin["revenue_per_km"] else "N/A"]
    ]
    filters = {"Start Date": str(start_date) if start_date else "", "End Date": str(end_date) if end_date else ""}
    pdf_bytes = AnalyticsService.export_pdf("Financial Performance Report", filters, headers, rows, current_user.full_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=financial_report.pdf"}
    )


@export_router.get(
    "/alerts/csv",
    summary="Export Alerts and Document Expiry summaries as CSV"
)
def export_alerts_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    from app.Vehicles.models import VehicleDocument
    from app.Maintenance.models import MaintenanceLog
    from app.Drivers.models import Driver
    from sqlalchemy import select

    alerts = AnalyticsService.get_dashboard_alerts(db)
    
    headers = ["Report Section", "Name / Type", "Identifier / Vehicle", "Status / Value"]
    rows = []
    
    # Dashboard Alerts section
    for c in alerts["critical"]:
        rows.append(["Dashboard Alerts - Critical", c["title"], c["type"], f"Count: {c['count']}"])
    for w in alerts["warning"]:
        rows.append(["Dashboard Alerts - Warning", w["title"], w["type"], f"Count: {w['count']}"])
    for i in alerts["info"]:
        rows.append(["Dashboard Alerts - Info", i["type"], "Metric", f"Value: {i['value']}"])
        
    # Driver License Expiry section
    drivers = db.scalars(select(Driver).where(Driver.is_deleted == False)).all()
    for drv in drivers:
        diff = (drv.license_expiry - date.today()).days
        if diff <= 30:
            rows.append(["Driver License Expiry Report", drv.full_name, drv.license_number, f"Expires: {drv.license_expiry} ({diff} days remaining)"])

    # Expiry Documents section
    docs = db.scalars(select(VehicleDocument).where(VehicleDocument.is_deleted == False)).all()
    for doc in docs:
        rows.append(["Document Expiry Report", doc.document_type.value, doc.vehicle.registration_number, f"Expires: {doc.expiry_date}"])
        
    # Maintenance Due section
    logs = db.scalars(select(MaintenanceLog).where(MaintenanceLog.is_deleted == False)).all()
    for log in logs:
        rows.append(["Maintenance Due Report", log.maintenance_type, log.vehicle.registration_number, f"Scheduled: {log.scheduled_date} ({log.status.value})"])

    csv_str = AnalyticsService.export_csv(headers, rows)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=alerts_report.csv"}
    )


@export_router.get(
    "/alerts/pdf",
    summary="Export Alerts and Document Expiry summaries as PDF"
)
def export_alerts_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analytics_access)
):
    from app.Vehicles.models import VehicleDocument
    from app.Maintenance.models import MaintenanceLog
    from app.Drivers.models import Driver
    from sqlalchemy import select

    alerts = AnalyticsService.get_dashboard_alerts(db)
    
    headers = ["Report Section", "Name / Type", "Identifier / Vehicle", "Status / Value"]
    rows = []
    
    # Dashboard Alerts section
    for c in alerts["critical"]:
        rows.append(["Dashboard Alerts - Critical", c["title"], c["type"], f"Count: {c['count']}"])
    for w in alerts["warning"]:
        rows.append(["Dashboard Alerts - Warning", w["title"], w["type"], f"Count: {w['count']}"])
    for i in alerts["info"]:
        rows.append(["Dashboard Alerts - Info", i["type"], "Metric", f"Value: {i['value']}"])
        
    # Driver License Expiry section
    drivers = db.scalars(select(Driver).where(Driver.is_deleted == False)).all()
    for drv in drivers:
        diff = (drv.license_expiry - date.today()).days
        if diff <= 30:
            rows.append(["Driver License Expiry Report", drv.full_name, drv.license_number, f"Expires: {drv.license_expiry} ({diff} days remaining)"])

    # Expiry Documents section
    docs = db.scalars(select(VehicleDocument).where(VehicleDocument.is_deleted == False)).all()
    for doc in docs:
        rows.append(["Document Expiry Report", doc.document_type.value, doc.vehicle.registration_number, f"Expires: {doc.expiry_date}"])
        
    # Maintenance Due section
    logs = db.scalars(select(MaintenanceLog).where(MaintenanceLog.is_deleted == False)).all()
    for log in logs:
        rows.append(["Maintenance Due Report", log.maintenance_type, log.vehicle.registration_number, f"Scheduled: {log.scheduled_date} ({log.status.value})"])

    pdf_bytes = AnalyticsService.export_pdf("Alerts and Document Expiry Report", {}, headers, rows, current_user.full_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=alerts_report.pdf"}
    )
