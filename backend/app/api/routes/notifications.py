"""
Notification and webhook API routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.notification import (
    EmailPreferencesUpdate, EmailPreferencesResponse,
    WebhookCreate, WebhookUpdate, WebhookResponse,
    WebhookDeliveryResponse, WebhookTestRequest, WebhookTestResponse,
    AVAILABLE_WEBHOOK_EVENTS
)
from app.services.notification_service import notification_service
import json


router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Email Preferences
@router.get("/email-preferences", response_model=EmailPreferencesResponse)
async def get_email_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's email notification preferences."""
    prefs = notification_service.get_email_preferences(db, user.id)
    return EmailPreferencesResponse(
        id=str(prefs.id),
        user_id=str(prefs.user_id),
        security_alerts=prefs.security_alerts,
        new_login_alerts=prefs.new_login_alerts,
        password_changes=prefs.password_changes,
        payment_receipts=prefs.payment_receipts,
        payment_failures=prefs.payment_failures,
        subscription_changes=prefs.subscription_changes,
        usage_alerts=prefs.usage_alerts,
        team_invites=prefs.team_invites,
        team_member_joined=prefs.team_member_joined,
        role_changes=prefs.role_changes,
        new_messages=prefs.new_messages,
        message_digest=prefs.message_digest,
        digest_frequency=prefs.digest_frequency,
        integration_errors=prefs.integration_errors,
        integration_connected=prefs.integration_connected,
        product_updates=prefs.product_updates,
        tips_and_tutorials=prefs.tips_and_tutorials,
        promotional_emails=prefs.promotional_emails,
        created_at=prefs.created_at,
        updated_at=prefs.updated_at
    )


@router.put("/email-preferences", response_model=EmailPreferencesResponse)
async def update_email_preferences(
    request: EmailPreferencesUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update email notification preferences."""
    prefs = notification_service.update_email_preferences(
        db, user.id, request.model_dump(exclude_unset=True)
    )
    return EmailPreferencesResponse(
        id=str(prefs.id),
        user_id=str(prefs.user_id),
        security_alerts=prefs.security_alerts,
        new_login_alerts=prefs.new_login_alerts,
        password_changes=prefs.password_changes,
        payment_receipts=prefs.payment_receipts,
        payment_failures=prefs.payment_failures,
        subscription_changes=prefs.subscription_changes,
        usage_alerts=prefs.usage_alerts,
        team_invites=prefs.team_invites,
        team_member_joined=prefs.team_member_joined,
        role_changes=prefs.role_changes,
        new_messages=prefs.new_messages,
        message_digest=prefs.message_digest,
        digest_frequency=prefs.digest_frequency,
        integration_errors=prefs.integration_errors,
        integration_connected=prefs.integration_connected,
        product_updates=prefs.product_updates,
        tips_and_tutorials=prefs.tips_and_tutorials,
        promotional_emails=prefs.promotional_emails,
        created_at=prefs.created_at,
        updated_at=prefs.updated_at
    )


# Webhooks
@router.get("/webhooks/events")
async def get_webhook_events():
    """Get list of available webhook events."""
    return AVAILABLE_WEBHOOK_EVENTS


@router.get("/webhooks", response_model=List[WebhookResponse])
async def get_webhooks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all webhooks for current user."""
    webhooks = notification_service.get_webhooks(db, user.id)
    return [
        WebhookResponse(
            id=str(w.id),
            name=w.name,
            url=w.url,
            status=w.status.value,
            events=json.loads(w.events) if w.events else [],
            total_deliveries=w.total_deliveries,
            successful_deliveries=w.successful_deliveries,
            failed_deliveries=w.failed_deliveries,
            last_delivery_at=w.last_delivery_at,
            last_failure_at=w.last_failure_at,
            last_failure_reason=w.last_failure_reason,
            max_retries=w.max_retries,
            retry_delay_seconds=w.retry_delay_seconds,
            created_at=w.created_at,
            updated_at=w.updated_at
        )
        for w in webhooks
    ]


@router.post("/webhooks", response_model=WebhookResponse)
async def create_webhook(
    request: WebhookCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new webhook."""
    webhook = notification_service.create_webhook(
        db=db,
        user_id=user.id,
        name=request.name,
        url=request.url,
        events=request.events,
        secret=request.secret,
        max_retries=request.max_retries,
        retry_delay_seconds=request.retry_delay_seconds
    )
    return WebhookResponse(
        id=str(webhook.id),
        name=webhook.name,
        url=webhook.url,
        status=webhook.status.value,
        events=json.loads(webhook.events) if webhook.events else [],
        total_deliveries=webhook.total_deliveries,
        successful_deliveries=webhook.successful_deliveries,
        failed_deliveries=webhook.failed_deliveries,
        last_delivery_at=webhook.last_delivery_at,
        last_failure_at=webhook.last_failure_at,
        last_failure_reason=webhook.last_failure_reason,
        max_retries=webhook.max_retries,
        retry_delay_seconds=webhook.retry_delay_seconds,
        created_at=webhook.created_at,
        updated_at=webhook.updated_at
    )


@router.get("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific webhook."""
    webhook = notification_service.get_webhook(db, webhook_id, user.id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    return WebhookResponse(
        id=str(webhook.id),
        name=webhook.name,
        url=webhook.url,
        status=webhook.status.value,
        events=json.loads(webhook.events) if webhook.events else [],
        total_deliveries=webhook.total_deliveries,
        successful_deliveries=webhook.successful_deliveries,
        failed_deliveries=webhook.failed_deliveries,
        last_delivery_at=webhook.last_delivery_at,
        last_failure_at=webhook.last_failure_at,
        last_failure_reason=webhook.last_failure_reason,
        max_retries=webhook.max_retries,
        retry_delay_seconds=webhook.retry_delay_seconds,
        created_at=webhook.created_at,
        updated_at=webhook.updated_at
    )


@router.patch("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    request: WebhookUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a webhook."""
    webhook = notification_service.get_webhook(db, webhook_id, user.id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    webhook = notification_service.update_webhook(
        db, webhook, request.model_dump(exclude_unset=True)
    )
    
    return WebhookResponse(
        id=str(webhook.id),
        name=webhook.name,
        url=webhook.url,
        status=webhook.status.value,
        events=json.loads(webhook.events) if webhook.events else [],
        total_deliveries=webhook.total_deliveries,
        successful_deliveries=webhook.successful_deliveries,
        failed_deliveries=webhook.failed_deliveries,
        last_delivery_at=webhook.last_delivery_at,
        last_failure_at=webhook.last_failure_at,
        last_failure_reason=webhook.last_failure_reason,
        max_retries=webhook.max_retries,
        retry_delay_seconds=webhook.retry_delay_seconds,
        created_at=webhook.created_at,
        updated_at=webhook.updated_at
    )


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a webhook."""
    webhook = notification_service.get_webhook(db, webhook_id, user.id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    notification_service.delete_webhook(db, webhook)
    return {"message": "Webhook deleted"}


@router.get("/webhooks/{webhook_id}/deliveries", response_model=List[WebhookDeliveryResponse])
async def get_webhook_deliveries(
    webhook_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get delivery logs for a webhook."""
    webhook = notification_service.get_webhook(db, webhook_id, user.id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    deliveries = notification_service.get_webhook_deliveries(db, webhook_id)
    return [
        WebhookDeliveryResponse(
            id=str(d.id),
            webhook_id=str(d.webhook_id),
            event_type=d.event_type,
            status_code=d.status_code,
            duration_ms=d.duration_ms,
            attempt_number=d.attempt_number,
            success=d.success,
            error_message=d.error_message,
            delivered_at=d.delivered_at
        )
        for d in deliveries
    ]


@router.post("/webhooks/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    webhook_id: str,
    request: WebhookTestRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test a webhook with a ping event."""
    webhook = notification_service.get_webhook(db, webhook_id, user.id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    result = await notification_service.test_webhook(db, webhook, request.event_type)
    return WebhookTestResponse(**result)
