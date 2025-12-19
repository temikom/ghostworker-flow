"""
OAuth service for handling OAuth authentication flows.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ValidationError
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
from app.schemas.auth import OAuthUrlResponse, TokenPair
from app.services.auth_service import auth_service


class OAuthService:
    """OAuth authentication service."""
    
    # OAuth provider configurations
    PROVIDERS = {
        OAuthProvider.GOOGLE: {
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
            "scopes": ["openid", "email", "profile"],
        },
        OAuthProvider.MICROSOFT: {
            "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "userinfo_url": "https://graph.microsoft.com/v1.0/me",
            "scopes": ["openid", "email", "profile", "User.Read"],
        },
        OAuthProvider.FACEBOOK: {
            "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
            "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
            "userinfo_url": "https://graph.facebook.com/me?fields=id,name,email,picture",
            "scopes": ["email", "public_profile"],
        },
    }
    
    def get_auth_url(self, provider: OAuthProvider) -> OAuthUrlResponse:
        """Generate OAuth authorization URL."""
        config = self.PROVIDERS.get(provider)
        if not config:
            raise ValidationError(f"Unsupported OAuth provider: {provider}")
        
        client_id = self._get_client_id(provider)
        if not client_id:
            raise ValidationError(f"OAuth provider {provider} not configured")
        
        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)
        
        # Build authorization URL
        redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/{provider.value}"
        scopes = " ".join(config["scopes"])
        
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": scopes,
            "state": state,
        }
        
        # Add provider-specific params
        if provider == OAuthProvider.GOOGLE:
            params["access_type"] = "offline"
            params["prompt"] = "consent"
        
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{config['auth_url']}?{query_string}"
        
        return OAuthUrlResponse(url=url, state=state)
    
    async def handle_callback(
        self,
        db: Session,
        provider: OAuthProvider,
        code: str,
        state: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_fingerprint: Optional[str] = None
    ) -> Tuple[User, TokenPair]:
        """Handle OAuth callback and authenticate user."""
        # Exchange code for tokens
        tokens = await self._exchange_code(provider, code)
        
        # Get user info from provider
        user_info = await self._get_user_info(provider, tokens["access_token"])
        
        # Find or create user
        user = await self._find_or_create_user(
            db=db,
            provider=provider,
            user_info=user_info,
            tokens=tokens,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Create auth tokens
        auth_tokens = auth_service._create_token_pair(user)
        
        return user, auth_tokens
    
    async def _exchange_code(
        self,
        provider: OAuthProvider,
        code: str
    ) -> dict:
        """Exchange authorization code for tokens."""
        config = self.PROVIDERS[provider]
        client_id = self._get_client_id(provider)
        client_secret = self._get_client_secret(provider)
        redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/{provider.value}"
        
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["token_url"],
                data=data,
                headers={"Accept": "application/json"}
            )
            
            if response.status_code != 200:
                raise AuthenticationError(f"OAuth token exchange failed: {response.text}")
            
            return response.json()
    
    async def _get_user_info(
        self,
        provider: OAuthProvider,
        access_token: str
    ) -> dict:
        """Get user info from OAuth provider."""
        config = self.PROVIDERS[provider]
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                config["userinfo_url"],
                headers=headers
            )
            
            if response.status_code != 200:
                raise AuthenticationError("Failed to get user info from OAuth provider")
            
            data = response.json()
            
            # Normalize user info across providers
            return self._normalize_user_info(provider, data)
    
    def _normalize_user_info(self, provider: OAuthProvider, data: dict) -> dict:
        """Normalize user info to common format."""
        if provider == OAuthProvider.GOOGLE:
            return {
                "id": data["id"],
                "email": data["email"],
                "name": data.get("name"),
                "first_name": data.get("given_name"),
                "last_name": data.get("family_name"),
                "avatar_url": data.get("picture"),
            }
        elif provider == OAuthProvider.MICROSOFT:
            return {
                "id": data["id"],
                "email": data.get("mail") or data.get("userPrincipalName"),
                "name": data.get("displayName"),
                "first_name": data.get("givenName"),
                "last_name": data.get("surname"),
                "avatar_url": None,  # Requires separate API call
            }
        elif provider == OAuthProvider.FACEBOOK:
            return {
                "id": data["id"],
                "email": data.get("email"),
                "name": data.get("name"),
                "first_name": None,
                "last_name": None,
                "avatar_url": data.get("picture", {}).get("data", {}).get("url"),
            }
        
        return data
    
    async def _find_or_create_user(
        self,
        db: Session,
        provider: OAuthProvider,
        user_info: dict,
        tokens: dict,
        ip_address: Optional[str],
        user_agent: Optional[str]
    ) -> User:
        """Find existing user or create new one from OAuth data."""
        email = user_info.get("email")
        if not email:
            raise AuthenticationError("Email not provided by OAuth provider")
        
        email = email.lower()
        provider_user_id = str(user_info["id"])
        
        # Check if OAuth account already linked
        oauth_account = db.query(OAuthAccount).filter(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id
        ).first()
        
        if oauth_account:
            # Update tokens
            oauth_account.access_token = tokens.get("access_token")
            oauth_account.refresh_token = tokens.get("refresh_token")
            if tokens.get("expires_in"):
                oauth_account.token_expires_at = datetime.utcnow() + timedelta(
                    seconds=tokens["expires_in"]
                )
            
            user = oauth_account.user
            user.last_login_at = datetime.utcnow()
            
            db.commit()
            return user
        
        # Check if user exists with this email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user
            user = User(
                email=email,
                first_name=user_info.get("first_name"),
                last_name=user_info.get("last_name"),
                avatar_url=user_info.get("avatar_url"),
                is_email_verified=True,  # Email verified by OAuth provider
                email_verified_at=datetime.utcnow(),
                is_active=True
            )
            db.add(user)
            db.flush()
            
            # Assign default role
            user_role = UserRole(user_id=user.id, role=AppRole.USER)
            db.add(user_role)
        
        # Link OAuth account
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email,
            access_token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
        )
        
        if tokens.get("expires_in"):
            oauth_account.token_expires_at = datetime.utcnow() + timedelta(
                seconds=tokens["expires_in"]
            )
        
        db.add(oauth_account)
        
        # Log security event
        event = SecurityEvent(
            user_id=user.id,
            event_type=SecurityEventType.OAUTH_CONNECTED,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=f'{{"provider": "{provider.value}"}}'
        )
        db.add(event)
        
        user.last_login_at = datetime.utcnow()
        db.commit()
        
        return user
    
    def _get_client_id(self, provider: OAuthProvider) -> Optional[str]:
        """Get OAuth client ID for provider."""
        if provider == OAuthProvider.GOOGLE:
            return settings.GOOGLE_CLIENT_ID
        elif provider == OAuthProvider.MICROSOFT:
            return settings.MICROSOFT_CLIENT_ID
        elif provider == OAuthProvider.FACEBOOK:
            return settings.FACEBOOK_CLIENT_ID
        return None
    
    def _get_client_secret(self, provider: OAuthProvider) -> Optional[str]:
        """Get OAuth client secret for provider."""
        if provider == OAuthProvider.GOOGLE:
            return settings.GOOGLE_CLIENT_SECRET
        elif provider == OAuthProvider.MICROSOFT:
            return settings.MICROSOFT_CLIENT_SECRET
        elif provider == OAuthProvider.FACEBOOK:
            return settings.FACEBOOK_CLIENT_SECRET
        return None


oauth_service = OAuthService()
