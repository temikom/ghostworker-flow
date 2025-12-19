/**
 * Auth types matching FastAPI backend schemas
 */

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_email_verified: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface EmailCheckResponse {
  exists: boolean;
  has_password: boolean;
  providers: string[];
}

export interface SignupResponse {
  user_id: string;
  email: string;
  message: string;
  verification_required: boolean;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
}

export interface ApiError {
  detail: string;
  code?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
