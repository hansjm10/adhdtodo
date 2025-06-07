// ABOUTME: Native gradient view component for subtle depth effects
// Provides platform-optimized gradients for cards and backgrounds

import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlatformTheme } from '../../styles/nativeTheme';

interface GradientViewProps {
  children: React.ReactNode;
  variant?: 'primary' | 'surface' | 'card' | 'custom';
  colors?: string[];
  angle?: number;
  intensity?: number;
  style?: ViewStyle;
  className?: string;
}

export const GradientView: React.FC<GradientViewProps> = ({
  children,
  variant = 'surface',
  colors,
  angle = 135,
  intensity = 1,
  style = {},
  className = '',
}) => {
  const theme = getPlatformTheme('dark', false);

  // Get gradient colors based on variant
  const getGradientColors = (): string[] => {
    if (colors) return colors;

    switch (variant) {
      case 'primary':
        return theme.gradients.primary;
      case 'surface':
        return theme.gradients.surface;
      case 'card':
        return theme.gradients.card;
      default:
        return theme.gradients.surface;
    }
  };

  // Calculate gradient positions
  const getGradientPositions = () => {
    const angleRad = (angle * Math.PI) / 180;
    return {
      start: {
        x: 0.5 - Math.sin(angleRad) * 0.5,
        y: 0.5 + Math.cos(angleRad) * 0.5,
      },
      end: {
        x: 0.5 + Math.sin(angleRad) * 0.5,
        y: 0.5 - Math.cos(angleRad) * 0.5,
      },
    };
  };

  const gradientColors = getGradientColors();
  const { start, end } = getGradientPositions();

  // Apply intensity by mixing with base color
  const adjustedColors = gradientColors.map((color) => {
    if (intensity === 1) return color;

    // Mix with surface color based on intensity
    const surfaceColor = theme.surface.default;
    const rgb = hexToRgb(color);
    const surfaceRgb = hexToRgb(surfaceColor);

    if (!rgb || !surfaceRgb) return color;

    const mixed = {
      r: Math.round(rgb.r * intensity + surfaceRgb.r * (1 - intensity)),
      g: Math.round(rgb.g * intensity + surfaceRgb.g * (1 - intensity)),
      b: Math.round(rgb.b * intensity + surfaceRgb.b * (1 - intensity)),
    };

    return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
  });

  // Platform-specific optimizations
  if (Platform.OS === 'android' && intensity < 0.3) {
    // Skip gradient on Android for very subtle effects (performance)
    return (
      <View className={className} style={[{ backgroundColor: gradientColors[0] }, style]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={adjustedColors as readonly [string, string, ...string[]]}
      start={start}
      end={end}
      style={style}
      className={className}
    >
      {children}
    </LinearGradient>
  );
};

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export default GradientView;
