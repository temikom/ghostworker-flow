"""
Conversation and message schemas.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.conversation import (
    ConversationStatus,
    MessageDirection,
    MessageStatus,
    MessageType,
)


class MessageBase(BaseModel):
    """Base message schema."""
    type: MessageType = MessageType.TEXT
    content: Optional[str] = None
    media_url: Optional[str] = None


class MessageCreate(MessageBase):
    """Message creation schema."""
    conversation_id: UUID
    direction: MessageDirection = MessageDirection.OUTBOUND


class MessageResponse(BaseModel):
    """Message response schema."""
    id: UUID
    conversation_id: UUID
    type: MessageType
    direction: MessageDirection
    content: Optional[str]
    media_url: Optional[str]
    media_mime_type: Optional[str]
    media_filename: Optional[str]
    status: MessageStatus
    external_id: Optional[str]
    is_ai_generated: bool
    ai_intent: Optional[str]
    ai_confidence: Optional[int]
    created_at: datetime
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ConversationBase(BaseModel):
    """Base conversation schema."""
    contact_id: str
    contact_name: Optional[str] = None
    subject: Optional[str] = None


class ConversationResponse(BaseModel):
    """Conversation response schema."""
    id: UUID
    user_id: UUID
    integration_id: UUID
    contact_id: str
    contact_name: Optional[str]
    contact_avatar: Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    status: ConversationStatus
    subject: Optional[str]
    is_ai_handled: bool
    ai_confidence: Optional[int]
    requires_human: bool
    unread_count: int
    message_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_message_at: Optional[datetime]
    
    # Last message preview
    last_message: Optional[MessageResponse] = None
    
    class Config:
        from_attributes = True


class ConversationDetail(ConversationResponse):
    """Detailed conversation with messages."""
    messages: List[MessageResponse] = []
    integration_name: Optional[str] = None
    integration_type: Optional[str] = None


class ConversationUpdate(BaseModel):
    """Conversation update schema."""
    status: Optional[ConversationStatus] = None
    is_ai_handled: Optional[bool] = None
    requires_human: Optional[bool] = None
    subject: Optional[str] = None


class ConversationListParams(BaseModel):
    """Conversation list query parameters."""
    integration_id: Optional[UUID] = None
    status: Optional[ConversationStatus] = None
    requires_human: Optional[bool] = None
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class SendMessageRequest(BaseModel):
    """Send message request."""
    content: str = Field(..., min_length=1, max_length=5000)
    type: MessageType = MessageType.TEXT


class AIHandoffRequest(BaseModel):
    """Request to hand off conversation to human."""
    reason: Optional[str] = None
