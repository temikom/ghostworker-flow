"""
Billing API routes for Paystack and Coinbase Commerce.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.billing import (
    PlanResponse, SubscriptionResponse, UsageResponse,
    PaymentResponse, InvoiceResponse,
    PaystackInitializeRequest, PaystackInitializeResponse, PaystackVerifyResponse,
    CoinbaseChargeRequest, CoinbaseChargeResponse, CoinbaseVerifyResponse,
    SubscriptionCancelRequest
)
from app.services.billing_service import billing_service


router = APIRouter(prefix="/billing", tags=["Billing"])


# Plans
@router.get("/plans", response_model=List[PlanResponse])
async def get_plans(db: Session = Depends(get_db)):
    """Get all available subscription plans."""
    plans = billing_service.get_plans(db)
    return [
        PlanResponse(
            id=str(p.id),
            tier=p.tier.value,
            name=p.name,
            description=p.description,
            price_monthly=p.price_monthly,
            price_yearly=p.price_yearly,
            currency=p.currency,
            conversations_limit=p.conversations_limit,
            messages_per_month=p.messages_per_month,
            integrations_limit=p.integrations_limit,
            team_members_limit=p.team_members_limit,
            api_calls_limit=p.api_calls_limit,
            storage_mb=p.storage_mb,
            rate_limit_per_minute=p.rate_limit_per_minute,
            features=json.loads(p.features) if p.features else [],
            is_popular=p.is_popular
        )
        for p in plans
    ]


# Subscription
@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's subscription."""
    subscription = billing_service.get_user_subscription(db, user.id)
    
    if not subscription:
        # Create free subscription
        free_plan = billing_service.get_or_create_free_plan(db)
        subscription = billing_service.create_subscription(db, user.id, free_plan.id)
    
    plan = subscription.plan
    return SubscriptionResponse(
        id=str(subscription.id),
        plan_id=str(subscription.plan_id),
        plan=PlanResponse(
            id=str(plan.id),
            tier=plan.tier.value,
            name=plan.name,
            description=plan.description,
            price_monthly=plan.price_monthly,
            price_yearly=plan.price_yearly,
            currency=plan.currency,
            conversations_limit=plan.conversations_limit,
            messages_per_month=plan.messages_per_month,
            integrations_limit=plan.integrations_limit,
            team_members_limit=plan.team_members_limit,
            api_calls_limit=plan.api_calls_limit,
            storage_mb=plan.storage_mb,
            rate_limit_per_minute=plan.rate_limit_per_minute,
            features=json.loads(plan.features) if plan.features else [],
            is_popular=plan.is_popular
        ),
        status=subscription.status.value,
        billing_cycle=subscription.billing_cycle,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        canceled_at=subscription.canceled_at,
        trial_start=subscription.trial_start,
        trial_end=subscription.trial_end,
        created_at=subscription.created_at
    )


@router.post("/subscription/cancel")
async def cancel_subscription(
    request: SubscriptionCancelRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel current subscription."""
    subscription = billing_service.get_user_subscription(db, user.id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    billing_service.cancel_subscription(db, subscription, request.cancel_immediately)
    return {"message": "Subscription cancelled"}


# Usage
@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current usage statistics."""
    usage = billing_service.get_user_usage(db, user.id)
    subscription = billing_service.get_user_subscription(db, user.id)
    
    if not subscription:
        free_plan = billing_service.get_or_create_free_plan(db)
        subscription = billing_service.create_subscription(db, user.id, free_plan.id)
    
    plan = subscription.plan
    
    return UsageResponse(
        conversations=usage.conversations if usage else 0,
        messages=usage.messages if usage else 0,
        api_calls=usage.api_calls if usage else 0,
        storage_used_mb=usage.storage_used_mb if usage else 0,
        period_start=usage.period_start if usage else subscription.current_period_start,
        period_end=usage.period_end if usage else subscription.current_period_end,
        conversations_limit=plan.conversations_limit,
        messages_limit=plan.messages_per_month,
        api_calls_limit=plan.api_calls_limit,
        storage_limit_mb=plan.storage_mb
    )


# Payments & Invoices
@router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history."""
    from app.models.subscription import Payment
    payments = db.query(Payment).filter(Payment.user_id == user.id).order_by(Payment.created_at.desc()).all()
    return [
        PaymentResponse(
            id=str(p.id),
            provider=p.provider.value,
            amount=p.amount,
            currency=p.currency,
            status=p.status.value,
            payment_type=p.payment_type,
            description=p.description,
            created_at=p.created_at,
            paid_at=p.paid_at
        )
        for p in payments
    ]


@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get invoice history."""
    invoices = billing_service.get_user_invoices(db, user.id)
    return [
        InvoiceResponse(
            id=str(i.id),
            invoice_number=i.invoice_number,
            subtotal=i.subtotal,
            tax=i.tax,
            total=i.total,
            currency=i.currency,
            status=i.status,
            billing_name=i.billing_name,
            billing_email=i.billing_email,
            line_items=json.loads(i.line_items) if i.line_items else [],
            pdf_url=i.pdf_url,
            issued_at=i.issued_at,
            due_at=i.due_at,
            paid_at=i.paid_at
        )
        for i in invoices
    ]


# Paystack
@router.post("/paystack/initialize", response_model=PaystackInitializeResponse)
async def initialize_paystack(
    request: PaystackInitializeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize a Paystack payment for subscription."""
    result = await billing_service.initialize_paystack_payment(
        db=db,
        user_id=user.id,
        email=user.email,
        plan_tier=request.plan_tier,
        billing_cycle=request.billing_cycle,
        callback_url=request.callback_url
    )
    return PaystackInitializeResponse(**result)


@router.get("/paystack/verify/{reference}", response_model=PaystackVerifyResponse)
async def verify_paystack(
    reference: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify a Paystack payment."""
    success, subscription = await billing_service.verify_paystack_payment(db, reference)
    
    if not success:
        return PaystackVerifyResponse(
            success=False,
            message="Payment verification failed",
            subscription=None
        )
    
    plan = subscription.plan
    return PaystackVerifyResponse(
        success=True,
        message="Payment successful",
        subscription=SubscriptionResponse(
            id=str(subscription.id),
            plan_id=str(subscription.plan_id),
            plan=PlanResponse(
                id=str(plan.id),
                tier=plan.tier.value,
                name=plan.name,
                description=plan.description,
                price_monthly=plan.price_monthly,
                price_yearly=plan.price_yearly,
                currency=plan.currency,
                conversations_limit=plan.conversations_limit,
                messages_per_month=plan.messages_per_month,
                integrations_limit=plan.integrations_limit,
                team_members_limit=plan.team_members_limit,
                api_calls_limit=plan.api_calls_limit,
                storage_mb=plan.storage_mb,
                rate_limit_per_minute=plan.rate_limit_per_minute,
                features=json.loads(plan.features) if plan.features else [],
                is_popular=plan.is_popular
            ),
            status=subscription.status.value,
            billing_cycle=subscription.billing_cycle,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            cancel_at_period_end=subscription.cancel_at_period_end,
            canceled_at=subscription.canceled_at,
            trial_start=subscription.trial_start,
            trial_end=subscription.trial_end,
            created_at=subscription.created_at
        )
    )


# Coinbase Commerce
@router.post("/coinbase/charge", response_model=CoinbaseChargeResponse)
async def create_coinbase_charge(
    request: CoinbaseChargeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Coinbase Commerce charge for crypto payment."""
    result = await billing_service.create_coinbase_charge(
        db=db,
        user_id=user.id,
        email=user.email,
        plan_tier=request.plan_tier,
        billing_cycle=request.billing_cycle,
        redirect_url=request.redirect_url,
        cancel_url=request.cancel_url
    )
    return CoinbaseChargeResponse(**result)


@router.get("/coinbase/verify/{charge_id}", response_model=CoinbaseVerifyResponse)
async def verify_coinbase(
    charge_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify a Coinbase Commerce charge."""
    success, subscription = await billing_service.verify_coinbase_charge(db, charge_id)
    
    if not success:
        return CoinbaseVerifyResponse(
            success=False,
            message="Payment verification failed or pending",
            subscription=None
        )
    
    plan = subscription.plan
    return CoinbaseVerifyResponse(
        success=True,
        message="Payment successful",
        subscription=SubscriptionResponse(
            id=str(subscription.id),
            plan_id=str(subscription.plan_id),
            plan=PlanResponse(
                id=str(plan.id),
                tier=plan.tier.value,
                name=plan.name,
                description=plan.description,
                price_monthly=plan.price_monthly,
                price_yearly=plan.price_yearly,
                currency=plan.currency,
                conversations_limit=plan.conversations_limit,
                messages_per_month=plan.messages_per_month,
                integrations_limit=plan.integrations_limit,
                team_members_limit=plan.team_members_limit,
                api_calls_limit=plan.api_calls_limit,
                storage_mb=plan.storage_mb,
                rate_limit_per_minute=plan.rate_limit_per_minute,
                features=json.loads(plan.features) if plan.features else [],
                is_popular=plan.is_popular
            ),
            status=subscription.status.value,
            billing_cycle=subscription.billing_cycle,
            current_period_start=subscription.current_period_start,
            current_period_end=subscription.current_period_end,
            cancel_at_period_end=subscription.cancel_at_period_end,
            canceled_at=subscription.canceled_at,
            trial_start=subscription.trial_start,
            trial_end=subscription.trial_end,
            created_at=subscription.created_at
        )
    )


# Webhooks for payment providers
@router.post("/webhooks/paystack")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Paystack webhook events."""
    # Verify signature
    signature = request.headers.get("x-paystack-signature")
    body = await request.body()
    
    # TODO: Verify HMAC signature with PAYSTACK_SECRET_KEY
    
    data = await request.json()
    event = data.get("event")
    
    if event == "charge.success":
        reference = data["data"]["reference"]
        await billing_service.verify_paystack_payment(db, reference)
    
    return {"status": "ok"}


@router.post("/webhooks/coinbase")
async def coinbase_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Coinbase Commerce webhook events."""
    # Verify signature
    signature = request.headers.get("X-CC-Webhook-Signature")
    body = await request.body()
    
    # TODO: Verify HMAC signature with COINBASE_WEBHOOK_SECRET
    
    data = await request.json()
    event_type = data.get("event", {}).get("type")
    
    if event_type == "charge:confirmed":
        charge_id = data["event"]["data"]["id"]
        await billing_service.verify_coinbase_charge(db, charge_id)
    
    return {"status": "ok"}
