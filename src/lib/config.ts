/**
 * Application configuration
 * Uses environment variables with fallbacks for development
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://reficulbot.site/api/v1';

// WebSocket Configuration
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'wss://reficulbot.site/ws';

// App Configuration
export const APP_NAME = 'GhostWorker';
export const APP_VERSION = '1.0.0';

// Feature Flags
export const FEATURES = {
  VOICE_VIDEO: true,
  BLOCKCHAIN_AUDIT: true,
  AI_TRAINING: true,
  PREDICTIVE_ANALYTICS: true,
  WHITE_LABEL: true,
  CRM_INTEGRATIONS: true,
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// WebSocket Configuration
export const WEBSOCKET = {
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000,
};

// API Timeouts (in milliseconds)
export const TIMEOUTS = {
  DEFAULT: 30000,
  UPLOAD: 120000,
  LONG_POLLING: 60000,
};
