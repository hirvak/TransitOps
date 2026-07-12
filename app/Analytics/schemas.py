import uuid
from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


# --- Dashboard KPI Schemas ---

class FleetKPIs(BaseModel):
    total_vehicles: int
    available: int
    on_trip: int
    in_shop: int
    retired: int


class DriverKPIs(BaseModel):
    total_drivers: int
    available: int
    on_trip: int
    suspended: int
    off_duty: int


class TripKPIs(BaseModel):
    total_trips: int
    draft: int
    dispatched: int
    completed: int
    cancelled: int
    active_trips: int
    todays_trips: int


class MaintenanceKPIs(BaseModel):
    pending: int
    in_progress: int
    completed: int
    cancelled: int


class FuelKPIs(BaseModel):
    total_fuel_quantity: float
    total_fuel_cost: float
    average_fuel_efficiency: Optional[float] = None


class ExpenseKPIs(BaseModel):
    total_expenses: float
    maintenance_cost: float
    operational_cost: float


class FinancialKPIs(BaseModel):
    total_revenue: float
    net_profit: float


class UtilizationKPIs(BaseModel):
    fleet_utilization_pct: float
    vehicle_utilization_pct: float
    driver_utilization_pct: float


class DashboardResponse(BaseModel):
    fleet: FleetKPIs
    drivers: DriverKPIs
    trips: TripKPIs
    maintenance: MaintenanceKPIs
    fuel: FuelKPIs
    expenses: ExpenseKPIs
    financial: FinancialKPIs
    utilization: UtilizationKPIs


# --- Dashboard Charts Schemas ---

class MonthlyTripsItem(BaseModel):
    month: str
    trips: int


class MonthlyRevenueItem(BaseModel):
    month: str
    revenue: float


class MonthlyExpensesItem(BaseModel):
    month: str
    expenses: float


class MonthlyFuelCostItem(BaseModel):
    month: str
    fuel_cost: float


class MaintenanceTrendItem(BaseModel):
    month: str
    completed: int
    pending: int
    cancelled: int


class PieChartItem(BaseModel):
    status: str
    count: int


class DashboardChartsResponse(BaseModel):
    monthly_trips: List[MonthlyTripsItem]
    monthly_revenue: List[MonthlyRevenueItem]
    monthly_expenses: List[MonthlyExpensesItem]
    monthly_fuel_cost: List[MonthlyFuelCostItem]
    maintenance_trend: List[MaintenanceTrendItem]
    vehicle_status_pie: List[PieChartItem]
    driver_status_pie: List[PieChartItem]


# --- Reports Row Schemas ---

class VehicleReportRow(BaseModel):
    vehicle_id: uuid.UUID
    registration_number: str
    vehicle_name: str
    trips_completed: int
    distance: float
    fuel_cost: float
    maintenance_cost: float
    expense_cost: float
    total_cost: float
    revenue: float
    profit: float
    fuel_efficiency: Optional[float] = None
    cost_per_km: Optional[float] = None
    utilization_pct: float
    notification_count: int = 0
    expired_documents_count: int = 0
    maintenance_due_count: int = 0
    license_status: str = "N/A"
    operational_health_score: float = 100.0


class DriverReportRow(BaseModel):
    driver_id: uuid.UUID
    full_name: str
    trips_completed: int
    distance: float
    revenue_generated: float
    fuel_used: float
    average_trip_distance: float
    average_trip_duration: float  # in hours
    current_status: str
    notification_count: int = 0
    expired_documents_count: int = 0
    maintenance_due_count: int = 0
    license_status: str = "VALID"
    operational_health_score: float = 100.0


class TripReportRow(BaseModel):
    trip_number: str
    vehicle_registration: str
    driver_name: str
    origin: str
    destination: str
    distance: float
    revenue: float
    fuel: float
    status: str
    duration: float  # in hours


class FuelReportRow(BaseModel):
    id: uuid.UUID
    vehicle_registration: str
    trip_number: str
    fuel_quantity: float
    fuel_cost: float
    fuel_efficiency: Optional[float] = None
    station: str
    fuel_type: str


class ExpenseReportRow(BaseModel):
    id: uuid.UUID
    vehicle_registration: str
    trip_number: Optional[str] = None
    expense_type: str
    amount: float
    date: date
    description: str


class MaintenanceReportRow(BaseModel):
    id: uuid.UUID
    vehicle_registration: str
    maintenance_type: str
    status: str
    estimated_cost: float
    actual_cost: Optional[float] = None
    scheduled_date: date
    completion_date: Optional[date] = None
    downtime: int  # in days
    notification_count: int = 0
    expired_documents_count: int = 0
    maintenance_due_count: int = 0
    license_status: str = "N/A"
    operational_health_score: float = 100.0


class FinancialReportRow(BaseModel):
    revenue: float
    fuel_cost: float
    maintenance_cost: float
    expenses: float
    operational_cost: float
    net_profit: float
    profit_margin: float  # percentage
    cost_per_km: Optional[float] = None
    revenue_per_km: Optional[float] = None
    notification_count: int = 0
    expired_documents_count: int = 0
    maintenance_due_count: int = 0
    license_status: str = "N/A"
    operational_health_score: float = 100.0


# --- Paginated Response Wrappers ---

class PaginationInfo(BaseModel):
    total_records: int
    total_pages: int
    current_page: int
    page_size: int


class VehicleReportResponse(BaseModel):
    data: List[VehicleReportRow]
    pagination: PaginationInfo


class DriverReportResponse(BaseModel):
    data: List[DriverReportRow]
    pagination: PaginationInfo


class TripReportResponse(BaseModel):
    data: List[TripReportRow]
    pagination: PaginationInfo


class FuelReportResponse(BaseModel):
    data: List[FuelReportRow]
    pagination: PaginationInfo


class ExpenseReportResponse(BaseModel):
    data: List[ExpenseReportRow]
    pagination: PaginationInfo


class MaintenanceReportResponse(BaseModel):
    data: List[MaintenanceReportRow]
    pagination: PaginationInfo


class EnhancedDashboardResponse(BaseModel):
    kpis: DashboardResponse
    charts: DashboardChartsResponse
    alerts: dict
    summary: dict
