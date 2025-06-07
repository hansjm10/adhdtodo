// ABOUTME: Platform-specific typography system
// Provides native font families and text styles for iOS and Android

import type { TextStyle } from 'react-native';
import { Platform } from 'react-native';

// Platform-specific font families
export const fontFamilies = {
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    black: 'System',
    mono: 'Menlo',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
    black: 'Roboto-Black',
    mono: 'monospace',
  },
};

// Get platform font
export const getFont = (weight: keyof typeof fontFamilies.ios = 'regular') => {
  return Platform.select({
    ios: fontFamilies.ios[weight],
    android: fontFamilies.android[weight],
    default: fontFamilies.android[weight],
  });
};

// Platform-specific font weights
export const fontWeights = {
  regular: Platform.select({
    ios: '400' as TextStyle['fontWeight'],
    android: 'normal' as TextStyle['fontWeight'],
  }),
  medium: Platform.select({
    ios: '500' as TextStyle['fontWeight'],
    android: '500' as TextStyle['fontWeight'],
  }),
  semibold: Platform.select({
    ios: '600' as TextStyle['fontWeight'],
    android: '600' as TextStyle['fontWeight'],
  }),
  bold: Platform.select({
    ios: '700' as TextStyle['fontWeight'],
    android: 'bold' as TextStyle['fontWeight'],
  }),
  black: Platform.select({
    ios: '900' as TextStyle['fontWeight'],
    android: '900' as TextStyle['fontWeight'],
  }),
};

// Typography scale
export const textStyles = {
  // Display styles
  displayLarge: {
    fontSize: Platform.select({ ios: 34, android: 36 }),
    lineHeight: Platform.select({ ios: 41, android: 44 }),
    fontWeight: fontWeights.bold,
    letterSpacing: Platform.select({ ios: 0.37, android: 0 }),
  } as TextStyle,

  displayMedium: {
    fontSize: Platform.select({ ios: 28, android: 32 }),
    lineHeight: Platform.select({ ios: 34, android: 40 }),
    fontWeight: fontWeights.bold,
    letterSpacing: Platform.select({ ios: 0.36, android: 0 }),
  } as TextStyle,

  displaySmall: {
    fontSize: Platform.select({ ios: 22, android: 28 }),
    lineHeight: Platform.select({ ios: 28, android: 36 }),
    fontWeight: fontWeights.semibold,
    letterSpacing: Platform.select({ ios: 0.35, android: 0 }),
  } as TextStyle,

  // Headline styles
  headline: {
    fontSize: Platform.select({ ios: 17, android: 24 }),
    lineHeight: Platform.select({ ios: 22, android: 32 }),
    fontWeight: fontWeights.semibold,
    letterSpacing: Platform.select({ ios: -0.43, android: 0 }),
  } as TextStyle,

  // Body styles
  bodyLarge: {
    fontSize: Platform.select({ ios: 17, android: 16 }),
    lineHeight: Platform.select({ ios: 22, android: 24 }),
    fontWeight: fontWeights.regular,
    letterSpacing: Platform.select({ ios: -0.43, android: 0.5 }),
  } as TextStyle,

  bodyMedium: {
    fontSize: Platform.select({ ios: 15, android: 14 }),
    lineHeight: Platform.select({ ios: 20, android: 20 }),
    fontWeight: fontWeights.regular,
    letterSpacing: Platform.select({ ios: -0.24, android: 0.25 }),
  } as TextStyle,

  bodySmall: {
    fontSize: Platform.select({ ios: 13, android: 12 }),
    lineHeight: Platform.select({ ios: 18, android: 16 }),
    fontWeight: fontWeights.regular,
    letterSpacing: Platform.select({ ios: -0.08, android: 0.4 }),
  } as TextStyle,

  // Label styles
  labelLarge: {
    fontSize: Platform.select({ ios: 13, android: 14 }),
    lineHeight: Platform.select({ ios: 18, android: 20 }),
    fontWeight: fontWeights.medium,
    letterSpacing: Platform.select({ ios: -0.08, android: 0.1 }),
  } as TextStyle,

  labelMedium: {
    fontSize: Platform.select({ ios: 11, android: 12 }),
    lineHeight: Platform.select({ ios: 13, android: 16 }),
    fontWeight: fontWeights.medium,
    letterSpacing: Platform.select({ ios: 0.07, android: 0.5 }),
  } as TextStyle,

  labelSmall: {
    fontSize: Platform.select({ ios: 10, android: 11 }),
    lineHeight: Platform.select({ ios: 12, android: 16 }),
    fontWeight: fontWeights.medium,
    letterSpacing: Platform.select({ ios: 0.12, android: 0.5 }),
  } as TextStyle,

  // Caption style
  caption: {
    fontSize: Platform.select({ ios: 12, android: 12 }),
    lineHeight: Platform.select({ ios: 16, android: 16 }),
    fontWeight: fontWeights.regular,
    letterSpacing: Platform.select({ ios: 0, android: 0.4 }),
  } as TextStyle,

  // Mono style
  mono: {
    fontFamily: getFont('mono'),
    fontSize: Platform.select({ ios: 13, android: 14 }),
    lineHeight: Platform.select({ ios: 18, android: 20 }),
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  } as TextStyle,
};

// Apply platform-specific adjustments
export const applyPlatformStyles = (baseStyle: TextStyle): TextStyle => {
  if (Platform.OS === 'ios') {
    return {
      ...baseStyle,
      fontFamily: getFont('regular'),
    };
  }

  // Android-specific adjustments
  return {
    ...baseStyle,
    includeFontPadding: false, // Remove extra padding on Android
  };
};
