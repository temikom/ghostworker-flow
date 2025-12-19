"""
Order schemas.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.order import OrderSource, OrderStatus


class OrderItemBase(BaseModel):
    """Order item schema."""
    name: str
    quantity: int = Field(..., ge=1)
    price: Decimal
    sku: Optional[str] = None
    notes: Optional[str] = None


class OrderBase(BaseModel):
    """Base order schema."""
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    notes: Optional[str] = None


class OrderCreate(OrderBase):
    """Order creation schema."""
    conversation_id: Optional[UUID] = None
    items: List[OrderItemBase]
    subtotal: Decimal
    tax: Optional[Decimal] = Decimal("0")
    shipping_cost: Optional[Decimal] = Decimal("0")
    discount: Optional[Decimal] = Decimal("0")
    total: Decimal
    currency: str = "USD"
    source: OrderSource = OrderSource.MANUAL


class OrderUpdate(BaseModel):
    """Order update schema."""
    status: Optional[OrderStatus] = None
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None


class OrderResponse(BaseModel):
    """Order response schema."""
    id: UUID
    user_id: UUID
    conversation_id: Optional[UUID]
    order_number: str
    customer_name: Optional[str]
    customer_email: Optional[str]
    customer_phone: Optional[str]
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_state: Optional[str]
    shipping_zip: Optional[str]
    shipping_country: Optional[str]
    status: OrderStatus
    source: OrderSource
    subtotal: Optional[Decimal]
    tax: Optional[Decimal]
    shipping_cost: Optional[Decimal]
    discount: Optional[Decimal]
    total: Decimal
    currency: str
    items: Optional[List[dict]] = None  # Parsed JSON
    notes: Optional[str]
    ai_confidence: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    confirmed_at: Optional[datetime]
    shipped_at: Optional[datetime]
    delivered_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class OrderListParams(BaseModel):
    """Order list query parameters."""
    status: Optional[OrderStatus] = None
    source: Optional[OrderSource] = None
    search: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class OrderStats(BaseModel):
    """Order statistics."""
    total_orders: int
    pending_orders: int
    confirmed_orders: int
    shipped_orders: int
    delivered_orders: int
    cancelled_orders: int
    total_revenue: Decimal
    revenue_today: Decimal
    average_order_value: Decimal
