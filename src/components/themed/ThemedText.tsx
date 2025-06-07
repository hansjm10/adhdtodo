// ABOUTME: Mac-inspired ADHD-friendly text component using NativeWind
// Provides consistent typography with clear hierarchy and accessibility

import React from 'react';
import type { TextStyle } from 'react-native';
import { Text } from 'react-native';
import { cn } from '../../utils/cn';

interface ThemedTextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label' | 'button';
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'white';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
  className?: string;
  testID?: string;
  numberOfLines?: number;
  onPress?: () => void;
}

export const ThemedText = ({
  children,
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  style,
  className,
  testID,
  numberOfLines,
  onPress,
}: ThemedTextProps) => {
  // Typography variant classes
  const variantClasses = {
    h1: 'text-screen-title',
    h2: 'text-section-title',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-medium',
    body: 'text-base',
    caption: 'text-sm',
    label: 'text-sm font-medium',
    button: 'text-base font-semibold',
  };

  // Color classes for dark theme
  const colorClasses = {
    primary: 'text-text-primary',
    secondary: 'text-text-secondary',
    tertiary: 'text-text-tertiary',
    success: 'text-success-500',
    warning: 'text-warning-500',
    danger: 'text-danger-500',
    white: 'text-white',
  };

  // Weight classes (overrides variant weight if specified)
  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  // Alignment classes
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const textClasses = cn(
    variantClasses[variant],
    colorClasses[color],
    weight && weightClasses[weight],
    alignClasses[align],
    // Custom className (applied last for override capability)
    className,
  );

  return (
    <Text
      className={textClasses}
      style={style}
      testID={testID}
      numberOfLines={numberOfLines}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      {children}
    </Text>
  );
};
