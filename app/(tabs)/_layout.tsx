// ABOUTME: Tab navigator layout for main app screens
// Provides bottom tab navigation for the primary app features

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NotificationBadge from '../../src/components/NotificationBadge';
import UserStorageService from '../../src/services/UserStorageService';
import NotificationService from '../../src/services/NotificationService';

// Tab bar icon type
type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

const TabIcon = ({
  focused,
  color,
  size,
  focusedName,
  unfocusedName,
}: TabBarIconProps & {
  focusedName: keyof typeof Ionicons.glyphMap;
  unfocusedName: keyof typeof Ionicons.glyphMap;
}) => <Ionicons name={focused ? focusedName : unfocusedName} size={size} color={color} />;

const TasksIcon = (props: TabBarIconProps) => (
  <TabIcon {...props} focusedName="checkbox" unfocusedName="checkbox-outline" />
);

const FocusIcon = (props: TabBarIconProps) => (
  <TabIcon {...props} focusedName="time" unfocusedName="time-outline" />
);

const PartnerIcon = (props: TabBarIconProps) => (
  <TabIcon {...props} focusedName="people" unfocusedName="people-outline" />
);

const ProfileIcon = (props: TabBarIconProps) => (
  <TabIcon {...props} focusedName="person" unfocusedName="person-outline" />
);

const useNotificationHeaderButton = (unreadCount: number) => {
  const router = useRouter();
  // eslint-disable-next-line react/display-name
  return () => (
    <NotificationBadge
      count={unreadCount}
      onPress={() => {
        router.push('/notifications');
      }}
    />
  );
};

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const NotificationHeaderButton = useNotificationHeaderButton(unreadCount);

  const loadUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const user = await UserStorageService.getCurrentUser();
      if (user) {
        const result = await NotificationService.getNotificationsForUser(user.id);
        if (result.success && result.data) {
          const unread = result.data.filter((n) => !n.read).length;
          setUnreadCount(unread);
        } else {
          setUnreadCount(0);
        }
      }
    } catch (error) {
      // Log error but don't disrupt UI - notification count is non-critical
      console.warn('Failed to load notification count:', error);
      setUnreadCount(0); // Default to 0 on error
    }
  }, []);

  useEffect(() => {
    loadUnreadCount().catch((error) => {
      if (global.__DEV__) {
        console.error('Failed to load unread count:', error);
      }
    });
    // Set up interval to check for new notifications
    const interval = setInterval(() => {
      loadUnreadCount().catch((error) => {
        if (global.__DEV__) {
          console.error('Failed to load unread count:', error);
        }
      });
    }, 10000); // Check every 10 seconds
    return () => {
      clearInterval(interval);
    };
  }, [loadUnreadCount]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3498DB',
        tabBarInactiveTintColor: '#7F8C8D',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tasks',
          tabBarButtonTestID: 'tab-tasks',
          tabBarIcon: TasksIcon,
          headerRight: NotificationHeaderButton,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarButtonTestID: 'tab-focus',
          tabBarIcon: FocusIcon,
        }}
      />
      <Tabs.Screen
        name="partner"
        options={{
          title: 'Partner',
          tabBarButtonTestID: 'tab-partner',
          tabBarIcon: PartnerIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: ProfileIcon,
        }}
      />
      {/* Hidden screens that are part of focus stack */}
      <Tabs.Screen
        name="hyperfocus"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="scattered"
        options={{
          href: null, // Hide from tab bar
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
