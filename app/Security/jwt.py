from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from jose import jwt, JWTError, ExpiredSignatureError
from loguru import logger
from fastapi import HTTPException, status

from app.Utils.config import settings


def create_access_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT access token.
    Injects an expiration timestamp.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any] | None:
    """
    Decode and return JWT payload. Returns None if decoding fails or token is invalid/expired.
    Does not raise exceptions.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        logger.warning("JWT token signature has expired")
        return None
    except JWTError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify and return JWT payload, raising HTTPException 401 on failure.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        logger.warning("JWT token verification failed: Token signature has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.warning(f"JWT token verification failed: Invalid token: {e}")
        raise credentials_exception
