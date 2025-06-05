// ABOUTME: Typography system for ADHD Todo app
// Defines font sizes, weights, and line heights for consistent text hierarchy

import type { TextStyle } from 'react-native';

// Font families
export const fonts = {
  // System font stack for optimal performance
  primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',

  // Monospace for time/numbers
  mono: 'SF Mono, Monaco, "Courier New", monospace',
} as const;

// Type scale with React Native TextStyle types
export const typography = {
  // Display
  displayLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  } as TextStyle,
  displayMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  } as TextStyle,

  // Headings
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  } as TextStyle,
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  } as TextStyle,
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  } as TextStyle,

  // Body
  bodyLarge: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  } as TextStyle,
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  } as TextStyle,
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  } as TextStyle,

  // Support
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  } as TextStyle,
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  } as TextStyle,
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
  } as TextStyle,
} as const;

// Legacy font size mappings for backward compatibility
export const legacyFontSizes = {
  10: typography.caption.fontSize,
  12: typography.caption.fontSize,
  14: typography.bodySmall.fontSize,
  16: typography.bodyMedium.fontSize,
  18: typography.h3.fontSize,
  20: typography.h2.fontSize,
  24: typography.h1.fontSize,
} as const;
