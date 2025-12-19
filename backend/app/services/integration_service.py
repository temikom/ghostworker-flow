"""
Integration service for managing external platform connections.
"""
import json
import secrets
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, AuthorizationError, ConflictError
from app.models.integration import Integration, IntegrationType, IntegrationStatus
from app.schemas.integration import IntegrationCreate, IntegrationUpdate


class IntegrationService:
    """Service for managing integrations."""
    
    def create(
        self,
        db: Session,
        user_id: UUID,
        data: IntegrationCreate
    ) -> Integration:
        """Create a new integration."""
        # Check for duplicate name
        existing = db.query(Integration).filter(
            Integration.user_id == user_id,
            Integration.name == data.name
        ).first()
        
        if existing:
            raise ConflictError("An integration with this name already exists")
        
        # Generate webhook secret
        webhook_secret = secrets.token_urlsafe(32)
        
        integration = Integration(
            user_id=user_id,
            type=data.type,
            name=data.name,
            description=data.description,
            credentials=json.dumps(data.credentials) if data.credentials else None,
            webhook_url=data.webhook_url,
            webhook_secret=webhook_secret,
            n8n_workflow_id=data.n8n_workflow_id,
            n8n_webhook_url=data.n8n_webhook_url,
            status=IntegrationStatus.PENDING
        )
        
        db.add(integration)
        db.commit()
        db.refresh(integration)
        
        return integration
    
    def get_by_id(
        self,
        db: Session,
        integration_id: UUID,
        user_id: Optional[UUID] = None
    ) -> Optional[Integration]:
        """Get integration by ID."""
        query = db.query(Integration).filter(Integration.id == integration_id)
        
        if user_id:
            query = query.filter(Integration.user_id == user_id)
        
        return query.first()
    
    def list_by_user(
        self,
        db: Session,
        user_id: UUID,
        integration_type: Optional[IntegrationType] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Integration]:
        """List integrations for a user."""
        query = db.query(Integration).filter(Integration.user_id == user_id)
        
        if integration_type:
            query = query.filter(Integration.type == integration_type)
        
        if is_active is not None:
            query = query.filter(Integration.is_active == is_active)
        
        return query.order_by(Integration.created_at.desc()).offset(skip).limit(limit).all()
    
    def update(
        self,
        db: Session,
        integration_id: UUID,
        user_id: UUID,
        data: IntegrationUpdate
    ) -> Integration:
        """Update an integration."""
        integration = self.get_by_id(db, integration_id, user_id)
        
        if not integration:
            raise NotFoundError("Integration not found")
        
        update_dict = data.model_dump(exclude_unset=True)
        
        # Handle credentials separately
        if "credentials" in update_dict:
            update_dict["credentials"] = json.dumps(update_dict["credentials"])
        
        for field, value in update_dict.items():
            setattr(integration, field, value)
        
        db.commit()
        db.refresh(integration)
        
        return integration
    
    def delete(
        self,
        db: Session,
        integration_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete an integration."""
        integration = self.get_by_id(db, integration_id, user_id)
        
        if not integration:
            raise NotFoundError("Integration not found")
        
        db.delete(integration)
        db.commit()
        
        return True
    
    def update_status(
        self,
        db: Session,
        integration_id: UUID,
        status: IntegrationStatus,
        error: Optional[str] = None
    ) -> Integration:
        """Update integration status."""
        integration = db.query(Integration).filter(
            Integration.id == integration_id
        ).first()
        
        if not integration:
            raise NotFoundError("Integration not found")
        
        integration.status = status
        
        if error:
            integration.last_error = error
            integration.error_count += 1
        elif status == IntegrationStatus.CONNECTED:
            integration.last_error = None
            integration.error_count = 0
            integration.last_sync_at = datetime.utcnow()
        
        db.commit()
        db.refresh(integration)
        
        return integration
    
    def verify_webhook_secret(
        self,
        db: Session,
        integration_id: UUID,
        secret: str
    ) -> bool:
        """Verify webhook secret for incoming webhooks."""
        integration = db.query(Integration).filter(
            Integration.id == integration_id
        ).first()
        
        if not integration:
            return False
        
        return secrets.compare_digest(integration.webhook_secret or "", secret)


integration_service = IntegrationService()
