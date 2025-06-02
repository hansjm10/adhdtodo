// ABOUTME: Tab navigator layout for main app screens
// Provides bottom tab navigation for the primary app features

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NotificationBadge from '../../src/components/NotificationBadge';
import UserStorageService from '../../src/services/UserStorageService';
import NotificationService from '../../src/services/NotificationService';
import { User } from '../../src/types/user.types';

// Tab bar icon type
type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

export default function TabLayout() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [, setCurrentUser] = useState<User | null>(null);

  const loadUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const user = await UserStorageService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const notifications = await NotificationService.getNotificationsForUser(user.id);
        const unread = notifications.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      // Error loading notification count
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    // Set up interval to check for new notifications
    const interval = setInterval(loadUnreadCount, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
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
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={size} color={color} />
          ),
          headerRight: () => (
            <NotificationBadge count={unreadCount} onPress={() => router.push('/notifications')} />
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarButtonTestID: 'tab-focus',
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="partner"
        options={{
          title: 'Partner',
          tabBarButtonTestID: 'tab-partner',
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: '/profile',
          title: 'Profile',
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
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
