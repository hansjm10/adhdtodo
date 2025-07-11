// ABOUTME: Badge component for showing unread notification count
// Displays a bell icon with a red badge showing the number of unread notifications

import React from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationBadgeProps {
  count: number;
  onPress: () => void;
}

const NotificationBadge = ({ count, onPress }: NotificationBadgeProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="notifications-outline" size={24} color="#2C3E50" />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface Styles {
  container: ViewStyle;
  badge: ViewStyle;
  badgeText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default NotificationBadge;
