// ABOUTME: Mac-inspired ADHD-friendly container component using NativeWind
// Provides consistent screen-level containers with proper safe areas and spacing

import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../../utils/cn';

interface ThemedContainerProps {
  children: React.ReactNode;
  variant?: 'screen' | 'section' | 'content';
  safeArea?: boolean;
  centered?: boolean;
  style?: ViewStyle;
  className?: string;
  testID?: string;
}

export const ThemedContainer = ({
  children,
  variant = 'content',
  safeArea = false,
  centered = false,
  style,
  className,
  testID,
}: ThemedContainerProps) => {
  // Base container classes
  const baseClasses = 'flex-1';

  // Variant classes
  const variantClasses = {
    screen: 'bg-neutral-50 p-screen-padding',
    section: 'bg-white rounded-lg p-4 mb-4',
    content: 'flex-1',
  };

  const containerClasses = cn(
    baseClasses,
    variantClasses[variant],
    centered && 'justify-center items-center',
    // Custom className (applied last for override capability)
    className,
  );

  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container className={containerClasses} style={style} testID={testID}>
      {children}
    </Container>
  );
};
