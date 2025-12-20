-- GhostWorker Database Migration: Advanced Features
-- Adds support for: AI features, CRM integrations, voice/video, blockchain, etc.

-- ==========================================
-- CANNED RESPONSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Response details
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    shortcut VARCHAR(50), -- Quick trigger like /greeting
    category VARCHAR(100),
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    
    -- Tags for searchability
    tags TEXT[] DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_canned_responses_user ON canned_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_shortcut ON canned_responses(shortcut);

-- ==========================================
-- CUSTOMER TAGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tag details
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    description TEXT,
    
    -- Usage count
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_customer_tags_user ON customer_tags(user_id);

-- ==========================================
-- CUSTOMER SEGMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Segment details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Rules (JSON-based conditions)
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"operator": "AND", "conditions": [{"field": "total_spent", "op": ">", "value": 1000}]}
    
    -- Dynamic vs Static
    is_dynamic BOOLEAN DEFAULT TRUE,
    
    -- Customer count (cached)
    customer_count INTEGER DEFAULT 0,
    
    -- Timestamps
    last_computed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_segments_user ON customer_segments(user_id);

-- ==========================================
-- CUSTOMER PROFILES TABLE (for segmentation)
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Customer identification
    external_id VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    name VARCHAR(255),
    
    -- Profile data
    avatar_url TEXT,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE,
    
    -- Tags (array of tag IDs)
    tags UUID[] DEFAULT '{}',
    
    -- Segments (array of segment IDs)
    segments UUID[] DEFAULT '{}',
    
    -- Custom attributes
    attributes JSONB DEFAULT '{}'::jsonb,
    
    -- Analytics
    total_conversations INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    avg_sentiment DECIMAL(3, 2), -- -1 to 1
    
    -- CRM sync
    crm_sync_status VARCHAR(50), -- synced, pending, error
    crm_external_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_tags ON customer_profiles USING GIN(tags);

-- ==========================================
-- AI CONVERSATION SUMMARIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Summary content
    summary TEXT NOT NULL,
    key_points JSONB DEFAULT '[]'::jsonb, -- Array of key points
    action_items JSONB DEFAULT '[]'::jsonb, -- Suggested actions
    
    -- Sentiment analysis
    overall_sentiment VARCHAR(20), -- positive, neutral, negative
    sentiment_score DECIMAL(3, 2), -- -1 to 1
    sentiment_breakdown JSONB, -- {positive: 0.7, neutral: 0.2, negative: 0.1}
    
    -- Language detection
    detected_language VARCHAR(10),
    
    -- AI metadata
    model_used VARCHAR(100),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_conversation ON ai_summaries(conversation_id);

-- ==========================================
-- VOICE TRANSCRIPTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS voice_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Audio details
    audio_url TEXT,
    audio_duration_seconds INTEGER,
    audio_format VARCHAR(20),
    
    -- Transcription
    transcription TEXT NOT NULL,
    confidence DECIMAL(3, 2),
    language VARCHAR(10),
    
    -- Word-level timing (for highlighting)
    word_timings JSONB, -- [{word: "hello", start: 0.0, end: 0.5}]
    
    -- AI metadata
    model_used VARCHAR(100),
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_message ON voice_transcriptions(message_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_conversation ON voice_transcriptions(conversation_id);

-- ==========================================
-- SENTIMENT ANALYSIS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reference
    entity_type VARCHAR(50) NOT NULL, -- message, conversation, customer
    entity_id UUID NOT NULL,
    
    -- Sentiment data
    sentiment VARCHAR(20) NOT NULL, -- positive, neutral, negative
    score DECIMAL(3, 2) NOT NULL, -- -1 to 1
    confidence DECIMAL(3, 2),
    
    -- Emotion breakdown
    emotions JSONB, -- {joy: 0.8, anger: 0.1, sadness: 0.05, fear: 0.05}
    
    -- Keywords/topics detected
    keywords JSONB DEFAULT '[]'::jsonb,
    topics JSONB DEFAULT '[]'::jsonb,
    
    -- AI metadata
    model_used VARCHAR(100),
    
    -- Timestamps
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_user ON sentiment_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_entity ON sentiment_analysis(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_sentiment ON sentiment_analysis(sentiment);

-- ==========================================
-- CRM INTEGRATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS crm_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- CRM type
    crm_type VARCHAR(50) NOT NULL, -- salesforce, hubspot, pipedrive, zoho
    
    -- Connection details (encrypted)
    credentials JSONB NOT NULL,
    
    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'disconnected', -- connected, disconnected, error
    
    -- Sync settings
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INTEGER DEFAULT 15,
    last_sync TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50),
    last_sync_error TEXT,
    
    -- Mapping configuration
    field_mappings JSONB DEFAULT '{}'::jsonb,
    
    -- Stats
    contacts_synced INTEGER DEFAULT 0,
    deals_synced INTEGER DEFAULT 0,
    
    -- Timestamps
    connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_integrations_user ON crm_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_integrations_type ON crm_integrations(crm_type);

-- ==========================================
-- CRM SYNC LOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS crm_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,
    
    -- Sync details
    sync_type VARCHAR(50) NOT NULL, -- full, incremental, manual
    direction VARCHAR(20) NOT NULL, -- push, pull, bidirectional
    
    -- Results
    status VARCHAR(50) NOT NULL, -- running, completed, failed
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- Errors
    errors JSONB DEFAULT '[]'::jsonb,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_integration ON crm_sync_logs(crm_integration_id);

-- ==========================================
-- AI TRAINING DATA TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_training_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Training type
    training_type VARCHAR(50) NOT NULL, -- response, classification, extraction
    
    -- Input/Output pairs
    input_text TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    
    -- Context
    context JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    
    -- Validation
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_training_data_user ON ai_training_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_type ON ai_training_data(training_type);

-- ==========================================
-- AI MODELS TABLE (Custom trained models)
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Model details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model_type VARCHAR(50) NOT NULL, -- response, classification, sentiment
    
    -- Base model
    base_model VARCHAR(100) DEFAULT 'gpt-4',
    
    -- Training status
    status VARCHAR(50) DEFAULT 'pending', -- pending, training, ready, failed
    
    -- Training metrics
    training_samples INTEGER DEFAULT 0,
    accuracy DECIMAL(5, 2),
    loss DECIMAL(5, 4),
    
    -- Fine-tuned model ID (from OpenAI)
    external_model_id VARCHAR(255),
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    training_started_at TIMESTAMP WITH TIME ZONE,
    training_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_models_user ON ai_models(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);

-- ==========================================
-- VOICE/VIDEO CALLS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Call details
    call_type VARCHAR(20) NOT NULL, -- voice, video
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    
    -- Twilio details
    twilio_call_sid VARCHAR(255) UNIQUE,
    twilio_room_name VARCHAR(255),
    
    -- Participants
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'initiated', -- initiated, ringing, in_progress, completed, failed, busy, no_answer
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Recording
    recording_url TEXT,
    recording_duration_seconds INTEGER,
    transcription_id UUID REFERENCES voice_transcriptions(id),
    
    -- Quality metrics
    quality_score DECIMAL(3, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_twilio ON calls(twilio_call_sid);

-- ==========================================
-- BLOCKCHAIN AUDIT LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS blockchain_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    
    -- Data
    data_hash VARCHAR(66) NOT NULL, -- Keccak256 hash
    payload JSONB NOT NULL,
    
    -- Blockchain details
    network VARCHAR(50) DEFAULT 'polygon', -- polygon, ethereum
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    block_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, failed
    confirmations INTEGER DEFAULT 0,
    
    -- Gas
    gas_used INTEGER,
    gas_price_gwei DECIMAL(10, 4),
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_blockchain_audit_user ON blockchain_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_tx ON blockchain_audit_logs(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_audit_entity ON blockchain_audit_logs(entity_type, entity_id);

-- ==========================================
-- WHITE LABEL SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS white_label_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Branding
    company_name VARCHAR(255),
    logo_url TEXT,
    favicon_url TEXT,
    
    -- Colors
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#10B981',
    accent_color VARCHAR(7) DEFAULT '#F59E0B',
    
    -- Custom domain
    custom_domain VARCHAR(255),
    domain_verified BOOLEAN DEFAULT FALSE,
    ssl_certificate_id VARCHAR(255),
    
    -- Email settings
    custom_from_email VARCHAR(255),
    custom_from_name VARCHAR(255),
    
    -- Custom scripts
    custom_head_scripts TEXT,
    custom_body_scripts TEXT,
    
    -- Features visibility
    hide_powered_by BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_white_label_user ON white_label_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_domain ON white_label_settings(custom_domain);

-- ==========================================
-- PREDICTIVE ANALYTICS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS predictive_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Prediction type
    prediction_type VARCHAR(50) NOT NULL, -- churn, conversion, volume, sentiment_trend
    
    -- Reference
    entity_type VARCHAR(50), -- customer, conversation, overall
    entity_id UUID,
    
    -- Prediction data
    prediction_value DECIMAL(10, 4),
    confidence DECIMAL(3, 2),
    
    -- Factors contributing to prediction
    factors JSONB DEFAULT '[]'::jsonb,
    
    -- Time range
    prediction_date DATE NOT NULL,
    valid_until DATE,
    
    -- Model used
    model_version VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictive_analytics_user ON predictive_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_predictive_analytics_type ON predictive_analytics(prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictive_analytics_date ON predictive_analytics(prediction_date);

-- ==========================================
-- AI CONVERSATION SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Model settings
    model VARCHAR(100) DEFAULT 'gpt-4',
    temperature DECIMAL(2, 1) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 500,
    
    -- Persona
    system_prompt TEXT,
    personality VARCHAR(50) DEFAULT 'professional', -- professional, friendly, casual, formal
    
    -- Languages
    primary_language VARCHAR(10) DEFAULT 'en',
    supported_languages TEXT[] DEFAULT '{en}',
    auto_translate BOOLEAN DEFAULT TRUE,
    
    -- Features
    auto_respond BOOLEAN DEFAULT FALSE,
    auto_summarize BOOLEAN DEFAULT TRUE,
    sentiment_analysis BOOLEAN DEFAULT TRUE,
    
    -- Response timing
    response_delay_seconds INTEGER DEFAULT 0,
    
    -- Fallback
    fallback_message TEXT,
    escalation_keywords TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_user ON ai_settings(user_id);

-- ==========================================
-- WEBSOCKET CONNECTIONS TABLE (for real-time)
-- ==========================================
CREATE TABLE IF NOT EXISTS websocket_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Connection details
    connection_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_websocket_connections_user ON websocket_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_active ON websocket_connections(is_active);

-- ==========================================
-- APPLY UPDATED_AT TRIGGERS
-- ==========================================
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
        AND table_name IN ('canned_responses', 'customer_tags', 'customer_segments', 
                           'customer_profiles', 'crm_integrations', 'ai_training_data',
                           'ai_models', 'calls', 'white_label_settings', 'ai_settings')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE canned_responses IS 'Pre-written response templates for quick replies';
COMMENT ON TABLE customer_tags IS 'Custom tags for organizing and categorizing customers';
COMMENT ON TABLE customer_segments IS 'Dynamic customer segments based on rules/conditions';
COMMENT ON TABLE customer_profiles IS 'Unified customer profiles with analytics and CRM sync';
COMMENT ON TABLE ai_summaries IS 'AI-generated conversation summaries and insights';
COMMENT ON TABLE voice_transcriptions IS 'Transcriptions of voice messages and calls';
COMMENT ON TABLE sentiment_analysis IS 'Sentiment analysis results for messages and conversations';
COMMENT ON TABLE crm_integrations IS 'CRM integration configurations (Salesforce, HubSpot, etc.)';
COMMENT ON TABLE crm_sync_logs IS 'CRM synchronization history and logs';
COMMENT ON TABLE ai_training_data IS 'Training data for custom AI models';
COMMENT ON TABLE ai_models IS 'Custom trained AI models';
COMMENT ON TABLE calls IS 'Voice and video call records via Twilio';
COMMENT ON TABLE blockchain_audit_logs IS 'Immutable audit trail on Polygon blockchain';
COMMENT ON TABLE white_label_settings IS 'White-label branding and customization settings';
COMMENT ON TABLE predictive_analytics IS 'AI-generated predictions for churn, conversion, etc.';
COMMENT ON TABLE ai_settings IS 'AI configuration for GPT-4 conversational AI';
COMMENT ON TABLE websocket_connections IS 'Active WebSocket connections for real-time updates';
