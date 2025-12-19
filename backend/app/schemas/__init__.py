# Schemas module
from app.schemas.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserInDB,
)
from app.schemas.auth import (
    TokenPair,
    TokenPayload,
    LoginRequest,
    SignupRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    EmailVerificationRequest,
    OAuthCallbackRequest,
)
from app.schemas.integration import (
    IntegrationBase,
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
)
from app.schemas.conversation import (
    ConversationBase,
    ConversationResponse,
    MessageBase,
    MessageCreate,
    MessageResponse,
)
from app.schemas.order import (
    OrderBase,
    OrderCreate,
    OrderUpdate,
    OrderResponse,
)

__all__ = [
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserInDB",
    # Auth
    "TokenPair",
    "TokenPayload",
    "LoginRequest",
    "SignupRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    "EmailVerificationRequest",
    "OAuthCallbackRequest",
    # Integration
    "IntegrationBase",
    "IntegrationCreate",
    "IntegrationUpdate",
    "IntegrationResponse",
    # Conversation
    "ConversationBase",
    "ConversationResponse",
    "MessageBase",
    "MessageCreate",
    "MessageResponse",
    # Order
    "OrderBase",
    "OrderCreate",
    "OrderUpdate",
    "OrderResponse",
]
