// ABOUTME: NotificationContext provides centralized notification state management
// Handles notification display, read status, and real-time updates across screens

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPriority } from '../types/notification.types';

// Internal notification structure that matches our storage format
interface InternalNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority?: NotificationPriority;
  taskId?: string;
  userId?: string;
  fromUserId?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
  buttons?: Array<{
    text: string;
    action: () => void;
    style?: 'default' | 'primary' | 'danger';
  }>;
}

interface NotificationContextValue {
  notifications: InternalNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  addNotification: (notificationData: Partial<InternalNotification>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  getNotificationsByType: (type: string) => InternalNotification[];
  refreshNotifications: () => Promise<void>;
}

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// For testing purposes only
let _notificationsList: InternalNotification[] = [];
export const _resetNotifications = () => {
  _notificationsList = [];
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Load notifications from AsyncStorage
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const storedNotifications = await AsyncStorage.getItem('notifications');
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications) as InternalNotification[];
        setNotifications(parsed);
        _notificationsList = parsed;
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Save notifications to storage
  const saveNotifications = useCallback(async (newNotifications: InternalNotification[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
      _notificationsList = newNotifications;
    } catch (err) {
      console.error('Error saving notifications:', err);
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback(
    async (notificationData: Partial<InternalNotification>) => {
      try {
        setError(null);

        const newNotification: InternalNotification = {
          id: notificationData.id || Date.now().toString(),
          title: notificationData.title || '',
          message: notificationData.message || '',
          type: notificationData.type || 'info',
          priority: notificationData.priority,
          taskId: notificationData.taskId,
          userId: notificationData.userId,
          fromUserId: notificationData.fromUserId,
          isRead: false,
          createdAt: notificationData.createdAt || new Date().toISOString(),
          expiresAt: notificationData.expiresAt,
          buttons: notificationData.buttons,
        };

        const updatedNotifications = [newNotification, ...notifications];
        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
      } catch (err) {
        setError((err as Error).message);
        console.error('Error adding notification:', err);
      }
    },
    [notifications, saveNotifications],
  );

  // Mark a notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        setError(null);

        const updatedNotifications = notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif,
        );

        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
      } catch (err) {
        setError((err as Error).message);
        console.error('Error marking notification as read:', err);
      }
    },
    [notifications, saveNotifications],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      setError(null);

      const updatedNotifications = notifications.map((notif) => ({
        ...notif,
        isRead: true,
      }));

      setNotifications(updatedNotifications);
      await saveNotifications(updatedNotifications);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error marking all notifications as read:', err);
    }
  }, [notifications, saveNotifications]);

  // Delete a notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        setError(null);

        const updatedNotifications = notifications.filter((notif) => notif.id !== notificationId);

        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
      } catch (err) {
        setError((err as Error).message);
        console.error('Error deleting notification:', err);
      }
    },
    [notifications, saveNotifications],
  );

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      setError(null);

      setNotifications([]);
      await AsyncStorage.removeItem('notifications');
      _notificationsList = [];
    } catch (err) {
      setError((err as Error).message);
      console.error('Error clearing notifications:', err);
    }
  }, []);

  // Get notifications by type
  const getNotificationsByType = useCallback(
    (type: string): InternalNotification[] => {
      return notifications.filter((notif) => notif.type === type);
    },
    [notifications],
  );

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    loading,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationsByType,
    refreshNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
