from fastapi import Depends, HTTPException, status
from loguru import logger

from app.Security.dependencies import get_current_active_user
from app.Users.models import User
from app.Utils.constants import ROLE_ADMIN, ROLE_FLEET_MANAGER, ROLE_DISPATCHER, ROLE_SAFETY_OFFICER, ROLE_FINANCIAL_ANALYST


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


def require_admin_or_fleet_manager(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have either ADMIN or FLEET_MANAGER role.
    """
    if current_user.role is None or current_user.role.name not in [ROLE_ADMIN, ROLE_FLEET_MANAGER]:
        logger.warning(
            f"Permission denied: User {current_user.id} requested ADMIN/FLEET_MANAGER access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_admin_or_safety_officer(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have either ADMIN or SAFETY_OFFICER role.
    """
    if current_user.role is None or current_user.role.name not in [ROLE_ADMIN, ROLE_SAFETY_OFFICER]:
        logger.warning(
            f"Permission denied: User {current_user.id} requested admin/safety officer access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_admin_or_dispatcher(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have either ADMIN or DISPATCHER role.
    """
    if current_user.role is None or current_user.role.name not in [ROLE_ADMIN, ROLE_DISPATCHER]:
        logger.warning(
            f"Permission denied: User {current_user.id} requested ADMIN/DISPATCHER access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_maintenance_write(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to allow write operations on maintenance records.
    Allowed roles: ADMIN, FLEET_MANAGER.
    """
    if current_user.role is None or current_user.role.name not in [ROLE_ADMIN, ROLE_FLEET_MANAGER]:
        logger.warning(
            f"Permission denied: User {current_user.id} requested maintenance write access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_admin_or_financial_analyst(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have either ADMIN or FINANCIAL_ANALYST role.
    """
    if current_user.role is None or current_user.role.name not in [ROLE_ADMIN, ROLE_FINANCIAL_ANALYST]:
        logger.warning(
            f"Permission denied: User {current_user.id} requested ADMIN/FINANCIAL_ANALYST access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_maintenance_read(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to allow read operations on maintenance records.
    Allowed roles: ADMIN, FLEET_MANAGER, SAFETY_OFFICER, FINANCIAL_ANALYST.
    """
    allowed = [ROLE_ADMIN, ROLE_FLEET_MANAGER, ROLE_SAFETY_OFFICER, ROLE_FINANCIAL_ANALYST]
    if current_user.role is None or current_user.role.name not in allowed:
        logger.warning(
            f"Permission denied: User {current_user.id} requested maintenance read access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_analytics_access(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require the user to have analytics access.
    Allowed roles: ADMIN, FLEET_MANAGER, SAFETY_OFFICER, FINANCIAL_ANALYST.
    """
    allowed = [ROLE_ADMIN, ROLE_FLEET_MANAGER, ROLE_SAFETY_OFFICER, ROLE_FINANCIAL_ANALYST]
    if current_user.role is None or current_user.role.name not in allowed:
        logger.warning(
            f"Permission denied: User {current_user.id} requested analytics access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_notification_access(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require notification read access.
    Allowed roles: ADMIN, FLEET_MANAGER, SAFETY_OFFICER.
    """
    allowed = [ROLE_ADMIN, ROLE_FLEET_MANAGER, ROLE_SAFETY_OFFICER]
    if current_user.role is None or current_user.role.name not in allowed:
        logger.warning(
            f"Permission denied: User {current_user.id} requested notification read access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user


def require_notification_write_access(current_user: User = Depends(get_current_active_user)) -> User:
    """
    Dependency to require notification write/modification access.
    Allowed roles: ADMIN, FLEET_MANAGER.
    """
    allowed = [ROLE_ADMIN, ROLE_FLEET_MANAGER]
    if current_user.role is None or current_user.role.name not in allowed:
        logger.warning(
            f"Permission denied: User {current_user.id} requested notification write access but has role "
            f"{current_user.role.name if current_user.role else 'None'}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return current_user
