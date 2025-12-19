import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Notification, MOCK_NOTIFICATIONS } from '@/types/notification';
import { notificationApi, getErrorMessage } from '@/lib/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Polling intervals
const ACTIVE_POLL_INTERVAL = 10000; // 10 seconds when tab is active
const BACKGROUND_POLL_INTERVAL = 60000; // 60 seconds when tab is in background

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);
  const lastFetchRef = useRef<number>(0);

  const unreadCount = notifications.filter(n => !n.read).length;

  const mapNotificationType = (type: string): Notification['type'] => {
    const typeMap: Record<string, Notification['type']> = {
      'info': 'system',
      'success': 'system',
      'warning': 'system',
      'error': 'system',
      'message': 'message',
      'team': 'team_invite',
      'integration': 'integration',
      'billing': 'billing',
    };
    return typeMap[type] || 'system';
  };

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      setIsConnected(false);
      return;
    }

    // Prevent fetching too frequently
    const now = Date.now();
    if (now - lastFetchRef.current < 5000 && !showLoading) {
      return;
    }
    lastFetchRef.current = now;

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await notificationApi.getNotifications({ limit: 50 });
      
      const mappedNotifications: Notification[] = response.notifications.map(n => ({
        id: n.id,
        type: mapNotificationType(n.type),
        title: n.title,
        description: n.message,
        timestamp: n.created_at,
        read: n.is_read,
        actionUrl: n.action_url,
      }));
      
      setNotifications(mappedNotifications);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setIsConnected(false);
      
      // Only use mock data on first load failure
      if (notifications.length === 0) {
        setNotifications(MOCK_NOTIFICATIONS);
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [user, notifications.length]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications(true);
  }, [user]);

  // Visibility-aware polling
  useEffect(() => {
    if (!user) return;

    const setupPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      const interval = isVisibleRef.current 
        ? ACTIVE_POLL_INTERVAL 
        : BACKGROUND_POLL_INTERVAL;

      pollIntervalRef.current = setInterval(() => {
        fetchNotifications(false);
      }, interval);
    };

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      
      // Fetch immediately when tab becomes visible
      if (isVisibleRef.current) {
        fetchNotifications(false);
      }
      
      // Restart polling with appropriate interval
      setupPolling();
    };

    // Set up visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start polling
    setupPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user, fetchNotifications]);

  // Focus handler for immediate refresh
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchNotifications(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    
    try {
      await notificationApi.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert on error
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: false } : n))
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const previousState = notifications;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    try {
      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert on error
      setNotifications(previousState);
    }
  }, [notifications]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isConnected,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification,
        refreshNotifications: () => fetchNotifications(true),
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
