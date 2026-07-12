import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Security.permissions import require_admin_or_financial_analyst
from app.Users.models import User
from app.FuelExpense.models import FuelType, ExpenseType
from app.FuelExpense.services import FuelExpenseService
from app.FuelExpense.schemas import (
    CreateFuelLogRequest,
    UpdateFuelLogRequest,
    FuelLogResponse,
    FuelLogListResponse,
    CreateExpenseRequest,
    UpdateExpenseRequest,
    ExpenseResponse,
    ExpenseListResponse,
    FuelExpenseStatisticsResponse,
    VehicleFinancialSummaryResponse
)

fuel_router = APIRouter(
    prefix="/fuel-logs",
    tags=["Fuel Logs"],
    dependencies=[Depends(require_admin_or_financial_analyst)]
)

expense_router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
    dependencies=[Depends(require_admin_or_financial_analyst)]
)


# --- Fuel Log Endpoints ---

@fuel_router.post(
    "",
    response_model=FuelLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Fuel Log",
    description="Creates a new fuel log for a completed trip. The vehicle's odometer reading will be updated automatically."
)
def create_fuel_log(
    request: CreateFuelLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_financial_analyst)
):
    return FuelExpenseService.create_fuel_log(db, request, current_user.id)


@fuel_router.get(
    "/vehicles/{id}/summary",
    response_model=VehicleFinancialSummaryResponse,
    summary="Get Vehicle Financial Summary",
    description="Returns financial and operational calculations specifically for a vehicle ID."
)
def get_vehicle_summary(
    id: uuid.UUID,
    db: Session = Depends(get_db)
):
    return FuelExpenseService.get_vehicle_financial_summary(db, id)


@fuel_router.get(
    "",
    response_model=FuelLogListResponse,
    summary="List Fuel Logs",
    description="Returns a paginated list of active fuel logs. Supports searching by registration/name/trip, filtering, and sorting."
)
def get_fuel_logs(
    search: Optional[str] = Query(None, description="Search by Vehicle Reg, Vehicle Name, or Trip Number"),
    fuel_type: Optional[FuelType] = Query(None),
    vehicle_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("fuel_date", regex="^(fuel_date|fuel_quantity|total_cost)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    logs, total = FuelExpenseService.get_paginated_fuel_logs(
        db, search, fuel_type, vehicle_id, start_date, end_date, sort_by, sort_order, page, page_size
    )
    pages = (total + page_size - 1) // page_size
    return {
        "data": logs,
        "pagination": {
            "total_records": total,
            "total_pages": pages,
            "current_page": page,
            "page_size": page_size
        }
    }


@fuel_router.get(
    "/{id}",
    response_model=FuelLogResponse,
    summary="Get Fuel Log Details",
    description="Returns details of an active fuel log by ID, including calculated efficiency."
)
def get_fuel_log(
    id: uuid.UUID,
    db: Session = Depends(get_db)
):
    return FuelExpenseService.get_fuel_log(db, id)


@fuel_router.put(
    "/{id}",
    response_model=FuelLogResponse,
    summary="Update Fuel Log",
    description="Updates an existing active fuel log and recalculates total costs if necessary."
)
def update_fuel_log(
    id: uuid.UUID,
    request: UpdateFuelLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_financial_analyst)
):
    return FuelExpenseService.update_fuel_log(db, id, request, current_user.id)


@fuel_router.delete(
    "/{id}",
    response_model=FuelLogResponse,
    summary="Delete Fuel Log",
    description="Performs a soft delete of a fuel log. Deletion is restricted to soft-delete auditing."
)
def delete_fuel_log(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_financial_analyst)
):
    return FuelExpenseService.soft_delete_fuel_log(db, id, current_user.id)


# --- Expense Endpoints ---

@expense_router.get(
    "/statistics",
    response_model=FuelExpenseStatisticsResponse,
    summary="Get Dashboard Statistics",
    description="Computes metrics including operational costs, fuel efficiency, cost per km, and vehicle leaders."
)
def get_statistics(
    db: Session = Depends(get_db)
):
    return FuelExpenseService.get_statistics(db)


@expense_router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Expense",
    description="Creates a new expense record linked to a vehicle and optionally to a trip."
)
def create_expense(
    request: CreateExpenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_financial_analyst)
):
    return FuelExpenseService.create_expense(db, request, current_user.id)


@expense_router.get(
    "",
    response_model=ExpenseListResponse,
    summary="List Expenses",
    description="Returns a paginated list of active expenses. Supports searching, filtering, and sorting."
)
def get_expenses(
    search: Optional[str] = Query(None, description="Search by Vehicle Reg, Type, or Description"),
    expense_type: Optional[ExpenseType] = Query(None),
    vehicle_id: Optional[uuid.UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("expense_date", regex="^(expense_date|amount)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    expenses, total = FuelExpenseService.get_paginated_expenses(
        db, search, expense_type, vehicle_id, start_date, end_date, sort_by, sort_order, page, page_size
    )
    pages = (total + page_size - 1) // page_size
    return {
        "data": expenses,
        "pagination": {
            "total_records": total,
            "total_pages": pages,
            "current_page": page,
            "page_size": page_size
        }
    }


@expense_router.get(
    "/{id}",
    response_model=ExpenseResponse,
    summary="Get Expense Details",
    description="Returns details of an active expense by ID."
)
def get_expense(
    id: uuid.UUID,
    db: Session = Depends(get_db)
):
    return FuelExpenseService.get_expense(db, id)


@expense_router.put(
    "/{id}",
    response_model=ExpenseResponse,
    summary="Update Expense",
    description="Updates details of an active expense."
)
def update_expense(
    id: uuid.UUID,
    request: UpdateExpenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_financial_analyst)
):
    return FuelExpenseService.update_expense(db, id, request, current_user.id)


@expense_router.delete(
    "/{id}",
    response_model=ExpenseResponse,
    summary="Delete Expense",
    description="Soft deletes an expense."
)
def delete_expense(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_financial_analyst)
):
    return FuelExpenseService.soft_delete_expense(db, id, current_user.id)
