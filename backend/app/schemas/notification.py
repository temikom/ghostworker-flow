"""
Notification and webhook schemas.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class EmailPreferencesBase(BaseModel):
    """Base email preferences."""
    # Security
    security_alerts: bool = True
    new_login_alerts: bool = True
    password_changes: bool = True
    
    # Billing
    payment_receipts: bool = True
    payment_failures: bool = True
    subscription_changes: bool = True
    usage_alerts: bool = True
    
    # Team
    team_invites: bool = True
    team_member_joined: bool = True
    role_changes: bool = True
    
    # Messages
    new_messages: bool = True
    message_digest: bool = False
    digest_frequency: str = "daily"
    
    # Integrations
    integration_errors: bool = True
    integration_connected: bool = True
    
    # Marketing
    product_updates: bool = True
    tips_and_tutorials: bool = False
    promotional_emails: bool = False


class EmailPreferencesUpdate(EmailPreferencesBase):
    """Update email preferences request."""
    pass


class EmailPreferencesResponse(EmailPreferencesBase):
    """Email preferences response."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Webhook schemas
class WebhookEventType(BaseModel):
    """Webhook event type."""
    id: str
    name: str
    description: str
    category: str


AVAILABLE_WEBHOOK_EVENTS = [
    WebhookEventType(id="message.created", name="New Message", description="When a new message is received", category="messages"),
    WebhookEventType(id="message.updated", name="Message Updated", description="When a message is edited", category="messages"),
    WebhookEventType(id="conversation.created", name="New Conversation", description="When a new conversation starts", category="conversations"),
    WebhookEventType(id="conversation.closed", name="Conversation Closed", description="When a conversation is closed", category="conversations"),
    WebhookEventType(id="order.created", name="New Order", description="When a new order is created", category="orders"),
    WebhookEventType(id="order.updated", name="Order Updated", description="When an order status changes", category="orders"),
    WebhookEventType(id="integration.connected", name="Integration Connected", description="When an integration is connected", category="integrations"),
    WebhookEventType(id="integration.disconnected", name="Integration Disconnected", description="When an integration is disconnected", category="integrations"),
    WebhookEventType(id="team.member_joined", name="Member Joined", description="When a new team member joins", category="team"),
    WebhookEventType(id="team.member_left", name="Member Left", description="When a team member leaves", category="team"),
    WebhookEventType(id="billing.payment_succeeded", name="Payment Succeeded", description="When a payment is successful", category="billing"),
    WebhookEventType(id="billing.payment_failed", name="Payment Failed", description="When a payment fails", category="billing"),
    WebhookEventType(id="billing.subscription_updated", name="Subscription Updated", description="When subscription changes", category="billing"),
]


class WebhookCreate(BaseModel):
    """Create webhook request."""
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    secret: Optional[str] = None
    events: List[str] = Field(..., min_length=1)
    max_retries: int = Field(default=3, ge=0, le=10)
    retry_delay_seconds: int = Field(default=60, ge=10, le=3600)


class WebhookUpdate(BaseModel):
    """Update webhook request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    secret: Optional[str] = None
    events: Optional[List[str]] = None
    status: Optional[str] = None
    max_retries: Optional[int] = Field(None, ge=0, le=10)
    retry_delay_seconds: Optional[int] = Field(None, ge=10, le=3600)


class WebhookResponse(BaseModel):
    """Webhook response."""
    id: str
    name: str
    url: str
    status: str
    events: List[str]
    total_deliveries: int
    successful_deliveries: int
    failed_deliveries: int
    last_delivery_at: Optional[datetime]
    last_failure_at: Optional[datetime]
    last_failure_reason: Optional[str]
    max_retries: int
    retry_delay_seconds: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class WebhookDeliveryResponse(BaseModel):
    """Webhook delivery log response."""
    id: str
    webhook_id: str
    event_type: str
    status_code: Optional[int]
    duration_ms: Optional[int]
    attempt_number: int
    success: bool
    error_message: Optional[str]
    delivered_at: datetime

    class Config:
        from_attributes = True


class WebhookTestRequest(BaseModel):
    """Test webhook request."""
    event_type: str = "test.ping"


class WebhookTestResponse(BaseModel):
    """Test webhook response."""
    success: bool
    status_code: Optional[int]
    response_time_ms: int
    error: Optional[str]
