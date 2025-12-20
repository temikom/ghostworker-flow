"""
Voice and Video Call Service using Twilio.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.advanced import Call, VoiceTranscription


class VoiceVideoService:
    """Service for Twilio voice and video calls."""
    
    def __init__(self):
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        self.api_key = getattr(settings, 'TWILIO_API_KEY', '')
        self.api_secret = getattr(settings, 'TWILIO_API_SECRET', '')
        self.phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', '')
    
    def _get_twilio_client(self):
        """Get Twilio client."""
        try:
            from twilio.rest import Client
            return Client(self.account_sid, self.auth_token)
        except ImportError:
            raise ImportError("twilio package not installed")
    
    def _get_access_token(self, identity: str, room_name: Optional[str] = None):
        """Generate Twilio access token for video."""
        try:
            from twilio.jwt.access_token import AccessToken
            from twilio.jwt.access_token.grants import VideoGrant, VoiceGrant
        except ImportError:
            raise ImportError("twilio package not installed")
        
        token = AccessToken(
            self.account_sid,
            self.api_key,
            self.api_secret,
            identity=identity
        )
        
        if room_name:
            # Video grant
            video_grant = VideoGrant(room=room_name)
            token.add_grant(video_grant)
        else:
            # Voice grant
            voice_grant = VoiceGrant(
                outgoing_application_sid=getattr(settings, 'TWILIO_TWIML_APP_SID', ''),
                incoming_allow=True
            )
            token.add_grant(voice_grant)
        
        return token.to_jwt()
    
    def initiate_voice_call(
        self,
        db: Session,
        user_id: UUID,
        to_number: str,
        conversation_id: Optional[UUID] = None
    ) -> Call:
        """Initiate an outbound voice call."""
        client = self._get_twilio_client()
        
        # Create call record first
        call_record = Call(
            user_id=user_id,
            conversation_id=conversation_id,
            call_type="voice",
            direction="outbound",
            from_number=self.phone_number,
            to_number=to_number,
            status="initiated"
        )
        db.add(call_record)
        db.commit()
        
        try:
            # Make call via Twilio
            twilio_call = client.calls.create(
                to=to_number,
                from_=self.phone_number,
                url=f"{settings.FRONTEND_URL}/api/twilio/voice-webhook",
                status_callback=f"{settings.FRONTEND_URL}/api/twilio/status-callback",
                status_callback_event=["initiated", "ringing", "answered", "completed"],
                record=True
            )
            
            call_record.twilio_call_sid = twilio_call.sid
            call_record.status = "initiated"
            call_record.started_at = datetime.utcnow()
            db.commit()
            
        except Exception as e:
            call_record.status = "failed"
            db.commit()
            raise e
        
        db.refresh(call_record)
        return call_record
    
    def get_video_token(
        self,
        db: Session,
        user_id: UUID,
        room_name: Optional[str] = None,
        conversation_id: Optional[UUID] = None
    ) -> Dict[str, str]:
        """Get access token for video room."""
        if not room_name:
            room_name = f"room_{uuid4().hex[:8]}"
        
        identity = f"user_{user_id}"
        token = self._get_access_token(identity, room_name)
        
        # Create call record for video
        call_record = Call(
            user_id=user_id,
            conversation_id=conversation_id,
            call_type="video",
            direction="outbound",
            twilio_room_name=room_name,
            status="initiated",
            started_at=datetime.utcnow()
        )
        db.add(call_record)
        db.commit()
        
        return {
            "token": token,
            "room_name": room_name,
            "identity": identity
        }
    
    def get_voice_token(self, db: Session, user_id: UUID) -> Dict[str, str]:
        """Get access token for voice calls."""
        identity = f"user_{user_id}"
        token = self._get_access_token(identity)
        
        return {
            "token": token,
            "identity": identity
        }
    
    def handle_status_callback(
        self,
        db: Session,
        call_sid: str,
        status: str,
        duration: Optional[int] = None,
        recording_url: Optional[str] = None
    ) -> Optional[Call]:
        """Handle Twilio status callback."""
        call = db.query(Call).filter(Call.twilio_call_sid == call_sid).first()
        if not call:
            return None
        
        call.status = status
        
        if status == "ringing":
            pass
        elif status == "in-progress" or status == "answered":
            call.answered_at = datetime.utcnow()
        elif status == "completed":
            call.ended_at = datetime.utcnow()
            call.duration_seconds = duration
        elif status in ["busy", "no-answer", "failed", "canceled"]:
            call.ended_at = datetime.utcnow()
        
        if recording_url:
            call.recording_url = recording_url
        
        db.commit()
        db.refresh(call)
        return call
    
    def end_call(self, db: Session, call_id: UUID, user_id: UUID) -> Optional[Call]:
        """End an active call."""
        call = db.query(Call).filter(
            Call.id == call_id,
            Call.user_id == user_id
        ).first()
        
        if not call or call.status in ["completed", "failed"]:
            return None
        
        if call.twilio_call_sid:
            client = self._get_twilio_client()
            try:
                client.calls(call.twilio_call_sid).update(status="completed")
            except Exception:
                pass  # Call may have already ended
        
        call.status = "completed"
        call.ended_at = datetime.utcnow()
        if call.answered_at:
            call.duration_seconds = int(
                (call.ended_at - call.answered_at).total_seconds()
            )
        
        db.commit()
        db.refresh(call)
        return call
    
    def get_calls(
        self,
        db: Session,
        user_id: UUID,
        conversation_id: Optional[UUID] = None,
        limit: int = 50
    ) -> List[Call]:
        """Get call history."""
        query = db.query(Call).filter(Call.user_id == user_id)
        
        if conversation_id:
            query = query.filter(Call.conversation_id == conversation_id)
        
        return query.order_by(Call.created_at.desc()).limit(limit).all()
    
    def get_call(self, db: Session, call_id: UUID, user_id: UUID) -> Optional[Call]:
        """Get specific call."""
        return db.query(Call).filter(
            Call.id == call_id,
            Call.user_id == user_id
        ).first()


# Singleton instance
voice_video_service = VoiceVideoService()
