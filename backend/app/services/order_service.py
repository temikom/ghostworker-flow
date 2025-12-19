"""
Order service for managing orders.
"""
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.order import Order, OrderStatus, OrderSource
from app.schemas.order import OrderCreate, OrderUpdate, OrderListParams, OrderStats


class OrderService:
    """Service for managing orders."""
    
    def create(
        self,
        db: Session,
        user_id: UUID,
        data: OrderCreate
    ) -> Order:
        """Create a new order."""
        order = Order(
            user_id=user_id,
            conversation_id=data.conversation_id,
            order_number=Order.generate_order_number(),
            customer_name=data.customer_name,
            customer_email=data.customer_email,
            customer_phone=data.customer_phone,
            shipping_address=data.shipping_address,
            shipping_city=data.shipping_city,
            shipping_state=data.shipping_state,
            shipping_zip=data.shipping_zip,
            shipping_country=data.shipping_country,
            status=OrderStatus.PENDING,
            source=data.source,
            subtotal=data.subtotal,
            tax=data.tax,
            shipping_cost=data.shipping_cost,
            discount=data.discount,
            total=data.total,
            currency=data.currency,
            items=json.dumps([item.model_dump() for item in data.items]),
            notes=data.notes
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        return order
    
    def get_by_id(
        self,
        db: Session,
        order_id: UUID,
        user_id: Optional[UUID] = None
    ) -> Optional[Order]:
        """Get order by ID."""
        query = db.query(Order).filter(Order.id == order_id)
        
        if user_id:
            query = query.filter(Order.user_id == user_id)
        
        return query.first()
    
    def get_by_order_number(
        self,
        db: Session,
        order_number: str,
        user_id: Optional[UUID] = None
    ) -> Optional[Order]:
        """Get order by order number."""
        query = db.query(Order).filter(Order.order_number == order_number)
        
        if user_id:
            query = query.filter(Order.user_id == user_id)
        
        return query.first()
    
    def list_orders(
        self,
        db: Session,
        user_id: UUID,
        params: OrderListParams
    ) -> Tuple[List[Order], int]:
        """List orders with filtering and pagination."""
        query = db.query(Order).filter(Order.user_id == user_id)
        
        if params.status:
            query = query.filter(Order.status == params.status)
        
        if params.source:
            query = query.filter(Order.source == params.source)
        
        if params.search:
            search_term = f"%{params.search}%"
            query = query.filter(
                (Order.order_number.ilike(search_term)) |
                (Order.customer_name.ilike(search_term)) |
                (Order.customer_email.ilike(search_term)) |
                (Order.customer_phone.ilike(search_term))
            )
        
        if params.date_from:
            query = query.filter(Order.created_at >= params.date_from)
        
        if params.date_to:
            query = query.filter(Order.created_at <= params.date_to)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        skip = (params.page - 1) * params.page_size
        orders = query.order_by(
            Order.created_at.desc()
        ).offset(skip).limit(params.page_size).all()
        
        return orders, total
    
    def update(
        self,
        db: Session,
        order_id: UUID,
        user_id: UUID,
        data: OrderUpdate
    ) -> Order:
        """Update an order."""
        order = self.get_by_id(db, order_id, user_id)
        
        if not order:
            raise NotFoundError("Order not found")
        
        update_dict = data.model_dump(exclude_unset=True)
        
        # Handle status changes with timestamps
        if "status" in update_dict:
            new_status = update_dict["status"]
            now = datetime.utcnow()
            
            if new_status == OrderStatus.CONFIRMED and not order.confirmed_at:
                order.confirmed_at = now
            elif new_status == OrderStatus.SHIPPED and not order.shipped_at:
                order.shipped_at = now
            elif new_status == OrderStatus.DELIVERED and not order.delivered_at:
                order.delivered_at = now
            elif new_status == OrderStatus.CANCELLED and not order.cancelled_at:
                order.cancelled_at = now
        
        for field, value in update_dict.items():
            setattr(order, field, value)
        
        db.commit()
        db.refresh(order)
        
        return order
    
    def delete(
        self,
        db: Session,
        order_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete an order."""
        order = self.get_by_id(db, order_id, user_id)
        
        if not order:
            raise NotFoundError("Order not found")
        
        db.delete(order)
        db.commit()
        
        return True
    
    def get_stats(
        self,
        db: Session,
        user_id: UUID
    ) -> OrderStats:
        """Get order statistics for a user."""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Count by status
        status_counts = db.query(
            Order.status,
            func.count(Order.id)
        ).filter(Order.user_id == user_id).group_by(Order.status).all()
        
        status_map = {status: count for status, count in status_counts}
        
        # Total revenue
        total_revenue = db.query(func.sum(Order.total)).filter(
            Order.user_id == user_id,
            Order.status.in_([
                OrderStatus.CONFIRMED,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED
            ])
        ).scalar() or Decimal("0")
        
        # Revenue today
        revenue_today = db.query(func.sum(Order.total)).filter(
            Order.user_id == user_id,
            Order.created_at >= today,
            Order.status.in_([
                OrderStatus.CONFIRMED,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED
            ])
        ).scalar() or Decimal("0")
        
        # Average order value
        total_orders = sum(status_map.values())
        avg_order_value = total_revenue / total_orders if total_orders > 0 else Decimal("0")
        
        return OrderStats(
            total_orders=total_orders,
            pending_orders=status_map.get(OrderStatus.PENDING, 0),
            confirmed_orders=status_map.get(OrderStatus.CONFIRMED, 0),
            shipped_orders=status_map.get(OrderStatus.SHIPPED, 0),
            delivered_orders=status_map.get(OrderStatus.DELIVERED, 0),
            cancelled_orders=status_map.get(OrderStatus.CANCELLED, 0),
            total_revenue=total_revenue,
            revenue_today=revenue_today,
            average_order_value=avg_order_value
        )
    
    def create_from_ai_extraction(
        self,
        db: Session,
        user_id: UUID,
        conversation_id: UUID,
        extracted_data: dict,
        confidence: int
    ) -> Order:
        """Create order from AI-extracted data."""
        items = extracted_data.get("items", [])
        
        # Calculate totals
        subtotal = sum(
            Decimal(str(item.get("price", 0))) * item.get("quantity", 1)
            for item in items
        )
        
        order = Order(
            user_id=user_id,
            conversation_id=conversation_id,
            order_number=Order.generate_order_number(),
            customer_name=extracted_data.get("customer_name"),
            customer_email=extracted_data.get("customer_email"),
            customer_phone=extracted_data.get("customer_phone"),
            shipping_address=extracted_data.get("shipping_address"),
            shipping_city=extracted_data.get("shipping_city"),
            shipping_state=extracted_data.get("shipping_state"),
            shipping_zip=extracted_data.get("shipping_zip"),
            shipping_country=extracted_data.get("shipping_country"),
            status=OrderStatus.PENDING,
            source=OrderSource.AI_EXTRACTED,
            subtotal=subtotal,
            total=subtotal,  # Simplified; add tax/shipping logic as needed
            currency=extracted_data.get("currency", "USD"),
            items=json.dumps(items),
            ai_extracted_at=datetime.utcnow(),
            ai_confidence=confidence,
            ai_raw_data=json.dumps(extracted_data)
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        return order


order_service = OrderService()
