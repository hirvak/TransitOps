import uuid
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Users.schemas import (
    AdminCreateUserRequest,
    UpdateUserRequest,
    UserResponse,
    UserListResponse,
    UserStatisticsResponse,
)
from app.Users.services import UserService
from app.Security.permissions import require_admin


# Restrict entire router to ADMIN users by default
router = APIRouter(
    prefix="/users", 
    tags=["User Management"], 
    dependencies=[Depends(require_admin)]
)


@router.get(
    "/statistics",
    response_model=UserStatisticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user statistics",
    description="Retrieve aggregated statistics of users including total count, active/inactive counts, and role distribution."
)
def get_statistics(db: Session = Depends(get_db)):
    return UserService.get_user_statistics(db)


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create user (Admin)",
    description="ADMIN-only endpoint for creating users with any system role. Administrators can assign ADMIN, FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER, or FINANCIAL_ANALYST."
)
def create_user(request: AdminCreateUserRequest, db: Session = Depends(get_db)):
    return UserService.create_user_by_admin(db, request)


@router.get(
    "",
    response_model=UserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List users",
    description="Fetch a paginated list of users with support for searching, filtering, and sorting."
)
def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    search: str | None = Query(None, description="Search term matching name or email"),
    role: str | None = Query(None, description="Filter by role name (e.g. ADMIN, DISPATCHER)"),
    is_active: bool | None = Query(None, description="Filter by active/inactive status"),
    sort_by: str = Query("created_at", enum=["created_at", "name", "email"], description="Sort field"),
    sort_order: str = Query("asc", enum=["asc", "desc"], description="Sort order"),
    db: Session = Depends(get_db)
):
    return UserService.get_paginated_users_service(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        role_name=role,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.get(
    "/{id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user by ID",
    description="Retrieve detailed profile information of a single user by their primary key UUID."
)
def get_user(id: uuid.UUID, db: Session = Depends(get_db)):
    return UserService.get_user_by_id(db, id)


@router.put(
    "/{id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user details",
    description="Update user profile fields, including optional password changes and role assignment."
)
def update_user(id: uuid.UUID, request: UpdateUserRequest, db: Session = Depends(get_db)):
    return UserService.update_user_by_admin(db, id, request)


@router.delete(
    "/{id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Soft delete user",
    description="Perform a soft-delete by setting the is_deleted flag to true. Physically retains the record."
)
def delete_user(id: uuid.UUID, db: Session = Depends(get_db)):
    return UserService.delete_user_by_admin(db, id)


@router.patch(
    "/{id}/activate",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Activate user",
    description="Activate a user account to allow system login access."
)
def activate_user(id: uuid.UUID, db: Session = Depends(get_db)):
    return UserService.set_user_status(db, id, is_active=True)


@router.patch(
    "/{id}/deactivate",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Deactivate user",
    description="Deactivate a user account to block system login access immediately."
)
def deactivate_user(id: uuid.UUID, db: Session = Depends(get_db)):
    return UserService.set_user_status(db, id, is_active=False)
