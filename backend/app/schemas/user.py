"""
User schemas for request/response validation.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user import AppRole


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    
    def validate_passwords_match(self) -> bool:
        """Validate that passwords match."""
        return self.password == self.confirm_password


class UserUpdate(BaseModel):
    """User update schema."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)


class UserRoleResponse(BaseModel):
    """User role response."""
    role: AppRole
    assigned_at: datetime
    
    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """User response schema."""
    id: UUID
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    avatar_url: Optional[str]
    full_name: str
    is_active: bool
    is_email_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime]
    roles: List[UserRoleResponse] = []
    
    class Config:
        from_attributes = True


class UserInDB(UserBase):
    """User in database schema."""
    id: UUID
    hashed_password: Optional[str]
    is_active: bool
    is_email_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    """Password change request."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_new_password: str = Field(..., min_length=8, max_length=100)
