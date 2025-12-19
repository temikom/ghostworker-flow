"""
Authentication API routes.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_client_info, get_current_user, get_db
from app.models.user import User, OAuthProvider
from app.schemas.auth import (
    EmailCheckRequest, EmailCheckResponse, LoginRequest, SignupRequest,
    SignupResponse, TokenPair, EmailVerificationRequest, EmailVerificationResponse,
    ResendVerificationRequest, PasswordResetRequest, PasswordResetConfirm,
    OAuthCallbackRequest, OAuthUrlResponse, RefreshTokenRequest, LogoutRequest
)
from app.services.auth_service import auth_service
from app.services.oauth_service import oauth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/check-email", response_model=EmailCheckResponse)
async def check_email(request: EmailCheckRequest, db: Session = Depends(get_db)):
    """Step 1: Check if email exists and available auth methods."""
    return await auth_service.check_email(db, request.email)


@router.post("/signup", response_model=SignupResponse)
async def signup(request: SignupRequest, req: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    client = get_client_info(req)
    user, _ = await auth_service.signup(db, request, client["ip_address"], client["user_agent"])
    return SignupResponse(
        user_id=str(user.id), email=user.email,
        message="Verification email sent. Please check your inbox.",
        verification_required=True
    )


@router.post("/login", response_model=TokenPair)
async def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """Step 2: Authenticate with email and password."""
    client = get_client_info(req)
    return await auth_service.login(db, request, client["ip_address"], client["user_agent"])


@router.post("/verify-email", response_model=EmailVerificationResponse)
async def verify_email(request: EmailVerificationRequest, req: Request, db: Session = Depends(get_db)):
    """Verify email with token."""
    client = get_client_info(req)
    await auth_service.verify_email(db, request.token, client["ip_address"], client["user_agent"])
    return EmailVerificationResponse(success=True, message="Email verified successfully")


@router.post("/resend-verification")
async def resend_verification(request: ResendVerificationRequest, req: Request, db: Session = Depends(get_db)):
    """Resend verification email."""
    client = get_client_info(req)
    await auth_service.resend_verification(db, request.email, client["ip_address"], client["user_agent"])
    return {"message": "If the email exists, a verification link has been sent"}


@router.post("/refresh", response_model=TokenPair)
async def refresh_tokens(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token."""
    return await auth_service.refresh_tokens(db, request.refresh_token)


@router.post("/logout")
async def logout(request: LogoutRequest, req: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout current user."""
    client = get_client_info(req)
    await auth_service.logout(db, user.id, request.refresh_token, client["ip_address"], client["user_agent"])
    return {"message": "Logged out successfully"}


@router.post("/password-reset/request")
async def request_password_reset(request: PasswordResetRequest, req: Request, db: Session = Depends(get_db)):
    """Request password reset."""
    client = get_client_info(req)
    await auth_service.request_password_reset(db, request.email, client["ip_address"], client["user_agent"])
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(request: PasswordResetConfirm, req: Request, db: Session = Depends(get_db)):
    """Confirm password reset with token."""
    client = get_client_info(req)
    await auth_service.reset_password(db, request.token, request.new_password, request.confirm_password, client["ip_address"], client["user_agent"])
    return {"message": "Password reset successfully"}


@router.get("/oauth/{provider}/url", response_model=OAuthUrlResponse)
async def get_oauth_url(provider: OAuthProvider):
    """Get OAuth authorization URL."""
    return oauth_service.get_auth_url(provider)


@router.post("/oauth/callback", response_model=TokenPair)
async def oauth_callback(request: OAuthCallbackRequest, req: Request, db: Session = Depends(get_db)):
    """Handle OAuth callback."""
    client = get_client_info(req)
    _, tokens = await oauth_service.handle_callback(
        db, request.provider, request.code, request.state,
        client["ip_address"], client["user_agent"], request.device_fingerprint
    )
    return tokens
