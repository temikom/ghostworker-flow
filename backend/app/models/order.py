"""
Order models for extracted orders from conversations.
"""
import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
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
import uuid

from app.db.base import Base


class OrderStatus(str, enum.Enum):
    """Order status."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class OrderSource(str, enum.Enum):
    """How the order was created."""
    AI_EXTRACTED = "ai_extracted"
    MANUAL = "manual"
    WEBHOOK = "webhook"
    IMPORTED = "imported"


class Order(Base):
    """Orders extracted from conversations or created manually."""
    __tablename__ = "orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Order identification
    order_number = Column(String(50), unique=True, nullable=False)
    
    # Customer info (may differ from contact)
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    
    # Shipping address
    shipping_address = Column(Text, nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_state = Column(String(100), nullable=True)
    shipping_zip = Column(String(20), nullable=True)
    shipping_country = Column(String(100), nullable=True)
    
    # Order details
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    source = Column(Enum(OrderSource), default=OrderSource.AI_EXTRACTED, nullable=False)
    
    # Financials
    subtotal = Column(Numeric(10, 2), nullable=True)
    tax = Column(Numeric(10, 2), nullable=True)
    shipping_cost = Column(Numeric(10, 2), nullable=True)
    discount = Column(Numeric(10, 2), nullable=True)
    total = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    
    # Line items (JSON stored as text)
    items = Column(Text, nullable=True)  # JSON array of items
    
    # Notes and metadata
    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON
    
    # AI extraction data
    ai_extracted_at = Column(DateTime, nullable=True)
    ai_confidence = Column(Integer, nullable=True)
    ai_raw_data = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    shipped_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="orders")
    conversation = relationship("Conversation", back_populates="orders")
    
    @staticmethod
    def generate_order_number() -> str:
        """Generate a unique order number."""
        import random
        import string
        prefix = datetime.utcnow().strftime("%Y%m%d")
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"GW-{prefix}-{suffix}"
