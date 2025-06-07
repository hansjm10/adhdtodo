// ABOUTME: Mac-inspired ADHD-friendly card component using NativeWind
// Provides clean card styling with subtle shadows and proper spacing

import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, TouchableOpacity } from 'react-native';
import { cn } from '../../utils/cn';

interface ThemedCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  spacing?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  className?: string;
  testID?: string;
  disabled?: boolean;
}

export const ThemedCard = ({
  children,
  variant = 'elevated',
  spacing: cardSpacing = 'medium',
  onPress,
  style,
  className,
  testID,
  disabled = false,
}: ThemedCardProps) => {
  // Base card classes with dark theme
  const baseClasses = 'bg-surface-1 rounded-card overflow-hidden';

  // Variant classes for dark theme
  const variantClasses = {
    elevated: 'shadow-card bg-surface-2',
    outlined: 'border border-border-default',
    filled: 'bg-surface-2',
  };

  // Spacing classes
  const spacingClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  const cardClasses = cn(
    baseClasses,
    variantClasses[variant],
    spacingClasses[cardSpacing],
    disabled && 'opacity-60',
    // Custom className (applied last for override capability)
    className,
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className={cardClasses}
        style={style}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={cardClasses} style={style} testID={testID}>
      {children}
    </View>
  );
};
