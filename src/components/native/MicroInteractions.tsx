// ABOUTME: Platform-specific micro-interactions and feedback components
// Provides native-feeling touch feedback, ripples, and state transitions

import React, { useRef, useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import { Animated, Easing, Platform, View } from 'react-native';
import * as Haptics from 'expo-haptics';

// Ripple effect for Android Material Design
interface RippleEffectProps {
  color?: string;
  duration?: number;
  size?: number;
  style?: ViewStyle;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  color = 'rgba(168, 85, 247, 0.3)',
  duration = 600,
  size = 100,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (Platform.OS !== 'android') return null;

  const animatedStyle = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  return <Animated.View style={style ? [animatedStyle, style] : animatedStyle} />;
};

// iOS-style success checkmark animation
interface SuccessCheckmarkProps {
  size?: number;
  color?: string;
  onComplete?: () => void;
}

export const SuccessCheckmark: React.FC<SuccessCheckmarkProps> = ({
  size = 60,
  color = '#22c55e',
  onComplete,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });

    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        transform: [{ scale: scaleAnim }, { rotate }],
      }}
    >
      <View
        className="rounded-full items-center justify-center"
        style={{
          width: size,
          height: size,
          backgroundColor: `${color}20`,
        }}
      >
        <Animated.Text
          style={{
            fontSize: size * 0.5,
            color,
            fontWeight: 'bold' as const,
          }}
        >
          ✓
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

// Attention pulse animation
interface AttentionPulseProps {
  children: React.ReactNode;
  enabled?: boolean;
  color?: string;
  minScale?: number;
  maxScale?: number;
}

export const AttentionPulse: React.FC<AttentionPulseProps> = ({
  children,
  enabled = true,
  color = '#a855f7',
  minScale = 0.95,
  maxScale = 1.05,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return undefined;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: maxScale,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: minScale,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [enabled]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
    >
      {Platform.OS === 'ios' && (
        <Animated.View
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: color,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
            transform: [{ scale: 1.2 }],
          }}
        />
      )}
      {children}
    </Animated.View>
  );
};

// Skeleton pulse animation
interface SkeletonPulseProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export const SkeletonPulse: React.FC<SkeletonPulseProps> = ({
  width = '100%' as string | number,
  height = 20,
  borderRadius = 4,
}) => {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, []);

  return (
    <Animated.View
      className="bg-gray-800"
      style={{
        width,
        height,
        borderRadius,
        opacity: opacityAnim,
      }}
    />
  );
};

// Touch bounce effect
export const useTouchBounce = (scale: number = 0.98, duration: number = 100) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: scale,
      duration,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return {
    scaleAnim,
    onPressIn,
    onPressOut,
  };
};

export default {
  RippleEffect,
  SuccessCheckmark,
  AttentionPulse,
  SkeletonPulse,
  useTouchBounce,
};
