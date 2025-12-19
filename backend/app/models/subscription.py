"""
Subscription and billing models.
"""
import enum
from datetime import datetime
from decimal import Decimal
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class PlanTier(str, enum.Enum):
    """Subscription plan tiers."""
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    """Subscription status."""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    PAUSED = "paused"


class PaymentProvider(str, enum.Enum):
    """Payment provider."""
    PAYSTACK = "paystack"
    COINBASE = "coinbase"


class PaymentStatus(str, enum.Enum):
    """Payment status."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELED = "canceled"


class Plan(Base):
    """Subscription plans."""
    __tablename__ = "plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tier = Column(Enum(PlanTier), unique=True, nullable=False)
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    
    # Pricing
    price_monthly = Column(Numeric(10, 2), nullable=False)
    price_yearly = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    
    # Paystack price IDs
    paystack_price_id_monthly = Column(String(100), nullable=True)
    paystack_price_id_yearly = Column(String(100), nullable=True)
    
    # Coinbase Commerce
    coinbase_product_id = Column(String(100), nullable=True)
    
    # Limits
    conversations_limit = Column(Integer, default=100, nullable=False)
    messages_per_month = Column(Integer, default=1000, nullable=False)
    integrations_limit = Column(Integer, default=1, nullable=False)
    team_members_limit = Column(Integer, default=1, nullable=False)
    api_calls_limit = Column(Integer, default=1000, nullable=False)
    storage_mb = Column(Integer, default=100, nullable=False)
    
    # Rate limiting
    rate_limit_per_minute = Column(Integer, default=60, nullable=False)
    auth_rate_limit_per_minute = Column(Integer, default=10, nullable=False)
    api_rate_limit_per_minute = Column(Integer, default=100, nullable=False)
    
    # Features
    features = Column(Text, nullable=True)  # JSON array
    is_popular = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Subscription(Base):
    """User subscriptions."""
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("plans.id"),
        nullable=False
    )
    
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    
    # Payment provider info
    payment_provider = Column(Enum(PaymentProvider), nullable=True)
    provider_subscription_id = Column(String(255), nullable=True)
    provider_customer_id = Column(String(255), nullable=True)
    
    # Billing
    billing_cycle = Column(String(10), default="monthly", nullable=False)  # monthly, yearly
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)
    canceled_at = Column(DateTime, nullable=True)
    
    # Trial
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    plan = relationship("Plan")


class Payment(Base):
    """Payment records."""
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    subscription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Payment details
    provider = Column(Enum(PaymentProvider), nullable=False)
    provider_payment_id = Column(String(255), nullable=True)
    provider_reference = Column(String(255), nullable=True)
    
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    
    # Payment type
    payment_type = Column(String(20), default="subscription", nullable=False)  # subscription, one_time
    description = Column(String(255), nullable=True)
    
    # Metadata
    metadata = Column(Text, nullable=True)  # JSON
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)


class Invoice(Base):
    """User invoices."""
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    payment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True
    )
    subscription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Invoice details
    invoice_number = Column(String(50), unique=True, nullable=False)
    
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax = Column(Numeric(10, 2), default=0, nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    
    status = Column(String(20), default="draft", nullable=False)  # draft, paid, void
    
    # Billing info
    billing_name = Column(String(200), nullable=True)
    billing_email = Column(String(255), nullable=True)
    billing_address = Column(Text, nullable=True)
    
    # Line items (JSON)
    line_items = Column(Text, nullable=True)
    
    # PDF
    pdf_url = Column(String(500), nullable=True)
    
    # Timestamps
    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)


class UsageRecord(Base):
    """Track user usage for billing."""
    __tablename__ = "usage_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Usage counts
    conversations = Column(Integer, default=0, nullable=False)
    messages = Column(Integer, default=0, nullable=False)
    api_calls = Column(Integer, default=0, nullable=False)
    storage_used_mb = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
