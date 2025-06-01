// ABOUTME: Central theme export for ADHD Todo app
// Aggregates and exports all design system modules

export { colors, legacyColors } from './colors';
export { typography, fonts, legacyFontSizes } from './typography';
export { spacing, grid, borderRadius, layout, legacySpacing } from './layout';
export { shadows, coloredShadows, createShadow } from './shadows';
export {
  duration,
  easing,
  animations,
  animationHelpers,
  adhdfriendlyGuidelines,
} from './animations';

// Import all for theme object
import * as colorExports from './colors';
import * as typographyExports from './typography';
import * as layoutExports from './layout';
import * as shadowExports from './shadows';
import * as animationExports from './animations';

// Re-export common theme object for convenience
export const theme = {
  colors: colorExports.colors,
  typography: typographyExports.typography,
  fonts: typographyExports.fonts,
  spacing: layoutExports.spacing,
  grid: layoutExports.grid,
  borderRadius: layoutExports.borderRadius,
  layout: layoutExports.layout,
  shadows: shadowExports.shadows,
  animations: animationExports.animations,
  duration: animationExports.duration,
  easing: animationExports.easing,
} as const;
