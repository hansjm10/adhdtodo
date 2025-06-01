// ABOUTME: Animated banner component for displaying in-app notifications
// Shows notifications at the top of the screen with auto-dismiss and swipe-to-dismiss

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NOTIFICATION_TYPES } from '../constants/UserConstants';
import { NotificationTypes } from '../types/user.types';

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

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onDismiss,
  onPress,
}) => {
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);

  // Determine if notification should auto-dismiss
  const shouldAutoDismiss = (): boolean => {
    const criticalTypes = [
      NOTIFICATION_TYPES.TASK_OVERDUE,
      NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST,
    ];
    return !criticalTypes.includes(notification.type);
  };

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
        return data.message || `${data.fromUser} sent you encouragement`;
      case NOTIFICATION_TYPES.CHECK_IN:
        return data.message || `${data.fromUser} is checking in`;
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return `Deadline change requested for "${data.taskTitle}"`;
      default:
        return 'New notification';
    }
  };

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
  }, []);

  // Dismiss animation
  const dismissBanner = (): void => {
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
  };

  const style = getNotificationStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: style.backgroundColor,
          transform: [{ translateY }, { translateX }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.9}
        onPress={() => {
          if (onPress) onPress();
          dismissBanner();
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: style.color }]}>
          <Ionicons name={style.icon} size={24} color="white" />
        </View>
        <Text style={[styles.message, { color: style.color }]} numberOfLines={2}>
          {getMessage()}
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={style.color} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface Styles {
  container: ViewStyle;
  content: ViewStyle;
  iconContainer: ViewStyle;
  message: TextStyle;
  closeButton: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40, // Account for status bar
    paddingBottom: 16,
    paddingHorizontal: 16,
    minHeight: BANNER_HEIGHT,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default NotificationBanner;
