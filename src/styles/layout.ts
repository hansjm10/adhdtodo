// ABOUTME: Layout system for ADHD Todo app
// Defines spacing, grid, and border radius values for consistent layouts

// Spacing scale based on 4px base unit
export const spacing = {
  // Base unit: 4px
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Layout grid system
export const grid = {
  // Margins
  marginHorizontal: 16,
  marginVertical: 24,

  // Padding
  paddingHorizontal: 16,
  paddingVertical: 16,

  // Content widths
  maxContentWidth: 600,
  compactContentWidth: 400,

  // Component spacing
  componentGap: 12,
  sectionGap: 24,
} as const;

// Border radius values
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Common layout patterns
export const layout = {
  // Flex utilities
  flex: {
    row: {
      flexDirection: 'row' as const,
    },
    column: {
      flexDirection: 'column' as const,
    },
    center: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    between: {
      justifyContent: 'space-between' as const,
    },
    around: {
      justifyContent: 'space-around' as const,
    },
    evenly: {
      justifyContent: 'space-evenly' as const,
    },
    start: {
      alignItems: 'flex-start' as const,
      justifyContent: 'flex-start' as const,
    },
    end: {
      alignItems: 'flex-end' as const,
      justifyContent: 'flex-end' as const,
    },
  },

  // Container patterns
  container: {
    flex: 1,
    paddingHorizontal: grid.paddingHorizontal,
  },

  // Card patterns
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },

  // Input patterns
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },

  // Button patterns
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
} as const;

// Legacy spacing mappings for backward compatibility
export const legacySpacing = {
  4: spacing.xxs,
  8: spacing.xs,
  10: spacing.xs,
  12: spacing.sm,
  16: spacing.md,
  20: spacing.lg,
  24: spacing.lg,
  32: spacing.xl,
  48: spacing.xxl,
  64: spacing.xxxl,
} as const;
