// ABOUTME: Utility for combining and conditionally applying NativeWind class names
// Simplified version of clsx/classnames for React Native with NativeWind

import { type ClassValue, clsx } from 'clsx';

/**
 * Combines class names conditionally
 * @param inputs - Class values to combine
 * @returns Combined class string
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
