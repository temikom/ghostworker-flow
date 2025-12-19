"""
Notification and webhook service.
"""
import hashlib
import hmac
import httpx
import json
from datetime import datetime
from typing import List, Optional
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.notification import (
    EmailNotificationPreference, Webhook, WebhookStatus, WebhookDelivery
)


class NotificationService:
    """Service for handling notifications and webhooks."""
    
    # Email Preferences
    def get_email_preferences(
        self,
        db: Session,
        user_id: uuid.UUID
    ) -> EmailNotificationPreference:
        """Get or create email preferences for user."""
        prefs = db.query(EmailNotificationPreference).filter(
            EmailNotificationPreference.user_id == user_id
        ).first()
        
        if not prefs:
            prefs = EmailNotificationPreference(user_id=user_id)
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
        
        return prefs
    
    def update_email_preferences(
        self,
        db: Session,
        user_id: uuid.UUID,
        updates: dict
    ) -> EmailNotificationPreference:
        """Update email preferences."""
        prefs = self.get_email_preferences(db, user_id)
        
        for key, value in updates.items():
            if hasattr(prefs, key):
                setattr(prefs, key, value)
        
        db.commit()
        db.refresh(prefs)
        return prefs
    
    # Webhook management
    def get_webhooks(self, db: Session, user_id: uuid.UUID) -> List[Webhook]:
        """Get all webhooks for user."""
        return db.query(Webhook).filter(Webhook.user_id == user_id).all()
    
    def get_webhook(
        self,
        db: Session,
        webhook_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[Webhook]:
        """Get a specific webhook."""
        return db.query(Webhook).filter(
            Webhook.id == webhook_id,
            Webhook.user_id == user_id
        ).first()
    
    def create_webhook(
        self,
        db: Session,
        user_id: uuid.UUID,
        name: str,
        url: str,
        events: List[str],
        secret: Optional[str] = None,
        max_retries: int = 3,
        retry_delay_seconds: int = 60
    ) -> Webhook:
        """Create a new webhook."""
        webhook = Webhook(
            user_id=user_id,
            name=name,
            url=url,
            secret=secret,
            events=json.dumps(events),
            max_retries=max_retries,
            retry_delay_seconds=retry_delay_seconds
        )
        db.add(webhook)
        db.commit()
        db.refresh(webhook)
        return webhook
    
    def update_webhook(
        self,
        db: Session,
        webhook: Webhook,
        updates: dict
    ) -> Webhook:
        """Update a webhook."""
        for key, value in updates.items():
            if key == "events" and isinstance(value, list):
                value = json.dumps(value)
            if key == "status" and isinstance(value, str):
                value = WebhookStatus(value)
            if hasattr(webhook, key):
                setattr(webhook, key, value)
        
        db.commit()
        db.refresh(webhook)
        return webhook
    
    def delete_webhook(self, db: Session, webhook: Webhook) -> None:
        """Delete a webhook."""
        db.delete(webhook)
        db.commit()
    
    def get_webhook_deliveries(
        self,
        db: Session,
        webhook_id: uuid.UUID,
        limit: int = 50
    ) -> List[WebhookDelivery]:
        """Get delivery logs for a webhook."""
        return db.query(WebhookDelivery).filter(
            WebhookDelivery.webhook_id == webhook_id
        ).order_by(WebhookDelivery.delivered_at.desc()).limit(limit).all()
    
    # Webhook delivery
    def _generate_signature(self, payload: str, secret: str) -> str:
        """Generate HMAC signature for webhook payload."""
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    async def deliver_webhook(
        self,
        db: Session,
        webhook: Webhook,
        event_type: str,
        payload: dict,
        attempt: int = 1
    ) -> WebhookDelivery:
        """Deliver a webhook to the configured URL."""
        payload_json = json.dumps(payload)
        
        headers = {
            "Content-Type": "application/json",
            "X-GhostWorker-Event": event_type,
            "X-GhostWorker-Delivery": str(uuid.uuid4()),
            "X-GhostWorker-Timestamp": datetime.utcnow().isoformat()
        }
        
        if webhook.secret:
            signature = self._generate_signature(payload_json, webhook.secret)
            headers["X-GhostWorker-Signature"] = f"sha256={signature}"
        
        start_time = datetime.utcnow()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    webhook.url,
                    content=payload_json,
                    headers=headers
                )
            
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            success = 200 <= response.status_code < 300
            
            delivery = WebhookDelivery(
                webhook_id=webhook.id,
                event_type=event_type,
                payload=payload_json,
                status_code=response.status_code,
                response_body=response.text[:1000] if response.text else None,
                duration_ms=duration_ms,
                attempt_number=attempt,
                success=success,
                error_message=None if success else f"HTTP {response.status_code}"
            )
            
            # Update webhook stats
            webhook.total_deliveries += 1
            if success:
                webhook.successful_deliveries += 1
                webhook.status = WebhookStatus.ACTIVE
            else:
                webhook.failed_deliveries += 1
                webhook.last_failure_at = datetime.utcnow()
                webhook.last_failure_reason = f"HTTP {response.status_code}"
            
            webhook.last_delivery_at = datetime.utcnow()
            
        except Exception as e:
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            delivery = WebhookDelivery(
                webhook_id=webhook.id,
                event_type=event_type,
                payload=payload_json,
                duration_ms=duration_ms,
                attempt_number=attempt,
                success=False,
                error_message=str(e)
            )
            
            webhook.total_deliveries += 1
            webhook.failed_deliveries += 1
            webhook.last_failure_at = datetime.utcnow()
            webhook.last_failure_reason = str(e)
            webhook.last_delivery_at = datetime.utcnow()
            
            # Mark as failed after too many consecutive failures
            if webhook.failed_deliveries > 10:
                webhook.status = WebhookStatus.FAILED
        
        db.add(delivery)
        db.commit()
        db.refresh(delivery)
        
        return delivery
    
    async def test_webhook(
        self,
        db: Session,
        webhook: Webhook,
        event_type: str = "test.ping"
    ) -> dict:
        """Test a webhook with a ping event."""
        payload = {
            "event": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "message": "This is a test webhook delivery from GhostWorker"
            }
        }
        
        delivery = await self.deliver_webhook(db, webhook, event_type, payload)
        
        return {
            "success": delivery.success,
            "status_code": delivery.status_code,
            "response_time_ms": delivery.duration_ms,
            "error": delivery.error_message
        }
    
    async def dispatch_event(
        self,
        db: Session,
        user_id: uuid.UUID,
        event_type: str,
        payload: dict
    ) -> List[WebhookDelivery]:
        """Dispatch an event to all matching webhooks."""
        webhooks = db.query(Webhook).filter(
            Webhook.user_id == user_id,
            Webhook.status == WebhookStatus.ACTIVE
        ).all()
        
        deliveries = []
        for webhook in webhooks:
            events = json.loads(webhook.events) if webhook.events else []
            if event_type in events or "*" in events:
                delivery = await self.deliver_webhook(
                    db, webhook, event_type, payload
                )
                deliveries.append(delivery)
        
        return deliveries


notification_service = NotificationService()
