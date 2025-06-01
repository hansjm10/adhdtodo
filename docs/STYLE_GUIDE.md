# ADHD Todo App Style Guide

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Animation & Motion](#animation--motion)
7. [Accessibility](#accessibility)
8. [ADHD-Specific Guidelines](#adhd-specific-guidelines)
9. [Implementation Guidelines](#implementation-guidelines)

## Design Philosophy

Our design system prioritizes clarity, focus, and positive reinforcement to support users with ADHD. Every design decision should:

- **Minimize cognitive load** through simplicity and consistency
- **Reduce distractions** with clean, purposeful interfaces
- **Provide dopamine rewards** through micro-interactions and visual feedback
- **Support executive function** with clear visual hierarchy and organization
- **Ensure accessibility** for all users regardless of ability

## Color System

### Primary Palette

```typescript
export const colors = {
  // Brand Colors
  primary: '#4ECDC4', // Teal - Primary actions, success states
  primaryDark: '#45B7A8', // Darker teal for pressed states
  primaryLight: '#7DD8D2', // Lighter teal for backgrounds

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
    work: '#4ECDC4', // Professional teal
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
};
```

### Color Usage Guidelines

1. **Contrast Requirements**

   - Minimum contrast ratio of 4.5:1 for normal text
   - Minimum contrast ratio of 3:1 for large text (18px+)
   - Use color contrast checkers before implementation

2. **Semantic Meaning**

   - Green = Positive/Complete/Go
   - Orange = Caution/Medium Priority
   - Red = Stop/High Priority/Error
   - Blue = Information/Neutral

3. **ADHD Considerations**
   - Avoid overly bright or saturated colors
   - Use muted tones to reduce sensory overload
   - Maintain consistent color associations

## Typography

### Font Stack

```typescript
export const fonts = {
  // System font stack for optimal performance
  primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',

  // Monospace for time/numbers
  mono: 'SF Mono, Monaco, "Courier New", monospace',
};
```

### Type Scale

```typescript
export const typography = {
  // Display
  displayLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  displayMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },

  // Headings
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },

  // Body
  bodyLarge: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },

  // Support
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
};
```

### Typography Guidelines

1. **Readability First**

   - Minimum body text size: 16px
   - Line height: 1.5x font size minimum
   - Paragraph width: 60-80 characters max

2. **Hierarchy**

   - Use size, weight, and color to create clear hierarchy
   - Limit to 3-4 levels of hierarchy per screen
   - Consistent spacing between hierarchy levels

3. **ADHD-Friendly Fonts**
   - Prefer sans-serif for clarity
   - Avoid decorative or script fonts
   - Use adequate letter spacing (0.5px for labels/buttons)

## Spacing & Layout

### Spacing Scale

```typescript
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
};
```

### Layout Grid

```typescript
export const grid = {
  // Margins
  marginHorizontal: 16,
  marginVertical: 24,

  // Safe areas
  safeAreaTop: 'safe',
  safeAreaBottom: 'safe',

  // Content widths
  maxContentWidth: 600,
  compactContentWidth: 400,
};
```

### Border Radius

```typescript
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

### Shadows

```typescript
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

## Components

### Button Patterns

```typescript
export const buttonStyles = {
  // Base button
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 48, // Touch target
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
    color: colors.text.inverse,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    color: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: colors.primary,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
};
```

### Card Patterns

```typescript
export const cardStyles = {
  base: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },

  interactive: {
    activeOpacity: 0.7,
  },
};
```

### Input Patterns

```typescript
export const inputStyles = {
  base: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.bodyMedium.fontSize,
    minHeight: 48,
  },

  focused: {
    borderColor: colors.primary,
  },

  error: {
    borderColor: colors.semantic.error,
  },
};
```

## Animation & Motion

### Timing Functions

```typescript
export const animations = {
  // Durations
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Easing
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  },
};
```

### Animation Guidelines

1. **Purpose-Driven Motion**

   - Use animation to guide attention
   - Provide feedback for user actions
   - Smooth transitions between states

2. **ADHD Considerations**

   - Keep animations short (< 300ms)
   - Avoid looping or auto-playing animations
   - Provide option to disable animations
   - Use subtle motion, not distracting

3. **Common Animations**
   - Fade in/out: 200ms
   - Slide: 300ms
   - Scale: 200ms
   - Color transitions: 200ms

## Accessibility

### Core Requirements

1. **Touch Targets**

   - Minimum size: 44x44px (iOS) / 48x48px (Android)
   - Adequate spacing between targets: 8px minimum

2. **Screen Reader Support**

   ```typescript
   accessibilityLabel="Complete task"
   accessibilityHint="Double tap to mark this task as complete"
   accessibilityRole="button"
   accessibilityState={{ checked: isCompleted }}
   ```

3. **Focus Management**

   - Clear focus indicators
   - Logical tab order
   - Skip navigation options

4. **Color Independence**

   - Never rely on color alone
   - Use icons, text, or patterns alongside color

5. **Reduced Motion**
   - Respect user's motion preferences
   - Provide static alternatives

## ADHD-Specific Guidelines

### 1. Information Architecture

- **Chunking**: Break information into small, digestible pieces
- **Progressive Disclosure**: Show details only when needed
- **Clear Navigation**: Maximum 3 levels deep
- **Consistent Patterns**: Same actions in same locations

### 2. Visual Design

- **White Space**: Use generously to reduce clutter
- **Visual Hierarchy**: Clear distinction between elements
- **Muted Colors**: Avoid overstimulation
- **High Contrast**: Support focus and readability

### 3. Interaction Design

- **Clear Feedback**: Immediate response to actions
- **Error Prevention**: Confirmation for destructive actions
- **Undo Options**: Allow recovery from mistakes
- **Progress Indicators**: Show task/goal progress

### 4. Time Management

- **Visual Timers**: Show time remaining/elapsed
- **Break Reminders**: Encourage healthy work patterns
- **Flexible Deadlines**: Allow for ADHD time blindness
- **Time Estimates**: Help with planning

### 5. Reward Systems

- **Micro-celebrations**: Small animations for task completion
- **Progress Tracking**: Visual representation of achievements
- **Streaks**: Encourage consistency
- **Points/XP**: Gamification elements

## Implementation Guidelines

### 1. Component Creation

```typescript
// Example: ADHD-friendly button component
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Haptic } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../styles/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  haptic?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  haptic = true,
}) => {
  const handlePress = () => {
    if (haptic) {
      Haptic.impact(Haptic.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        disabled && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
  },
  primaryText: {
    color: colors.text.inverse,
  },
  secondaryText: {
    color: colors.primary,
  },
});
```

### 2. Theme Configuration

Create a centralized theme file:

```typescript
// src/styles/theme.ts
export { colors } from './colors';
export { typography } from './typography';
export { spacing, grid, borderRadius } from './layout';
export { shadows } from './shadows';
export { animations } from './animations';
```

### 3. Style Constants

Update existing constants to use the new theme:

```typescript
// src/constants/Styles.ts
import { colors, spacing, typography } from '../styles/theme';

export const globalStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  // ... more global styles
};
```

### 4. Testing Checklist

Before implementing any UI component:

- [ ] Meets minimum touch target size
- [ ] Has proper accessibility labels
- [ ] Works with screen readers
- [ ] Provides haptic feedback (optional)
- [ ] Animations respect reduced motion
- [ ] Colors meet contrast requirements
- [ ] Text is readable (size/spacing)
- [ ] Component handles all states
- [ ] Error states are clear
- [ ] Loading states are indicated

### 5. Future Enhancements

- **Dark Mode**: Implement alternative color schemes
- **Theme Customization**: Allow users to adjust colors/sizes
- **Sound Effects**: Optional audio feedback
- **Advanced Animations**: Lottie for celebrations
- **Adaptive Layouts**: Better tablet support

---

_This style guide is a living document. Update it as the design system evolves and new patterns emerge._
