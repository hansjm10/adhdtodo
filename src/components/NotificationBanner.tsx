// ABOUTME: Mac-inspired notification banner using NativeWind
// Clean animated notifications with auto-dismiss and swipe gestures

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { View, Animated, TouchableOpacity, PanResponder } from 'react-native';
import { ThemedText, ThemedIcon } from './themed';
import type { Ionicons } from '@expo/vector-icons';
import { NOTIFICATION_TYPES } from '../constants/UserConstants';
import type { NotificationTypes } from '../types/user.types';

// Screen width constant removed - using direct calculation in styles
const BANNER_HEIGHT = 100;
const SWIPE_THRESHOLD = 50;

export interface NotificationData {
  assignedBy?: string;
  taskTitle?: string;
  startedBy?: string;
  completedBy?: string;
  message?: string;
  fromUser?: string;
}

export interface NotificationBannerNotification {
  type: NotificationTypes;
  data?: NotificationData;
}

interface NotificationBannerProps {
  notification: NotificationBannerNotification;
  onDismiss?: () => void;
  onPress?: () => void;
}

interface NotificationStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
}

const NotificationBanner = ({ notification, onDismiss, onPress }: NotificationBannerProps) => {
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);

  // Determine if notification should auto-dismiss
  const shouldAutoDismiss = useCallback((): boolean => {
    const criticalTypes = [
      NOTIFICATION_TYPES.TASK_OVERDUE,
      NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST,
    ];
    return !criticalTypes.includes(notification.type);
  }, [notification.type]);

  // Get icon and color based on notification type
  const getNotificationStyle = (): NotificationStyle => {
    switch (notification.type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return { icon: 'add-circle', color: '#3498DB', backgroundColor: '#EBF5FB' };
      case NOTIFICATION_TYPES.TASK_STARTED:
        return { icon: 'play-circle', color: '#27AE60', backgroundColor: '#E8F8F5' };
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return { icon: 'checkmark-circle', color: '#27AE60', backgroundColor: '#E8F8F5' };
      case NOTIFICATION_TYPES.TASK_OVERDUE:
        return { icon: 'alert-circle', color: '#E74C3C', backgroundColor: '#FADBD8' };
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
        return { icon: 'heart', color: '#F39C12', backgroundColor: '#FEF5E7' };
      case NOTIFICATION_TYPES.CHECK_IN:
        return { icon: 'chatbubble-ellipses', color: '#9B59B6', backgroundColor: '#F4ECF7' };
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return { icon: 'time', color: '#E67E22', backgroundColor: '#FDEBD0' };
      default:
        return { icon: 'notifications', color: '#3498DB', backgroundColor: '#EBF5FB' };
    }
  };

  // Get notification message
  const getMessage = (): string => {
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
        return data.message ?? `${data.fromUser} sent you encouragement`;
      case NOTIFICATION_TYPES.CHECK_IN:
        return data.message ?? `${data.fromUser} is checking in`;
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return `Deadline change requested for "${data.taskTitle}"`;
      default:
        return 'New notification';
    }
  };

  // Dismiss animation
  const dismissBanner = useCallback((): void => {
    if (isDismissing) return;
    setIsDismissing(true);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -BANNER_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  }, [isDismissing, translateY, opacity, onDismiss]);

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        } else {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (gestureState.dy < -SWIPE_THRESHOLD) {
          // Swipe up to dismiss
          dismissBanner();
        } else if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          // Swipe horizontally to dismiss
          dismissBanner();
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  // Show animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 5 seconds for non-critical notifications
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (shouldAutoDismiss()) {
      timer = setTimeout(() => {
        dismissBanner();
      }, 5000);
    }

    // Always return cleanup function
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [shouldAutoDismiss, dismissBanner, translateY, opacity]);

  const style = getNotificationStyle();

  return (
    <Animated.View
      className="absolute top-0 left-0 right-0 z-50 shadow-lg elevation-10"
      style={{
        backgroundColor: style.backgroundColor,
        transform: [{ translateY }, { translateX }],
        opacity,
      }}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        className={`flex-row items-center px-4 pb-4 pt-10 min-h-[${BANNER_HEIGHT}px]`}
        activeOpacity={0.9}
        onPress={() => {
          if (onPress) onPress();
          dismissBanner();
        }}
      >
        <View
          className="w-10 h-10 rounded-full justify-center items-center mr-3"
          style={{ backgroundColor: style.color }}
        >
          <ThemedIcon name={style.icon} size="md" color="white" />
        </View>
        <ThemedText
          variant="body"
          weight="medium"
          numberOfLines={2}
          className="flex-1"
          style={{ color: style.color }}
        >
          {getMessage()}
        </ThemedText>
        <TouchableOpacity
          className="ml-2 p-1"
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedIcon name="close" size="sm" color="primary" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default NotificationBanner;
