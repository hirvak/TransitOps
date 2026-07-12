from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from loguru import logger

from app.Users.schemas import CreateUserRequest
from app.Users.repository import UserRepository
from app.Auth.repository import AuthRepository
from app.Security.password import hash_password
from app.Utils.constants import DEFAULT_ROLE
from app.Users.models import User


class UserService:
    @staticmethod
    def register_user(db: Session, request: CreateUserRequest) -> User:
        """
        Register a new user in the platform.
        Validates that the email is unique, hashes the password,
        assigns the default role, and manages database transaction.
        """
        # Check duplicate registration
        existing_user = UserRepository.get_user_by_email(db, request.email)
        if existing_user:
            logger.warning(f"Registration failed: Email {request.email} already exists.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists."
            )

        # Fetch default role from AuthRepository
        default_role = AuthRepository.get_role_by_name(db, DEFAULT_ROLE)
        if not default_role:
            logger.error(f"Configuration error: Default role {DEFAULT_ROLE} not found in database.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Default role configuration is missing."
            )

        hashed_pwd = hash_password(request.password)

        try:
            # Create user
            db_user = UserRepository.create_user(
                db=db,
                user_data=request,
                role_id=default_role.id,
                hashed_password=hashed_pwd
            )
            # Commit transaction
            db.commit()
            # Refresh to populate relationships
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
