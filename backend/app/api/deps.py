"""
API dependencies for FastAPI.
"""
from typing import Optional
from uuid import UUID

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_token
from app.db.base import get_db
from app.models.user import AppRole, User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise AuthenticationError("Invalid access token")
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    
    if not user:
        raise AuthenticationError("User not found")
    
    if not user.is_active:
        raise AuthenticationError("User account is disabled")
    
    return user


async def get_current_verified_user(
    user: User = Depends(get_current_user)
) -> User:
    """Get current user with verified email."""
    if not user.is_email_verified:
        raise AuthorizationError("Email not verified")
    return user


async def require_admin(
    user: User = Depends(get_current_verified_user)
) -> User:
    """Require admin role."""
    if not user.has_role(AppRole.ADMIN):
        raise AuthorizationError("Admin access required")
    return user


def get_client_info(request: Request) -> dict:
    """Extract client info from request."""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "device_fingerprint": request.headers.get("x-device-fingerprint")
    }
