"""
Notification preferences and webhook models.
"""
import enum
from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class NotificationChannel(str, enum.Enum):
    """Notification delivery channels."""
    EMAIL = "email"
    IN_APP = "in_app"
    WEBHOOK = "webhook"


class NotificationCategory(str, enum.Enum):
    """Categories of notifications."""
    SECURITY = "security"
    BILLING = "billing"
    TEAM = "team"
    MESSAGES = "messages"
    INTEGRATIONS = "integrations"
    UPDATES = "updates"
    MARKETING = "marketing"


class EmailNotificationPreference(Base):
    """User email notification preferences."""
    __tablename__ = "email_notification_preferences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    
    # Security notifications
    security_alerts = Column(Boolean, default=True, nullable=False)
    new_login_alerts = Column(Boolean, default=True, nullable=False)
    password_changes = Column(Boolean, default=True, nullable=False)
    
    # Billing notifications
    payment_receipts = Column(Boolean, default=True, nullable=False)
    payment_failures = Column(Boolean, default=True, nullable=False)
    subscription_changes = Column(Boolean, default=True, nullable=False)
    usage_alerts = Column(Boolean, default=True, nullable=False)
    
    # Team notifications
    team_invites = Column(Boolean, default=True, nullable=False)
    team_member_joined = Column(Boolean, default=True, nullable=False)
    role_changes = Column(Boolean, default=True, nullable=False)
    
    # Message notifications
    new_messages = Column(Boolean, default=True, nullable=False)
    message_digest = Column(Boolean, default=False, nullable=False)
    digest_frequency = Column(String(20), default="daily", nullable=False)  # daily, weekly
    
    # Integration notifications
    integration_errors = Column(Boolean, default=True, nullable=False)
    integration_connected = Column(Boolean, default=True, nullable=False)
    
    # Marketing
    product_updates = Column(Boolean, default=True, nullable=False)
    tips_and_tutorials = Column(Boolean, default=False, nullable=False)
    promotional_emails = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WebhookStatus(str, enum.Enum):
    """Webhook status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    FAILED = "failed"


class Webhook(Base):
    """User webhook configurations."""
    __tablename__ = "webhooks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    secret = Column(String(255), nullable=True)  # For signature verification
    
    status = Column(Enum(WebhookStatus), default=WebhookStatus.ACTIVE, nullable=False)
    
    # Event subscriptions
    events = Column(Text, nullable=False)  # JSON array of event types
    
    # Stats
    total_deliveries = Column(Integer, default=0, nullable=False)
    successful_deliveries = Column(Integer, default=0, nullable=False)
    failed_deliveries = Column(Integer, default=0, nullable=False)
    last_delivery_at = Column(DateTime, nullable=True)
    last_failure_at = Column(DateTime, nullable=True)
    last_failure_reason = Column(Text, nullable=True)
    
    # Retry configuration
    max_retries = Column(Integer, default=3, nullable=False)
    retry_delay_seconds = Column(Integer, default=60, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WebhookDelivery(Base):
    """Log of webhook deliveries."""
    __tablename__ = "webhook_deliveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(
        UUID(as_uuid=True),
        ForeignKey("webhooks.id", ondelete="CASCADE"),
        nullable=False
    )
    
    event_type = Column(String(50), nullable=False)
    payload = Column(Text, nullable=False)  # JSON
    
    # Response
    status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    
    # Timing
    duration_ms = Column(Integer, nullable=True)
    
    # Retry info
    attempt_number = Column(Integer, default=1, nullable=False)
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    delivered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
