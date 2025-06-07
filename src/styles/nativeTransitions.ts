// ABOUTME: Platform-specific transition and animation configurations
// Provides native-feeling transitions for iOS and Android platforms

import { Platform, Animated, Easing } from 'react-native';

// iOS-style spring configuration
export const iosSpring = {
  friction: 7,
  tension: 40,
  useNativeDriver: true,
};

// Android Material Design spring
export const androidSpring = {
  friction: 8,
  tension: 35,
  useNativeDriver: true,
};

// Platform-specific page transitions
export const pageTransitions = {
  ios: {
    // iOS-style push/pop navigation
    push: {
      from: { translateX: 375, shadowOpacity: 0 },
      to: { translateX: 0, shadowOpacity: 0.3 },
      config: iosSpring,
    },
    pop: {
      from: { translateX: 0, shadowOpacity: 0.3 },
      to: { translateX: 375, shadowOpacity: 0 },
      config: iosSpring,
    },
    // iOS-style modal presentation
    modal: {
      from: { translateY: 800, opacity: 0 },
      to: { translateY: 0, opacity: 1 },
      config: { ...iosSpring, friction: 8 },
    },
  },
  android: {
    // Android shared axis transition
    push: {
      from: { translateX: 50, opacity: 0, scale: 0.95 },
      to: { translateX: 0, opacity: 1, scale: 1 },
      config: androidSpring,
    },
    pop: {
      from: { translateX: 0, opacity: 1, scale: 1 },
      to: { translateX: -50, opacity: 0, scale: 0.95 },
      config: androidSpring,
    },
    // Android fade through transition
    modal: {
      from: { opacity: 0, scale: 0.9 },
      to: { opacity: 1, scale: 1 },
      config: { ...androidSpring, friction: 9 },
    },
  },
};

// Platform-specific button animations
export const buttonAnimations = {
  ios: {
    pressIn: {
      scale: 0.96,
      duration: 100,
      useNativeDriver: true,
    },
    pressOut: {
      scale: 1,
      ...iosSpring,
    },
  },
  android: {
    pressIn: {
      scale: 0.94,
      duration: 50,
      useNativeDriver: true,
    },
    pressOut: {
      scale: 1,
      duration: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    },
  },
};

// Platform-specific list item animations
export const listItemAnimations = {
  ios: {
    appear: (index: number) => ({
      from: { translateY: 30, opacity: 0 },
      to: { translateY: 0, opacity: 1 },
      delay: index * 50,
      config: iosSpring,
    }),
    delete: {
      to: { translateX: -375, opacity: 0 },
      config: { ...iosSpring, friction: 8 },
    },
  },
  android: {
    appear: (index: number) => ({
      from: { translateY: 20, opacity: 0, scale: 0.95 },
      to: { translateY: 0, opacity: 1, scale: 1 },
      delay: index * 30,
      duration: 200,
      easing: Easing.out(Easing.ease),
    }),
    delete: {
      to: { scale: 0.8, opacity: 0 },
      duration: 150,
      easing: Easing.in(Easing.ease),
    },
  },
};

// Tab bar animations
export const tabBarAnimations = {
  ios: {
    indicator: {
      ...iosSpring,
      friction: 7,
      tension: 50,
    },
    iconScale: {
      active: 1.1,
      inactive: 1,
      config: iosSpring,
    },
  },
  android: {
    indicator: {
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    },
    iconScale: {
      active: 1.15,
      inactive: 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
    },
  },
};

// Shared element transition configurations
export const sharedElementTransitions = {
  duration: Platform.OS === 'ios' ? 350 : 300,
  easing: Platform.OS === 'ios' ? Easing.inOut(Easing.ease) : Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design standard easing
  useNativeDriver: true,
};

// Get platform-specific animation config
export const getPlatformAnimation = (type: keyof typeof pageTransitions.ios) => {
  const platformTransitions = Platform.OS === 'ios' ? pageTransitions.ios : pageTransitions.android;
  return platformTransitions[type] || platformTransitions.push;
};

// Create animated timing with platform defaults
export const createPlatformTiming = (value: Animated.Value, toValue: number, duration?: number) => {
  return Animated.timing(value, {
    toValue,
    duration: duration ?? (Platform.OS === 'ios' ? 300 : 200),
    easing: Platform.OS === 'ios' ? Easing.inOut(Easing.ease) : Easing.out(Easing.ease),
    useNativeDriver: true,
  });
};

// Create platform-specific spring animation
interface SpringConfig {
  friction?: number;
  tension?: number;
  useNativeDriver?: boolean;
}

export const createPlatformSpring = (
  value: Animated.Value,
  toValue: number,
  config?: SpringConfig,
) => {
  const defaultConfig = Platform.OS === 'ios' ? iosSpring : androidSpring;
  return Animated.spring(value, {
    toValue,
    ...defaultConfig,
    ...config,
  });
};
