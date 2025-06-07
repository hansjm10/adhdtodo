// ABOUTME: Mac-inspired ADHD-friendly icon component using NativeWind
// Provides consistent icon sizing and coloring with accessibility support

import React from 'react';
import type { ViewStyle } from 'react-native';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../utils/cn';

interface ThemedIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'white';
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export const ThemedIcon = ({
  name,
  size = 'md',
  color = 'primary',
  onPress,
  style,
  testID,
  accessibilityLabel,
  disabled = false,
}: ThemedIconProps) => {
  // Size mappings
  const sizeMap = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  };

  // Color mappings
  const colorMap = {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    white: '#ffffff',
  };

  const iconSize = sizeMap[size];
  const iconColor = colorMap[color];

  // Container classes for touchable icons
  const containerClasses = cn(
    'items-center justify-center',
    onPress && 'p-2 rounded-md',
    disabled && 'opacity-50',
  );

  const icon = (
    <Ionicons
      name={name}
      size={iconSize}
      color={iconColor}
      accessibilityLabel={accessibilityLabel}
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className={containerClasses}
        style={style}
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {icon}
      </TouchableOpacity>
    );
  }

  return (
    <View className={containerClasses} style={style} testID={testID}>
      {icon}
    </View>
  );
};
