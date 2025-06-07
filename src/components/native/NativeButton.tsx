// ABOUTME: Native-feeling button component with platform-specific styles
// Provides iOS and Android native button behaviors with haptic feedback

import React, { useRef } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import {
  TouchableOpacity,
  Pressable,
  Text,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { animationHelpers } from '../../styles/animations';
import { cn } from '../../utils/cn';

interface NativeButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  testID?: string;
  className?: string;
}

export const NativeButton: React.FC<NativeButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  testID,
  className = '',
}) => {
  const scaleAnim = useRef(animationHelpers.createValue(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;

    // Platform-specific haptic feedback
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onPress();
  };

  // Size styles
  const sizeStyles: Record<string, { height: number; px: number; fontSize: number }> = {
    small: { height: 36, px: 16, fontSize: 14 },
    medium: { height: 44, px: 20, fontSize: 16 },
    large: { height: 52, px: 24, fontSize: 18 },
  };

  const currentSize = sizeStyles[size];

  // Base button styles
  const baseStyle: ViewStyle = {
    height: currentSize.height,
    paddingHorizontal: currentSize.px,
    borderRadius: Platform.OS === 'ios' ? currentSize.height / 2 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(fullWidth && { width: '100%' }),
  };

  // Variant styles
  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: disabled ? '#52525B' : '#a855f7',
      ...Platform.select({
        ios: {
          shadowColor: '#a855f7',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: disabled ? 0 : 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: disabled ? 0 : 4,
        },
      }),
    },
    secondary: {
      backgroundColor: disabled ? '#27272A' : '#1A1A1E',
      borderWidth: 1,
      borderColor: disabled ? '#3F3F46' : '#52525B',
    },
    danger: {
      backgroundColor: disabled ? '#52525B' : '#dc2626',
      ...Platform.select({
        ios: {
          shadowColor: '#dc2626',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: disabled ? 0 : 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: disabled ? 0 : 4,
        },
      }),
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };

  // Text styles
  const textStyle: TextStyle = {
    fontSize: currentSize.fontSize,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    color: (() => {
      if (disabled) return '#71717A';
      if (variant === 'secondary' || variant === 'ghost') return '#FFFFFF';
      return '#FFFFFF';
    })(),
    marginLeft: icon ? 8 : 0,
  };

  const ButtonComponent = Platform.OS === 'ios' ? TouchableOpacity : Pressable;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
      className={cn(className, disabled && 'opacity-60')}
    >
      <ButtonComponent
        testID={testID}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[baseStyle, variantStyles[variant]]}
        activeOpacity={0.8}
        {...(Platform.OS === 'android' && {
          android_ripple: {
            color: 'rgba(255, 255, 255, 0.2)',
            borderless: false,
          },
        })}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'secondary' || variant === 'ghost' ? '#a855f7' : '#FFFFFF'}
          />
        ) : (
          <>
            {icon}
            <Text style={textStyle}>{label}</Text>
          </>
        )}
      </ButtonComponent>
    </Animated.View>
  );
};

export default NativeButton;
