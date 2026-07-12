from fastapi import APIRouter, Depends, status, Request, HTTPException
from sqlalchemy.orm import Session

from app.Database.database import get_db
from app.Auth.schemas import LoginRequest, TokenResponse, CurrentUserResponse
from app.Users.schemas import CreateUserRequest, UserResponse
from app.Users.services import UserService
from app.Auth.services import AuthService
from app.Security.dependencies import get_current_active_user
from app.Users.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description=(
        "Self-registration endpoint. Registers a new user on the platform "
        "with a specified system role (ADMIN, FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER, FINANCIAL_ANALYST)."
    )
)
def register(request: CreateUserRequest, db: Session = Depends(get_db)):
    return UserService.register_user(db, request)


from fastapi.security import OAuth2PasswordRequestForm


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login (JSON)",
    description=(
        "Authenticate user with email and password using JSON payloads. "
        "Intended for standard REST clients (React, Flutter, mobile, etc.)."
    )
)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return AuthService.login_user(db, request)


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="OAuth2 Token (Form Data)",
    description=(
        "OAuth2-compliant token generation endpoint using application/x-www-form-urlencoded form data. "
        "Allows seamless Swagger UI Authorization."
    )
)
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    login_req = LoginRequest(email=form_data.username, password=form_data.password)
    return AuthService.login_user(db, login_req)


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user details",
    description=(
        "Retrieve details of the currently authenticated active user "
        "from the JWT token."
    )
)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
