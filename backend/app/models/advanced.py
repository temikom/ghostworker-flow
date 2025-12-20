"""
Advanced feature models for GhostWorker.
Includes: Canned responses, Tags, Segments, AI features, CRM, Voice/Video, Blockchain
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, DateTime, Numeric, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship

from app.db.base import Base


class CannedResponse(Base):
    """Pre-written response templates."""
    __tablename__ = "canned_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    shortcut = Column(String(50))
    category = Column(String(100))
    
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True))
    tags = Column(ARRAY(Text), default=[])
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CustomerTag(Base):
    """Custom tags for customers."""
    __tablename__ = "customer_tags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#3B82F6")
    description = Column(Text)
    usage_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CustomerSegment(Base):
    """Dynamic customer segments."""
    __tablename__ = "customer_segments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    rules = Column(JSONB, default={})
    is_dynamic = Column(Boolean, default=True)
    customer_count = Column(Integer, default=0)
    last_computed = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CustomerProfile(Base):
    """Unified customer profiles."""
    __tablename__ = "customer_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    external_id = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    name = Column(String(255))
    avatar_url = Column(Text)
    
    first_seen = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_seen = Column(DateTime(timezone=True))
    
    tags = Column(ARRAY(UUID(as_uuid=True)), default=[])
    segments = Column(ARRAY(UUID(as_uuid=True)), default=[])
    attributes = Column(JSONB, default={})
    
    total_conversations = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Numeric(10, 2), default=0)
    avg_sentiment = Column(Numeric(3, 2))
    
    crm_sync_status = Column(String(50))
    crm_external_id = Column(String(255))
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AISummary(Base):
    """AI-generated conversation summaries."""
    __tablename__ = "ai_summaries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    
    summary = Column(Text, nullable=False)
    key_points = Column(JSONB, default=[])
    action_items = Column(JSONB, default=[])
    
    overall_sentiment = Column(String(20))
    sentiment_score = Column(Numeric(3, 2))
    sentiment_breakdown = Column(JSONB)
    
    detected_language = Column(String(10))
    model_used = Column(String(100))
    tokens_used = Column(Integer)
    processing_time_ms = Column(Integer)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class VoiceTranscription(Base):
    """Voice message transcriptions."""
    __tablename__ = "voice_transcriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"))
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    
    audio_url = Column(Text)
    audio_duration_seconds = Column(Integer)
    audio_format = Column(String(20))
    
    transcription = Column(Text, nullable=False)
    confidence = Column(Numeric(3, 2))
    language = Column(String(10))
    word_timings = Column(JSONB)
    
    model_used = Column(String(100))
    processing_time_ms = Column(Integer)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class SentimentAnalysis(Base):
    """Sentiment analysis results."""
    __tablename__ = "sentiment_analysis"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    
    sentiment = Column(String(20), nullable=False)
    score = Column(Numeric(3, 2), nullable=False)
    confidence = Column(Numeric(3, 2))
    emotions = Column(JSONB)
    keywords = Column(JSONB, default=[])
    topics = Column(JSONB, default=[])
    
    model_used = Column(String(100))
    analyzed_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class CRMIntegration(Base):
    """CRM integration configurations."""
    __tablename__ = "crm_integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    crm_type = Column(String(50), nullable=False)
    credentials = Column(JSONB, nullable=False)
    
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime(timezone=True))
    
    status = Column(String(50), default="disconnected")
    sync_enabled = Column(Boolean, default=True)
    sync_interval_minutes = Column(Integer, default=15)
    last_sync = Column(DateTime(timezone=True))
    last_sync_status = Column(String(50))
    last_sync_error = Column(Text)
    
    field_mappings = Column(JSONB, default={})
    contacts_synced = Column(Integer, default=0)
    deals_synced = Column(Integer, default=0)
    
    connected_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CRMSyncLog(Base):
    """CRM sync history."""
    __tablename__ = "crm_sync_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    crm_integration_id = Column(UUID(as_uuid=True), ForeignKey("crm_integrations.id", ondelete="CASCADE"), nullable=False)
    
    sync_type = Column(String(50), nullable=False)
    direction = Column(String(20), nullable=False)
    
    status = Column(String(50), nullable=False)
    records_processed = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    errors = Column(JSONB, default=[])
    
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)


class AITrainingData(Base):
    """Training data for custom AI models."""
    __tablename__ = "ai_training_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    training_type = Column(String(50), nullable=False)
    input_text = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    context = Column(JSONB, default={})
    
    category = Column(String(100))
    tags = Column(ARRAY(Text), default=[])
    
    is_validated = Column(Boolean, default=False)
    validated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    validated_at = Column(DateTime(timezone=True))
    usage_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class AIModel(Base):
    """Custom trained AI models."""
    __tablename__ = "ai_models"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    model_type = Column(String(50), nullable=False)
    base_model = Column(String(100), default="gpt-4")
    
    status = Column(String(50), default="pending")
    training_samples = Column(Integer, default=0)
    accuracy = Column(Numeric(5, 2))
    loss = Column(Numeric(5, 4))
    
    external_model_id = Column(String(255))
    usage_count = Column(Integer, default=0)
    
    training_started_at = Column(DateTime(timezone=True))
    training_completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Call(Base):
    """Voice and video calls."""
    __tablename__ = "calls"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"))
    
    call_type = Column(String(20), nullable=False)
    direction = Column(String(20), nullable=False)
    
    twilio_call_sid = Column(String(255), unique=True)
    twilio_room_name = Column(String(255))
    
    from_number = Column(String(50))
    to_number = Column(String(50))
    
    status = Column(String(50), default="initiated")
    
    started_at = Column(DateTime(timezone=True))
    answered_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    recording_url = Column(Text)
    recording_duration_seconds = Column(Integer)
    transcription_id = Column(UUID(as_uuid=True), ForeignKey("voice_transcriptions.id"))
    
    quality_score = Column(Numeric(3, 2))
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class BlockchainAuditLog(Base):
    """Blockchain-based audit logs."""
    __tablename__ = "blockchain_audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(UUID(as_uuid=True))
    
    data_hash = Column(String(66), nullable=False)
    payload = Column(JSONB, nullable=False)
    
    network = Column(String(50), default="polygon")
    transaction_hash = Column(String(66))
    block_number = Column(Integer)
    block_timestamp = Column(DateTime(timezone=True))
    
    status = Column(String(50), default="pending")
    confirmations = Column(Integer, default=0)
    gas_used = Column(Integer)
    gas_price_gwei = Column(Numeric(10, 4))
    
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    confirmed_at = Column(DateTime(timezone=True))


class WhiteLabelSettings(Base):
    """White-label branding settings."""
    __tablename__ = "white_label_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    company_name = Column(String(255))
    logo_url = Column(Text)
    favicon_url = Column(Text)
    
    primary_color = Column(String(7), default="#3B82F6")
    secondary_color = Column(String(7), default="#10B981")
    accent_color = Column(String(7), default="#F59E0B")
    
    custom_domain = Column(String(255))
    domain_verified = Column(Boolean, default=False)
    ssl_certificate_id = Column(String(255))
    
    custom_from_email = Column(String(255))
    custom_from_name = Column(String(255))
    
    custom_head_scripts = Column(Text)
    custom_body_scripts = Column(Text)
    hide_powered_by = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class PredictiveAnalytics(Base):
    """AI predictions for churn, conversion, etc."""
    __tablename__ = "predictive_analytics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    prediction_type = Column(String(50), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    
    prediction_value = Column(Numeric(10, 4))
    confidence = Column(Numeric(3, 2))
    factors = Column(JSONB, default=[])
    
    prediction_date = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True))
    model_version = Column(String(50))
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class AISettings(Base):
    """AI configuration settings."""
    __tablename__ = "ai_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    model = Column(String(100), default="gpt-4")
    temperature = Column(Numeric(2, 1), default=0.7)
    max_tokens = Column(Integer, default=500)
    
    system_prompt = Column(Text)
    personality = Column(String(50), default="professional")
    
    primary_language = Column(String(10), default="en")
    supported_languages = Column(ARRAY(Text), default=["en"])
    auto_translate = Column(Boolean, default=True)
    
    auto_respond = Column(Boolean, default=False)
    auto_summarize = Column(Boolean, default=True)
    sentiment_analysis = Column(Boolean, default=True)
    
    response_delay_seconds = Column(Integer, default=0)
    fallback_message = Column(Text)
    escalation_keywords = Column(ARRAY(Text), default=[])
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class WebSocketConnection(Base):
    """Active WebSocket connections."""
    __tablename__ = "websocket_connections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    connection_id = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    
    user_agent = Column(Text)
    ip_address = Column(INET)
    
    connected_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_ping = Column(DateTime(timezone=True), default=datetime.utcnow)
    disconnected_at = Column(DateTime(timezone=True))
