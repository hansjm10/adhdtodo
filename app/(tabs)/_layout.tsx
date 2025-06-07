// ABOUTME: Tab navigator layout for main app screens
// Provides bottom tab navigation for the primary app features

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import NotificationBadge from '../../src/components/NotificationBadge';
import NativeTabBar from '../../src/components/navigation/NativeTabBar';
import UserStorageService from '../../src/services/UserStorageService';
import NotificationService from '../../src/services/NotificationService';

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
  const router = useRouter();
  const NotificationHeaderButton = useNotificationHeaderButton(unreadCount);

  const loadUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const user = await UserStorageService.getCurrentUser();
      if (user) {
        const notifications = await NotificationService.getNotificationsForUser(user.id);
        const unread = notifications.filter((n) => !n.read).length;
        setUnreadCount(unread);
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

  const tabs = [
    {
      name: 'tasks',
      label: 'Tasks',
      icon: 'checkbox-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'checkbox' as keyof typeof Ionicons.glyphMap,
      path: '/(tabs)',
    },
    {
      name: 'focus',
      label: 'Focus',
      icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'time' as keyof typeof Ionicons.glyphMap,
      path: '/(tabs)/focus',
    },
    {
      name: 'partner',
      label: 'Partner',
      icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'people' as keyof typeof Ionicons.glyphMap,
      path: '/(tabs)/partner',
    },
    {
      name: 'profile',
      label: 'Profile',
      icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
      activeIcon: 'person' as keyof typeof Ionicons.glyphMap,
      path: '/(tabs)/profile',
    },
  ];

  const handleTabPress = (tab: (typeof tabs)[0]) => {
    router.push(tab.path);
  };

  const renderTabBar = useCallback(
    (props: object) => (
      <NativeTabBar
        {...props}
        tabs={tabs}
        onTabPress={handleTabPress}
        badge={{ tasks: unreadCount }}
      />
    ),
    [tabs, handleTabPress, unreadCount],
  );

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' }, // Hide default tab bar
        headerStyle: {
          backgroundColor: '#131316',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
      }}
      tabBar={renderTabBar}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tasks',
          headerRight: NotificationHeaderButton,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus Mode',
        }}
      />
      <Tabs.Screen
        name="partner"
        options={{
          title: 'Partner',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
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
