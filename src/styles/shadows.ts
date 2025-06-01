// ABOUTME: Shadow system for ADHD Todo app
// Defines consistent elevation and shadow values for depth perception

import { ViewStyle } from 'react-native';

// Shadow definitions with platform-specific values
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,

  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,

  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,
} as const;

// Colored shadows for special effects
export const coloredShadows = {
  primary: {
    ...shadows.md,
    shadowColor: '#4ECDC4',
    shadowOpacity: 0.3,
  } as ViewStyle,

  success: {
    ...shadows.md,
    shadowColor: '#27AE60',
    shadowOpacity: 0.3,
  } as ViewStyle,

  warning: {
    ...shadows.md,
    shadowColor: '#F39C12',
    shadowOpacity: 0.3,
  } as ViewStyle,

  error: {
    ...shadows.md,
    shadowColor: '#E74C3C',
    shadowOpacity: 0.3,
  } as ViewStyle,
} as const;

// Helper function to create custom shadows
export const createShadow = (
  color: string,
  offsetY: number = 4,
  opacity: number = 0.15,
  radius: number = 8,
  elevation: number = 4,
): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: elevation,
});
