"""
API routes for advanced features.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.advanced import (
    CannedResponseCreate, CannedResponseUpdate, CannedResponseResponse,
    CustomerTagCreate, CustomerTagUpdate, CustomerTagResponse,
    CustomerSegmentCreate, CustomerSegmentUpdate, CustomerSegmentResponse,
    CustomerProfileResponse, CustomerProfileUpdate,
    AISummaryResponse, GenerateSummaryRequest,
    VoiceTranscriptionResponse, TranscribeAudioRequest,
    SentimentDashboardResponse,
    CRMIntegrationCreate, CRMIntegrationUpdate, CRMIntegrationResponse, CRMOAuthURLResponse, CRMSyncLogResponse,
    AITrainingDataCreate, AITrainingDataUpdate, AITrainingDataResponse,
    AIModelCreate, AIModelResponse, StartTrainingRequest,
    CallResponse, InitiateCallRequest, CallTokenResponse,
    BlockchainAuditLogResponse, VerifyAuditLogRequest, VerifyAuditLogResponse,
    WhiteLabelSettingsUpdate, WhiteLabelSettingsResponse, VerifyDomainRequest, VerifyDomainResponse,
    PredictionDashboardResponse,
    AISettingsUpdate, AISettingsResponse, AIGenerateResponseRequest, AIGenerateResponseResponse,
    AITranslateRequest, AITranslateResponse
)
from app.services.advanced_service import advanced_service
from app.services.ai_service import ai_service
from app.services.crm_service import crm_service
from app.services.voice_video_service import voice_video_service
from app.services.blockchain_service import blockchain_service

router = APIRouter()

# ==========================================
# CANNED RESPONSES
# ==========================================

@router.get("/canned-responses", response_model=List[CannedResponseResponse])
def get_canned_responses(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return advanced_service.get_canned_responses(db, current_user.id, category, search)

@router.post("/canned-responses", response_model=CannedResponseResponse)
def create_canned_response(
    data: CannedResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return advanced_service.create_canned_response(db, current_user.id, data.model_dump())

@router.patch("/canned-responses/{response_id}", response_model=CannedResponseResponse)
def update_canned_response(
    response_id: UUID,
    data: CannedResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    response = advanced_service.update_canned_response(db, response_id, current_user.id, data.model_dump(exclude_unset=True))
    if not response:
        raise HTTPException(status_code=404, detail="Canned response not found")
    return response

@router.delete("/canned-responses/{response_id}")
def delete_canned_response(
    response_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not advanced_service.delete_canned_response(db, response_id, current_user.id):
        raise HTTPException(status_code=404, detail="Canned response not found")
    return {"message": "Deleted successfully"}

@router.post("/canned-responses/{response_id}/use", response_model=CannedResponseResponse)
def use_canned_response(
    response_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    response = advanced_service.use_canned_response(db, response_id, current_user.id)
    if not response:
        raise HTTPException(status_code=404, detail="Canned response not found")
    return response

# ==========================================
# CUSTOMER TAGS
# ==========================================

@router.get("/tags", response_model=List[CustomerTagResponse])
def get_tags(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.get_tags(db, current_user.id)

@router.post("/tags", response_model=CustomerTagResponse)
def create_tag(data: CustomerTagCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.create_tag(db, current_user.id, data.model_dump())

@router.patch("/tags/{tag_id}", response_model=CustomerTagResponse)
def update_tag(tag_id: UUID, data: CustomerTagUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tag = advanced_service.update_tag(db, tag_id, current_user.id, data.model_dump(exclude_unset=True))
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag

@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not advanced_service.delete_tag(db, tag_id, current_user.id):
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"message": "Deleted successfully"}

# ==========================================
# CUSTOMER SEGMENTS
# ==========================================

@router.get("/segments", response_model=List[CustomerSegmentResponse])
def get_segments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.get_segments(db, current_user.id)

@router.post("/segments", response_model=CustomerSegmentResponse)
def create_segment(data: CustomerSegmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.create_segment(db, current_user.id, data.model_dump())

@router.patch("/segments/{segment_id}", response_model=CustomerSegmentResponse)
def update_segment(segment_id: UUID, data: CustomerSegmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    segment = advanced_service.update_segment(db, segment_id, current_user.id, data.model_dump(exclude_unset=True))
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    return segment

@router.delete("/segments/{segment_id}")
def delete_segment(segment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not advanced_service.delete_segment(db, segment_id, current_user.id):
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"message": "Deleted successfully"}

@router.post("/segments/{segment_id}/compute", response_model=CustomerSegmentResponse)
def compute_segment(segment_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    segment = advanced_service.compute_segment(db, segment_id, current_user.id)
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    return segment

# ==========================================
# CUSTOMER PROFILES
# ==========================================

@router.get("/customers", response_model=List[CustomerProfileResponse])
def get_customer_profiles(
    tag_id: Optional[UUID] = None,
    segment_id: Optional[UUID] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return advanced_service.get_customer_profiles(db, current_user.id, tag_id, segment_id, search, limit, offset)

@router.get("/customers/{profile_id}", response_model=CustomerProfileResponse)
def get_customer_profile(profile_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = advanced_service.get_customer_profile(db, profile_id, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")
    return profile

@router.patch("/customers/{profile_id}", response_model=CustomerProfileResponse)
def update_customer_profile(profile_id: UUID, data: CustomerProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = advanced_service.update_customer_profile(db, profile_id, current_user.id, data.model_dump(exclude_unset=True))
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")
    return profile

@router.post("/customers/{profile_id}/tags/{tag_id}", response_model=CustomerProfileResponse)
def add_tag_to_customer(profile_id: UUID, tag_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = advanced_service.add_tag_to_customer(db, profile_id, tag_id, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")
    return profile

@router.delete("/customers/{profile_id}/tags/{tag_id}", response_model=CustomerProfileResponse)
def remove_tag_from_customer(profile_id: UUID, tag_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = advanced_service.remove_tag_from_customer(db, profile_id, tag_id, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")
    return profile

# ==========================================
# AI FEATURES
# ==========================================

@router.post("/ai/summary", response_model=AISummaryResponse)
async def generate_summary(data: GenerateSummaryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get messages from conversation (simplified)
    messages = []  # Would fetch from conversation_service
    return await ai_service.generate_summary(db, data.conversation_id, messages, current_user.id)

@router.post("/ai/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_audio(data: TranscribeAudioRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await ai_service.transcribe_audio(db, data.audio_url, data.conversation_id, data.message_id)

@router.get("/ai/sentiment-dashboard", response_model=SentimentDashboardResponse)
def get_sentiment_dashboard(days: int = 30, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.get_sentiment_dashboard(db, current_user.id, days)

@router.get("/ai/settings", response_model=AISettingsResponse)
def get_ai_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = ai_service.get_ai_settings(db, current_user.id)
    if not settings:
        raise HTTPException(status_code=404, detail="AI settings not found")
    return settings

@router.put("/ai/settings", response_model=AISettingsResponse)
def update_ai_settings(data: AISettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return ai_service.update_ai_settings(db, current_user.id, data.model_dump(exclude_unset=True))

@router.post("/ai/generate-response", response_model=AIGenerateResponseResponse)
async def generate_ai_response(data: AIGenerateResponseRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    context = []  # Would fetch from conversation
    return await ai_service.generate_response(db, current_user.id, context, data.context or "")

@router.post("/ai/translate", response_model=AITranslateResponse)
async def translate_text(data: AITranslateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await ai_service.translate_text(data.text, data.target_language, data.source_language)

# ==========================================
# CRM INTEGRATIONS
# ==========================================

@router.get("/crm", response_model=List[CRMIntegrationResponse])
def get_crm_integrations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crm_service.get_integrations(db, current_user.id)

@router.get("/crm/{crm_type}/oauth-url", response_model=CRMOAuthURLResponse)
def get_crm_oauth_url(crm_type: str, redirect_uri: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crm_service.get_oauth_url(crm_type, redirect_uri)

@router.post("/crm/{crm_type}/callback", response_model=CRMIntegrationResponse)
async def handle_crm_callback(crm_type: str, code: str, redirect_uri: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await crm_service.handle_oauth_callback(db, current_user.id, crm_type, code, redirect_uri)

@router.post("/crm/{integration_id}/sync", response_model=CRMSyncLogResponse)
async def sync_crm(integration_id: UUID, direction: str = "pull", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    integration = crm_service.get_integration(db, current_user.id, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="CRM integration not found")
    return await crm_service.sync_contacts(db, integration, direction)

@router.delete("/crm/{integration_id}")
def disconnect_crm(integration_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    integration = crm_service.get_integration(db, current_user.id, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="CRM integration not found")
    crm_service.disconnect(db, integration)
    return {"message": "Disconnected successfully"}

@router.get("/crm/{integration_id}/sync-logs", response_model=List[CRMSyncLogResponse])
def get_crm_sync_logs(integration_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crm_service.get_sync_logs(db, integration_id)

# ==========================================
# VOICE/VIDEO CALLS
# ==========================================

@router.post("/calls/voice", response_model=CallResponse)
def initiate_voice_call(data: InitiateCallRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voice_video_service.initiate_voice_call(db, current_user.id, data.to_number, data.conversation_id)

@router.get("/calls/voice-token", response_model=CallTokenResponse)
def get_voice_token(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voice_video_service.get_voice_token(db, current_user.id)

@router.get("/calls/video-token", response_model=CallTokenResponse)
def get_video_token(room_name: Optional[str] = None, conversation_id: Optional[UUID] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voice_video_service.get_video_token(db, current_user.id, room_name, conversation_id)

@router.post("/calls/{call_id}/end", response_model=CallResponse)
def end_call(call_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    call = voice_video_service.end_call(db, call_id, current_user.id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call

@router.get("/calls", response_model=List[CallResponse])
def get_calls(conversation_id: Optional[UUID] = None, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voice_video_service.get_calls(db, current_user.id, conversation_id, limit)

# ==========================================
# BLOCKCHAIN AUDIT
# ==========================================

@router.get("/audit-logs", response_model=List[BlockchainAuditLogResponse])
def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return blockchain_service.get_audit_logs(db, current_user.id, entity_type, entity_id, limit)

@router.post("/audit-logs/verify", response_model=VerifyAuditLogResponse)
async def verify_audit_log(data: VerifyAuditLogRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await blockchain_service.verify_audit_log(db, data.audit_log_id)

# ==========================================
# WHITE LABEL
# ==========================================

@router.get("/white-label", response_model=WhiteLabelSettingsResponse)
def get_white_label_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = advanced_service.get_white_label_settings(db, current_user.id)
    if not settings:
        raise HTTPException(status_code=404, detail="White label settings not found")
    return settings

@router.put("/white-label", response_model=WhiteLabelSettingsResponse)
def update_white_label_settings(data: WhiteLabelSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.update_white_label_settings(db, current_user.id, data.model_dump(exclude_unset=True))

@router.post("/white-label/verify-domain", response_model=VerifyDomainResponse)
def verify_domain(data: VerifyDomainRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.verify_domain(db, current_user.id, data.domain)

# ==========================================
# PREDICTIVE ANALYTICS
# ==========================================

@router.get("/predictions", response_model=PredictionDashboardResponse)
def get_prediction_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return advanced_service.get_prediction_dashboard(db, current_user.id)
