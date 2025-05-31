// ABOUTME: Container component that manages the display of notification banners
// Handles notification queue, display timing, and integration with NotificationService

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationBanner from './NotificationBanner';
import NotificationService from '../services/NotificationService';
import UserStorageService from '../services/UserStorageService';

const NotificationContainer = () => {
  const navigation = useNavigation();
  const [currentNotification, setCurrentNotification] = useState(null);
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const checkIntervalRef = useRef(null);
  const lastCheckRef = useRef(new Date());

  useEffect(() => {
    loadCurrentUser();
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Check for new notifications immediately
      checkForNewNotifications();

      // Set up polling interval
      checkIntervalRef.current = setInterval(() => {
        checkForNewNotifications();
      }, 5000); // Check every 5 seconds
    }
  }, [currentUser]);

  useEffect(() => {
    // When queue changes and no current notification, show next
    if (!currentNotification && notificationQueue.length > 0) {
      const [next, ...rest] = notificationQueue;
      setCurrentNotification(next);
      setNotificationQueue(rest);
    }
  }, [notificationQueue, currentNotification]);

  const loadCurrentUser = async () => {
    try {
      const user = await UserStorageService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      // Error loading user
    }
  };

  const checkForNewNotifications = async () => {
    if (!currentUser) return;

    try {
      const allNotifications = await NotificationService.getNotificationsForUser(currentUser.id);

      // Filter for new notifications since last check
      const newNotifications = allNotifications.filter(
        (n) => !n.read && new Date(n.timestamp) > lastCheckRef.current,
      );

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
    }
  };

  const handleDismiss = () => {
    setCurrentNotification(null);
  };

  const handlePress = () => {
    // Navigate based on notification type
    if (currentNotification?.data?.taskId) {
      navigation.navigate('Tasks', {
        screen: 'TasksList',
        params: { focusTaskId: currentNotification.data.taskId },
      });
    } else {
      // Default to notifications list
      navigation.navigate('NotificationList');
    }
  };

  if (!currentNotification) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <NotificationBanner
        notification={currentNotification}
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
