"""
Conversation and message models.
"""
import enum
from datetime import datetime

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
import uuid

from app.db.base import Base


class ConversationStatus(str, enum.Enum):
    """Conversation status."""
    OPEN = "open"
    PENDING = "pending"
    RESOLVED = "resolved"
    ARCHIVED = "archived"


class Conversation(Base):
    """Conversation threads from integrations."""
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    integration_id = Column(
        UUID(as_uuid=True),
        ForeignKey("integrations.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # External contact info
    contact_id = Column(String(255), nullable=False)  # Platform-specific ID
    contact_name = Column(String(255), nullable=True)
    contact_avatar = Column(String(500), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    
    # Conversation metadata
    status = Column(
        Enum(ConversationStatus),
        default=ConversationStatus.OPEN,
        nullable=False
    )
    subject = Column(String(255), nullable=True)
    
    # AI handling
    is_ai_handled = Column(Boolean, default=True, nullable=False)
    ai_confidence = Column(Integer, nullable=True)  # 0-100
    requires_human = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = Column(DateTime, nullable=True)
    
    # Counts
    unread_count = Column(Integer, default=0)
    message_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    integration = relationship("Integration", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="conversation")


class MessageType(str, enum.Enum):
    """Message types."""
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    LOCATION = "location"
    CONTACT = "contact"
    TEMPLATE = "template"
    INTERACTIVE = "interactive"


class MessageDirection(str, enum.Enum):
    """Message direction."""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class MessageStatus(str, enum.Enum):
    """Message delivery status."""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class Message(Base):
    """Individual messages within conversations."""
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Message content
    type = Column(Enum(MessageType), default=MessageType.TEXT, nullable=False)
    direction = Column(Enum(MessageDirection), nullable=False)
    content = Column(Text, nullable=True)
    
    # Media (for non-text messages)
    media_url = Column(String(500), nullable=True)
    media_mime_type = Column(String(100), nullable=True)
    media_filename = Column(String(255), nullable=True)
    
    # Delivery status
    status = Column(
        Enum(MessageStatus),
        default=MessageStatus.PENDING,
        nullable=False
    )
    
    # External message ID from platform
    external_id = Column(String(255), nullable=True)
    
    # AI processing
    is_ai_generated = Column(Boolean, default=False, nullable=False)
    ai_intent = Column(String(100), nullable=True)
    ai_confidence = Column(Integer, nullable=True)
    ai_metadata = Column(Text, nullable=True)  # JSON
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    
    # Relationship
    conversation = relationship("Conversation", back_populates="messages")
