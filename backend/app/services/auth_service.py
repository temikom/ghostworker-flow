"""
Authentication service - core auth logic.
"""
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    AccountLockedError,
    AuthenticationError,
    ConflictError,
    EmailNotVerifiedError,
    NotFoundError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_verification_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.redis import redis_service
from app.models.user import (
    AppRole,
    OAuthAccount,
    OAuthProvider,
    SecurityEvent,
    SecurityEventType,
    User,
    UserRole,
)
from app.schemas.auth import (
    EmailCheckResponse,
    LoginRequest,
    SignupRequest,
    TokenPair,
)
from app.services.email_service import email_service


class AuthService:
    """Authentication service."""
    
    async def check_email(self, db: Session, email: str) -> EmailCheckResponse:
        """Check if email exists and what auth methods are available."""
        user = db.query(User).filter(User.email == email.lower()).first()
        
        if not user:
            return EmailCheckResponse(exists=False, has_password=False, providers=[])
        
        # Get linked OAuth providers
        oauth_accounts = db.query(OAuthAccount).filter(
            OAuthAccount.user_id == user.id
        ).all()
        providers = [acc.provider.value for acc in oauth_accounts]
        
        return EmailCheckResponse(
            exists=True,
            has_password=user.hashed_password is not None,
            providers=providers
        )
    
    async def signup(
        self,
        db: Session,
        request: SignupRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[User, str]:
        """
        Register a new user.
        Returns (user, verification_token).
        """
        # Validate passwords match
        if request.password != request.confirm_password:
            raise ValidationError("Passwords do not match")
        
        # Validate password strength
        self._validate_password_strength(request.password)
        
        # Check if email already exists
        existing = db.query(User).filter(
            User.email == request.email.lower()
        ).first()
        
        if existing:
            raise ConflictError("An account with this email already exists")
        
        # Create user
        user = User(
            email=request.email.lower(),
            hashed_password=hash_password(request.password),
            first_name=request.first_name,
            last_name=request.last_name,
            is_email_verified=False,
            is_active=True
        )
        
        db.add(user)
        db.flush()  # Get user ID
        
        # Assign default role
        user_role = UserRole(
            user_id=user.id,
            role=AppRole.USER
        )
        db.add(user_role)
        
        # Create verification token
        verification_token = create_verification_token()
        
        # Store verification token in Redis
        await redis_service.store_verification_token(
            token=verification_token,
            user_id=str(user.id),
            expire_minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES
        )
        
        # Log security event
        self._log_security_event(
            db=db,
            user_id=user.id,
            event_type=SecurityEventType.EMAIL_VERIFICATION_SENT,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.commit()
        
        # Send verification email (async)
        await email_service.send_verification_email(
            to_email=user.email,
            user_name=user.full_name,
            verification_token=verification_token
        )
        
        return user, verification_token
    
    async def login(
        self,
        db: Session,
        request: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> TokenPair:
        """
        Authenticate user with email and password.
        Returns access and refresh tokens.
        """
        email = request.email.lower()
        
        # Check if account is locked
        is_locked = await redis_service.is_account_locked(
            email,
            settings.MAX_FAILED_LOGIN_ATTEMPTS
        )
        if is_locked:
            raise AccountLockedError()
        
        # Find user
        user = db.query(User).filter(User.email == email).first()
        
        if not user or not user.hashed_password:
            await self._handle_failed_login(db, email, ip_address, user_agent)
            raise AuthenticationError("Invalid email or password")
        
        # Verify password
        if not verify_password(request.password, user.hashed_password):
            await self._handle_failed_login(
                db, email, ip_address, user_agent, user.id
            )
            raise AuthenticationError("Invalid email or password")
        
        # Check if account is active
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        
        # Check email verification
        if not user.is_email_verified:
            raise EmailNotVerifiedError()
        
        # Clear failed login attempts
        await redis_service.clear_failed_logins(email)
        
        # Check for new device/IP
        await self._check_new_device_ip(
            db, user, ip_address, user_agent, request.device_fingerprint
        )
        
        # Create tokens
        tokens = self._create_token_pair(user)
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        
        # Log security event
        self._log_security_event(
            db=db,
            user_id=user.id,
            event_type=SecurityEventType.LOGIN_SUCCESS,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"device_fingerprint": request.device_fingerprint}
        )
        
        db.commit()
        
        return tokens
    
    async def verify_email(
        self,
        db: Session,
        token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> User:
        """Verify user email with token."""
        # Get token from Redis
        token_data = await redis_service.get_verification_token(token)
        
        if not token_data:
            raise ValidationError("Invalid or expired verification token")
        
        if token_data.get("used"):
            raise ValidationError("Verification token has already been used")
        
        user_id = token_data["user_id"]
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        
        if not user:
            raise NotFoundError("User not found")
        
        if user.is_email_verified:
            raise ValidationError("Email is already verified")
        
        # Mark email as verified
        user.is_email_verified = True
        user.email_verified_at = datetime.utcnow()
        
        # Mark token as used
        await redis_service.mark_verification_used(token)
        
        # Log security event
        self._log_security_event(
            db=db,
            user_id=user.id,
            event_type=SecurityEventType.EMAIL_VERIFIED,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.commit()
        
        return user
    
    async def resend_verification(
        self,
        db: Session,
        email: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Resend verification email."""
        user = db.query(User).filter(User.email == email.lower()).first()
        
        if not user:
            # Don't reveal if user exists
            return True
        
        if user.is_email_verified:
            raise ValidationError("Email is already verified")
        
        # Create new verification token
        verification_token = create_verification_token()
        
        # Store in Redis
        await redis_service.store_verification_token(
            token=verification_token,
            user_id=str(user.id),
            expire_minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES
        )
        
        # Log security event
        self._log_security_event(
            db=db,
            user_id=user.id,
            event_type=SecurityEventType.EMAIL_VERIFICATION_SENT,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.commit()
        
        # Send email
        await email_service.send_verification_email(
            to_email=user.email,
            user_name=user.full_name,
            verification_token=verification_token
        )
        
        return True
    
    async def refresh_tokens(self, db: Session, refresh_token: str) -> TokenPair:
        """Refresh access token using refresh token."""
        payload = decode_token(refresh_token)
        
        if not payload:
            raise AuthenticationError("Invalid refresh token")
        
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")
        
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")
        
        return self._create_token_pair(user)
    
    async def logout(
        self,
        db: Session,
        user_id: UUID,
        refresh_token: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Logout user and invalidate refresh token."""
        # In production, add refresh token to blacklist in Redis
        
        self._log_security_event(
            db=db,
            user_id=user_id,
            event_type=SecurityEventType.LOGOUT,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.commit()
        return True
    
    async def request_password_reset(
        self,
        db: Session,
        email: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Request password reset."""
        user = db.query(User).filter(User.email == email.lower()).first()
        
        if not user:
            # Don't reveal if user exists
            return True
        
        # Create reset token
        reset_token = create_verification_token()
        
        # Store in Redis (expires in 1 hour)
        await redis_service.set(
            f"password_reset:{reset_token}",
            {"user_id": str(user.id), "used": False},
            timedelta(hours=1)
        )
        
        # Log security event
        self._log_security_event(
            db=db,
            user_id=user.id,
            event_type=SecurityEventType.PASSWORD_RESET_REQUESTED,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.commit()
        
        # Send reset email
        await email_service.send_password_reset_email(
            to_email=user.email,
            user_name=user.full_name,
            reset_token=reset_token
        )
        
        return True
    
    async def reset_password(
        self,
        db: Session,
        token: str,
        new_password: str,
        confirm_password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Reset password with token."""
        if new_password != confirm_password:
            raise ValidationError("Passwords do not match")
        
        self._validate_password_strength(new_password)
        
        # Get token from Redis
        token_data = await redis_service.get_json(f"password_reset:{token}")
        
        if not token_data or token_data.get("used"):
            raise ValidationError("Invalid or expired reset token")
        
        user_id = token_data["user_id"]
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        
        if not user:
            raise NotFoundError("User not found")
        
        # Update password
        user.hashed_password = hash_password(new_password)
        user.password_changed_at = datetime.utcnow()
        
        # Mark token as used
        token_data["used"] = True
        await redis_service.set(f"password_reset:{token}", token_data, timedelta(hours=1))
        
        # Log security event
        self._log_security_event(
            db=db,
            user_id=user.id,
            event_type=SecurityEventType.PASSWORD_RESET_COMPLETED,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.commit()
        
        # Send security alert
        await email_service.send_security_alert(
            to_email=user.email,
            user_name=user.full_name,
            event_type="password_changed",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return True
    
    def _create_token_pair(self, user: User) -> TokenPair:
        """Create access and refresh token pair."""
        # Get user roles
        roles = [r.role.value for r in user.roles]
        
        access_token = create_access_token(
            subject=str(user.id),
            additional_claims={"roles": roles, "email": user.email}
        )
        
        refresh_token, expires_at = create_refresh_token(str(user.id))
        
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    def _validate_password_strength(self, password: str) -> None:
        """Validate password meets requirements."""
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters")
        
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if errors:
            raise ValidationError("; ".join(errors))
    
    async def _handle_failed_login(
        self,
        db: Session,
        email: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
        user_id: Optional[UUID] = None
    ) -> None:
        """Handle failed login attempt."""
        count, is_locked = await redis_service.record_failed_login(
            email,
            settings.MAX_FAILED_LOGIN_ATTEMPTS,
            settings.ACCOUNT_LOCKOUT_MINUTES
        )
        
        if user_id:
            event_type = (
                SecurityEventType.ACCOUNT_LOCKED
                if is_locked
                else SecurityEventType.LOGIN_FAILED
            )
            
            self._log_security_event(
                db=db,
                user_id=user_id,
                event_type=event_type,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"attempt_count": count}
            )
            
            db.commit()
            
            if is_locked:
                # Get user for email alert
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    await email_service.send_security_alert(
                        to_email=user.email,
                        user_name=user.full_name,
                        event_type="account_locked",
                        ip_address=ip_address,
                        user_agent=user_agent
                    )
    
    async def _check_new_device_ip(
        self,
        db: Session,
        user: User,
        ip_address: Optional[str],
        user_agent: Optional[str],
        device_fingerprint: Optional[str]
    ) -> None:
        """Check for new device or IP and send alert."""
        # Check recent login history
        recent_events = db.query(SecurityEvent).filter(
            SecurityEvent.user_id == user.id,
            SecurityEvent.event_type == SecurityEventType.LOGIN_SUCCESS,
            SecurityEvent.created_at >= datetime.utcnow() - timedelta(days=30)
        ).all()
        
        known_ips = {e.ip_address for e in recent_events if e.ip_address}
        known_fingerprints = {
            e.device_fingerprint for e in recent_events if e.device_fingerprint
        }
        
        is_new_ip = ip_address and ip_address not in known_ips
        is_new_device = (
            device_fingerprint and device_fingerprint not in known_fingerprints
        )
        
        if is_new_ip or is_new_device:
            event_type = (
                SecurityEventType.NEW_DEVICE_LOGIN
                if is_new_device
                else SecurityEventType.NEW_IP_LOGIN
            )
            
            self._log_security_event(
                db=db,
                user_id=user.id,
                event_type=event_type,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"device_fingerprint": device_fingerprint}
            )
            
            # Send security alert
            await email_service.send_security_alert(
                to_email=user.email,
                user_name=user.full_name,
                event_type="new_login" if is_new_ip else "new_device",
                ip_address=ip_address,
                user_agent=user_agent
            )
    
    def _log_security_event(
        self,
        db: Session,
        user_id: UUID,
        event_type: SecurityEventType,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> SecurityEvent:
        """Log a security event."""
        event = SecurityEvent(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            metadata=json.dumps(metadata) if metadata else None
        )
        db.add(event)
        return event


auth_service = AuthService()
