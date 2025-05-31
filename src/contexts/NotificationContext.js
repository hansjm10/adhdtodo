// ABOUTME: NotificationContext provides centralized notification state management
// Handles notification display, read status, and real-time updates across screens

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationContext = createContext();

// For testing purposes only
let _notificationsList = [];
export const _resetNotifications = () => {
  _notificationsList = [];
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Load notifications from AsyncStorage
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const storedNotifications = await AsyncStorage.getItem('notifications');
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed);
        _notificationsList = parsed;
      }
    } catch (err) {
      setError(err.message);
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
  const saveNotifications = useCallback(async (newNotifications) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
      _notificationsList = newNotifications;
    } catch (err) {
      console.error('Error saving notifications:', err);
    }
  }, []);

  // Add a new notification
  const addNotification = useCallback(
    async (notificationData) => {
      try {
        setError(null);

        const newNotification = {
          id: notificationData.id || Date.now().toString(),
          ...notificationData,
          isRead: false,
          createdAt: notificationData.createdAt || new Date().toISOString(),
        };

        const updatedNotifications = [newNotification, ...notifications];
        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
      } catch (err) {
        setError(err.message);
        console.error('Error adding notification:', err);
      }
    },
    [notifications, saveNotifications],
  );

  // Mark a notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        setError(null);

        const updatedNotifications = notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif,
        );

        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
      } catch (err) {
        setError(err.message);
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
      setError(err.message);
      console.error('Error marking all notifications as read:', err);
    }
  }, [notifications, saveNotifications]);

  // Delete a notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      try {
        setError(null);

        const updatedNotifications = notifications.filter((notif) => notif.id !== notificationId);

        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
      } catch (err) {
        setError(err.message);
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
      setError(err.message);
      console.error('Error clearing notifications:', err);
    }
  }, []);

  // Get notifications by type
  const getNotificationsByType = useCallback(
    (type) => {
      return notifications.filter((notif) => notif.type === type);
    },
    [notifications],
  );

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const value = {
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

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
