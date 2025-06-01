// ABOUTME: Animation system for ADHD Todo app
// Defines timing, easing, and animation patterns for consistent motion

import { Animated, Easing } from 'react-native';

// Animation durations (in milliseconds)
export const duration = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;

// Easing functions
export const easing = {
  // Standard easing (ease-in-out)
  standard: Easing.inOut(Easing.ease),

  // Decelerate (ease-out) - for entering elements
  decelerate: Easing.out(Easing.ease),

  // Accelerate (ease-in) - for exiting elements
  accelerate: Easing.in(Easing.ease),

  // Sharp easing for responsive actions
  sharp: Easing.inOut(Easing.quad),

  // Spring-like easing
  spring: Easing.out(Easing.back(1.2)),

  // Linear - no easing
  linear: Easing.linear,
} as const;

// Common animation patterns
export const animations = {
  // Fade animations
  fadeIn: (animatedValue: Animated.Value, options = {}) => {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: duration.normal,
      easing: easing.decelerate,
      useNativeDriver: true,
      ...options,
    });
  },

  fadeOut: (animatedValue: Animated.Value, options = {}) => {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration.fast,
      easing: easing.accelerate,
      useNativeDriver: true,
      ...options,
    });
  },

  // Scale animations
  scaleIn: (animatedValue: Animated.Value, options = {}) => {
    return Animated.spring(animatedValue, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
      ...options,
    });
  },

  scaleOut: (animatedValue: Animated.Value, options = {}) => {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration.fast,
      easing: easing.accelerate,
      useNativeDriver: true,
      ...options,
    });
  },

  // Slide animations
  slideInFromRight: (animatedValue: Animated.Value, options = {}) => {
    return Animated.spring(animatedValue, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
      ...options,
    });
  },

  slideInFromBottom: (animatedValue: Animated.Value, options = {}) => {
    return Animated.spring(animatedValue, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
      ...options,
    });
  },

  // Bounce animation
  bounce: (animatedValue: Animated.Value, options = {}) => {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.2,
        duration: duration.fast,
        easing: easing.decelerate,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
        ...options,
      }),
    ]);
  },

  // Shake animation (for errors)
  shake: (animatedValue: Animated.Value) => {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 10,
        duration: 50,
        easing: easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: -10,
        duration: 50,
        easing: easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 10,
        duration: 50,
        easing: easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 50,
        easing: easing.linear,
        useNativeDriver: true,
      }),
    ]);
  },

  // Pulse animation (for attention)
  pulse: (animatedValue: Animated.Value, loopConfig = {}) => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.1,
          duration: duration.slow,
          easing: easing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: duration.slow,
          easing: easing.standard,
          useNativeDriver: true,
        }),
      ]),
      loopConfig,
    );
  },
} as const;

// Animation helpers
export const animationHelpers = {
  // Create a new animated value
  createValue: (initialValue: number = 0) => new Animated.Value(initialValue),

  // Create animated value for XY coordinates
  createValueXY: (x: number = 0, y: number = 0) => new Animated.ValueXY({ x, y }),

  // Run animations in parallel
  parallel: (animations: Animated.CompositeAnimation[], config = {}) => {
    return Animated.parallel(animations, config);
  },

  // Run animations in sequence
  sequence: (animations: Animated.CompositeAnimation[]) => {
    return Animated.sequence(animations);
  },

  // Delay an animation
  delay: (delayTime: number) => {
    return Animated.delay(delayTime);
  },

  // Create a stagger effect
  stagger: (delayTime: number, animations: Animated.CompositeAnimation[]) => {
    return Animated.stagger(delayTime, animations);
  },
};

// ADHD-friendly animation guidelines
export const adhdfriendlyGuidelines = {
  // Keep animations short to maintain focus
  maxDuration: duration.normal,

  // Avoid looping animations by default
  defaultLoop: false,

  // Use subtle movements
  maxScale: 1.2,

  // Provide haptic feedback option
  hapticFeedback: true,

  // Respect reduced motion preferences
  respectReducedMotion: true,
};
