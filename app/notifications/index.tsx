// ABOUTME: Screen for viewing all notifications with history and read status
// Displays notification list with timestamps and ability to mark as read

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import NotificationService from '../../src/services/NotificationService';
import UserStorageService from '../../src/services/UserStorageService';
import { NOTIFICATION_TYPES } from '../../src/constants/UserConstants';
import type { Notification } from '../../src/types/notification.types';
import type { User } from '../../src/types/user.types';

interface NotificationStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  clearButton: ViewStyle;
  clearButtonText: TextStyle;
  listContent: ViewStyle;
  notificationItem: ViewStyle;
  unreadNotification: ViewStyle;
  iconContainer: ViewStyle;
  notificationContent: ViewStyle;
  notificationMessage: TextStyle;
  unreadText: TextStyle;
  timestamp: TextStyle;
  unreadDot: ViewStyle;
  emptyState: ViewStyle;
  emptyStateTitle: TextStyle;
  emptyStateText: TextStyle;
}

const NotificationListScreen = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const user = await UserStorageService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const userNotifications = await NotificationService.getNotificationsForUser(user.id);
        // Sort by timestamp, newest first
        const sortedNotifications = userNotifications.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setNotifications(sortedNotifications);
      }
    } catch (error) {
      // Error loading notifications
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await NotificationService.markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    Alert.alert('Clear All Notifications', 'Are you sure you want to clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          if (currentUser) {
            await NotificationService.clearNotificationsForUser(currentUser.id);
            setNotifications([]);
          }
        },
      },
    ]);
  }, [currentUser]);

  const getNotificationStyle = (type: string): NotificationStyle => {
    switch (type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return { icon: 'add-circle', color: '#3498DB' };
      case NOTIFICATION_TYPES.TASK_STARTED:
        return { icon: 'play-circle', color: '#27AE60' };
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return { icon: 'checkmark-circle', color: '#27AE60' };
      case NOTIFICATION_TYPES.TASK_OVERDUE:
        return { icon: 'alert-circle', color: '#E74C3C' };
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
        return { icon: 'heart', color: '#F39C12' };
      case NOTIFICATION_TYPES.CHECK_IN:
        return { icon: 'chatbubble-ellipses', color: '#9B59B6' };
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return { icon: 'time', color: '#E67E22' };
      default:
        return { icon: 'notifications', color: '#3498DB' };
    }
  };

  const getMessage = (notification: Notification): string => {
    const data = notification.data || {};
    switch (notification.type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return `${data.assignedBy} assigned you "${data.taskTitle}"`;
      case NOTIFICATION_TYPES.TASK_STARTED:
        return `${data.startedBy} started "${data.taskTitle}"`;
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return `${data.completedBy} completed "${data.taskTitle}"`;
      case NOTIFICATION_TYPES.TASK_OVERDUE:
        return `"${data.taskTitle}" is overdue`;
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
        return (
          (typeof data.message === 'string' ? data.message : null) ||
          `${data.fromUser} sent you encouragement`
        );
      case NOTIFICATION_TYPES.CHECK_IN:
        return (
          (typeof data.message === 'string' ? data.message : null) ||
          `${data.fromUser} is checking in`
        );
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return `Deadline change requested for "${data.taskTitle}"`;
      default:
        return 'New notification';
    }
  };

  const getTimeAgo = (timestamp: string | Date): string => {
    const now = new Date();
    const notificationTime = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diffMs = now.getTime() - notificationTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationTime.toLocaleDateString();
  };

  const renderNotification: ListRenderItem<Notification> = ({ item }) => {
    const style = getNotificationStyle(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadNotification]}
        onPress={() => {
          if (!item.read) {
            markAsRead(item.id);
          }
          // Navigate to relevant screen based on notification type
          if (item.data?.taskId) {
            // Navigate to task list
            router.push('/(tabs)');
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: style.color + '20' }]}>
          <Ionicons name={style.icon} size={24} color={style.color} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationMessage, !item.read && styles.unreadText]}>
            {getMessage(item)}
          </Text>
          <Text style={styles.timestamp}>{getTimeAgo(item.timestamp)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={80} color="#BDC3C7" />
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>You&apos;re all caught up!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlashList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={100}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498DB']} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498DB',
    marginLeft: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
  },
});

export default NotificationListScreen;
