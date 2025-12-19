"""
Billing and payment service.
"""
import json
import httpx
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Tuple
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.subscription import (
    Plan, PlanTier, Subscription, SubscriptionStatus,
    Payment, PaymentProvider, PaymentStatus, Invoice, UsageRecord
)


class BillingService:
    """Service for handling billing operations."""
    
    def __init__(self):
        self.paystack_secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
        self.paystack_base_url = "https://api.paystack.co"
        self.coinbase_api_key = getattr(settings, 'COINBASE_COMMERCE_API_KEY', '')
        self.coinbase_base_url = "https://api.commerce.coinbase.com"
    
    # Plan methods
    def get_plans(self, db: Session) -> list:
        """Get all active plans."""
        return db.query(Plan).filter(Plan.is_active == True).all()
    
    def get_plan_by_tier(self, db: Session, tier: PlanTier) -> Optional[Plan]:
        """Get plan by tier."""
        return db.query(Plan).filter(Plan.tier == tier).first()
    
    def get_or_create_free_plan(self, db: Session) -> Plan:
        """Get or create the free plan."""
        plan = self.get_plan_by_tier(db, PlanTier.FREE)
        if not plan:
            plan = Plan(
                tier=PlanTier.FREE,
                name="Free",
                description="Perfect for getting started",
                price_monthly=Decimal("0"),
                price_yearly=Decimal("0"),
                conversations_limit=100,
                messages_per_month=1000,
                integrations_limit=1,
                team_members_limit=1,
                api_calls_limit=1000,
                storage_mb=100,
                rate_limit_per_minute=60,
                auth_rate_limit_per_minute=10,
                api_rate_limit_per_minute=100,
                features=json.dumps(["100 conversations/month", "1,000 messages/month", "1 integration", "Community support"])
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
        return plan
    
    # Subscription methods
    def get_user_subscription(self, db: Session, user_id: uuid.UUID) -> Optional[Subscription]:
        """Get user's current subscription."""
        return db.query(Subscription).filter(Subscription.user_id == user_id).first()
    
    def create_subscription(
        self,
        db: Session,
        user_id: uuid.UUID,
        plan_id: uuid.UUID,
        billing_cycle: str = "monthly",
        provider: Optional[PaymentProvider] = None,
        provider_subscription_id: Optional[str] = None,
        provider_customer_id: Optional[str] = None,
    ) -> Subscription:
        """Create a new subscription."""
        now = datetime.utcnow()
        period_end = now + timedelta(days=30 if billing_cycle == "monthly" else 365)
        
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            status=SubscriptionStatus.ACTIVE,
            payment_provider=provider,
            provider_subscription_id=provider_subscription_id,
            provider_customer_id=provider_customer_id,
            billing_cycle=billing_cycle,
            current_period_start=now,
            current_period_end=period_end,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        return subscription
    
    def cancel_subscription(
        self,
        db: Session,
        subscription: Subscription,
        cancel_immediately: bool = False
    ) -> Subscription:
        """Cancel a subscription."""
        if cancel_immediately:
            subscription.status = SubscriptionStatus.CANCELED
            subscription.canceled_at = datetime.utcnow()
        else:
            subscription.cancel_at_period_end = True
        
        db.commit()
        db.refresh(subscription)
        return subscription
    
    # Paystack integration
    async def initialize_paystack_payment(
        self,
        db: Session,
        user_id: uuid.UUID,
        email: str,
        plan_tier: str,
        billing_cycle: str,
        callback_url: Optional[str] = None
    ) -> dict:
        """Initialize a Paystack payment."""
        plan = self.get_plan_by_tier(db, PlanTier(plan_tier))
        if not plan:
            raise AppException("Plan not found", status_code=404)
        
        amount = plan.price_monthly if billing_cycle == "monthly" else plan.price_yearly
        amount_kobo = int(amount * 100)  # Paystack uses kobo (smallest currency unit)
        
        reference = f"ghostworker_{uuid.uuid4().hex[:16]}"
        
        payload = {
            "email": email,
            "amount": amount_kobo,
            "currency": "NGN",  # Paystack primarily supports NGN
            "reference": reference,
            "callback_url": callback_url or f"{settings.FRONTEND_URL}/billing/callback",
            "metadata": {
                "user_id": str(user_id),
                "plan_tier": plan_tier,
                "billing_cycle": billing_cycle,
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.paystack_base_url}/transaction/initialize",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.paystack_secret_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                raise AppException("Failed to initialize payment", status_code=500)
            
            data = response.json()
            if not data.get("status"):
                raise AppException(data.get("message", "Payment initialization failed"), status_code=400)
            
            # Create pending payment record
            payment = Payment(
                user_id=user_id,
                provider=PaymentProvider.PAYSTACK,
                provider_reference=reference,
                amount=amount,
                currency="NGN",
                status=PaymentStatus.PENDING,
                payment_type="subscription",
                description=f"{plan.name} plan - {billing_cycle}",
                metadata=json.dumps(payload["metadata"])
            )
            db.add(payment)
            db.commit()
            
            return {
                "authorization_url": data["data"]["authorization_url"],
                "access_code": data["data"]["access_code"],
                "reference": reference
            }
    
    async def verify_paystack_payment(
        self,
        db: Session,
        reference: str
    ) -> Tuple[bool, Optional[Subscription]]:
        """Verify a Paystack payment and create subscription."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.paystack_base_url}/transaction/verify/{reference}",
                headers={"Authorization": f"Bearer {self.paystack_secret_key}"}
            )
            
            if response.status_code != 200:
                return False, None
            
            data = response.json()
            if not data.get("status") or data["data"]["status"] != "success":
                return False, None
            
            # Update payment record
            payment = db.query(Payment).filter(
                Payment.provider_reference == reference
            ).first()
            
            if not payment:
                return False, None
            
            payment.status = PaymentStatus.COMPLETED
            payment.provider_payment_id = str(data["data"]["id"])
            payment.paid_at = datetime.utcnow()
            
            # Get metadata
            metadata = json.loads(payment.metadata) if payment.metadata else {}
            plan_tier = metadata.get("plan_tier")
            billing_cycle = metadata.get("billing_cycle", "monthly")
            
            # Get or create subscription
            plan = self.get_plan_by_tier(db, PlanTier(plan_tier))
            if not plan:
                return False, None
            
            existing_sub = self.get_user_subscription(db, payment.user_id)
            if existing_sub:
                # Update existing subscription
                existing_sub.plan_id = plan.id
                existing_sub.status = SubscriptionStatus.ACTIVE
                existing_sub.billing_cycle = billing_cycle
                existing_sub.current_period_start = datetime.utcnow()
                existing_sub.current_period_end = datetime.utcnow() + timedelta(
                    days=30 if billing_cycle == "monthly" else 365
                )
                existing_sub.cancel_at_period_end = False
                existing_sub.payment_provider = PaymentProvider.PAYSTACK
                db.commit()
                db.refresh(existing_sub)
                return True, existing_sub
            else:
                # Create new subscription
                subscription = self.create_subscription(
                    db, payment.user_id, plan.id, billing_cycle,
                    PaymentProvider.PAYSTACK
                )
                return True, subscription
    
    # Coinbase Commerce integration
    async def create_coinbase_charge(
        self,
        db: Session,
        user_id: uuid.UUID,
        email: str,
        plan_tier: str,
        billing_cycle: str,
        redirect_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> dict:
        """Create a Coinbase Commerce charge."""
        plan = self.get_plan_by_tier(db, PlanTier(plan_tier))
        if not plan:
            raise AppException("Plan not found", status_code=404)
        
        amount = plan.price_monthly if billing_cycle == "monthly" else plan.price_yearly
        
        payload = {
            "name": f"GhostWorker {plan.name} Plan",
            "description": f"{plan.name} subscription - {billing_cycle}",
            "pricing_type": "fixed_price",
            "local_price": {
                "amount": str(amount),
                "currency": "USD"
            },
            "metadata": {
                "user_id": str(user_id),
                "plan_tier": plan_tier,
                "billing_cycle": billing_cycle,
            },
            "redirect_url": redirect_url or f"{settings.FRONTEND_URL}/billing/success",
            "cancel_url": cancel_url or f"{settings.FRONTEND_URL}/billing/cancel"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.coinbase_base_url}/charges",
                json=payload,
                headers={
                    "X-CC-Api-Key": self.coinbase_api_key,
                    "X-CC-Version": "2018-03-22",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code not in [200, 201]:
                raise AppException("Failed to create charge", status_code=500)
            
            data = response.json()["data"]
            
            # Create pending payment record
            payment = Payment(
                user_id=user_id,
                provider=PaymentProvider.COINBASE,
                provider_payment_id=data["id"],
                provider_reference=data["code"],
                amount=amount,
                currency="USD",
                status=PaymentStatus.PENDING,
                payment_type="subscription",
                description=f"{plan.name} plan - {billing_cycle}",
                metadata=json.dumps(payload["metadata"])
            )
            db.add(payment)
            db.commit()
            
            return {
                "charge_id": data["id"],
                "hosted_url": data["hosted_url"],
                "expires_at": data["expires_at"]
            }
    
    async def verify_coinbase_charge(
        self,
        db: Session,
        charge_id: str
    ) -> Tuple[bool, Optional[Subscription]]:
        """Verify a Coinbase Commerce charge."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.coinbase_base_url}/charges/{charge_id}",
                headers={
                    "X-CC-Api-Key": self.coinbase_api_key,
                    "X-CC-Version": "2018-03-22"
                }
            )
            
            if response.status_code != 200:
                return False, None
            
            data = response.json()["data"]
            
            # Check if payment is completed
            timeline = data.get("timeline", [])
            is_completed = any(t["status"] == "COMPLETED" for t in timeline)
            
            if not is_completed:
                return False, None
            
            # Update payment record
            payment = db.query(Payment).filter(
                Payment.provider_payment_id == charge_id
            ).first()
            
            if not payment:
                return False, None
            
            payment.status = PaymentStatus.COMPLETED
            payment.paid_at = datetime.utcnow()
            
            # Get metadata
            metadata = json.loads(payment.metadata) if payment.metadata else {}
            plan_tier = metadata.get("plan_tier")
            billing_cycle = metadata.get("billing_cycle", "monthly")
            
            # Create or update subscription
            plan = self.get_plan_by_tier(db, PlanTier(plan_tier))
            if not plan:
                return False, None
            
            existing_sub = self.get_user_subscription(db, payment.user_id)
            if existing_sub:
                existing_sub.plan_id = plan.id
                existing_sub.status = SubscriptionStatus.ACTIVE
                existing_sub.billing_cycle = billing_cycle
                existing_sub.current_period_start = datetime.utcnow()
                existing_sub.current_period_end = datetime.utcnow() + timedelta(
                    days=30 if billing_cycle == "monthly" else 365
                )
                existing_sub.cancel_at_period_end = False
                existing_sub.payment_provider = PaymentProvider.COINBASE
                db.commit()
                db.refresh(existing_sub)
                return True, existing_sub
            else:
                subscription = self.create_subscription(
                    db, payment.user_id, plan.id, billing_cycle,
                    PaymentProvider.COINBASE
                )
                return True, subscription
    
    # Usage tracking
    def get_user_usage(self, db: Session, user_id: uuid.UUID) -> Optional[UsageRecord]:
        """Get current period usage for user."""
        now = datetime.utcnow()
        return db.query(UsageRecord).filter(
            UsageRecord.user_id == user_id,
            UsageRecord.period_start <= now,
            UsageRecord.period_end >= now
        ).first()
    
    def increment_usage(
        self,
        db: Session,
        user_id: uuid.UUID,
        field: str,
        amount: int = 1
    ) -> UsageRecord:
        """Increment usage counter."""
        usage = self.get_user_usage(db, user_id)
        
        if not usage:
            # Create new usage record
            now = datetime.utcnow()
            usage = UsageRecord(
                user_id=user_id,
                period_start=now,
                period_end=now + timedelta(days=30)
            )
            db.add(usage)
        
        if hasattr(usage, field):
            setattr(usage, field, getattr(usage, field) + amount)
        
        db.commit()
        db.refresh(usage)
        return usage
    
    # Invoice methods
    def get_user_invoices(self, db: Session, user_id: uuid.UUID) -> list:
        """Get user's invoices."""
        return db.query(Invoice).filter(Invoice.user_id == user_id).order_by(Invoice.issued_at.desc()).all()
    
    def create_invoice(
        self,
        db: Session,
        user_id: uuid.UUID,
        payment: Payment,
        subscription: Optional[Subscription] = None
    ) -> Invoice:
        """Create an invoice for a payment."""
        invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:8].upper()}"
        
        invoice = Invoice(
            user_id=user_id,
            payment_id=payment.id,
            subscription_id=subscription.id if subscription else None,
            invoice_number=invoice_number,
            subtotal=payment.amount,
            tax=Decimal("0"),
            total=payment.amount,
            currency=payment.currency,
            status="paid",
            line_items=json.dumps([{
                "description": payment.description,
                "amount": str(payment.amount),
                "currency": payment.currency
            }]),
            issued_at=datetime.utcnow(),
            paid_at=payment.paid_at
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        return invoice


billing_service = BillingService()
