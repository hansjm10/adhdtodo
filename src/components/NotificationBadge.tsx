// ABOUTME: Mac-inspired notification badge using NativeWind
// Clean bell icon with red badge for unread notification count

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ThemedIcon } from './themed';

interface NotificationBadgeProps {
  count: number;
  onPress: () => void;
}

const NotificationBadge = ({ count, onPress }: NotificationBadgeProps) => {
  return (
    <TouchableOpacity className="p-2 relative" onPress={onPress} activeOpacity={0.7}>
      <ThemedIcon name="notifications-outline" size="md" color="primary" />
      {count > 0 && (
        <View className="absolute -top-1 -right-1 bg-danger-500 rounded-full min-w-5 h-5 justify-center items-center px-1 border-2 border-white">
          <Text className="text-white text-xs font-bold">{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default NotificationBadge;
