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

// API base URL - configure for your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
  } else {
    accessToken = null;
    refreshToken = null;
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
  timeout: 30000,
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
};

export default api;
