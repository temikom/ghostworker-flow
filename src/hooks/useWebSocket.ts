import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WebSocketMessage, ConnectionStatus } from '@/types/advanced';
import { WS_BASE_URL, WEBSOCKET } from '@/lib/config';

const RECONNECT_DELAY = WEBSOCKET.RECONNECT_DELAY;
const MAX_RECONNECT_ATTEMPTS = WEBSOCKET.MAX_RECONNECT_ATTEMPTS;
const HEARTBEAT_INTERVAL = WEBSOCKET.HEARTBEAT_INTERVAL;

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    lastConnected: null,
    error: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<string[]>([]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const processMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const message = messageQueueRef.current.shift();
      if (message) {
        wsRef.current.send(message);
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (!user) return;
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const wsUrl = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WebSocket] Connected');
        setStatus({
          connected: true,
          reconnecting: false,
          lastConnected: new Date().toISOString(),
          error: null,
        });
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
        processMessageQueue();
        options.onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Ignore pong messages
          if ((message as unknown as { type: string }).type === 'pong') return;
          
          options.onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        clearTimers();
        
        setStatus((prev) => ({
          ...prev,
          connected: false,
        }));
        
        options.onDisconnect?.();

        // Attempt reconnection if not a normal close
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setStatus((prev) => ({
            ...prev,
            reconnecting: true,
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            console.log(`[WebSocket] Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
            connect();
          }, RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setStatus((prev) => ({
          ...prev,
          error: 'Connection error occurred',
        }));
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setStatus((prev) => ({
        ...prev,
        error: 'Failed to establish connection',
      }));
    }
  }, [user, options, clearTimers, startHeartbeat, processMessageQueue]);

  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setStatus({
      connected: false,
      reconnecting: false,
      lastConnected: null,
      error: null,
    });
  }, [clearTimers]);

  const send = useCallback((message: object) => {
    const messageStr = JSON.stringify(message);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(messageStr);
    } else {
      // Queue message for later
      messageQueueRef.current.push(messageStr);
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    send({ type: 'subscribe', channel });
  }, [send]);

  const unsubscribe = useCallback((channel: string) => {
    send({ type: 'unsubscribe', channel });
  }, [send]);

  // Auto-connect when user is available
  useEffect(() => {
    if (options.autoConnect !== false && user) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, options.autoConnect, connect, disconnect]);

  // Handle visibility change for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !status.connected && user) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status.connected, user, connect]);

  return {
    status,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
  };
};

export default useWebSocket;
