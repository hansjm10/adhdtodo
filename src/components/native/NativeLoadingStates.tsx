// ABOUTME: Platform-specific loading states and skeleton screens
// Provides iOS and Android native loading patterns

import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform, Dimensions, ActivityIndicator } from 'react-native';
import type { DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlatformTheme } from '../../styles/nativeTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  className?: string;
}

// Skeleton loading component
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  className = '',
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const theme = getPlatformTheme('dark', false);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: Platform.OS === 'ios' ? 1500 : 1200,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      className={`overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={[
            theme.surface.raised,
            Platform.OS === 'ios' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
            theme.surface.raised,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-1"
        />
      </Animated.View>
    </View>
  );
};

// Task item skeleton
export const TaskItemSkeleton: React.FC = () => {
  const theme = getPlatformTheme('dark', false);

  return (
    <View className="mx-4 my-2 p-4 rounded-2xl" style={{ backgroundColor: theme.surface.default }}>
      <View className="flex-row items-start">
        <Skeleton width={24} height={24} borderRadius={12} className="mr-3" />
        <View className="flex-1">
          <Skeleton width="70%" height={18} borderRadius={4} className="mb-2" />
          <Skeleton width="90%" height={14} borderRadius={4} className="mb-3" />
          <View className="flex-row gap-2">
            <Skeleton width={60} height={20} borderRadius={10} />
            <Skeleton width={80} height={20} borderRadius={10} />
          </View>
        </View>
      </View>
    </View>
  );
};

// List skeleton
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const items = React.useMemo(
    () => Array.from({ length: count }, (_, i) => ({ id: `skeleton-${i}-${count}` })),
    [count],
  );

  return (
    <>
      {items.map((item) => (
        <TaskItemSkeleton key={item.id} />
      ))}
    </>
  );
};

// Native activity indicator
interface NativeSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export const NativeSpinner: React.FC<NativeSpinnerProps> = ({ size = 'large', color, text }) => {
  const theme = getPlatformTheme('dark', false);
  const spinnerColor = color ?? theme.primary;

  if (Platform.OS === 'ios') {
    return (
      <View className="items-center justify-center p-4">
        <ActivityIndicator size={size} color={spinnerColor} animating />
        {text && (
          <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
            {text}
          </Text>
        )}
      </View>
    );
  }

  // Android Material circular progress
  return (
    <View className="items-center justify-center p-4">
      <View className="relative">
        <ActivityIndicator size={size} color={spinnerColor} animating />
        {size === 'large' && (
          <View
            className="absolute inset-0 rounded-full"
            style={{
              backgroundColor: `${spinnerColor}20`,
              transform: [{ scale: 1.2 }],
            }}
          />
        )}
      </View>
      {text && (
        <Text className="mt-3 text-sm font-medium" style={{ color: theme.text.secondary }}>
          {text}
        </Text>
      )}
    </View>
  );
};

// Progress bar
interface NativeProgressBarProps {
  progress: number; // 0-1
  height?: number;
  animated?: boolean;
}

export const NativeProgressBar: React.FC<NativeProgressBarProps> = ({
  progress,
  height = 4,
  animated = true,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const theme = getPlatformTheme('dark', false);

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated]);

  const width = animated
    ? progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      })
    : `${progress * 100}%`;

  return (
    <View
      className="overflow-hidden"
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.surface.raised,
      }}
    >
      <Animated.View
        className="h-full"
        style={{
          width,
          borderRadius: height / 2,
          backgroundColor: theme.primary,
        }}
      >
        {Platform.OS === 'ios' && progress > 0 && progress < 1 && (
          <LinearGradient
            colors={[theme.primary, theme.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-1"
          />
        )}
      </Animated.View>
    </View>
  );
};

// Import required modules at the top
import { StyleSheet, Text } from 'react-native';

export default {
  Skeleton,
  TaskItemSkeleton,
  ListSkeleton,
  NativeSpinner,
  NativeProgressBar,
};
