"""
User service for user management operations.
"""
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, AuthorizationError
from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole, AppRole, SecurityEvent, SecurityEventType
from app.schemas.user import UserUpdate, PasswordChange
from app.services.email_service import email_service


class UserService:
    """User management service."""
    
    def get_by_id(self, db: Session, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email.lower()).first()
    
    def list_users(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[User]:
        """List users with optional filtering."""
        query = db.query(User)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.email.ilike(search_term)) |
                (User.first_name.ilike(search_term)) |
                (User.last_name.ilike(search_term))
            )
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        return query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    def count_users(
        self,
        db: Session,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> int:
        """Count users with optional filtering."""
        query = db.query(User)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.email.ilike(search_term)) |
                (User.first_name.ilike(search_term)) |
                (User.last_name.ilike(search_term))
            )
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        return query.count()
    
    def update_user(
        self,
        db: Session,
        user_id: UUID,
        update_data: UserUpdate
    ) -> User:
        """Update user profile."""
        user = self.get_by_id(db, user_id)
        if not user:
            raise NotFoundError("User not found")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        return user
    
    async def change_password(
        self,
        db: Session,
        user_id: UUID,
        password_data: PasswordChange,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Change user password."""
        user = self.get_by_id(db, user_id)
        if not user:
            raise NotFoundError("User not found")
        
        # Verify current password
        if not user.hashed_password:
            raise AuthorizationError("Cannot change password for OAuth-only account")
        
        if not verify_password(password_data.current_password, user.hashed_password):
            raise AuthorizationError("Current password is incorrect")
        
        # Validate new passwords match
        if password_data.new_password != password_data.confirm_new_password:
            raise AuthorizationError("New passwords do not match")
        
        # Update password
        user.hashed_password = hash_password(password_data.new_password)
        
        # Log security event
        event = SecurityEvent(
            user_id=user.id,
            event_type=SecurityEventType.PASSWORD_CHANGED,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(event)
        
        db.commit()
        
        # Send security alert
        await email_service.send_security_alert(
            to_email=user.email,
            user_name=user.full_name,
            event_type="password_changed",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return True
    
    def deactivate_user(
        self,
        db: Session,
        user_id: UUID,
        admin_id: UUID
    ) -> bool:
        """Deactivate a user account."""
        user = self.get_by_id(db, user_id)
        if not user:
            raise NotFoundError("User not found")
        
        user.is_active = False
        db.commit()
        
        return True
    
    def activate_user(
        self,
        db: Session,
        user_id: UUID,
        admin_id: UUID
    ) -> bool:
        """Activate a user account."""
        user = self.get_by_id(db, user_id)
        if not user:
            raise NotFoundError("User not found")
        
        user.is_active = True
        db.commit()
        
        return True
    
    def assign_role(
        self,
        db: Session,
        user_id: UUID,
        role: AppRole,
        assigned_by: UUID
    ) -> UserRole:
        """Assign a role to a user."""
        user = self.get_by_id(db, user_id)
        if not user:
            raise NotFoundError("User not found")
        
        # Check if role already assigned
        existing = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role == role
        ).first()
        
        if existing:
            return existing
        
        user_role = UserRole(
            user_id=user_id,
            role=role,
            assigned_by=assigned_by
        )
        db.add(user_role)
        db.commit()
        db.refresh(user_role)
        
        return user_role
    
    def remove_role(
        self,
        db: Session,
        user_id: UUID,
        role: AppRole
    ) -> bool:
        """Remove a role from a user."""
        deleted = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role == role
        ).delete()
        
        db.commit()
        return deleted > 0
    
    def get_security_events(
        self,
        db: Session,
        user_id: UUID,
        limit: int = 50
    ) -> List[SecurityEvent]:
        """Get user's security event history."""
        return db.query(SecurityEvent).filter(
            SecurityEvent.user_id == user_id
        ).order_by(SecurityEvent.created_at.desc()).limit(limit).all()


user_service = UserService()
