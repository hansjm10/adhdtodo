// ABOUTME: Mac-inspired notifications screen using NativeWind
// Clean notification list with history and read status tracking

import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import type { Ionicons } from '@expo/vector-icons';
import { ThemedText, ThemedContainer, ThemedIcon } from '../../src/components/themed';
import NotificationService from '../../src/services/NotificationService';
import UserStorageService from '../../src/services/UserStorageService';
import { NOTIFICATION_TYPES } from '../../src/constants/UserConstants';
import type { Notification } from '../../src/types/notification.types';
import type { User } from '../../src/types/user.types';

interface NotificationStyle {
  icon: string;
  color: string;
  bgColor: string;
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
    loadNotifications().catch(() => {});
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
        onPress: () => {
          if (currentUser) {
            NotificationService.clearNotificationsForUser(currentUser.id)
              .then(() => {
                setNotifications([]);
              })
              .catch(() => {});
          }
        },
      },
    ]);
  }, [currentUser]);

  const getNotificationStyle = (type: string): NotificationStyle => {
    switch (type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return { icon: 'add-circle', color: '#3498DB', bgColor: '#EBF5FB' };
      case NOTIFICATION_TYPES.TASK_STARTED:
        return { icon: 'play-circle', color: '#27AE60', bgColor: '#E8F8F5' };
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return { icon: 'checkmark-circle', color: '#27AE60', bgColor: '#E8F8F5' };
      case NOTIFICATION_TYPES.TASK_OVERDUE:
        return { icon: 'alert-circle', color: '#E74C3C', bgColor: '#FADBD8' };
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
        return { icon: 'heart', color: '#F39C12', bgColor: '#FEF5E7' };
      case NOTIFICATION_TYPES.CHECK_IN:
        return { icon: 'chatbubble-ellipses', color: '#9B59B6', bgColor: '#F4ECF7' };
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return { icon: 'time', color: '#E67E22', bgColor: '#FDEBD0' };
      default:
        return { icon: 'notifications', color: '#3498DB', bgColor: '#EBF5FB' };
    }
  };

  const getMessage = (notification: Notification): string => {
    const data = notification.data ?? {};
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
          (typeof data.message === 'string' && data.message) ||
          `${data.fromUser} sent you encouragement`
        );
      case NOTIFICATION_TYPES.CHECK_IN:
        return (
          (typeof data.message === 'string' && data.message) || `${data.fromUser} is checking in`
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
        className={`flex-row items-center bg-white mx-4 my-1 px-5 py-4 rounded-xl shadow-sm${!item.read ? ' bg-blue-50 border border-blue-100' : ''}`}
        onPress={() => {
          if (!item.read) {
            markAsRead(item.id).catch(() => {});
          }
          // Navigate to relevant screen based on notification type
          if (item.data?.taskId) {
            // Navigate to task list
            router.push('/(tabs)');
          }
        }}
      >
        <View
          className="w-12 h-12 rounded-full justify-center items-center mr-4"
          style={{ backgroundColor: style.bgColor }}
        >
          <ThemedIcon
            name={style.icon as keyof typeof Ionicons.glyphMap}
            size="md"
            color="primary"
          />
        </View>
        <View className="flex-1">
          <ThemedText
            variant="body"
            color="primary"
            weight={!item.read ? 'semibold' : 'medium'}
            className="mb-1"
          >
            {getMessage(item)}
          </ThemedText>
          <ThemedText variant="caption" color="tertiary">
            {getTimeAgo(item.timestamp)}
          </ThemedText>
        </View>
        {!item.read && <View className="w-2 h-2 rounded-full bg-primary-500 ml-3" />}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-10">
      <ThemedIcon name="notifications-off-outline" size="xl" color="tertiary" />
      <ThemedText variant="h3" color="secondary" weight="bold" align="center" className="mt-4 mb-2">
        No Notifications
      </ThemedText>
      <ThemedText variant="body" color="tertiary" align="center">
        You&apos;re all caught up!
      </ThemedText>
    </View>
  );

  return (
    <ThemedContainer variant="screen" safeArea>
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-neutral-200">
        <ThemedText variant="h2" color="primary" weight="bold">
          Notifications
        </ThemedText>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications} className="p-2">
            <ThemedText variant="body" color="danger" weight="medium">
              Clear All
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <FlashList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerClassName="py-2"
        estimatedItemSize={100}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh().catch(() => {});
            }}
            colors={['#3498DB']}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </ThemedContainer>
  );
};

export default NotificationListScreen;
