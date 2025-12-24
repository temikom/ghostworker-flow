/**
 * Typed API client for GhostWorker backend
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  TokenPair,
  EmailCheckResponse,
  SignupResponse,
  EmailVerificationResponse,
  ApiError,
} from '@/types/auth';
import { API_BASE_URL, TIMEOUTS } from '@/lib/config';

// Token storage (in-memory for security)
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Token refresh promise to prevent concurrent refreshes
let refreshPromise: Promise<TokenPair> | null = null;

// Callbacks for auth state changes
type AuthCallback = (tokens: TokenPair | null) => void;
let authCallback: AuthCallback | null = null;

export function setAuthCallback(callback: AuthCallback) {
  authCallback = callback;
}

export function setTokens(tokens: TokenPair | null) {
  if (tokens) {
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    // Store in localStorage for WebSocket connection
    localStorage.setItem('auth_token', tokens.access_token);
  } else {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('auth_token');
  }
  authCallback?.(tokens);
}

export function getAccessToken() {
  return accessToken;
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: TIMEOUTS.DEFAULT,
});

// Request interceptor - add auth header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // If 401 and we have a refresh token, try to refresh
    if (error.response?.status === 401 && refreshToken && originalRequest) {
      // Prevent infinite loop
      if ((originalRequest as any)._retry) {
        setTokens(null);
        return Promise.reject(error);
      }

      (originalRequest as any)._retry = true;

      try {
        // Use shared promise to prevent concurrent refreshes
        if (!refreshPromise) {
          refreshPromise = authApi.refreshTokens(refreshToken);
        }

        const tokens = await refreshPromise;
        refreshPromise = null;
        setTokens(tokens);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        setTokens(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    if (apiError?.detail) {
      return apiError.detail;
    }
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.response?.status === 403) {
      return 'Access denied. Please verify your email to continue.';
    }
    if (error.response?.status === 423) {
      return 'Account locked. Please try again later or reset your password.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please check your connection.';
    }
    if (!error.response) {
      return 'Unable to connect to server. Please check your connection.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

// Check if error is a specific type
export function isAccountLocked(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 423;
}

export function isEmailUnverified(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

export function isRateLimited(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 429;
}

/**
 * Auth API endpoints
 */
export const authApi = {
  // Check if email exists (step 1 of login/signup)
  async checkEmail(email: string): Promise<EmailCheckResponse> {
    const { data } = await api.post<EmailCheckResponse>('/auth/check-email', { email });
    return data;
  },

  // Signup
  async signup(params: {
    email: string;
    password: string;
    confirm_password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<SignupResponse> {
    const { data } = await api.post<SignupResponse>('/auth/signup', params);
    return data;
  },

  // Login
  async login(email: string, password: string): Promise<TokenPair> {
    const { data } = await api.post<TokenPair>('/auth/login', { email, password });
    setTokens(data);
    return data;
  },

  // Verify email
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    const { data } = await api.post<EmailVerificationResponse>('/auth/verify-email', { token });
    return data;
  },

  // Resend verification email
  async resendVerification(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return data;
  },

  // Refresh tokens
  async refreshTokens(refresh_token: string): Promise<TokenPair> {
    const { data } = await api.post<TokenPair>('/auth/refresh', { refresh_token });
    return data;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } finally {
      setTokens(null);
    }
  },

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/password-reset/request', { email });
    return data;
  },

  // Confirm password reset
  async confirmPasswordReset(params: {
    token: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/password-reset/confirm', params);
    return data;
  },

  // Get OAuth URL
  async getOAuthUrl(provider: 'google' | 'microsoft' | 'facebook'): Promise<{ url: string; state: string }> {
    const { data } = await api.get<{ url: string; state: string }>(`/auth/oauth/${provider}/url`);
    return data;
  },

  // Handle OAuth callback
  async handleOAuthCallback(params: {
    provider: string;
    code: string;
    state?: string;
  }): Promise<TokenPair> {
    const { data } = await api.post<TokenPair>('/auth/oauth/callback', params);
    setTokens(data);
    return data;
  },
};

/**
 * User API endpoints
 */
export const userApi = {
  async getMe(): Promise<import('@/types/auth').User> {
    const { data } = await api.get<import('@/types/auth').User>('/users/me');
    return data;
  },

  async updateProfile(params: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  }): Promise<import('@/types/auth').User> {
    const { data } = await api.patch<import('@/types/auth').User>('/users/me', params);
    return data;
  },
};

/**
 * Billing API types
 */
export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: {
    max_conversations: number;
    max_integrations: number;
    max_team_members: number;
  };
}

export interface Subscription {
  id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface PaymentInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface CoinbaseChargeResponse {
  id: string;
  hosted_url: string;
  code: string;
  expires_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issue_date: string;
  pdf_url?: string;
}

export interface UsageStats {
  conversations_count: number;
  messages_count: number;
  orders_count: number;
  storage_used_mb: number;
  period_start: string;
  period_end: string;
}

/**
 * Billing API endpoints
 */
export const billingApi = {
  // Get all available plans
  async getPlans(): Promise<Plan[]> {
    const { data } = await api.get<Plan[]>('/billing/plans');
    return data;
  },

  // Get current subscription
  async getSubscription(): Promise<Subscription> {
    const { data } = await api.get<Subscription>('/billing/subscription');
    return data;
  },

  // Create subscription with Paystack
  async createSubscription(params: {
    plan_id: string;
    billing_cycle: 'monthly' | 'yearly';
  }): Promise<PaymentInitResponse> {
    const { data } = await api.post<PaymentInitResponse>('/billing/subscribe', params);
    return data;
  },

  // Cancel subscription
  async cancelSubscription(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/billing/subscription/cancel');
    return data;
  },

  // Resume cancelled subscription
  async resumeSubscription(): Promise<Subscription> {
    const { data } = await api.post<Subscription>('/billing/subscription/resume');
    return data;
  },

  // Initialize one-time payment with Paystack
  async initializePaystackPayment(params: {
    amount: number;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentInitResponse> {
    const { data } = await api.post<PaymentInitResponse>('/billing/payment/paystack/initialize', params);
    return data;
  },

  // Verify Paystack payment
  async verifyPaystackPayment(reference: string): Promise<{ status: string; message: string }> {
    const { data } = await api.get<{ status: string; message: string }>(`/billing/payment/paystack/verify/${reference}`);
    return data;
  },

  // Create Coinbase Commerce charge
  async createCoinbaseCharge(params: {
    amount: number;
    description: string;
    type: 'subscription' | 'one_time';
    plan_id?: string;
    metadata?: Record<string, any>;
  }): Promise<CoinbaseChargeResponse> {
    const { data } = await api.post<CoinbaseChargeResponse>('/billing/payment/coinbase/create-charge', params);
    return data;
  },

  // Get usage statistics
  async getUsageStats(): Promise<UsageStats> {
    const { data } = await api.get<UsageStats>('/billing/usage');
    return data;
  },

  // Get invoices
  async getInvoices(params?: { page?: number; limit?: number }): Promise<{ invoices: Invoice[]; total: number }> {
    const { data } = await api.get<{ invoices: Invoice[]; total: number }>('/billing/invoices', { params });
    return data;
  },

  // Download invoice PDF
  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  // Change plan
  async changePlan(params: {
    plan_id: string;
    billing_cycle?: 'monthly' | 'yearly';
  }): Promise<{ message: string; subscription: Subscription }> {
    const { data } = await api.post<{ message: string; subscription: Subscription }>('/billing/subscription/change-plan', params);
    return data;
  },
};

/**
 * Email Preferences API types
 */
export interface EmailPreferences {
  new_conversation: boolean;
  new_message: boolean;
  conversation_assigned: boolean;
  order_created: boolean;
  order_status_changed: boolean;
  product_updates: boolean;
  tips_and_tutorials: boolean;
  promotional: boolean;
  payment_received: boolean;
  payment_failed: boolean;
  subscription_expiring: boolean;
  team_invitation: boolean;
  team_member_joined: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
}

/**
 * Notification API endpoints
 */
export const notificationApi = {
  // Get email preferences
  async getEmailPreferences(): Promise<EmailPreferences> {
    const { data } = await api.get<EmailPreferences>('/notifications/email-preferences');
    return data;
  },

  // Update email preferences
  async updateEmailPreferences(preferences: Partial<EmailPreferences>): Promise<EmailPreferences> {
    const { data } = await api.put<EmailPreferences>('/notifications/email-preferences', preferences);
    return data;
  },

  // Get in-app notifications
  async getNotifications(params?: { unread_only?: boolean; page?: number; limit?: number }): Promise<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      is_read: boolean;
      created_at: string;
      action_url?: string;
    }>;
    total: number;
    unread_count: number;
  }> {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await api.post(`/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },
};

/**
 * Webhook API types
 */
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret?: string;
  last_triggered?: string;
  last_status?: number;
  failure_count: number;
  success_count: number;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed';
  status_code?: number;
  error_message?: string;
  delivered_at?: string;
  created_at: string;
}

/**
 * Webhook API endpoints
 */
export const webhookApi = {
  // Get all webhooks
  async getWebhooks(): Promise<Webhook[]> {
    const { data } = await api.get<Webhook[]>('/notifications/webhooks');
    return data;
  },

  // Create webhook
  async createWebhook(params: {
    name: string;
    url: string;
    events: string[];
  }): Promise<Webhook> {
    const { data } = await api.post<Webhook>('/notifications/webhooks', params);
    return data;
  },

  // Update webhook
  async updateWebhook(webhookId: string, params: {
    name?: string;
    url?: string;
    events?: string[];
    is_active?: boolean;
  }): Promise<Webhook> {
    const { data } = await api.put<Webhook>(`/notifications/webhooks/${webhookId}`, params);
    return data;
  },

  // Delete webhook
  async deleteWebhook(webhookId: string): Promise<void> {
    await api.delete(`/notifications/webhooks/${webhookId}`);
  },

  // Get webhook deliveries
  async getWebhookDeliveries(webhookId: string, params?: { page?: number; limit?: number }): Promise<{
    deliveries: WebhookDelivery[];
    total: number;
  }> {
    const { data } = await api.get(`/notifications/webhooks/${webhookId}/deliveries`, { params });
    return data;
  },

  // Test webhook
  async testWebhook(webhookId: string): Promise<{ success: boolean; status_code?: number; error?: string }> {
    const { data } = await api.post(`/notifications/webhooks/${webhookId}/test`);
    return data;
  },

  // Regenerate webhook secret
  async regenerateSecret(webhookId: string): Promise<{ secret: string }> {
    const { data } = await api.post<{ secret: string }>(`/notifications/webhooks/${webhookId}/regenerate-secret`);
    return data;
  },

  // Get available webhook events
  async getAvailableEvents(): Promise<{ events: Array<{ id: string; name: string; description: string }> }> {
    const { data } = await api.get('/notifications/webhooks/events');
    return data;
  },
};

// ============= Sentiment API =============
export const sentimentApi = {
  async getDashboard(params?: { startDate?: string; endDate?: string }) {
    const { data } = await api.get('/advanced/sentiment/dashboard', { params });
    return data;
  },
  async analyzeConversation(conversationId: string) {
    const { data } = await api.post(`/advanced/sentiment/analyze/${conversationId}`);
    return data;
  },
  async getTrends(days: number = 30) {
    const { data } = await api.get('/advanced/sentiment/trends', { params: { days } });
    return data;
  },
};

// ============= CRM API =============
export const crmApi = {
  async getConnections() {
    const { data } = await api.get('/advanced/crm/connections');
    return data;
  },
  async connect(provider: string, credentials: Record<string, string>) {
    const { data } = await api.post(`/advanced/crm/${provider}/connect`, credentials);
    return data;
  },
  async disconnect(provider: string) {
    const { data } = await api.delete(`/advanced/crm/${provider}/disconnect`);
    return data;
  },
  async syncContacts(provider: string) {
    const { data } = await api.post(`/advanced/crm/${provider}/sync`);
    return data;
  },
  async getContacts(provider: string, params?: { limit?: number; offset?: number }) {
    const { data } = await api.get(`/advanced/crm/${provider}/contacts`, { params });
    return data;
  },
  async getSyncLogs(provider?: string) {
    const { data } = await api.get('/advanced/crm/sync-logs', { params: { provider } });
    return data;
  },
  async updateSettings(provider: string, settings: Record<string, unknown>) {
    const { data } = await api.patch(`/advanced/crm/${provider}/settings`, settings);
    return data;
  },
};

// ============= Canned Responses API =============
export const cannedResponsesApi = {
  async getAll(params?: { category?: string; search?: string }) {
    const { data } = await api.get('/advanced/canned-responses', { params });
    return data;
  },
  async getById(id: string) {
    const { data } = await api.get(`/advanced/canned-responses/${id}`);
    return data;
  },
  async create(responseData: { name: string; content: string; category: string; shortcut?: string; tags?: string[] }) {
    const { data } = await api.post('/advanced/canned-responses', responseData);
    return data;
  },
  async update(id: string, responseData: Partial<{ name: string; content: string; category: string; shortcut?: string; tags?: string[] }>) {
    const { data } = await api.patch(`/advanced/canned-responses/${id}`, responseData);
    return data;
  },
  async delete(id: string) {
    const { data } = await api.delete(`/advanced/canned-responses/${id}`);
    return data;
  },
  async getCategories() {
    const { data } = await api.get('/advanced/canned-responses/categories');
    return data;
  },
  async createCategory(categoryData: { name: string; color: string }) {
    const { data } = await api.post('/advanced/canned-responses/categories', categoryData);
    return data;
  },
};

// ============= Customer Tags & Segments API =============
export const customerApi = {
  async getTags() {
    const { data } = await api.get('/advanced/customers/tags');
    return data;
  },
  async createTag(tagData: { name: string; color: string; description?: string }) {
    const { data } = await api.post('/advanced/customers/tags', tagData);
    return data;
  },
  async updateTag(id: string, tagData: Partial<{ name: string; color: string; description?: string }>) {
    const { data } = await api.patch(`/advanced/customers/tags/${id}`, tagData);
    return data;
  },
  async deleteTag(id: string) {
    const { data } = await api.delete(`/advanced/customers/tags/${id}`);
    return data;
  },
  async getSegments() {
    const { data } = await api.get('/advanced/customers/segments');
    return data;
  },
  async createSegment(segmentData: { name: string; description: string; rules: unknown[] }) {
    const { data } = await api.post('/advanced/customers/segments', segmentData);
    return data;
  },
  async updateSegment(id: string, segmentData: Partial<{ name: string; description: string; rules: unknown[]; isActive: boolean }>) {
    const { data } = await api.patch(`/advanced/customers/segments/${id}`, segmentData);
    return data;
  },
  async deleteSegment(id: string) {
    const { data } = await api.delete(`/advanced/customers/segments/${id}`);
    return data;
  },
  async getCustomers(params?: { tags?: string[]; segment?: string; search?: string; limit?: number; offset?: number }) {
    const { data } = await api.get('/advanced/customers', { params });
    return data;
  },
  async getCustomer(id: string) {
    const { data } = await api.get(`/advanced/customers/${id}`);
    return data;
  },
  async updateCustomer(id: string, customerData: { tags?: string[]; metadata?: Record<string, unknown> }) {
    const { data } = await api.patch(`/advanced/customers/${id}`, customerData);
    return data;
  },
};

// ============= Voice Transcription API =============
export const voiceApi = {
  async transcribe(messageId: string) {
    const { data } = await api.post(`/advanced/voice/${messageId}/transcribe`);
    return data;
  },
  async getTranscription(messageId: string) {
    const { data } = await api.get(`/advanced/voice/${messageId}/transcription`);
    return data;
  },
  async uploadVoiceMessage(conversationId: string, audioFile: File) {
    const formData = new FormData();
    formData.append('audio', audioFile);
    const { data } = await api.post(`/advanced/voice/${conversationId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// ============= Multi-language AI API =============
export const languageApi = {
  async detectLanguage(text: string) {
    const { data } = await api.post('/advanced/language/detect', { text });
    return data;
  },
  async translate(text: string, targetLanguage: string, sourceLanguage?: string) {
    const { data } = await api.post('/advanced/language/translate', { text, targetLanguage, sourceLanguage });
    return data;
  },
  async getSettings() {
    const { data } = await api.get('/advanced/language/settings');
    return data;
  },
  async updateSettings(settings: Record<string, unknown>) {
    const { data } = await api.patch('/advanced/language/settings', settings);
    return data;
  },
};

// ============= Predictive Analytics API =============
export const predictiveApi = {
  async getInsights() {
    const { data } = await api.get('/advanced/predictive/insights');
    return data;
  },
  async getMetrics() {
    const { data } = await api.get('/advanced/predictive/metrics');
    return data;
  },
  async getChurnRisk(customerId?: string) {
    const { data } = await api.get('/advanced/predictive/churn-risk', { params: { customerId } });
    return data;
  },
  async getPeakHours() {
    const { data } = await api.get('/advanced/predictive/peak-hours');
    return data;
  },
};

// ============= Voice/Video Calls API =============
export const callsApi = {
  async initiateCall(conversationId: string, type: 'voice' | 'video') {
    const { data } = await api.post('/advanced/calls/initiate', { conversationId, type });
    return data;
  },
  async endCall(callId: string) {
    const { data } = await api.post(`/advanced/calls/${callId}/end`);
    return data;
  },
  async getCallHistory(conversationId?: string) {
    const { data } = await api.get('/advanced/calls/history', { params: { conversationId } });
    return data;
  },
  async getSettings() {
    const { data } = await api.get('/advanced/calls/settings');
    return data;
  },
  async updateSettings(settings: Record<string, unknown>) {
    const { data } = await api.patch('/advanced/calls/settings', settings);
    return data;
  },
  async getCallToken(callId: string) {
    const { data } = await api.get(`/advanced/calls/${callId}/token`);
    return data;
  },
};

// ============= White-label API =============
export const whiteLabelApi = {
  async getConfig() {
    const { data } = await api.get('/advanced/white-label/config');
    return data;
  },
  async updateConfig(config: Record<string, unknown>) {
    const { data } = await api.patch('/advanced/white-label/config', config);
    return data;
  },
  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await api.post('/advanced/white-label/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async uploadFavicon(file: File) {
    const formData = new FormData();
    formData.append('favicon', file);
    const { data } = await api.post('/advanced/white-label/favicon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async verifyDomain(domain: string) {
    const { data } = await api.post('/advanced/white-label/verify-domain', { domain });
    return data;
  },
};

// ============= AI Training API =============
export const aiTrainingApi = {
  async getDatasets() {
    const { data } = await api.get('/advanced/ai-training/datasets');
    return data;
  },
  async createDataset(datasetData: { name: string; description?: string }) {
    const { data } = await api.post('/advanced/ai-training/datasets', datasetData);
    return data;
  },
  async getDataset(id: string) {
    const { data } = await api.get(`/advanced/ai-training/datasets/${id}`);
    return data;
  },
  async deleteDataset(id: string) {
    const { data } = await api.delete(`/advanced/ai-training/datasets/${id}`);
    return data;
  },
  async addSample(datasetId: string, sampleData: { input: string; expectedOutput: string; category?: string }) {
    const { data } = await api.post(`/advanced/ai-training/datasets/${datasetId}/samples`, sampleData);
    return data;
  },
  async getSamples(datasetId: string, params?: { limit?: number; offset?: number }) {
    const { data } = await api.get(`/advanced/ai-training/datasets/${datasetId}/samples`, { params });
    return data;
  },
  async deleteSample(datasetId: string, sampleId: string) {
    const { data } = await api.delete(`/advanced/ai-training/datasets/${datasetId}/samples/${sampleId}`);
    return data;
  },
  async startTraining(datasetId: string) {
    const { data } = await api.post(`/advanced/ai-training/datasets/${datasetId}/train`);
    return data;
  },
  async getTrainingStatus(datasetId: string) {
    const { data } = await api.get(`/advanced/ai-training/datasets/${datasetId}/status`);
    return data;
  },
  async getModelConfig() {
    const { data } = await api.get('/advanced/ai-training/model-config');
    return data;
  },
  async updateModelConfig(config: Record<string, unknown>) {
    const { data } = await api.patch('/advanced/ai-training/model-config', config);
    return data;
  },
};

// ============= Blockchain Audit API =============
export const blockchainApi = {
  async getLogs(params?: { eventType?: string; startDate?: string; endDate?: string; verified?: boolean; limit?: number; offset?: number }) {
    const { data } = await api.get('/advanced/blockchain/logs', { params });
    return data;
  },
  async verifyLog(logId: string) {
    const { data } = await api.post(`/advanced/blockchain/logs/${logId}/verify`);
    return data;
  },
  async getLogDetails(transactionHash: string) {
    const { data } = await api.get(`/advanced/blockchain/logs/tx/${transactionHash}`);
    return data;
  },
  async getStats() {
    const { data } = await api.get('/advanced/blockchain/stats');
    return data;
  },
};

// ============= AI Summary API =============
export const summaryApi = {
  async generateSummary(conversationId: string) {
    const { data } = await api.post(`/advanced/summary/${conversationId}/generate`);
    return data;
  },
  async getSummary(conversationId: string) {
    const { data } = await api.get(`/advanced/summary/${conversationId}`);
    return data;
  },
  async getRecentSummaries(limit: number = 10) {
    const { data } = await api.get('/advanced/summary/recent', { params: { limit } });
    return data;
  },
};

export default api;
