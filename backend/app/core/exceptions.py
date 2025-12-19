"""
Custom exceptions for the application.
"""
from typing import Any, Dict, Optional

from fastapi import HTTPException, status


class GhostWorkerException(HTTPException):
    """Base exception for GhostWorker."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class AuthenticationError(GhostWorkerException):
    """Authentication failed."""
    
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationError(GhostWorkerException):
    """User not authorized for this action."""
    
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class NotFoundError(GhostWorkerException):
    """Resource not found."""
    
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class ConflictError(GhostWorkerException):
    """Resource already exists."""
    
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class ValidationError(GhostWorkerException):
    """Validation failed."""
    
    def __init__(self, detail: str = "Validation error"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class RateLimitError(GhostWorkerException):
    """Rate limit exceeded."""
    
    def __init__(self, detail: str = "Rate limit exceeded. Please try again later."):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail
        )


class AccountLockedError(GhostWorkerException):
    """Account is locked due to too many failed attempts."""
    
    def __init__(self, detail: str = "Account is temporarily locked. Please try again later."):
        super().__init__(
            status_code=status.HTTP_423_LOCKED,
            detail=detail
        )


class EmailNotVerifiedError(GhostWorkerException):
    """Email not verified."""
    
    def __init__(self, detail: str = "Email not verified. Please verify your email first."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )
