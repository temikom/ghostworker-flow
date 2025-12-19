"""
Webhook handlers for Paystack and Coinbase Commerce payment events.
"""
import hashlib
import hmac
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel

from app.core.config import settings
from app.services.billing_service import billing_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ==========================================
# PAYSTACK WEBHOOK HANDLER
# ==========================================

class PaystackEvent(BaseModel):
    event: str
    data: dict


def verify_paystack_signature(payload: bytes, signature: str) -> bool:
    """Verify Paystack webhook signature."""
    if not settings.PAYSTACK_WEBHOOK_SECRET:
        return True  # Skip verification if no secret configured
    
    expected_signature = hmac.new(
        settings.PAYSTACK_WEBHOOK_SECRET.encode('utf-8'),
        payload,
        hashlib.sha512
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


async def process_paystack_subscription_created(data: dict):
    """Handle subscription.create event."""
    subscription_code = data.get("subscription_code")
    customer = data.get("customer", {})
    plan = data.get("plan", {})
    
    print(f"[Paystack] Subscription created: {subscription_code}")
    print(f"  Customer: {customer.get('email')}")
    print(f"  Plan: {plan.get('name')}")
    
    # Update subscription in database
    await billing_service.handle_subscription_created(
        provider="paystack",
        provider_subscription_id=subscription_code,
        customer_email=customer.get("email"),
        plan_code=plan.get("plan_code"),
        amount=data.get("amount", 0) / 100,  # Convert from kobo
    )


async def process_paystack_subscription_disabled(data: dict):
    """Handle subscription.disable event (cancellation)."""
    subscription_code = data.get("subscription_code")
    
    print(f"[Paystack] Subscription cancelled: {subscription_code}")
    
    await billing_service.handle_subscription_cancelled(
        provider="paystack",
        provider_subscription_id=subscription_code,
    )


async def process_paystack_charge_success(data: dict):
    """Handle charge.success event."""
    reference = data.get("reference")
    amount = data.get("amount", 0) / 100  # Convert from kobo
    customer = data.get("customer", {})
    metadata = data.get("metadata", {})
    
    print(f"[Paystack] Payment successful: {reference}")
    print(f"  Amount: {amount}")
    print(f"  Customer: {customer.get('email')}")
    
    await billing_service.handle_payment_success(
        provider="paystack",
        provider_payment_id=reference,
        customer_email=customer.get("email"),
        amount=amount,
        currency=data.get("currency", "NGN"),
        metadata=metadata,
    )


async def process_paystack_charge_failed(data: dict):
    """Handle charge.failed event."""
    reference = data.get("reference")
    customer = data.get("customer", {})
    
    print(f"[Paystack] Payment failed: {reference}")
    
    await billing_service.handle_payment_failed(
        provider="paystack",
        provider_payment_id=reference,
        customer_email=customer.get("email"),
        error_message=data.get("gateway_response", "Payment failed"),
    )


async def process_paystack_invoice_created(data: dict):
    """Handle invoice.create event."""
    invoice_code = data.get("invoice_code")
    subscription = data.get("subscription", {})
    
    print(f"[Paystack] Invoice created: {invoice_code}")
    
    await billing_service.handle_invoice_created(
        provider="paystack",
        invoice_code=invoice_code,
        subscription_code=subscription.get("subscription_code"),
        amount=data.get("amount", 0) / 100,
    )


async def process_paystack_invoice_payment_failed(data: dict):
    """Handle invoice.payment_failed event."""
    invoice_code = data.get("invoice_code")
    subscription = data.get("subscription", {})
    
    print(f"[Paystack] Invoice payment failed: {invoice_code}")
    
    await billing_service.handle_invoice_payment_failed(
        provider="paystack",
        invoice_code=invoice_code,
        subscription_code=subscription.get("subscription_code"),
    )


@router.post("/paystack")
async def paystack_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_paystack_signature: Optional[str] = Header(None),
):
    """
    Handle Paystack webhook events.
    
    Events handled:
    - subscription.create: New subscription created
    - subscription.disable: Subscription cancelled
    - charge.success: Payment successful
    - charge.failed: Payment failed
    - invoice.create: Invoice generated
    - invoice.payment_failed: Invoice payment failed
    """
    payload = await request.body()
    
    # Verify signature
    if x_paystack_signature and not verify_paystack_signature(payload, x_paystack_signature):
        print("[Paystack] Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        event_data = json.loads(payload)
        event_type = event_data.get("event")
        data = event_data.get("data", {})
        
        print(f"[Paystack] Received webhook: {event_type}")
        
        # Route to appropriate handler
        handlers = {
            "subscription.create": process_paystack_subscription_created,
            "subscription.disable": process_paystack_subscription_disabled,
            "charge.success": process_paystack_charge_success,
            "charge.failed": process_paystack_charge_failed,
            "invoice.create": process_paystack_invoice_created,
            "invoice.payment_failed": process_paystack_invoice_payment_failed,
        }
        
        handler = handlers.get(event_type)
        if handler:
            # Process in background for faster response
            background_tasks.add_task(handler, data)
        else:
            print(f"[Paystack] Unhandled event type: {event_type}")
        
        return {"status": "success", "event": event_type}
        
    except json.JSONDecodeError:
        print("[Paystack] Invalid JSON payload")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        print(f"[Paystack] Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# COINBASE COMMERCE WEBHOOK HANDLER
# ==========================================

def verify_coinbase_signature(payload: bytes, signature: str) -> bool:
    """Verify Coinbase Commerce webhook signature."""
    if not settings.COINBASE_WEBHOOK_SECRET:
        return True  # Skip verification if no secret configured
    
    expected_signature = hmac.new(
        settings.COINBASE_WEBHOOK_SECRET.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


async def process_coinbase_charge_created(data: dict):
    """Handle charge:created event."""
    charge_id = data.get("id")
    charge_code = data.get("code")
    
    print(f"[Coinbase] Charge created: {charge_code}")
    
    # Usually just log this, actual processing happens on confirmation


async def process_coinbase_charge_confirmed(data: dict):
    """Handle charge:confirmed event - payment confirmed on blockchain."""
    charge_id = data.get("id")
    charge_code = data.get("code")
    metadata = data.get("metadata", {})
    pricing = data.get("pricing", {})
    payments = data.get("payments", [])
    
    print(f"[Coinbase] Charge confirmed: {charge_code}")
    
    # Get payment amount (use local amount if available)
    local_amount = pricing.get("local", {})
    amount = float(local_amount.get("amount", 0))
    currency = local_amount.get("currency", "USD")
    
    # Get crypto payment details
    crypto_payment = payments[0] if payments else {}
    crypto_amount = crypto_payment.get("value", {}).get("crypto", {})
    
    await billing_service.handle_payment_success(
        provider="coinbase",
        provider_payment_id=charge_code,
        customer_email=metadata.get("customer_email"),
        amount=amount,
        currency=currency,
        metadata={
            **metadata,
            "charge_id": charge_id,
            "crypto_currency": crypto_amount.get("currency"),
            "crypto_amount": crypto_amount.get("amount"),
        },
    )
    
    # Handle subscription if this was a subscription payment
    if metadata.get("type") == "subscription":
        await billing_service.handle_crypto_subscription_payment(
            charge_code=charge_code,
            plan_id=metadata.get("plan_id"),
            customer_email=metadata.get("customer_email"),
            billing_cycle=metadata.get("billing_cycle", "monthly"),
        )


async def process_coinbase_charge_failed(data: dict):
    """Handle charge:failed event - payment failed or expired."""
    charge_code = data.get("code")
    metadata = data.get("metadata", {})
    
    print(f"[Coinbase] Charge failed: {charge_code}")
    
    await billing_service.handle_payment_failed(
        provider="coinbase",
        provider_payment_id=charge_code,
        customer_email=metadata.get("customer_email"),
        error_message="Crypto payment failed or expired",
    )


async def process_coinbase_charge_delayed(data: dict):
    """Handle charge:delayed event - payment detected but not yet confirmed."""
    charge_code = data.get("code")
    
    print(f"[Coinbase] Charge delayed (pending confirmation): {charge_code}")
    
    # Update payment status to pending confirmation
    await billing_service.handle_payment_pending(
        provider="coinbase",
        provider_payment_id=charge_code,
        status="pending_confirmation",
    )


async def process_coinbase_charge_pending(data: dict):
    """Handle charge:pending event - payment initiated."""
    charge_code = data.get("code")
    
    print(f"[Coinbase] Charge pending: {charge_code}")


async def process_coinbase_charge_resolved(data: dict):
    """Handle charge:resolved event - resolved manually or marked as resolved."""
    charge_code = data.get("code")
    timeline = data.get("timeline", [])
    
    # Check if this was marked as resolved with payment
    last_status = timeline[-1] if timeline else {}
    
    print(f"[Coinbase] Charge resolved: {charge_code}")
    print(f"  Context: {last_status.get('context')}")


@router.post("/coinbase")
async def coinbase_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_cc_webhook_signature: Optional[str] = Header(None),
):
    """
    Handle Coinbase Commerce webhook events.
    
    Events handled:
    - charge:created: Charge created
    - charge:confirmed: Payment confirmed on blockchain
    - charge:failed: Payment failed or expired
    - charge:delayed: Payment detected but not confirmed
    - charge:pending: Payment initiated
    - charge:resolved: Charge resolved
    """
    payload = await request.body()
    
    # Verify signature
    if x_cc_webhook_signature and not verify_coinbase_signature(payload, x_cc_webhook_signature):
        print("[Coinbase] Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        event_data = json.loads(payload)
        event = event_data.get("event", {})
        event_type = event.get("type")
        data = event.get("data", {})
        
        print(f"[Coinbase] Received webhook: {event_type}")
        
        # Route to appropriate handler
        handlers = {
            "charge:created": process_coinbase_charge_created,
            "charge:confirmed": process_coinbase_charge_confirmed,
            "charge:failed": process_coinbase_charge_failed,
            "charge:delayed": process_coinbase_charge_delayed,
            "charge:pending": process_coinbase_charge_pending,
            "charge:resolved": process_coinbase_charge_resolved,
        }
        
        handler = handlers.get(event_type)
        if handler:
            # Process in background for faster response
            background_tasks.add_task(handler, data)
        else:
            print(f"[Coinbase] Unhandled event type: {event_type}")
        
        return {"status": "success", "event": event_type}
        
    except json.JSONDecodeError:
        print("[Coinbase] Invalid JSON payload")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        print(f"[Coinbase] Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
