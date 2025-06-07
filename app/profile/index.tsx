// ABOUTME: Mac-inspired profile screen using NativeWind
// Clean user information display with account settings

import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import { ThemedText, ThemedContainer, ThemedIcon } from '../../src/components/themed';
import { useUser } from '../../src/contexts';
import AuthService from '../../src/services/AuthService';
import { USER_ROLE } from '../../src/constants/UserConstants';
import type { UserRole } from '../../src/types/user.types';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
  showArrow?: boolean;
  disabled?: boolean;
}

const MenuItem = ({
  icon,
  label,
  onPress,
  variant = 'default',
  showArrow = true,
  disabled = false,
}: MenuItemProps) => (
  <TouchableOpacity
    className="flex-row items-center justify-between px-5 py-4 active:bg-neutral-100"
    onPress={onPress}
    disabled={disabled}
  >
    <View className="flex-row items-center gap-4">
      <ThemedIcon
        name={icon as keyof typeof Ionicons.glyphMap}
        size="md"
        color={variant === 'danger' ? 'danger' : 'primary'}
      />
      <ThemedText
        variant="body"
        color={variant === 'danger' ? 'danger' : 'primary'}
        weight="medium"
      >
        {label}
      </ThemedText>
    </View>
    {showArrow && <ThemedIcon name="chevron-forward" size="sm" color="tertiary" />}
  </TouchableOpacity>
);

const ProfileScreen = () => {
  const router = useRouter();
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogout = (): void => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: (): void => {
          setLoading(true);
          AuthService.logout()
            .then((result) => {
              if (!result.success) {
                Alert.alert('Error', 'Failed to logout. Please try again.');
                setLoading(false);
              }
            })
            .catch(() => {
              Alert.alert('Error', 'Failed to logout. Please try again.');
              setLoading(false);
            });
        },
      },
    ]);
  };

  const getUserRoleLabel = (role: UserRole | string): string => {
    switch (role) {
      case USER_ROLE.ADHD_USER:
        return 'ADHD User';
      case USER_ROLE.PARTNER:
        return 'Accountability Partner';
      case USER_ROLE.BOTH:
        return 'Both ADHD User & Partner';
      default:
        return role;
    }
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  if (!currentUser) {
    return (
      <ThemedContainer variant="screen" safeArea centered>
        <ThemedText variant="body" color="secondary">
          No user data available
        </ThemedText>
      </ThemedContainer>
    );
  }

  return (
    <ThemedContainer variant="screen" safeArea>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="items-center py-8 bg-white">
          <View className="w-20 h-20 rounded-full bg-primary-500 justify-center items-center mb-4">
            <ThemedText variant="h1" color="white" weight="bold">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </ThemedText>
          </View>
          <ThemedText variant="h3" color="primary" weight="semibold" className="mb-1">
            {currentUser.name || 'Anonymous'}
          </ThemedText>
          <ThemedText variant="body" color="secondary" className="mb-3">
            {currentUser.email}
          </ThemedText>
          <View className="bg-primary-50 px-4 py-1.5 rounded-full">
            <ThemedText variant="caption" color="primary" weight="medium">
              {getUserRoleLabel(currentUser.role)}
            </ThemedText>
          </View>
        </View>

        {/* Account Section */}
        <View className="bg-white mt-4">
          <View className="px-5 pt-4 pb-2">
            <ThemedText
              variant="caption"
              color="tertiary"
              weight="semibold"
              className="uppercase tracking-wide"
            >
              Account
            </ThemedText>
          </View>
          <MenuItem
            icon="people-outline"
            label="Partnership"
            onPress={() => {
              router.push('/profile/partnership');
            }}
            disabled={loading}
          />
          <MenuItem
            icon="key-outline"
            label="Change Password"
            onPress={() => {
              Alert.alert('Coming Soon', 'Password change feature coming soon!');
            }}
            disabled={loading}
          />
          <MenuItem
            icon="mail-outline"
            label="Email Preferences"
            onPress={() => {
              Alert.alert('Coming Soon', 'Email preferences coming soon!');
            }}
            disabled={loading}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notification Settings"
            onPress={() => {
              Alert.alert('Coming Soon', 'Notification settings coming soon!');
            }}
            disabled={loading}
          />
        </View>

        {/* Statistics Section */}
        <View className="bg-white mt-4">
          <View className="px-5 pt-4 pb-2">
            <ThemedText
              variant="caption"
              color="tertiary"
              weight="semibold"
              className="uppercase tracking-wide"
            >
              Statistics
            </ThemedText>
          </View>
          <View className="flex-row justify-around py-4">
            <View className="items-center">
              <ThemedText variant="h2" color="primary" weight="bold">
                {currentUser.stats?.tasksCompleted || 0}
              </ThemedText>
              <ThemedText variant="caption" color="secondary" className="mt-1">
                Tasks Done
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText variant="h2" color="primary" weight="bold">
                {currentUser.stats?.currentStreak || 0}
              </ThemedText>
              <ThemedText variant="caption" color="secondary" className="mt-1">
                Day Streak
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText variant="h2" color="primary" weight="bold">
                {currentUser.stats?.totalXP || 0}
              </ThemedText>
              <ThemedText variant="caption" color="secondary" className="mt-1">
                Total XP
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Account Info Section */}
        <View className="bg-white mt-4">
          <View className="px-5 pt-4 pb-2">
            <ThemedText
              variant="caption"
              color="tertiary"
              weight="semibold"
              className="uppercase tracking-wide"
            >
              Account Info
            </ThemedText>
          </View>
          <View className="flex-row justify-between px-5 py-3">
            <ThemedText variant="body" color="secondary">
              Member Since
            </ThemedText>
            <ThemedText variant="body" color="primary" weight="medium">
              {formatDate(currentUser.createdAt)}
            </ThemedText>
          </View>
          <View className="flex-row justify-between px-5 py-3">
            <ThemedText variant="body" color="secondary">
              Last Login
            </ThemedText>
            <ThemedText variant="body" color="primary" weight="medium">
              {formatDate(currentUser.lastLoginAt)}
            </ThemedText>
          </View>
          <View className="flex-row justify-between px-5 py-3">
            <ThemedText variant="body" color="secondary">
              Account ID
            </ThemedText>
            <ThemedText variant="body" color="primary" weight="medium">
              {currentUser.id.slice(-8)}
            </ThemedText>
          </View>
        </View>

        {/* Logout Section */}
        <View className="bg-white mt-4">
          <MenuItem
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
            variant="danger"
            showArrow={false}
            disabled={loading}
          />
        </View>

        {/* Footer */}
        <View className="items-center py-8">
          <ThemedText variant="caption" color="tertiary" className="mb-1">
            ADHD Todo v1.0.0
          </ThemedText>
          <ThemedText variant="caption" color="tertiary">
            Your accountability partner app
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedContainer>
  );
};

export default ProfileScreen;
