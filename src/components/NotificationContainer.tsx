// ABOUTME: Container component that manages the display of notification banners
// Handles notification queue, display timing, and integration with NotificationService

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import NotificationBanner from './NotificationBanner';
import NotificationService from '../services/NotificationService';
import UserStorageService from '../services/UserStorageService';
import { Notification, User, NotificationTypes } from '../types';

// Extended notification type that includes the data property from the service
interface NotificationWithData extends Omit<Notification, 'timestamp'> {
  data?: {
    taskId?: string;
    assignedBy?: string;
    taskTitle?: string;
    startedBy?: string;
    completedBy?: string;
    message?: string;
    fromUser?: string;
  };
  timestamp?: Date | string;
}

const NotificationContainer = () => {
  const router = useRouter();
  const [currentNotification, setCurrentNotification] = useState<NotificationWithData | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<NotificationWithData[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckRef = useRef<Date>(new Date());

  const loadCurrentUser = useCallback(async (): Promise<void> => {
    try {
      const user = await UserStorageService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      // Error loading user
      console.error('Error loading current user:', error);
    }
  }, []);

  const checkForNewNotifications = useCallback(async (): Promise<void> => {
    if (!currentUser) return;

    try {
      const allNotifications = await NotificationService.getNotificationsForUser(currentUser.id);

      // Filter for new notifications since last check
      const newNotifications = allNotifications.filter((n) => {
        // Handle both timestamp and createdAt properties
        const notificationTime = n.timestamp
          ? typeof n.timestamp === 'string'
            ? new Date(n.timestamp)
            : n.timestamp
          : n.createdAt;
        return !n.read && notificationTime && notificationTime > lastCheckRef.current;
      }) as NotificationWithData[];

      if (newNotifications.length > 0) {
        // Add new notifications to queue
        setNotificationQueue((prev) => [...prev, ...newNotifications]);

        // Mark them as read immediately to prevent re-showing
        for (const notification of newNotifications) {
          await NotificationService.markNotificationAsRead(notification.id);
        }
      }

      lastCheckRef.current = new Date();
    } catch (error) {
      // Error checking notifications
      console.error('Error checking for new notifications:', error);
    }
  }, [currentUser]);

  const handleDismiss = useCallback((): void => {
    setCurrentNotification(null);
  }, []);

  const handlePress = useCallback((): void => {
    // Navigate based on notification type
    if (currentNotification?.data?.taskId) {
      // Navigate to task list with focus on specific task
      router.push('/(tabs)');
      // Note: The TaskList screen would need to handle focusing the task via route params or context
    } else {
      // Default to notifications list
      router.push('/notifications');
    }
  }, [currentNotification, router]);

  useEffect(() => {
    void loadCurrentUser();
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [loadCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      // Check for new notifications immediately
      void checkForNewNotifications();

      // Set up polling interval
      checkIntervalRef.current = setInterval(() => {
        void checkForNewNotifications();
      }, 5000); // Check every 5 seconds
    }
  }, [currentUser, checkForNewNotifications]);

  useEffect(() => {
    // When queue changes and no current notification, show next
    if (!currentNotification && notificationQueue.length > 0) {
      const [next, ...rest] = notificationQueue;
      setCurrentNotification(next);
      setNotificationQueue(rest);
    }
  }, [notificationQueue, currentNotification]);

  if (!currentNotification) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <NotificationBanner
        notification={{
          ...currentNotification,
          type: currentNotification.type as NotificationTypes,
        }}
        onDismiss={handleDismiss}
        onPress={handlePress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});

export default NotificationContainer;
