import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotifications } from './NotificationContext';
import { WebSocketMessage, ConnectionStatus } from '@/types/advanced';
import { toast } from 'sonner';

interface WebSocketContextType {
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  send: (message: object) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification, refreshNotifications } = useNotifications();
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('[WebSocket] Received:', message.type);
    setLastMessage(message);

    switch (message.type) {
      case 'message.new':
        addNotification({
          type: 'message',
          title: 'New Message',
          description: (message.payload as { preview?: string })?.preview || 'You have a new message',
          actionUrl: '/dashboard/conversations',
        });
        toast.info('New message received');
        break;

      case 'conversation.created':
        addNotification({
          type: 'message',
          title: 'New Conversation',
          description: 'A new conversation has started',
          actionUrl: '/dashboard/conversations',
        });
        break;

      case 'conversation.status_changed':
        // Dispatch custom event for components to listen
        window.dispatchEvent(new CustomEvent('conversation-update', { detail: message.payload }));
        break;

      case 'notification.new':
        refreshNotifications();
        break;

      case 'presence.update':
        window.dispatchEvent(new CustomEvent('presence-update', { detail: message.payload }));
        break;

      case 'typing.start':
      case 'typing.stop':
        window.dispatchEvent(new CustomEvent('typing-indicator', { detail: message }));
        break;

      default:
        console.log('[WebSocket] Unhandled message type:', message.type);
    }
  }, [addNotification, refreshNotifications]);

  const handleConnect = useCallback(() => {
    console.log('[WebSocket] Connected to real-time updates');
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('[WebSocket] Disconnected from real-time updates');
  }, []);

  const { status, connect, disconnect, send, subscribe, unsubscribe } = useWebSocket({
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    autoConnect: true,
  });

  // Subscribe to default channels on connect
  useEffect(() => {
    if (status.connected) {
      subscribe('notifications');
      subscribe('conversations');
    }
  }, [status.connected, subscribe]);

  return (
    <WebSocketContext.Provider
      value={{
        status,
        connect,
        disconnect,
        send,
        subscribe,
        unsubscribe,
        lastMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
