// ABOUTME: Centralized color system for ADHD Todo app
// Defines all colors used throughout the app with ADHD-friendly muted tones

export const colors = {
  // Brand Colors
  primary: '#2E918C', // WCAG AA compliant teal - Primary actions, success states
  primaryDark: '#1F6B66', // Darker teal for pressed states
  primaryLight: '#4ECDC4', // Lighter teal for backgrounds

  // Neutral Colors
  background: '#F8F9FA', // Soft white-gray background
  surface: '#FFFFFF', // Pure white for cards/surfaces
  border: '#E1E8ED', // Light gray for borders

  // Text Colors
  text: {
    primary: '#1A1A1A', // Almost black for main text
    secondary: '#657786', // Medium gray for secondary text
    tertiary: '#AAB8C2', // Light gray for hints/placeholders
    inverse: '#FFFFFF', // White text on dark backgrounds
  },

  // Semantic Colors
  semantic: {
    success: '#27AE60', // Green - Completed tasks, success
    warning: '#F39C12', // Orange - Medium priority, warnings
    error: '#E74C3C', // Red - High priority, errors
    critical: '#C0392B', // Dark red - Urgent items
    info: '#3498DB', // Blue - Information, tips
  },

  // Priority Colors (ADHD-friendly spectrum)
  priority: {
    low: '#27AE60', // Calming green
    medium: '#F39C12', // Attention-grabbing orange
    high: '#E74C3C', // Urgent red
    critical: '#C0392B', // Critical dark red
  },

  // Category Colors
  categories: {
    home: '#FF6B6B', // Warm coral
    work: '#2E918C', // Professional teal (matches primary)
    personal: '#45B7D1', // Personal blue
    health: '#27AE60', // Health green
    social: '#9B59B6', // Social purple
    learning: '#F39C12', // Learning orange
  },

  // State Colors
  states: {
    disabled: '#BDC3C7', // Disabled gray
    hover: '#F5F8FA', // Hover background
    pressed: '#E1E8ED', // Pressed background
    selected: '#E8F5F4', // Selected teal tint
  },
} as const;

// Legacy color mappings for backward compatibility
export const legacyColors = {
  // Map old color values to new theme colors
  '#333': colors.text.primary,
  '#666': colors.text.secondary,
  '#999': colors.text.tertiary,
  '#888': colors.text.tertiary,
  '#BDC3C7': colors.states.disabled,
  '#f5f5f5': colors.background,
  '#fff': colors.surface,
  '#4ECDC4': colors.primaryLight, // Map old primary to primaryLight
  '#27AE60': colors.semantic.success,
  '#F39C12': colors.semantic.warning,
  '#E74C3C': colors.semantic.error,
  '#C0392B': colors.semantic.critical,
  '#3498DB': colors.semantic.info,
  '#FF6B6B': colors.categories.home,
  '#45B7D1': colors.categories.personal,
} as const;
