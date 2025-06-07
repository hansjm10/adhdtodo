// ABOUTME: Mac-inspired ADHD-friendly input component using NativeWind
// Features clean focus states, clear error handling, and accessibility support

import React, { useState } from 'react';
import type {
  ViewStyle,
  TextStyle,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { TextInput, View, Text, Animated } from 'react-native';
import { cn } from '../../utils/cn';

interface ThemedInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  variant?: 'outlined' | 'filled';
}

export const ThemedInput = ({
  label,
  error,
  helper,
  required = false,
  style,
  inputStyle,
  variant = 'outlined',
  onFocus,
  onBlur,
  editable = true,
  ...props
}: ThemedInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderColorAnim = React.useRef(new Animated.Value(0)).current;

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    Animated.timing(borderColorAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    Animated.timing(borderColorAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  // Container classes
  const containerClasses = cn('mb-4', style && '');

  // Label classes
  const labelClasses = cn(
    'text-sm font-medium mb-1 ml-1',
    error ? 'text-danger-500' : 'text-neutral-600',
  );

  // Input container classes
  const inputContainerClasses = cn(
    'rounded-input min-h-[48px] transition-colors duration-200',
    variant === 'outlined' && [
      'border-2 bg-neutral-50',
      isFocused && !error && 'border-primary-500',
      !isFocused && !error && 'border-neutral-200',
      error && 'border-danger-500',
    ],
    variant === 'filled' && [
      'bg-neutral-100',
      isFocused && 'bg-neutral-50 border-2 border-primary-500',
      !isFocused && 'border-0',
      error && 'border-2 border-danger-500',
    ],
    !editable && 'opacity-60 bg-neutral-100',
  );

  // Input text classes
  const inputClasses = cn(
    'text-base text-neutral-900 px-4 py-3 min-h-[48px]',
    variant === 'filled' && isFocused && 'pt-3 pb-3',
  );

  // Helper text classes
  const helperClasses = cn('text-xs mt-1 ml-1', error ? 'text-danger-500' : 'text-neutral-500');

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#ef4444' : '#e5e7eb', error ? '#ef4444' : '#3b82f6'],
  });

  return (
    <View className={containerClasses}>
      {label && (
        <Text className={labelClasses}>
          {label}
          {required && <Text className="text-danger-500"> *</Text>}
        </Text>
      )}

      <Animated.View
        className={inputContainerClasses}
        style={variant === 'outlined' ? { borderColor } : undefined}
      >
        <TextInput
          className={inputClasses}
          placeholderTextColor="#9ca3af"
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={helper}
          style={inputStyle}
          {...props}
        />
      </Animated.View>

      {(error ?? helper) && <Text className={helperClasses}>{error ?? helper}</Text>}
    </View>
  );
};
