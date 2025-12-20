"""
Pydantic schemas for advanced features.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


# ==========================================
# CANNED RESPONSES
# ==========================================
class CannedResponseBase(BaseModel):
    title: str
    content: str
    shortcut: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []


class CannedResponseCreate(CannedResponseBase):
    pass


class CannedResponseUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    shortcut: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class CannedResponseResponse(CannedResponseBase):
    id: UUID
    user_id: UUID
    team_id: Optional[UUID] = None
    usage_count: int = 0
    last_used: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# CUSTOMER TAGS
# ==========================================
class CustomerTagBase(BaseModel):
    name: str
    color: str = "#3B82F6"
    description: Optional[str] = None


class CustomerTagCreate(CustomerTagBase):
    pass


class CustomerTagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class CustomerTagResponse(CustomerTagBase):
    id: UUID
    user_id: UUID
    usage_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# CUSTOMER SEGMENTS
# ==========================================
class SegmentCondition(BaseModel):
    field: str
    operator: str  # equals, not_equals, contains, greater_than, less_than, etc.
    value: Any


class SegmentRules(BaseModel):
    operator: str = "AND"  # AND, OR
    conditions: List[SegmentCondition] = []


class CustomerSegmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    rules: SegmentRules = SegmentRules()
    is_dynamic: bool = True


class CustomerSegmentCreate(CustomerSegmentBase):
    pass


class CustomerSegmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[SegmentRules] = None
    is_dynamic: Optional[bool] = None


class CustomerSegmentResponse(CustomerSegmentBase):
    id: UUID
    user_id: UUID
    customer_count: int = 0
    last_computed: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# CUSTOMER PROFILES
# ==========================================
class CustomerProfileBase(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    attributes: Dict[str, Any] = {}


class CustomerProfileCreate(CustomerProfileBase):
    external_id: Optional[str] = None
    tags: List[UUID] = []


class CustomerProfileUpdate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    tags: Optional[List[UUID]] = None


class CustomerProfileResponse(CustomerProfileBase):
    id: UUID
    user_id: UUID
    external_id: Optional[str] = None
    first_seen: datetime
    last_seen: Optional[datetime] = None
    tags: List[UUID] = []
    segments: List[UUID] = []
    total_conversations: int = 0
    total_orders: int = 0
    total_spent: float = 0
    avg_sentiment: Optional[float] = None
    crm_sync_status: Optional[str] = None
    crm_external_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# AI SUMMARIES
# ==========================================
class AISummaryResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    summary: str
    key_points: List[str] = []
    action_items: List[str] = []
    overall_sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_breakdown: Optional[Dict[str, float]] = None
    detected_language: Optional[str] = None
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateSummaryRequest(BaseModel):
    conversation_id: UUID


# ==========================================
# VOICE TRANSCRIPTION
# ==========================================
class VoiceTranscriptionResponse(BaseModel):
    id: UUID
    message_id: Optional[UUID] = None
    conversation_id: UUID
    audio_url: Optional[str] = None
    audio_duration_seconds: Optional[int] = None
    transcription: str
    confidence: Optional[float] = None
    language: Optional[str] = None
    word_timings: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TranscribeAudioRequest(BaseModel):
    audio_url: str
    conversation_id: UUID
    message_id: Optional[UUID] = None


# ==========================================
# SENTIMENT ANALYSIS
# ==========================================
class SentimentAnalysisResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    sentiment: str
    score: float
    confidence: Optional[float] = None
    emotions: Optional[Dict[str, float]] = None
    keywords: List[str] = []
    topics: List[str] = []
    analyzed_at: datetime

    class Config:
        from_attributes = True


class SentimentDashboardResponse(BaseModel):
    overall_sentiment: str
    average_score: float
    sentiment_distribution: Dict[str, int]
    sentiment_trend: List[Dict[str, Any]]
    top_emotions: Dict[str, float]
    top_keywords: List[str]
    top_topics: List[str]


# ==========================================
# CRM INTEGRATIONS
# ==========================================
class CRMIntegrationBase(BaseModel):
    crm_type: str  # salesforce, hubspot, pipedrive, zoho
    sync_enabled: bool = True
    sync_interval_minutes: int = 15
    field_mappings: Dict[str, str] = {}


class CRMIntegrationCreate(CRMIntegrationBase):
    credentials: Dict[str, Any]


class CRMIntegrationUpdate(BaseModel):
    sync_enabled: Optional[bool] = None
    sync_interval_minutes: Optional[int] = None
    field_mappings: Optional[Dict[str, str]] = None


class CRMIntegrationResponse(CRMIntegrationBase):
    id: UUID
    user_id: UUID
    status: str
    last_sync: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_error: Optional[str] = None
    contacts_synced: int = 0
    deals_synced: int = 0
    connected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CRMSyncLogResponse(BaseModel):
    id: UUID
    crm_integration_id: UUID
    sync_type: str
    direction: str
    status: str
    records_processed: int
    records_created: int
    records_updated: int
    records_failed: int
    errors: List[Dict[str, Any]] = []
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    class Config:
        from_attributes = True


class CRMOAuthURLResponse(BaseModel):
    url: str
    state: str


# ==========================================
# AI TRAINING
# ==========================================
class AITrainingDataBase(BaseModel):
    training_type: str  # response, classification, extraction
    input_text: str
    expected_output: str
    context: Dict[str, Any] = {}
    category: Optional[str] = None
    tags: List[str] = []


class AITrainingDataCreate(AITrainingDataBase):
    pass


class AITrainingDataUpdate(BaseModel):
    input_text: Optional[str] = None
    expected_output: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_validated: Optional[bool] = None


class AITrainingDataResponse(AITrainingDataBase):
    id: UUID
    user_id: UUID
    is_validated: bool = False
    validated_by: Optional[UUID] = None
    validated_at: Optional[datetime] = None
    usage_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIModelBase(BaseModel):
    name: str
    description: Optional[str] = None
    model_type: str  # response, classification, sentiment
    base_model: str = "gpt-4"


class AIModelCreate(AIModelBase):
    pass


class AIModelResponse(AIModelBase):
    id: UUID
    user_id: UUID
    status: str
    training_samples: int = 0
    accuracy: Optional[float] = None
    loss: Optional[float] = None
    external_model_id: Optional[str] = None
    usage_count: int = 0
    training_started_at: Optional[datetime] = None
    training_completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StartTrainingRequest(BaseModel):
    model_id: UUID


# ==========================================
# VOICE/VIDEO CALLS
# ==========================================
class CallBase(BaseModel):
    call_type: str  # voice, video
    direction: str  # inbound, outbound
    to_number: Optional[str] = None
    conversation_id: Optional[UUID] = None


class InitiateCallRequest(CallBase):
    pass


class CallResponse(CallBase):
    id: UUID
    user_id: UUID
    twilio_call_sid: Optional[str] = None
    twilio_room_name: Optional[str] = None
    from_number: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    recording_url: Optional[str] = None
    quality_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CallTokenResponse(BaseModel):
    token: str
    room_name: str
    identity: str


# ==========================================
# BLOCKCHAIN AUDIT
# ==========================================
class BlockchainAuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    data_hash: str
    network: str
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    block_timestamp: Optional[datetime] = None
    status: str
    confirmations: int = 0
    submitted_at: datetime
    confirmed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VerifyAuditLogRequest(BaseModel):
    audit_log_id: UUID


class VerifyAuditLogResponse(BaseModel):
    is_valid: bool
    on_chain_hash: Optional[str] = None
    stored_hash: str
    block_number: Optional[int] = None
    message: str


# ==========================================
# WHITE LABEL
# ==========================================
class WhiteLabelSettingsBase(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#10B981"
    accent_color: str = "#F59E0B"
    custom_domain: Optional[str] = None
    custom_from_email: Optional[str] = None
    custom_from_name: Optional[str] = None
    hide_powered_by: bool = False


class WhiteLabelSettingsUpdate(WhiteLabelSettingsBase):
    custom_head_scripts: Optional[str] = None
    custom_body_scripts: Optional[str] = None


class WhiteLabelSettingsResponse(WhiteLabelSettingsBase):
    id: UUID
    user_id: UUID
    domain_verified: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VerifyDomainRequest(BaseModel):
    domain: str


class VerifyDomainResponse(BaseModel):
    verified: bool
    dns_records: List[Dict[str, str]]
    message: str


# ==========================================
# PREDICTIVE ANALYTICS
# ==========================================
class PredictiveAnalyticsResponse(BaseModel):
    id: UUID
    prediction_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    prediction_value: float
    confidence: float
    factors: List[Dict[str, Any]] = []
    prediction_date: datetime
    valid_until: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PredictionDashboardResponse(BaseModel):
    churn_predictions: List[Dict[str, Any]]
    conversion_predictions: List[Dict[str, Any]]
    volume_forecast: List[Dict[str, Any]]
    sentiment_trend: List[Dict[str, Any]]
    key_insights: List[str]


# ==========================================
# AI SETTINGS
# ==========================================
class AISettingsBase(BaseModel):
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 500
    system_prompt: Optional[str] = None
    personality: str = "professional"
    primary_language: str = "en"
    supported_languages: List[str] = ["en"]
    auto_translate: bool = True
    auto_respond: bool = False
    auto_summarize: bool = True
    sentiment_analysis: bool = True
    response_delay_seconds: int = 0
    fallback_message: Optional[str] = None
    escalation_keywords: List[str] = []


class AISettingsUpdate(AISettingsBase):
    pass


class AISettingsResponse(AISettingsBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIGenerateResponseRequest(BaseModel):
    conversation_id: UUID
    message_id: Optional[UUID] = None
    context: Optional[str] = None


class AIGenerateResponseResponse(BaseModel):
    response: str
    confidence: float
    language: str
    tokens_used: int


class AITranslateRequest(BaseModel):
    text: str
    source_language: Optional[str] = None
    target_language: str


class AITranslateResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    confidence: float


# ==========================================
# WEBSOCKET
# ==========================================
class WebSocketMessage(BaseModel):
    type: str  # notification, conversation_update, message, etc.
    payload: Dict[str, Any]


class WebSocketConnectionResponse(BaseModel):
    connection_id: str
    user_id: UUID
    connected_at: datetime
