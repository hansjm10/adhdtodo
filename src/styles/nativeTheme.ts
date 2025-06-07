// ABOUTME: Native-feeling theme system with platform-specific colors
// Provides OLED black mode, gradients, and dynamic color support

import type { ColorSchemeName } from 'react-native';
import { Platform } from 'react-native';

interface ThemeColors {
  // Backgrounds
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
  };

  // Surfaces
  surface: {
    default: string;
    raised: string;
    overlay: string;
    glass: string;
  };

  // Text
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string;
  };

  // Borders
  border: {
    default: string;
    light: string;
    focus: string;
  };

  // System colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  warning: string;
  danger: string;

  // Gradients
  gradients: {
    primary: string[];
    surface: string[];
    card: string[];
  };
}

// OLED optimized dark theme
const darkThemeOLED: ThemeColors = {
  background: {
    primary: '#000000', // True black for OLED
    secondary: '#0A0A0A',
    tertiary: '#121212',
    elevated: '#1A1A1A',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
  surface: {
    default: '#0F0F0F',
    raised: '#1A1A1A',
    overlay: 'rgba(255, 255, 255, 0.05)',
    glass: 'rgba(255, 255, 255, 0.03)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#808080',
    disabled: '#4D4D4D',
    inverse: '#000000',
  },
  border: {
    default: '#1A1A1A',
    light: '#262626',
    focus: '#a855f7',
  },
  primary: '#a855f7',
  primaryLight: '#c084fc',
  primaryDark: '#7c3aed',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  gradients: {
    primary: ['#a855f7', '#7c3aed'],
    surface: ['#1A1A1A', '#0F0F0F'],
    card: ['#1F1F1F', '#0A0A0A'],
  },
};

// Standard dark theme
const darkTheme: ThemeColors = {
  background: {
    primary: '#0A0A0B',
    secondary: '#131316',
    tertiary: '#1A1A1E',
    elevated: '#202024',
    overlay: 'rgba(10, 10, 11, 0.8)',
  },
  surface: {
    default: '#131316',
    raised: '#1A1A1E',
    overlay: 'rgba(255, 255, 255, 0.08)',
    glass: 'rgba(255, 255, 255, 0.05)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    disabled: '#52525B',
    inverse: '#18181B',
  },
  border: {
    default: '#27272A',
    light: '#3F3F46',
    focus: '#a855f7',
  },
  primary: '#a855f7',
  primaryLight: '#c084fc',
  primaryDark: '#7c3aed',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  gradients: {
    primary: ['#a855f7', '#7c3aed'],
    surface: ['#1A1A1E', '#131316'],
    card: ['#202024', '#131316'],
  },
};

// Platform-specific adjustments
export const getPlatformTheme = (
  colorScheme: ColorSchemeName,
  useOLED: boolean = false,
): ThemeColors => {
  const baseTheme = useOLED ? darkThemeOLED : darkTheme;

  if (Platform.OS === 'ios') {
    // iOS-specific adjustments
    return {
      ...baseTheme,
      surface: {
        ...baseTheme.surface,
        glass: 'rgba(255, 255, 255, 0.02)', // More subtle for iOS
      },
    };
  }

  // Android-specific adjustments
  return {
    ...baseTheme,
    primary: '#bb86fc', // Material You purple
    primaryLight: '#e7b9ff',
    primaryDark: '#8858c8',
  };
};

// Elevation to shadow mapping for Android
export const getElevation = (level: number) => {
  if (Platform.OS === 'android') {
    return {
      elevation: level,
    };
  }

  // iOS shadow equivalents
  const shadows = {
    1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 4,
    },
    3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    8: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
  };

  return shadows[level as keyof typeof shadows] || shadows[1];
};

// Dynamic color utilities
export const getDynamicColor = (
  lightColor: string,
  darkColor: string,
  colorScheme: ColorSchemeName,
): string => {
  return colorScheme === 'light' ? lightColor : darkColor;
};

// Gradient helpers
export const createLinearGradient = (colors: string[], angle: number = 180) => {
  return {
    colors,
    start: { x: 0, y: 0 },
    end: { x: angle === 90 ? 1 : 0, y: angle === 90 ? 0 : 1 },
  };
};

export const createRadialGradient = (colors: string[]) => {
  return {
    colors,
    center: { x: 0.5, y: 0.5 },
    radius: 1,
  };
};
