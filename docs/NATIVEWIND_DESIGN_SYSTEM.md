# NativeWind Design System for ADHD Todo

## Overview

This document outlines the design system implemented using NativeWind (Tailwind CSS for React Native) for the ADHD Todo app. The design system focuses on creating an ADHD-friendly, Mac/iOS-inspired interface that reduces cognitive load and enhances user experience.

## Setup Complete

✅ **NativeWind Integration**: Successfully configured with Tailwind CSS v4
✅ **Babel Configuration**: Added NativeWind plugin for className compilation
✅ **TypeScript Support**: Configured types for className prop support
✅ **Metro Configuration**: Updated for CSS processing
✅ **Design Tokens**: Custom ADHD-friendly color palette and spacing system

## Color Palette

### Primary Colors (Blue)

Used for main actions, navigation, and primary UI elements:

- `bg-primary-50` - Light blue backgrounds (#f0f9ff)
- `bg-primary-500` - Primary actions (#3b82f6)
- `bg-primary-900` - High contrast text (#1e3a8a)
- `text-primary-500` - Primary text color

### Semantic Colors

#### Success (Green) - Task completion, positive feedback

- `bg-success-50` - Light success background (#f0fdf4)
- `bg-success-500` - Success actions (#10b981)
- `text-success-600` - Success text

#### Warning (Amber) - Deadlines, attention needed

- `bg-warning-50` - Light warning background (#fffbeb)
- `bg-warning-500` - Warning actions (#f59e0b)
- `text-warning-600` - Warning text

#### Danger (Red) - Urgent tasks, errors

- `bg-danger-50` - Light danger background (#fef2f2)
- `bg-danger-500` - Danger actions (#ef4444)
- `text-danger-600` - Danger text

### Neutral Colors

Used for text, backgrounds, and UI structure:

- `bg-neutral-50` - Main backgrounds (#f9fafb)
- `bg-neutral-100` - Card backgrounds (#f3f4f6)
- `bg-neutral-200` - Borders (#e5e7eb)
- `text-neutral-500` - Secondary text (#6b7280)
- `text-neutral-900` - Primary text (#111827)

### ADHD-Specific Colors

#### Focus Mode

- `bg-focus-background` - Calming focus background (#f0f9ff)
- `text-focus-ring` - Focus ring color (#3b82f6)

#### Hyperfocus Mode

- `bg-hyperfocus-background` - Minimal distraction background (#f8fafc)
- `text-hyperfocus-text` - High contrast text (#1e293b)
- `bg-hyperfocus-accent` - Accent color (#6366f1)

#### Scattered Mode

- `bg-scattered-background` - Organized chaos background (#fefbff)
- `bg-scattered-accent` - Visual structure accent (#8b5cf6)
- `border-scattered-grid` - Grid lines (#e2e8f0)

## Typography Scale

### Custom Text Sizes

- `text-task-title` - 18px, line-height 26px, font-weight 600
- `text-task-description` - 14px, line-height 20px
- `text-screen-title` - 28px, line-height 34px, font-weight 700
- `text-section-title` - 20px, line-height 28px, font-weight 600

### Standard Sizes

- `text-xs` through `text-4xl` - Standard Tailwind scale
- All sizes include optimized line-heights for readability

## Spacing System

Based on 8pt grid system for consistent spacing:

- `space-1` - 4px
- `space-2` - 8px (base unit)
- `space-3` - 12px
- `space-4` - 16px
- `space-6` - 24px
- `space-8` - 32px

### Component-Specific Spacing

- `p-card-padding` - 16px for card interiors
- `p-screen-padding` - 20px for screen margins
- `space-task-spacing` - 12px between task items

## Border Radius

Mac-inspired rounded corners:

- `rounded-sm` - 4px for small elements
- `rounded` / `rounded-md` - 8px (default)
- `rounded-lg` - 12px for cards
- `rounded-xl` - 16px for larger elements
- `rounded-2xl` - 20px for prominent elements

### Component-Specific Radius

- `rounded-card` - 12px for card components
- `rounded-button` - 8px for buttons
- `rounded-input` - 8px for form inputs
- `rounded-task-item` - 10px for task list items

## Shadows and Elevation

Subtle shadows for depth:

- `shadow-card` - Standard card shadow
- `shadow-card-hover` - Enhanced hover shadow
- `shadow-button` - Button shadow
- `shadow-button-pressed` - Pressed button shadow (inset)
- `shadow-focus` - Focus ring shadow

## Animations

Smooth, dopamine-friendly transitions:

- `animate-task-complete` - Pulse animation for completed tasks
- `animate-task-appear` - Slide-in animation for new tasks
- `animate-button-press` - Button press feedback

## Usage Guidelines

### Component Structure

```tsx
// Basic card component
<View className="bg-white rounded-card shadow-card p-card-padding mx-4">
  <Text className="text-task-title text-neutral-900 mb-3">Task Title</Text>
  <Text className="text-task-description text-neutral-600">Task description text</Text>
</View>
```

### Color Usage Patterns

```tsx
// Primary action button
<TouchableOpacity className="bg-primary-500 rounded-button px-6 py-3">
  <Text className="text-white font-semibold">Complete Task</Text>
</TouchableOpacity>

// Success state
<View className="bg-success-500 rounded-lg p-3">
  <Text className="text-white text-center font-semibold">
    ✅ Task Completed!
  </Text>
</View>

// Warning state
<View className="bg-warning-50 border border-warning-200 rounded-lg p-4">
  <Text className="text-warning-800">Deadline approaching</Text>
</View>
```

### Responsive Spacing

```tsx
// Screen container
<View className="flex-1 bg-neutral-50 p-screen-padding">
  {/* Screen content */}
</View>

// Task list item
<View className="bg-white rounded-task-item shadow-card p-4 mb-task-spacing">
  {/* Task content */}
</View>
```

## ADHD-Friendly Patterns

### High Contrast for Clarity

```tsx
// Use strong color contrast
<Text className="text-neutral-900 bg-white">Primary text</Text>
<Text className="text-neutral-600 bg-neutral-50">Secondary text</Text>
```

### Visual Hierarchy

```tsx
// Clear information hierarchy
<View>
  <Text className="text-screen-title text-neutral-900 mb-4">Screen Title</Text>
  <Text className="text-section-title text-neutral-800 mb-3">Section Title</Text>
  <Text className="text-task-description text-neutral-600">Body text</Text>
</View>
```

### Progress Indicators

```tsx
// Visual progress feedback
<View className="bg-success-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
```

### State Communication

```tsx
// Clear loading state
<View className="bg-neutral-100 rounded-lg p-4">
  <ActivityIndicator color="#3b82f6" />
  <Text className="text-neutral-600 text-center mt-2">Loading...</Text>
</View>
```

## Migration Strategy

### Phase 1: Foundation ✅ COMPLETED

- [x] Install and configure NativeWind
- [x] Create design system tokens
- [x] Set up TypeScript support
- [x] Create documentation

### Phase 2: Core Components (Next)

- [ ] Convert themed components (ThemedButton, ThemedCard, ThemedInput)
- [ ] Update task components (TaskItem, TaskListView)
- [ ] Create new components (ThemedContainer, ThemedText)

### Phase 3: Screens

- [ ] Update all tab screens
- [ ] Convert auth screens
- [ ] Apply consistent layouts

### Phase 4: Polish

- [ ] Add animations and micro-interactions
- [ ] Implement dark mode
- [ ] Responsive design improvements

## Testing

All NativeWind classes should be tested for:

- Correct visual rendering
- TypeScript compilation
- Cross-platform compatibility
- Accessibility compliance

## Performance Notes

- NativeWind compiles to optimized StyleSheet objects at build time
- No runtime performance impact compared to StyleSheet.create()
- Bundle size increase minimal (~50KB max acceptable)
- CSS-in-JS benefits with Tailwind developer experience

## Best Practices

1. **Consistency**: Use design tokens instead of arbitrary values
2. **Accessibility**: Always include proper contrast ratios
3. **Performance**: Prefer utility classes over custom styles
4. **Maintainability**: Document custom color meanings
5. **Testing**: Verify styles work across iOS and Android

---

_This design system provides the foundation for a modern, ADHD-friendly interface that will improve user experience while maintaining performance and maintainability._
