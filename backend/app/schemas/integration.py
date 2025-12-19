"""
Integration schemas.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.integration import IntegrationStatus, IntegrationType


class IntegrationBase(BaseModel):
    """Base integration schema."""
    name: str = Field(..., max_length=100)
    type: IntegrationType
    description: Optional[str] = None


class IntegrationCreate(IntegrationBase):
    """Integration creation schema."""
    credentials: Optional[dict] = None
    webhook_url: Optional[str] = None
    n8n_workflow_id: Optional[str] = None
    n8n_webhook_url: Optional[str] = None


class IntegrationUpdate(BaseModel):
    """Integration update schema."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    credentials: Optional[dict] = None
    webhook_url: Optional[str] = None
    n8n_workflow_id: Optional[str] = None
    n8n_webhook_url: Optional[str] = None


class IntegrationResponse(BaseModel):
    """Integration response schema."""
    id: UUID
    user_id: UUID
    name: str
    type: IntegrationType
    description: Optional[str]
    status: IntegrationStatus
    is_active: bool
    external_id: Optional[str]
    external_name: Optional[str]
    webhook_url: Optional[str]
    n8n_workflow_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    last_sync_at: Optional[datetime]
    last_error: Optional[str]
    error_count: int
    
    class Config:
        from_attributes = True


class IntegrationStats(BaseModel):
    """Integration statistics."""
    total_conversations: int
    active_conversations: int
    total_messages: int
    messages_today: int
    orders_extracted: int


class WebhookPayload(BaseModel):
    """Webhook payload for incoming messages."""
    integration_id: UUID
    event_type: str
    data: dict
    timestamp: Optional[datetime] = None
