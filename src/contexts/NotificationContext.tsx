// ABOUTME: NotificationContext provides centralized notification state management with real-time updates
// Integrates with Supabase-based NotificationService for live synchronization

import type {
  ReactNode} from 'react';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import NotificationService from '../services/NotificationService';
import type { Notification } from '../types/notification.types';
import { NotificationTypes } from '../types/user.types';
import { supabase } from '../services/SupabaseService';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  addNotification: (notificationData: Partial<Notification>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  getNotificationsByType: (type: string) => Notification[];
  refreshNotifications: () => Promise<void>;
}

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get current user from auth session
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get current user on mount and auth changes
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    checkUser();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Load notifications from Supabase
  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const loadedNotifications = await NotificationService.getNotificationsForUser(currentUser.id);

      if (isMountedRef.current) {
        setNotifications(loadedNotifications);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError((err as Error).message);
        console.error('Error loading notifications:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentUser?.id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!currentUser?.id) return;

    // Load initial notifications
    loadNotifications();

    // Subscribe to real-time updates
    const unsubscribe = NotificationService.subscribeToNotifications(
      currentUser.id,
      (notification: Notification) => {
        if (!isMountedRef.current) return;

        // Add new notification to the beginning of the list
        setNotifications((prev) => [notification, ...prev]);
      },
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.id, loadNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Add a new notification (for local notifications)
  const addNotification = useCallback(
    async (notificationData: Partial<Notification>): Promise<void> => {
      try {
        setError(null);

        if (!currentUser?.id) {
          throw new Error('User not authenticated');
        }

        // Send notification through the service
        await NotificationService.sendNotification(
          currentUser.id,
          (notificationData.type as NotificationTypes) || NotificationTypes.TASK_ASSIGNED,
          notificationData.data || {},
        );

        // Real-time subscription will handle adding to state
      } catch (err) {
        setError((err as Error).message);
        console.error('Error adding notification:', err);
        throw err;
      }
    },
    [currentUser?.id],
  );

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      setError(null);

      const success = await NotificationService.markNotificationAsRead(notificationId);

      if (success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        );
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!currentUser?.id) return;

    try {
      setError(null);

      const success = await NotificationService.markAllNotificationsAsRead(currentUser.id);

      if (success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, [currentUser?.id]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      setError(null);

      // For now, we'll just remove it from local state
      // In the future, we might want to add a delete method to NotificationService
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      setError((err as Error).message);
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(async (): Promise<void> => {
    if (!currentUser?.id) return;

    try {
      setError(null);

      const success = await NotificationService.clearNotificationsForUser(currentUser.id);

      if (success) {
        setNotifications([]);
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Error clearing notifications:', err);
      throw err;
    }
  }, [currentUser?.id]);

  // Get notifications by type
  const getNotificationsByType = useCallback(
    (type: string): Notification[] => {
      return notifications.filter((n) => n.type === type);
    },
    [notifications],
  );

  // Refresh notifications
  const refreshNotifications = useCallback(async (): Promise<void> => {
    await loadNotifications();
  }, [loadNotifications]);

  const value = useMemo<NotificationContextValue>(
    () => ({
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
    }),
    [
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
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
