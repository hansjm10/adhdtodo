// ABOUTME: Native-feeling card component with platform-specific depth
// Provides iOS glass morphism and Android Material elevation

import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, Platform, Pressable, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { animationHelpers } from '../../styles/animations';

interface NativeCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'glass' | 'surface';
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  testID?: string;
  intensity?: number;
}

export const NativeCard: React.FC<NativeCardProps> = ({
  children,
  variant = 'elevated',
  onPress,
  disabled = false,
  className = '',
  style = {},
  testID,
  intensity = 20,
}) => {
  const scaleAnim = React.useRef(animationHelpers.createValue(1)).current;

  const handlePressIn = () => {
    if (!onPress || disabled) return;

    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress || disabled) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handlePress = () => {
    if (!onPress || disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Base card styles
  const baseStyles: ViewStyle = {
    borderRadius: 16,
    overflow: 'hidden',
    ...style,
  };

  // Variant-specific styles
  const variantStyles: Record<string, ViewStyle> = {
    elevated: Platform.select({
      ios: {
        backgroundColor: 'rgba(26, 26, 30, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        backgroundColor: '#1A1A1E',
        elevation: 4,
      },
      default: {
        backgroundColor: '#1A1A1E',
      },
    }),
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.1)' : '#27272A',
    },
    glass: Platform.select({
      ios: {
        backgroundColor: 'transparent',
      },
      default: {
        backgroundColor: 'rgba(26, 26, 30, 0.9)',
      },
    }),
    surface: {
      backgroundColor: '#131316',
      ...Platform.select({
        android: {
          elevation: 1,
        },
      }),
    },
  };

  const cardContent = <View className={`p-4 ${className}`}>{children}</View>;

  // iOS Glass morphism effect
  if (Platform.OS === 'ios' && variant === 'glass') {
    const content = (
      <BlurView intensity={intensity} tint="dark" style={[baseStyles, variantStyles[variant]]}>
        <View className="bg-white/5">{cardContent}</View>
      </BlurView>
    );

    if (onPress) {
      return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            testID={testID}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
          >
            {content}
          </Pressable>
        </Animated.View>
      );
    }

    return <View testID={testID}>{content}</View>;
  }

  // Regular card (non-glass)
  const regularContent = <View style={[baseStyles, variantStyles[variant]]}>{cardContent}</View>;

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          testID={testID}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          android_ripple={{
            color: 'rgba(168, 85, 247, 0.1)',
            borderless: false,
          }}
        >
          {regularContent}
        </Pressable>
      </Animated.View>
    );
  }

  return <View testID={testID}>{regularContent}</View>;
};

export default NativeCard;
