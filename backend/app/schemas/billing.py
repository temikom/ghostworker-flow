"""
Billing and payment schemas.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


class PlanResponse(BaseModel):
    """Plan response."""
    id: str
    tier: str
    name: str
    description: Optional[str]
    price_monthly: Decimal
    price_yearly: Decimal
    currency: str
    conversations_limit: int
    messages_per_month: int
    integrations_limit: int
    team_members_limit: int
    api_calls_limit: int
    storage_mb: int
    rate_limit_per_minute: int
    features: Optional[List[str]]
    is_popular: bool

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    """Subscription response."""
    id: str
    plan_id: str
    plan: PlanResponse
    status: str
    billing_cycle: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    canceled_at: Optional[datetime]
    trial_start: Optional[datetime]
    trial_end: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class UsageResponse(BaseModel):
    """Usage statistics response."""
    conversations: int
    messages: int
    api_calls: int
    storage_used_mb: int
    period_start: datetime
    period_end: datetime

    # Limits from plan
    conversations_limit: int
    messages_limit: int
    api_calls_limit: int
    storage_limit_mb: int


class PaymentResponse(BaseModel):
    """Payment response."""
    id: str
    provider: str
    amount: Decimal
    currency: str
    status: str
    payment_type: str
    description: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    """Invoice response."""
    id: str
    invoice_number: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    status: str
    billing_name: Optional[str]
    billing_email: Optional[str]
    line_items: Optional[List[dict]]
    pdf_url: Optional[str]
    issued_at: datetime
    due_at: Optional[datetime]
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True


# Paystack schemas
class PaystackInitializeRequest(BaseModel):
    """Initialize Paystack payment."""
    plan_tier: str
    billing_cycle: str = "monthly"  # monthly or yearly
    callback_url: Optional[str] = None


class PaystackInitializeResponse(BaseModel):
    """Paystack initialization response."""
    authorization_url: str
    access_code: str
    reference: str


class PaystackVerifyResponse(BaseModel):
    """Paystack verification response."""
    success: bool
    message: str
    subscription: Optional[SubscriptionResponse]


# Coinbase Commerce schemas
class CoinbaseChargeRequest(BaseModel):
    """Create Coinbase Commerce charge."""
    plan_tier: str
    billing_cycle: str = "monthly"
    redirect_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CoinbaseChargeResponse(BaseModel):
    """Coinbase Commerce charge response."""
    charge_id: str
    hosted_url: str
    expires_at: datetime


class CoinbaseVerifyResponse(BaseModel):
    """Coinbase Commerce verification response."""
    success: bool
    message: str
    subscription: Optional[SubscriptionResponse]


# Subscription management
class SubscriptionCancelRequest(BaseModel):
    """Cancel subscription request."""
    cancel_immediately: bool = False
    reason: Optional[str] = None


class SubscriptionUpgradeRequest(BaseModel):
    """Upgrade subscription request."""
    plan_tier: str
    billing_cycle: str = "monthly"
    provider: str = "paystack"  # paystack or coinbase
