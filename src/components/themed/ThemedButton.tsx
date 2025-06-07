// ABOUTME: Mac-inspired ADHD-friendly button component using NativeWind
// Features proper states, haptic feedback, and accessibility

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

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
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const isDisabled = disabled || loading;

  // Base button classes
  const baseClasses = 'flex-row items-center justify-center rounded-button';

  // Size classes
  const sizeClasses = {
    small: 'px-4 py-2 min-h-[36px]',
    medium: 'px-6 py-3 min-h-[48px]',
    large: 'px-8 py-4 min-h-[56px]',
  };

  // Variant classes for dark theme
  const variantClasses = {
    primary: 'bg-primary-500 shadow-button',
    secondary: 'bg-surface-2 border-2 border-primary-500',
    ghost: 'bg-transparent',
    danger: 'bg-danger-500 shadow-button',
  };

  // Text color classes for dark theme
  const textColorClasses = {
    primary: 'text-white',
    secondary: 'text-primary-500',
    ghost: 'text-primary-500',
    danger: 'text-white',
  };

  // Text size classes
  const textSizeClasses = {
    small: 'text-sm font-medium',
    medium: 'text-base font-semibold',
    large: 'text-lg font-semibold',
  };

  const buttonClasses = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    fullWidth ? 'w-full' : '',
    isDisabled ? 'opacity-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const textClasses = [
    'text-center',
    textSizeClasses[size],
    textColorClasses[variant],
    isDisabled ? 'text-text-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const loadingColor = variant === 'primary' || variant === 'danger' ? '#ffffff' : '#a855f7';

  return (
    <Animated.View
      className={fullWidth ? 'w-full' : ''}
      style={{ transform: [{ scale: scaleAnim }] }}
    >
      <TouchableOpacity
        className={buttonClasses}
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
          <ActivityIndicator size="small" color={loadingColor} />
        ) : (
          <>
            {icon && <Text className="mr-2">{icon}</Text>}
            <Text className={textClasses}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
