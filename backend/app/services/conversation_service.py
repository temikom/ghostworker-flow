"""
Conversation service for managing conversations and messages.
"""
import json
from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, AuthorizationError
from app.models.conversation import (
    Conversation,
    ConversationStatus,
    Message,
    MessageDirection,
    MessageStatus,
    MessageType,
)
from app.models.integration import Integration
from app.schemas.conversation import (
    ConversationListParams,
    ConversationUpdate,
    MessageCreate,
    SendMessageRequest,
)


class ConversationService:
    """Service for managing conversations."""
    
    def get_by_id(
        self,
        db: Session,
        conversation_id: UUID,
        user_id: Optional[UUID] = None
    ) -> Optional[Conversation]:
        """Get conversation by ID with messages."""
        query = db.query(Conversation).options(
            joinedload(Conversation.messages),
            joinedload(Conversation.integration)
        ).filter(Conversation.id == conversation_id)
        
        if user_id:
            query = query.filter(Conversation.user_id == user_id)
        
        return query.first()
    
    def list_conversations(
        self,
        db: Session,
        user_id: UUID,
        params: ConversationListParams
    ) -> Tuple[List[Conversation], int]:
        """List conversations with filtering and pagination."""
        query = db.query(Conversation).filter(Conversation.user_id == user_id)
        
        if params.integration_id:
            query = query.filter(Conversation.integration_id == params.integration_id)
        
        if params.status:
            query = query.filter(Conversation.status == params.status)
        
        if params.requires_human is not None:
            query = query.filter(Conversation.requires_human == params.requires_human)
        
        if params.search:
            search_term = f"%{params.search}%"
            query = query.filter(
                (Conversation.contact_name.ilike(search_term)) |
                (Conversation.contact_phone.ilike(search_term)) |
                (Conversation.contact_email.ilike(search_term)) |
                (Conversation.subject.ilike(search_term))
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        skip = (params.page - 1) * params.page_size
        conversations = query.order_by(
            Conversation.last_message_at.desc().nullslast(),
            Conversation.updated_at.desc()
        ).offset(skip).limit(params.page_size).all()
        
        return conversations, total
    
    def create_or_update(
        self,
        db: Session,
        user_id: UUID,
        integration_id: UUID,
        contact_id: str,
        contact_name: Optional[str] = None,
        contact_phone: Optional[str] = None,
        contact_email: Optional[str] = None,
        contact_avatar: Optional[str] = None
    ) -> Conversation:
        """Create or update a conversation."""
        # Check if conversation exists
        conversation = db.query(Conversation).filter(
            Conversation.user_id == user_id,
            Conversation.integration_id == integration_id,
            Conversation.contact_id == contact_id
        ).first()
        
        if conversation:
            # Update contact info if provided
            if contact_name:
                conversation.contact_name = contact_name
            if contact_phone:
                conversation.contact_phone = contact_phone
            if contact_email:
                conversation.contact_email = contact_email
            if contact_avatar:
                conversation.contact_avatar = contact_avatar
            
            db.commit()
            return conversation
        
        # Create new conversation
        conversation = Conversation(
            user_id=user_id,
            integration_id=integration_id,
            contact_id=contact_id,
            contact_name=contact_name,
            contact_phone=contact_phone,
            contact_email=contact_email,
            contact_avatar=contact_avatar,
            status=ConversationStatus.OPEN
        )
        
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        return conversation
    
    def update(
        self,
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
        data: ConversationUpdate
    ) -> Conversation:
        """Update conversation."""
        conversation = self.get_by_id(db, conversation_id, user_id)
        
        if not conversation:
            raise NotFoundError("Conversation not found")
        
        update_dict = data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(conversation, field, value)
        
        db.commit()
        db.refresh(conversation)
        
        return conversation
    
    def add_message(
        self,
        db: Session,
        conversation_id: UUID,
        direction: MessageDirection,
        content: str,
        message_type: MessageType = MessageType.TEXT,
        external_id: Optional[str] = None,
        is_ai_generated: bool = False,
        ai_intent: Optional[str] = None,
        ai_confidence: Optional[int] = None,
        media_url: Optional[str] = None,
        media_mime_type: Optional[str] = None,
        media_filename: Optional[str] = None
    ) -> Message:
        """Add a message to a conversation."""
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if not conversation:
            raise NotFoundError("Conversation not found")
        
        message = Message(
            conversation_id=conversation_id,
            type=message_type,
            direction=direction,
            content=content,
            external_id=external_id,
            is_ai_generated=is_ai_generated,
            ai_intent=ai_intent,
            ai_confidence=ai_confidence,
            media_url=media_url,
            media_mime_type=media_mime_type,
            media_filename=media_filename,
            status=MessageStatus.PENDING if direction == MessageDirection.OUTBOUND else MessageStatus.DELIVERED
        )
        
        db.add(message)
        
        # Update conversation stats
        conversation.message_count += 1
        conversation.last_message_at = datetime.utcnow()
        
        if direction == MessageDirection.INBOUND:
            conversation.unread_count += 1
        
        db.commit()
        db.refresh(message)
        
        return message
    
    def send_message(
        self,
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
        request: SendMessageRequest
    ) -> Message:
        """Send a message from the user."""
        conversation = self.get_by_id(db, conversation_id, user_id)
        
        if not conversation:
            raise NotFoundError("Conversation not found")
        
        message = self.add_message(
            db=db,
            conversation_id=conversation_id,
            direction=MessageDirection.OUTBOUND,
            content=request.content,
            message_type=request.type,
            is_ai_generated=False
        )
        
        # TODO: Send message via integration (WhatsApp, Instagram, etc.)
        
        return message
    
    def mark_as_read(
        self,
        db: Session,
        conversation_id: UUID,
        user_id: UUID
    ) -> bool:
        """Mark all messages in conversation as read."""
        conversation = self.get_by_id(db, conversation_id, user_id)
        
        if not conversation:
            raise NotFoundError("Conversation not found")
        
        # Update unread messages
        db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.direction == MessageDirection.INBOUND,
            Message.read_at.is_(None)
        ).update({"read_at": datetime.utcnow()})
        
        # Reset unread count
        conversation.unread_count = 0
        
        db.commit()
        
        return True
    
    def handoff_to_human(
        self,
        db: Session,
        conversation_id: UUID,
        user_id: UUID,
        reason: Optional[str] = None
    ) -> Conversation:
        """Hand off conversation from AI to human."""
        conversation = self.get_by_id(db, conversation_id, user_id)
        
        if not conversation:
            raise NotFoundError("Conversation not found")
        
        conversation.is_ai_handled = False
        conversation.requires_human = True
        
        if reason:
            # Add system message about handoff
            self.add_message(
                db=db,
                conversation_id=conversation_id,
                direction=MessageDirection.INBOUND,
                content=f"[System] AI handoff requested: {reason}",
                message_type=MessageType.TEXT,
                is_ai_generated=True
            )
        
        db.commit()
        db.refresh(conversation)
        
        return conversation
    
    def get_unread_count(self, db: Session, user_id: UUID) -> int:
        """Get total unread message count for user."""
        from sqlalchemy import func
        
        result = db.query(func.sum(Conversation.unread_count)).filter(
            Conversation.user_id == user_id
        ).scalar()
        
        return result or 0


conversation_service = ConversationService()
