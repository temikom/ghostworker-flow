// Advanced Feature Types

// ============= WebSocket & Real-time =============
export type WebSocketEventType = 
  | 'message.new'
  | 'message.updated'
  | 'conversation.created'
  | 'conversation.updated'
  | 'conversation.status_changed'
  | 'notification.new'
  | 'presence.update'
  | 'typing.start'
  | 'typing.stop';

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: unknown;
  timestamp: string;
  conversationId?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected: string | null;
  error: string | null;
}

// ============= Sentiment Analysis =============
export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface SentimentScore {
  label: SentimentLabel;
  score: number;
  confidence: number;
}

export interface ConversationSentiment {
  id: string;
  conversationId: string;
  overallSentiment: SentimentLabel;
  sentimentScore: number;
  emotionBreakdown: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
  };
  keywords: string[];
  analyzedAt: string;
}

export interface SentimentTrend {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  averageScore: number;
}

export interface SentimentDashboardData {
  overall: {
    positive: number;
    negative: number;
    neutral: number;
    averageScore: number;
  };
  trends: SentimentTrend[];
  topKeywords: { keyword: string; count: number; sentiment: SentimentLabel }[];
  recentConversations: ConversationSentiment[];
}

// ============= CRM Integrations =============
export type CRMProvider = 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho';

export interface CRMConnection {
  id: string;
  provider: CRMProvider;
  isConnected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
  syncEnabled: boolean;
  settings: {
    autoSyncContacts: boolean;
    autoSyncDeals: boolean;
    syncFrequency: 'realtime' | 'hourly' | 'daily';
  };
}

export interface CRMContact {
  id: string;
  crmId: string;
  provider: CRMProvider;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  syncedAt: string;
}

export interface CRMSyncLog {
  id: string;
  provider: CRMProvider;
  action: 'sync' | 'create' | 'update' | 'delete';
  status: 'success' | 'failed' | 'pending';
  recordType: string;
  recordCount: number;
  timestamp: string;
  error?: string;
}

// ============= Canned Responses =============
export interface CannedResponse {
  id: string;
  name: string;
  content: string;
  category: string;
  shortcut?: string;
  tags: string[];
  language: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CannedResponseCategory {
  id: string;
  name: string;
  color: string;
  responseCount: number;
}

// ============= Customer Tags & Segmentation =============
export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  customerCount: number;
  createdAt: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  customerCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentRule {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | string[];
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags: CustomerTag[];
  segments: string[];
  totalConversations: number;
  lastInteractionAt: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

// ============= Voice Transcription =============
export interface VoiceMessage {
  id: string;
  conversationId: string;
  audioUrl: string;
  duration: number;
  transcription?: string;
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  language?: string;
  confidence?: number;
  createdAt: string;
}

// ============= Multi-language AI =============
export type SupportedLanguage = 
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko' | 'ar' | 'hi';

export interface LanguageDetection {
  detectedLanguage: SupportedLanguage;
  confidence: number;
  alternatives: { language: SupportedLanguage; confidence: number }[];
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
}

export interface AILanguageSettings {
  defaultLanguage: SupportedLanguage;
  autoDetect: boolean;
  autoTranslate: boolean;
  preferredLanguages: SupportedLanguage[];
}

// ============= Predictive Analytics =============
export interface PredictiveInsight {
  id: string;
  type: 'churn_risk' | 'upsell_opportunity' | 'engagement_drop' | 'peak_hours' | 'response_time';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  affectedCustomers?: number;
  createdAt: string;
}

export interface PredictionMetrics {
  churnRisk: {
    high: number;
    medium: number;
    low: number;
  };
  engagementScore: number;
  predictedMessages: number;
  optimalResponseTime: number;
  peakHours: { hour: number; volume: number }[];
}

// ============= Voice/Video Calls =============
export type CallType = 'voice' | 'video';
export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'ended' | 'failed' | 'missed';

export interface Call {
  id: string;
  conversationId: string;
  type: CallType;
  status: CallStatus;
  duration?: number;
  startedAt: string;
  endedAt?: string;
  recordingUrl?: string;
  participantCount: number;
}

export interface CallSettings {
  enableVoiceCalls: boolean;
  enableVideoCalls: boolean;
  autoRecord: boolean;
  maxDuration: number;
  twilioAccountSid?: string;
  twilioConfigured: boolean;
}

// ============= White-label =============
export interface WhiteLabelConfig {
  id: string;
  enabled: boolean;
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
  customCss?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  footerText?: string;
  hideGhostWorkerBranding: boolean;
}

// ============= AI Training =============
export interface TrainingDataset {
  id: string;
  name: string;
  description?: string;
  sampleCount: number;
  status: 'draft' | 'training' | 'completed' | 'failed';
  accuracy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSample {
  id: string;
  datasetId: string;
  input: string;
  expectedOutput: string;
  category?: string;
  isValidated: boolean;
  createdAt: string;
}

export interface AIModelConfig {
  modelId: string;
  name: string;
  baseModel: 'gpt-4' | 'gpt-3.5-turbo' | 'custom';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  isActive: boolean;
  trainedDatasetId?: string;
}

// ============= Blockchain Audit Logs =============
export interface BlockchainAuditLog {
  id: string;
  transactionHash: string;
  blockNumber: number;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: string;
  verified: boolean;
  network: 'polygon' | 'ethereum' | 'testnet';
}

export interface AuditLogFilter {
  eventType?: string;
  startDate?: string;
  endDate?: string;
  verified?: boolean;
}

// ============= AI Conversation Summary =============
export interface ConversationSummary {
  id: string;
  conversationId: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: SentimentLabel;
  topics: string[];
  generatedAt: string;
}
