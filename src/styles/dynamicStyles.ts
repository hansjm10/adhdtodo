// ABOUTME: Dynamic style utilities for NativeWind components
// Extracts inline styles to reusable functions and constants

import type { ViewStyle, TextStyle } from 'react-native';

// Priority colors
export const PRIORITY_COLORS = {
  low: '#27AE60',
  medium: '#F39C12',
  high: '#E74C3C',
  urgent: '#C0392B',
  default: '#7F8C8D',
} as const;

// Status colors
export const STATUS_COLORS = {
  online: '#4CAF50',
  away: '#FF9800',
  offline: '#9E9E9E',
  success: '#27AE60',
  danger: '#E74C3C',
  primary: '#3498DB',
} as const;

// Presence indicator styles
export const getPresenceDotStyle = (
  status: 'online' | 'away' | 'offline',
  size: number,
): ViewStyle => ({
  width: size,
  height: size,
  backgroundColor: STATUS_COLORS[status] ?? STATUS_COLORS.offline,
  borderRadius: size / 2,
});

// Task category styles
export const getCategoryBgStyle = (color: string): ViewStyle => ({
  backgroundColor: `${color}20`,
});

// Progress bar styles
export const getProgressBarStyle = (percentage: number): ViewStyle => ({
  width: `${percentage}%`,
});

// Mode selection styles
export const getModeCardStyle = (isActive: boolean, baseColor = '#3b82f6'): ViewStyle => ({
  borderWidth: 2,
  borderColor: isActive ? baseColor : 'transparent',
  backgroundColor: isActive ? '#f0f9ff' : '#ffffff',
});

// Transform scale styles
export const getScaleTransform = (isActive: boolean, scale = 1.02): ViewStyle => ({
  transform: [{ scale: isActive ? scale : 1 }],
});

// Avatar styles
export const getAvatarStyle = (size: number, index?: number): ViewStyle => {
  const style: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (index !== undefined && index > 0) {
    style.marginLeft = -size * 0.3;
  }

  return style;
};

// Badge position styles
export const getBadgePositionStyle = (position: 'bottom-right' | 'top-right'): ViewStyle => {
  const baseStyle: ViewStyle = {
    position: 'absolute',
  };

  if (position === 'bottom-right') {
    baseStyle.bottom = -2;
    baseStyle.right = -2;
  } else {
    baseStyle.top = -2;
    baseStyle.right = -2;
  }

  return baseStyle;
};

// Timer circle styles
export const getTimerCircleStyle = (isBreak: boolean): ViewStyle => ({
  borderColor: isBreak ? '#4CAF50' : '#3b82f6',
});

// Button background styles
export const getButtonBgStyle = (
  variant: 'primary' | 'break' | 'pause' | 'transparent',
  isBreak = false,
): ViewStyle => {
  switch (variant) {
    case 'primary':
      return { backgroundColor: isBreak ? '#4CAF50' : '#3b82f6' };
    case 'break':
      return { backgroundColor: '#4CAF50' };
    case 'pause':
      return { backgroundColor: '#f59e0b' };
    case 'transparent':
      return { backgroundColor: 'transparent', borderColor: '#6b7280' };
    default:
      return {};
  }
};

// Text color styles
export const getTextColorStyle = (color: string): TextStyle => ({
  color,
});

// Spacing styles
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const getSpacingStyle = (
  size: keyof typeof spacing,
  direction: 'top' | 'bottom' | 'left' | 'right' | 'all',
): ViewStyle => {
  const value = spacing[size];

  switch (direction) {
    case 'top':
      return { marginTop: value };
    case 'bottom':
      return { marginBottom: value };
    case 'left':
      return { marginLeft: value };
    case 'right':
      return { marginRight: value };
    case 'all':
      return { margin: value };
    default:
      return {};
  }
};
