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
  className?: string;
  inputClassName?: string;
  variant?: 'outlined' | 'filled';
}

export const ThemedInput = ({
  label,
  error,
  helper,
  required = false,
  style: _style,
  inputStyle,
  className,
  inputClassName,
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
  const containerClasses = cn('mb-4', className);

  // Label classes for dark theme
  const labelClasses = cn(
    'text-sm font-medium mb-1 ml-1',
    error ? 'text-danger-500' : 'text-text-secondary',
  );

  // Input container classes for dark theme
  const inputContainerClasses = cn(
    'rounded-input min-h-[48px] transition-colors duration-200',
    variant === 'outlined' && [
      'border-2 bg-surface-2',
      isFocused && !error && 'border-primary-500',
      !isFocused && !error && 'border-border-default',
      error && 'border-danger-500',
    ],
    variant === 'filled' && [
      'bg-surface-3',
      isFocused && 'bg-surface-2 border-2 border-primary-500',
      !isFocused && 'border-0',
      error && 'border-2 border-danger-500',
    ],
    !editable && 'opacity-60 bg-surface-3',
  );

  // Input text classes for dark theme
  const inputClasses = cn(
    'text-base text-text-primary px-4 py-3 min-h-[48px]',
    variant === 'filled' && isFocused && 'pt-3 pb-3',
    // Custom inputClassName (applied last for override capability)
    inputClassName,
  );

  // Helper text classes for dark theme
  const helperClasses = cn('text-xs mt-1 ml-1', error ? 'text-danger-500' : 'text-text-tertiary');

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#ef4444' : '#27272A', error ? '#ef4444' : '#a855f7'],
  });

  return (
    <View className={containerClasses} style={_style}>
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
          placeholderTextColor="#71717A"
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
