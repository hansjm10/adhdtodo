// ABOUTME: Mac-inspired profile screen using NativeWind
// Clean settings and profile management with card-based layout

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/contexts';
import { ThemedContainer, ThemedText, ThemedCard, ThemedIcon } from '../../src/components/themed';
import AuthService from '../../src/services/AuthService';
import { USER_ROLE } from '../../src/constants/UserConstants';
import type { UserRole } from '../../src/types/user.types';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  showArrow?: boolean;
  disabled?: boolean;
}

const MenuItem = ({
  icon,
  label,
  onPress,
  color = 'primary',
  showArrow = true,
  disabled = false,
}: MenuItemProps) => (
  <TouchableOpacity
    className={`flex-row items-center justify-between px-5 py-4${disabled ? ' opacity-50' : ''}`}
    onPress={onPress}
    disabled={disabled}
  >
    <View className="flex-row items-center">
      <View className="mr-4">
        <ThemedIcon
          name={icon as keyof typeof Ionicons.glyphMap}
          size="md"
          color={color === '#E74C3C' ? 'danger' : 'primary'}
        />
      </View>
      <ThemedText variant="body" color={color === '#E74C3C' ? 'danger' : 'primary'}>
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
        <ThemedIcon name="person-circle-outline" size="xl" color="tertiary" />
        <ThemedText variant="h3" color="secondary" align="center" className="mt-4">
          No user data available
        </ThemedText>
      </ThemedContainer>
    );
  }

  return (
    <ThemedContainer variant="screen" safeArea>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Header */}
        <View className="mb-4">
          <ThemedCard variant="elevated" spacing="large">
            <View className="items-center">
              {/* Avatar */}
              <View className="w-20 h-20 rounded-full bg-primary-500 justify-center items-center mb-4">
                <Text className="text-4xl font-bold text-white">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>

              {/* Name and Email */}
              <ThemedText variant="h2" color="primary" align="center" className="mb-1">
                {currentUser.name || 'Anonymous'}
              </ThemedText>
              <ThemedText variant="body" color="secondary" align="center" className="mb-3">
                {currentUser.email}
              </ThemedText>

              {/* Role Badge */}
              <View className="bg-primary-50 px-4 py-2 rounded-full">
                <ThemedText variant="caption" color="primary" weight="medium">
                  {getUserRoleLabel(currentUser.role)}
                </ThemedText>
              </View>
            </View>
          </ThemedCard>
        </View>

        {/* Account Section */}
        <View className="mb-4">
          <ThemedCard variant="elevated" spacing="small">
            <View className="px-1 py-2">
              <View className="px-4 py-2">
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
                icon="settings-outline"
                label="App Settings"
                onPress={() => {
                  router.push('/settings');
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
          </ThemedCard>
        </View>

        {/* Statistics Section */}
        <View className="mb-4">
          <ThemedCard variant="elevated" spacing="medium">
            <ThemedText
              variant="caption"
              color="tertiary"
              weight="semibold"
              className="mb-4 uppercase tracking-wide"
            >
              Statistics
            </ThemedText>
            <View className="flex-row justify-around">
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
          </ThemedCard>
        </View>

        {/* Account Info Section */}
        <View className="mb-4">
          <ThemedCard variant="elevated" spacing="medium">
            <ThemedText
              variant="caption"
              color="tertiary"
              weight="semibold"
              className="mb-4 uppercase tracking-wide"
            >
              Account Info
            </ThemedText>
            <View className="gap-3">
              <View className="flex-row justify-between">
                <ThemedText variant="body" color="secondary">
                  Member Since
                </ThemedText>
                <ThemedText variant="body" color="primary">
                  {formatDate(currentUser.createdAt)}
                </ThemedText>
              </View>
              <View className="flex-row justify-between">
                <ThemedText variant="body" color="secondary">
                  Last Login
                </ThemedText>
                <ThemedText variant="body" color="primary">
                  {formatDate(currentUser.lastLoginAt)}
                </ThemedText>
              </View>
              <View className="flex-row justify-between">
                <ThemedText variant="body" color="secondary">
                  Account ID
                </ThemedText>
                <ThemedText variant="body" color="primary">
                  {currentUser.id.slice(-8)}
                </ThemedText>
              </View>
            </View>
          </ThemedCard>
        </View>

        {/* Logout Section */}
        <View className="mb-4">
          <ThemedCard variant="elevated" spacing="small">
            <MenuItem
              icon="log-out-outline"
              label="Logout"
              onPress={handleLogout}
              color="#E74C3C"
              showArrow={false}
              disabled={loading}
            />
          </ThemedCard>
        </View>

        {/* Footer */}
        <View className="items-center py-8">
          <ThemedText variant="caption" color="tertiary" align="center" className="mb-1">
            ADHD Todo v1.0.0
          </ThemedText>
          <ThemedText variant="caption" color="tertiary" align="center">
            Your accountability partner app
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedContainer>
  );
};

export default ProfileScreen;
