// ABOUTME: ADHD-friendly button component using the new design system
// Demonstrates proper use of theme values, accessibility, and haptic feedback

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';

export interface ThemedButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  haptic?: boolean;
  testID?: string;
}

export const ThemedButton = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  haptic = true,
  testID,
}: ThemedButtonProps) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (haptic && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.base,
          styles[size],
          styles[variant],
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.text.inverse : colors.primary}
          />
        ) : (
          <>
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text
              style={[
                styles.text,
                styles[`${size}Text`],
                styles[`${variant}Text`],
                isDisabled && styles.disabledText,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Base styles
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  } as ViewStyle,

  // Size variants
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 36,
  } as ViewStyle,
  medium: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 48,
  } as ViewStyle,
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 56,
  } as ViewStyle,

  // Style variants
  primary: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  } as ViewStyle,
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
  } as ViewStyle,
  danger: {
    backgroundColor: colors.semantic.error,
    ...shadows.sm,
  } as ViewStyle,

  // State styles
  disabled: {
    opacity: 0.5,
    ...shadows.none,
  } as ViewStyle,

  // Text styles
  text: {
    textAlign: 'center',
  } as TextStyle,
  smallText: {
    ...typography.bodySmall,
  } as TextStyle,
  mediumText: {
    ...typography.button,
  } as TextStyle,
  largeText: {
    ...typography.h3,
  } as TextStyle,

  // Text color variants
  primaryText: {
    color: colors.text.inverse,
  } as TextStyle,
  secondaryText: {
    color: colors.primary,
  } as TextStyle,
  ghostText: {
    color: colors.primary,
  } as TextStyle,
  dangerText: {
    color: colors.text.inverse,
  } as TextStyle,
  disabledText: {
    color: colors.text.tertiary,
  } as TextStyle,

  // Icon styles
  icon: {
    marginRight: spacing.xs,
  } as TextStyle,

  // Layout styles
  fullWidth: {
    width: '100%',
  } as ViewStyle,
});
