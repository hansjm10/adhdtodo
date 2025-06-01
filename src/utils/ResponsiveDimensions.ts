// ABOUTME: Utility functions for calculating responsive dimensions
// Provides methods to calculate dimensions based on device screen size

import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Calculate responsive width based on screen width percentage
 * @param percentage - Percentage of screen width (0-100)
 * @returns Calculated width
 */
export const responsiveWidth = (percentage: number): number => {
  return (screenWidth * percentage) / 100;
};

/**
 * Calculate responsive height based on screen height percentage
 * @param percentage - Percentage of screen height (0-100)
 * @returns Calculated height
 */
export const responsiveHeight = (percentage: number): number => {
  return (screenHeight * percentage) / 100;
};

/**
 * Calculate responsive font size based on screen width
 * @param size - Base font size
 * @returns Calculated font size
 */
export const responsiveFontSize = (size: number): number => {
  const standardScreenWidth = 375; // iPhone 11 Pro width
  const scale = screenWidth / standardScreenWidth;
  return Math.round(size * scale);
};

/**
 * Get responsive timer size for HyperfocusScreen
 * @returns Timer container size
 */
export const getTimerSize = (): number => {
  // Use 75% of screen width, but cap at 280 for larger screens
  return Math.min(responsiveWidth(75), 280);
};

/**
 * Get responsive card height for ScatteredScreen
 * @returns Card minimum height
 */
export const getCardMinHeight = (): number => {
  // Use 40% of screen height, but ensure minimum of 250
  return Math.max(responsiveHeight(40), 250);
};

/**
 * Check if device is a tablet
 * @returns True if tablet
 */
export const isTablet = (): boolean => {
  return screenWidth >= 768;
};

/**
 * Get responsive padding based on screen size
 * @param basePadding - Base padding value
 * @returns Calculated padding
 */
export const responsivePadding = (basePadding: number): number => {
  if (isTablet()) {
    return basePadding * 1.5;
  }
  if (screenWidth < 350) {
    return basePadding * 0.8;
  }
  return basePadding;
};

// Export screen dimensions for direct use
export { screenWidth, screenHeight };
