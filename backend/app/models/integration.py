"""
Integration models for external messaging platforms.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class IntegrationType(str, enum.Enum):
    """Supported integration types."""
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    FACEBOOK_MESSENGER = "facebook_messenger"
    EMAIL = "email"
    WEBHOOK = "webhook"


class IntegrationStatus(str, enum.Enum):
    """Integration connection status."""
    PENDING = "pending"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class Integration(Base):
    """External platform integrations."""
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Integration type and name
    type = Column(Enum(IntegrationType), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(
        Enum(IntegrationStatus),
        default=IntegrationStatus.PENDING,
        nullable=False
    )
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Connection details (encrypted in production)
    credentials = Column(Text, nullable=True)  # JSON encrypted
    webhook_url = Column(String(500), nullable=True)
    webhook_secret = Column(String(255), nullable=True)
    
    # Platform-specific identifiers
    external_id = Column(String(255), nullable=True)
    external_name = Column(String(255), nullable=True)
    
    # n8n workflow integration
    n8n_workflow_id = Column(String(255), nullable=True)
    n8n_webhook_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sync_at = Column(DateTime, nullable=True)
    
    # Error tracking
    last_error = Column(Text, nullable=True)
    error_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="integrations")
    conversations = relationship("Conversation", back_populates="integration", cascade="all, delete-orphan")


from sqlalchemy import Integer  # Added missing import
