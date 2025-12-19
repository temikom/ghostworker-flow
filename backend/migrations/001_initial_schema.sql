-- GhostWorker Database Migration: Initial Schema
-- This migration creates all the core tables for the application
-- Run this against your PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- PLANS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Limits
    max_conversations INTEGER DEFAULT 100,
    max_messages_per_conversation INTEGER DEFAULT 50,
    max_integrations INTEGER DEFAULT 2,
    max_team_members INTEGER DEFAULT 1,
    max_orders_per_month INTEGER DEFAULT 100,
    max_storage_mb INTEGER DEFAULT 100,
    
    -- Features (JSON array)
    features JSONB DEFAULT '[]'::jsonb,
    
    -- Flags
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plans
INSERT INTO plans (id, name, description, price_monthly, price_yearly, max_conversations, max_messages_per_conversation, max_integrations, max_team_members, max_orders_per_month, max_storage_mb, features, is_popular) VALUES
('free', 'Free', 'Get started with basic features', 0, 0, 100, 50, 2, 1, 100, 100, '["100 conversations/month", "2 integrations", "Basic analytics", "Email support"]'::jsonb, FALSE),
('pro', 'Pro', 'For growing businesses', 29.00, 290.00, 1000, 100, 10, 5, 1000, 1000, '["1,000 conversations/month", "10 integrations", "Advanced analytics", "Priority support", "Custom branding", "API access"]'::jsonb, TRUE),
('business', 'Business', 'For scaling teams', 99.00, 990.00, 10000, 200, 50, 25, 10000, 10000, '["10,000 conversations/month", "50 integrations", "Full analytics suite", "24/7 support", "Custom branding", "API access", "Webhooks", "Team management"]'::jsonb, FALSE),
('enterprise', 'Enterprise', 'Custom solutions for large organizations', 299.00, 2990.00, -1, -1, -1, -1, -1, -1, '["Unlimited conversations", "Unlimited integrations", "Enterprise analytics", "Dedicated support", "Custom branding", "Full API access", "Webhooks", "Advanced team management", "SLA guarantee", "Custom integrations"]'::jsonb, FALSE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    features = EXCLUDED.features,
    updated_at = CURRENT_TIMESTAMP;

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- Email verification
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    
    -- Password reset
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP WITH TIME ZONE,
    lock_reason VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP WITH TIME ZONE,
    
    -- OAuth
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    
    -- Timestamps
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- ==========================================
-- SUBSCRIPTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, past_due, trialing, expired
    
    -- Payment provider
    payment_provider VARCHAR(50), -- paystack, coinbase
    provider_subscription_id VARCHAR(255),
    provider_customer_id VARCHAR(255),
    
    -- Billing
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Dates
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(payment_provider, provider_subscription_id);

-- ==========================================
-- PAYMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Payment details
    payment_provider VARCHAR(50) NOT NULL, -- paystack, coinbase
    provider_payment_id VARCHAR(255),
    provider_reference VARCHAR(255),
    
    -- Amount
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    
    -- Type
    payment_type VARCHAR(50) DEFAULT 'subscription', -- subscription, one_time, addon
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Receipt
    receipt_url TEXT,
    invoice_id VARCHAR(255),
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(payment_provider, provider_payment_id);

-- ==========================================
-- INVOICES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Amount
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, void, uncollectible
    
    -- Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    
    -- Details
    line_items JSONB DEFAULT '[]'::jsonb,
    billing_address JSONB,
    notes TEXT,
    
    -- PDF
    pdf_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- ==========================================
-- TEAMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    avatar_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- ==========================================
-- TEAM MEMBERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, invited, suspended
    
    -- Invitation
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ==========================================
-- INTEGRATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Integration type
    type VARCHAR(50) NOT NULL, -- shopify, woocommerce, whatsapp, instagram, messenger, telegram, email
    name VARCHAR(255) NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'disconnected', -- connected, disconnected, error, pending
    
    -- Credentials (encrypted)
    credentials JSONB DEFAULT '{}'::jsonb,
    
    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    external_id VARCHAR(255),
    external_name VARCHAR(255),
    
    -- Health
    last_sync TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Timestamps
    connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_team ON integrations(team_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);

-- ==========================================
-- CONVERSATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    
    -- Customer info
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_avatar TEXT,
    customer_external_id VARCHAR(255),
    
    -- Conversation details
    channel VARCHAR(50) NOT NULL, -- whatsapp, instagram, messenger, email, telegram, web
    subject TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'open', -- open, pending, resolved, closed, spam
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Tags
    tags TEXT[] DEFAULT '{}',
    
    -- AI
    ai_summary TEXT,
    sentiment VARCHAR(20), -- positive, neutral, negative
    
    -- Timestamps
    last_message_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_integration ON conversations(integration_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_email ON conversations(customer_email);

-- ==========================================
-- MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Sender
    sender_type VARCHAR(20) NOT NULL, -- customer, agent, system, ai
    sender_id UUID REFERENCES users(id),
    sender_name VARCHAR(255),
    
    -- Content
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text, image, file, audio, video, template
    
    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, failed
    
    -- External reference
    external_id VARCHAR(255),
    
    -- AI
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(3, 2),
    
    -- Timestamps
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Order details
    order_number VARCHAR(100) NOT NULL,
    external_order_id VARCHAR(255),
    
    -- Customer
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled, refunded
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    
    -- Amount
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Items
    items JSONB DEFAULT '[]'::jsonb,
    
    -- Shipping
    shipping_address JSONB,
    billing_address JSONB,
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Timestamps
    ordered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- ==========================================
-- WEBHOOKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Webhook details
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    
    -- Events (array of event types)
    events TEXT[] NOT NULL DEFAULT '{}',
    
    -- Authentication
    secret VARCHAR(255),
    headers JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Health
    last_triggered TIMESTAMP WITH TIME ZONE,
    last_status INTEGER,
    last_error TEXT,
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

-- ==========================================
-- WEBHOOK DELIVERIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    
    -- Event
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Delivery
    status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    
    -- Retry
    attempt_count INTEGER DEFAULT 1,
    next_retry TIMESTAMP WITH TIME ZONE,
    
    -- Timing
    duration_ms INTEGER,
    
    -- Timestamps
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

-- ==========================================
-- EMAIL PREFERENCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Notification preferences
    new_conversation BOOLEAN DEFAULT TRUE,
    new_message BOOLEAN DEFAULT TRUE,
    conversation_assigned BOOLEAN DEFAULT TRUE,
    order_created BOOLEAN DEFAULT TRUE,
    order_status_changed BOOLEAN DEFAULT TRUE,
    
    -- Marketing preferences
    product_updates BOOLEAN DEFAULT TRUE,
    tips_and_tutorials BOOLEAN DEFAULT TRUE,
    promotional BOOLEAN DEFAULT FALSE,
    
    -- Billing
    payment_received BOOLEAN DEFAULT TRUE,
    payment_failed BOOLEAN DEFAULT TRUE,
    subscription_expiring BOOLEAN DEFAULT TRUE,
    
    -- Team
    team_invitation BOOLEAN DEFAULT TRUE,
    team_member_joined BOOLEAN DEFAULT TRUE,
    
    -- Digest
    daily_digest BOOLEAN DEFAULT FALSE,
    weekly_digest BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON email_preferences(user_id);

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification details
    type VARCHAR(50) NOT NULL, -- info, success, warning, error
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    
    -- Action
    action_url TEXT,
    action_label VARCHAR(100),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ==========================================
-- USAGE STATS TABLE (for tracking plan limits)
-- ==========================================
CREATE TABLE IF NOT EXISTS usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Usage counts
    conversations_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_period ON usage_stats(period_start, period_end);

-- ==========================================
-- API KEYS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Key details
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL, -- First few characters for identification
    
    -- Permissions
    scopes TEXT[] DEFAULT '{}', -- read, write, admin
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    
    -- Expiry
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ==========================================
-- AUDIT LOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Data
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
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

-- Function to create default email preferences for new users
CREATE OR REPLACE FUNCTION create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-create email preferences for new users
DROP TRIGGER IF EXISTS create_user_email_preferences ON users;
CREATE TRIGGER create_user_email_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_email_preferences();

-- Function to create free subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (user_id, plan_id, status, billing_cycle)
    VALUES (NEW.id, 'free', 'active', 'monthly')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-create free subscription for new users
DROP TRIGGER IF EXISTS create_user_subscription ON users;
CREATE TRIGGER create_user_subscription
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_subscription();

-- ==========================================
-- VIEWS
-- ==========================================

-- View for user dashboard stats
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN c.status = 'open' THEN c.id END) as open_conversations,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT i.id) as active_integrations,
    COALESCE(SUM(o.total), 0) as total_revenue
FROM users u
LEFT JOIN conversations c ON c.user_id = u.id
LEFT JOIN orders o ON o.user_id = u.id
LEFT JOIN integrations i ON i.user_id = u.id AND i.status = 'connected'
GROUP BY u.id;

-- ==========================================
-- GRANT PERMISSIONS (adjust role name as needed)
-- ==========================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

COMMENT ON TABLE plans IS 'Subscription plan definitions with limits and features';
COMMENT ON TABLE users IS 'User accounts with authentication and profile data';
COMMENT ON TABLE subscriptions IS 'User subscriptions linking to plans';
COMMENT ON TABLE payments IS 'Payment transactions from Paystack and Coinbase';
COMMENT ON TABLE invoices IS 'Generated invoices for payments';
COMMENT ON TABLE teams IS 'Team/organization entities';
COMMENT ON TABLE team_members IS 'Team membership and roles';
COMMENT ON TABLE integrations IS 'Connected third-party integrations (Shopify, WhatsApp, etc.)';
COMMENT ON TABLE conversations IS 'Customer conversations across channels';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE orders IS 'Orders synced from integrations';
COMMENT ON TABLE webhooks IS 'User-configured webhook endpoints';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and status';
COMMENT ON TABLE email_preferences IS 'User email notification preferences';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE usage_stats IS 'Monthly usage tracking against plan limits';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON TABLE audit_logs IS 'Audit trail of user actions';
