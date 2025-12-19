/**
 * Auth context for in-memory authentication state
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, userApi, setAuthCallback, setTokens, getAccessToken, getErrorMessage } from '@/lib/api';
import type { User, TokenPair, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<{ verification_required: boolean }>;
  logout: () => Promise<void>;
  checkEmail: (email: string) => Promise<{ exists: boolean; providers: string[] }>;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!accessToken && !!user;

  // Handle token changes from API client
  const handleTokenChange = useCallback((tokens: TokenPair | null) => {
    if (tokens) {
      setAccessToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
    } else {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, []);

  // Set up auth callback
  useEffect(() => {
    setAuthCallback(handleTokenChange);
  }, [handleTokenChange]);

  // Try to restore session on mount (tokens are in-memory, so this is just initialization)
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      // In-memory auth means no persistence - user must log in again on page refresh
      // This is intentional for security
      setIsLoading(false);
    };
    init();
  }, []);

  // Fetch user data when we have a token
  useEffect(() => {
    const fetchUser = async () => {
      if (accessToken && !user) {
        try {
          const userData = await userApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          setTokens(null);
        }
      }
    };
    fetchUser();
  }, [accessToken, user]);

  const checkEmail = useCallback(async (email: string) => {
    const response = await authApi.checkEmail(email);
    return { exists: response.exists, providers: response.providers };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
    
    // Fetch user data
    const userData = await userApi.getMe();
    setUser(userData);
    
    // Navigate to dashboard or intended destination
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  }, [navigate, location.state]);

  const signup = useCallback(async (email: string, password: string, confirmPassword: string) => {
    const response = await authApi.signup({
      email,
      password,
      confirm_password: confirmPassword,
    });
    return { verification_required: response.verification_required };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      navigate('/login');
    }
  }, [navigate]);

  const resendVerification = useCallback(async (email: string) => {
    await authApi.resendVerification(email);
  }, []);

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    checkEmail,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
