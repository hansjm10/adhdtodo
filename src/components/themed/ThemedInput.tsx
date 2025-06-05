// ABOUTME: ADHD-friendly input component using the new design system
// Provides clear visual feedback and proper accessibility support

import React, { useState } from 'react';
import type {
  ViewStyle,
  TextStyle,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData} from 'react-native';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  Animated
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';

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

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? colors.semantic.error : colors.border,
      error ? colors.semantic.error : colors.primary,
    ],
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, error && styles.errorLabel]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          variant === 'outlined' && { borderColor },
          variant === 'filled' && styles.filledContainer,
          isFocused && variant === 'filled' && styles.filledFocused,
          error && styles.errorContainer,
          !editable && styles.disabled,
        ]}
      >
        <TextInput
          style={[styles.input, variant === 'filled' && styles.filledInput, inputStyle]}
          placeholderTextColor={colors.text.tertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={helper}
          {...props}
        />
      </Animated.View>

      {(error || helper) && (
        <Text style={[styles.helperText, error && styles.errorText]}>{error || helper}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  } as ViewStyle,

  label: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  } as TextStyle,

  errorLabel: {
    color: colors.semantic.error,
  } as TextStyle,

  required: {
    color: colors.semantic.error,
  } as TextStyle,

  inputContainer: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    minHeight: 48,
  } as ViewStyle,

  filledContainer: {
    borderWidth: 0,
    backgroundColor: colors.states.hover,
  } as ViewStyle,

  filledFocused: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  } as ViewStyle,

  errorContainer: {
    borderColor: colors.semantic.error,
  } as ViewStyle,

  disabled: {
    opacity: 0.6,
    backgroundColor: colors.states.disabled,
  } as ViewStyle,

  input: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  } as TextStyle,

  filledInput: {
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm - 2,
  } as TextStyle,

  helperText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
    marginLeft: spacing.xs,
  } as TextStyle,

  errorText: {
    color: colors.semantic.error,
  } as TextStyle,
});
