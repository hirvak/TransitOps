from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from loguru import logger

from app.Auth.schemas import LoginRequest, TokenResponse, UserLoginResponse
from app.Users.repository import UserRepository
from app.Security.password import verify_password
from app.Security.jwt import create_access_token
from app.Users.models import User
from app.Utils.config import settings
from app.Utils.constants import TOKEN_TYPE


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, request: LoginRequest) -> User:
        """
        Authenticate a user by checking email and verifying password.
        Raises 401 on failure, and validates active status.
        """
        user = UserRepository.get_user_by_email(db, request.email)
        
        # Consistent invalid credential checking
        if not user:
            logger.warning(f"Failed login attempt: Email {request.email} does not exist.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
            
        if not verify_password(request.password, user.hashed_password):
            logger.warning(f"Failed login attempt: Incorrect password for email {request.email}.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
            
        if not user.is_active:
            logger.warning(f"Failed login attempt: User {user.email} is inactive.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is inactive."
            )
            
        logger.info(f"User authenticated successfully: {user.email} (ID: {user.id})")
        return user

    @staticmethod
    def login_user(db: Session, request: LoginRequest) -> TokenResponse:
        """
        Authenticate user and return a signed JWT token response containing token details and user info.
        """
        user = AuthService.authenticate_user(db, request)
        
        role_name = user.role.name if user.role else "None"
        
        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": role_name
        }
        
        access_token = create_access_token(token_payload)
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        
        user_response = UserLoginResponse(
            id=user.id,
            full_name=user.full_name,
            role=role_name
        )
        
        logger.info(f"Session started successfully: Token generated for {user.email}")
        
        return TokenResponse(
            access_token=access_token,
            token_type=TOKEN_TYPE,
            expires_in=expires_in,
            user=user_response
        )
