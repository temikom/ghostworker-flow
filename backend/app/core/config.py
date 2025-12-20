"""
Application configuration settings.
Uses pydantic-settings for environment variable management.
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "GhostWorker"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@ghostworker.app"
    SMTP_FROM_NAME: str = "GhostWorker"
    
    # Email Verification
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 15
    
    # OAuth Providers
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    FACEBOOK_CLIENT_ID: str = ""
    FACEBOOK_CLIENT_SECRET: str = ""
    
    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Rate Limiting (default for free tier)
    RATE_LIMIT_PER_MINUTE: int = 60
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10
    API_RATE_LIMIT_PER_MINUTE: int = 100
    
    # Plan-based rate limits
    RATE_LIMIT_FREE: int = 60
    RATE_LIMIT_PRO: int = 200
    RATE_LIMIT_BUSINESS: int = 500
    RATE_LIMIT_ENTERPRISE: int = 1000
    
    # Security Alerts
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 30
    
    # Paystack
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""
    PAYSTACK_WEBHOOK_SECRET: str = ""
    
    # Coinbase Commerce
    COINBASE_COMMERCE_API_KEY: str = ""
    COINBASE_WEBHOOK_SECRET: str = ""
    
    # OpenAI (GPT-4 & Whisper)
    OPENAI_API_KEY: str = ""
    
    # Twilio (Voice/Video)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_API_KEY: str = ""
    TWILIO_API_SECRET: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_TWIML_APP_SID: str = ""
    
    # CRM - Salesforce
    SALESFORCE_CLIENT_ID: str = ""
    SALESFORCE_CLIENT_SECRET: str = ""
    
    # CRM - HubSpot
    HUBSPOT_CLIENT_ID: str = ""
    HUBSPOT_CLIENT_SECRET: str = ""
    
    # CRM - Pipedrive
    PIPEDRIVE_CLIENT_ID: str = ""
    PIPEDRIVE_CLIENT_SECRET: str = ""
    
    # CRM - Zoho
    ZOHO_CLIENT_ID: str = ""
    ZOHO_CLIENT_SECRET: str = ""
    
    # Blockchain (Polygon)
    BLOCKCHAIN_NETWORK: str = "polygon"
    POLYGON_RPC_URL: str = "https://polygon-rpc.com"
    BLOCKCHAIN_PRIVATE_KEY: str = ""
    AUDIT_CONTRACT_ADDRESS: str = ""
    POLYGONSCAN_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
