from fastapi import Depends, HTTPException, status
from loguru import logger

from app.Security.dependencies import get_current_active_user
from app.Users.models import User
from app.Utils.constants import ROLE_ADMIN, ROLE_FLEET_MANAGER, ROLE_DISPATCHER, ROLE_SAFETY_OFFICER


def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have the ADMIN role.
    """
    if current_user.role is None or current_user.role.name != ROLE_ADMIN:
        logger.warning(
            f"Permission denied: User {current_user.id} requested ADMIN access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_fleet_manager(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have the FLEET_MANAGER role.
    """
    if current_user.role is None or current_user.role.name != ROLE_FLEET_MANAGER:
        logger.warning(
            f"Permission denied: User {current_user.id} requested FLEET_MANAGER access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_dispatcher(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have the DISPATCHER role.
    """
    if current_user.role is None or current_user.role.name != ROLE_DISPATCHER:
        logger.warning(
            f"Permission denied: User {current_user.id} requested DISPATCHER access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user
