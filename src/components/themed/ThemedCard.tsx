// ABOUTME: ADHD-friendly card component using the new design system
// Provides consistent card styling with proper spacing and shadows

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

interface ThemedCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  spacing?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  disabled?: boolean;
}

export const ThemedCard = ({
  children,
  variant = 'elevated',
  spacing: cardSpacing = 'medium',
  onPress,
  style,
  testID,
  disabled = false,
}: ThemedCardProps) => {
  const cardStyles = [
    styles.base,
    styles[variant],
    styles[cardSpacing],
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
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
    <View style={cardStyles} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // Base styles
  base: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  } as ViewStyle,

  // Variant styles
  elevated: {
    ...shadows.md,
  } as ViewStyle,
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  filled: {
    backgroundColor: colors.states.hover,
  } as ViewStyle,

  // Spacing variants
  small: {
    padding: spacing.sm,
  } as ViewStyle,
  medium: {
    padding: spacing.md,
  } as ViewStyle,
  large: {
    padding: spacing.lg,
  } as ViewStyle,

  // State styles
  disabled: {
    opacity: 0.6,
  } as ViewStyle,
});
