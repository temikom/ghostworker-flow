"""
Authentication schemas.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import OAuthProvider


class TokenPair(BaseModel):
    """Access and refresh token pair."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # user_id
    exp: datetime
    iat: datetime
    type: str  # "access" or "refresh"
    jti: Optional[str] = None  # JWT ID for refresh token


class LoginRequest(BaseModel):
    """Login request - step 2 after email validation."""
    email: EmailStr
    password: str = Field(..., min_length=1)
    device_fingerprint: Optional[str] = None


class EmailCheckRequest(BaseModel):
    """Email check request - step 1."""
    email: EmailStr


class EmailCheckResponse(BaseModel):
    """Email check response."""
    exists: bool
    has_password: bool  # For OAuth users without password
    providers: list[str] = []  # OAuth providers linked


class SignupRequest(BaseModel):
    """Signup request."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    device_fingerprint: Optional[str] = None


class SignupResponse(BaseModel):
    """Signup response."""
    user_id: str
    email: str
    message: str
    verification_required: bool = True


class EmailVerificationRequest(BaseModel):
    """Email verification request."""
    token: str


class EmailVerificationResponse(BaseModel):
    """Email verification response."""
    success: bool
    message: str


class ResendVerificationRequest(BaseModel):
    """Resend verification email request."""
    email: EmailStr


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request."""
    provider: OAuthProvider
    code: str
    state: Optional[str] = None
    device_fingerprint: Optional[str] = None


class OAuthUrlResponse(BaseModel):
    """OAuth URL response."""
    url: str
    state: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class LogoutRequest(BaseModel):
    """Logout request."""
    refresh_token: Optional[str] = None
    all_devices: bool = False
