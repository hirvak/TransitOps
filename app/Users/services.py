import uuid
from typing import Tuple, List, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from loguru import logger

from app.Users.schemas import (
    CreateUserRequest,
    AdminCreateUserRequest,
    UpdateUserRequest,
    UserListResponse,
    PaginationResponse,
)
from app.Users.repository import UserRepository
from app.Auth.repository import AuthRepository
from app.Security.password import hash_password
from app.Utils.constants import DEFAULT_ROLE
from app.Users.models import User


class UserService:
    @staticmethod
    def register_user(db: Session, request: CreateUserRequest) -> User:
        """
        Register a new user in the platform (self-registration) with a chosen role.
        Validates email uniqueness and role existence, then hashes password.
        """
        existing_user = UserRepository.get_user_by_email(db, request.email)
        if existing_user:
            logger.warning(f"Registration failed: Email {request.email} already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists."
            )

        role = AuthRepository.get_role_by_name(db, request.role)
        if not role:
            logger.warning(f"Registration failed: Role {request.role} does not exist.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role."
            )

        hashed_pwd = hash_password(request.password)

        try:
            db_user = UserRepository.create_user(
                db=db,
                user_data=request,
                role_id=role.id,
                hashed_password=hashed_pwd
            )
            db.commit()
            db.refresh(db_user)
            logger.info(f"User registered successfully: {db_user.email} (ID: {db_user.id})")
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during registration for {request.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating your account."
            )

    @staticmethod
    def create_user_by_admin(db: Session, request: AdminCreateUserRequest) -> User:
        """
        Create a new user by Admin with custom role.
        """
        # Validate email uniqueness
        existing_user = UserRepository.get_user_by_email(db, request.email)
        if existing_user:
            logger.warning(f"Admin user creation failed: Email {request.email} already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists."
            )

        # Validate role existence
        role = AuthRepository.get_role_by_name(db, request.role)
        if not role:
            logger.warning(f"Admin user creation failed: Role {request.role} does not exist.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role {request.role} does not exist."
            )

        hashed_pwd = hash_password(request.password)

        try:
            # Map request to CreateUserRequest format to reuse repository method
            create_req = CreateUserRequest(
                email=request.email,
                full_name=request.full_name,
                password=request.password,
                phone=request.phone,
                profile_image=request.profile_image,
                role=request.role
            )
            db_user = UserRepository.create_user(
                db=db,
                user_data=create_req,
                role_id=role.id,
                hashed_password=hashed_pwd
            )
            db.commit()
            db.refresh(db_user)
            logger.info(f"Admin created user successfully: {db_user.email} with role {role.name} (ID: {db_user.id})")
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during admin user creation for {request.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while creating the user."
            )

    @staticmethod
    def get_paginated_users_service(
        db: Session,
        page: int,
        page_size: int,
        search: str | None,
        role_name: str | None,
        is_active: bool | None,
        sort_by: str,
        sort_order: str
    ) -> dict:
        """
        Retrieve paginated users and construct formatted pagination details.
        """
        users, total_records = UserRepository.get_paginated_users(
            db=db,
            page=page,
            page_size=page_size,
            search=search,
            role_name=role_name,
            is_active=is_active,
            sort_by=sort_by,
            sort_order=sort_order
        )
        import math
        total_pages = math.ceil(total_records / page_size) if total_records > 0 else 0
        return {
            "data": users,
            "pagination": {
                "total_records": total_records,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size
            }
        }

    @staticmethod
    def get_user_by_id(db: Session, user_id: uuid.UUID) -> User:
        """
        Fetch a user by ID or raise 404.
        """
        user = UserRepository.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        return user

    @staticmethod
    def get_user_statistics(db: Session) -> dict:
        """
        Fetch aggregated user stats.
        """
        return UserRepository.get_users_statistics(db)

    @staticmethod
    def update_user_by_admin(db: Session, user_id: uuid.UUID, request: UpdateUserRequest) -> User:
        """
        Update user fields by Admin. Handles optional password hashing and role changes.
        """
        user = UserService.get_user_by_id(db, user_id)
        updates = {}

        if request.full_name is not None:
            updates["full_name"] = request.full_name
        if request.phone is not None:
            updates["phone"] = request.phone
        if request.profile_image is not None:
            updates["profile_image"] = request.profile_image
        if request.is_active is not None:
            updates["is_active"] = request.is_active

        if request.password is not None:
            updates["hashed_password"] = hash_password(request.password)

        if request.role is not None:
            # Look up role
            role = AuthRepository.get_role_by_name(db, request.role)
            if not role:
                logger.warning(f"User update failed: Role {request.role} does not exist.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role {request.role} does not exist."
                )
            old_role_name = user.role.name if user.role else "None"
            if old_role_name != role.name:
                updates["role_id"] = role.id
                logger.info(f"Role changed: User {user.email} role updated from {old_role_name} to {role.name}")

        try:
            UserRepository.update_user_fields(db, user, updates)
            db.commit()
            db.refresh(user)
            logger.info(f"User updated: User {user.email} (ID: {user.id}) updated successfully.")
            return user
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during user update for {user.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating the user."
            )

    @staticmethod
    def delete_user_by_admin(db: Session, user_id: uuid.UUID) -> User:
        """
        Soft delete a user.
        """
        user = UserService.get_user_by_id(db, user_id)
        try:
            UserRepository.soft_delete_user(db, user)
            db.commit()
            db.refresh(user)
            logger.info(f"User deleted: User {user.email} (ID: {user.id}) soft-deleted successfully.")
            return user
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during user deletion for {user.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while deleting the user."
            )

    @staticmethod
    def set_user_status(db: Session, user_id: uuid.UUID, is_active: bool) -> User:
        """
        Activate or deactivate a user.
        """
        user = UserService.get_user_by_id(db, user_id)
        try:
            UserRepository.update_user_fields(db, user, {"is_active": is_active})
            db.commit()
            db.refresh(user)
            action = "activated" if is_active else "deactivated"
            logger.info(f"User {action}: User {user.email} (ID: {user.id}) status set to is_active={is_active}")
            return user
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during user status change for {user.email}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred while changing user status."
            )
