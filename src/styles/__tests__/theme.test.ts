import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  duration,
  easing,
  theme,
} from '../theme';

describe('Theme System', () => {
  describe('Colors', () => {
    it('should export primary colors', () => {
      expect(colors.primary).toBe('#2E918C');
      expect(colors.primaryDark).toBe('#1F6B66');
      expect(colors.primaryLight).toBe('#4ECDC4');
    });

    it('should export text colors', () => {
      expect(colors.text.primary).toBe('#1A1A1A');
      expect(colors.text.secondary).toBe('#657786');
      expect(colors.text.tertiary).toBe('#AAB8C2');
      expect(colors.text.inverse).toBe('#FFFFFF');
    });

    it('should export semantic colors', () => {
      expect(colors.semantic.success).toBe('#27AE60');
      expect(colors.semantic.warning).toBe('#F39C12');
      expect(colors.semantic.error).toBe('#E74C3C');
      expect(colors.semantic.critical).toBe('#C0392B');
      expect(colors.semantic.info).toBe('#3498DB');
    });

    it('should export priority colors matching ADHD guidelines', () => {
      expect(colors.priority.low).toBe('#27AE60');
      expect(colors.priority.medium).toBe('#F39C12');
      expect(colors.priority.high).toBe('#E74C3C');
      expect(colors.priority.critical).toBe('#C0392B');
    });

    it('should export category colors', () => {
      expect(colors.categories).toHaveProperty('home');
      expect(colors.categories).toHaveProperty('work');
      expect(colors.categories).toHaveProperty('personal');
      expect(colors.categories).toHaveProperty('health');
      expect(colors.categories).toHaveProperty('social');
      expect(colors.categories).toHaveProperty('learning');
    });
  });

  describe('Typography', () => {
    it('should export display text styles', () => {
      expect(typography.displayLarge.fontSize).toBe(32);
      expect(typography.displayLarge.lineHeight).toBe(40);
      expect(typography.displayLarge.fontWeight).toBe('700');
    });

    it('should export heading styles', () => {
      expect(typography.h1.fontSize).toBe(24);
      expect(typography.h2.fontSize).toBe(20);
      expect(typography.h3.fontSize).toBe(18);
    });

    it('should export body text styles', () => {
      expect(typography.bodyLarge.fontSize).toBe(18);
      expect(typography.bodyMedium.fontSize).toBe(16);
      expect(typography.bodySmall.fontSize).toBe(14);
    });

    it('should maintain ADHD-friendly minimum font sizes', () => {
      expect(typography.bodyMedium.fontSize).toBeGreaterThanOrEqual(16);
      expect(typography.caption.fontSize).toBeGreaterThanOrEqual(12);
    });

    it('should have proper line height ratios', () => {
      const bodyLineHeight = typography.bodyMedium.lineHeight ?? 24;
      const bodyFontSize = typography.bodyMedium.fontSize ?? 16;
      const h1LineHeight = typography.h1.lineHeight ?? 32;
      const h1FontSize = typography.h1.fontSize ?? 24;

      expect(bodyLineHeight / bodyFontSize).toBeGreaterThanOrEqual(1.5);
      expect(h1LineHeight / h1FontSize).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('Spacing', () => {
    it('should follow 4px base unit system', () => {
      expect(spacing.xxs).toBe(4);
      expect(spacing.xs).toBe(8);
      expect(spacing.sm).toBe(12);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
    });

    it('should have consistent scale progression', () => {
      expect(spacing.xs).toBe(spacing.xxs * 2);
      expect(spacing.md).toBe(spacing.xxs * 4);
      expect(spacing.xl).toBe(spacing.xxs * 8);
    });
  });

  describe('Border Radius', () => {
    it('should export border radius values', () => {
      expect(borderRadius.none).toBe(0);
      expect(borderRadius.sm).toBe(8);
      expect(borderRadius.md).toBe(12);
      expect(borderRadius.lg).toBe(16);
      expect(borderRadius.full).toBe(9999);
    });
  });

  describe('Shadows', () => {
    it('should export shadow definitions', () => {
      expect(shadows.none.elevation).toBe(0);
      expect(shadows.sm.elevation).toBe(2);
      expect(shadows.md.elevation).toBe(4);
      expect(shadows.lg.elevation).toBe(8);
    });

    it('should have progressive shadow opacity', () => {
      const smOpacity = typeof shadows.sm.shadowOpacity === 'number' ? shadows.sm.shadowOpacity : 0;
      const mdOpacity = typeof shadows.md.shadowOpacity === 'number' ? shadows.md.shadowOpacity : 0;
      const lgOpacity = typeof shadows.lg.shadowOpacity === 'number' ? shadows.lg.shadowOpacity : 0;

      expect(smOpacity).toBeLessThan(mdOpacity);
      expect(mdOpacity).toBeLessThan(lgOpacity);
    });
  });

  describe('Animations', () => {
    it('should export ADHD-friendly durations', () => {
      expect(duration.instant).toBe(100);
      expect(duration.fast).toBe(200);
      expect(duration.normal).toBe(300);
      expect(duration.slow).toBe(500);
    });

    it('should keep animations under recommended duration', () => {
      expect(duration.normal).toBeLessThanOrEqual(300);
      expect(duration.fast).toBeLessThanOrEqual(200);
    });

    it('should export easing functions', () => {
      expect(easing).toHaveProperty('standard');
      expect(easing).toHaveProperty('decelerate');
      expect(easing).toHaveProperty('accelerate');
      expect(easing).toHaveProperty('spring');
    });
  });

  describe('Theme Object', () => {
    it('should export complete theme object', () => {
      expect(theme).toHaveProperty('colors');
      expect(theme).toHaveProperty('typography');
      expect(theme).toHaveProperty('spacing');
      expect(theme).toHaveProperty('shadows');
      expect(theme).toHaveProperty('animations');
    });

    it('should match individual exports', () => {
      expect(theme.colors.primary).toBe(colors.primary);
      expect(theme.typography.h1).toEqual(typography.h1);
      expect(theme.spacing.md).toBe(spacing.md);
    });
  });

  describe('Accessibility', () => {
    it('should have sufficient color contrast for text', () => {
      // Helper function to calculate relative luminance
      const getLuminance = (hex: string) => {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;

        const sRGB = [r, g, b].map((val) => {
          val = val / 255;
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
      };

      const getContrast = (color1: string, color2: string) => {
        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      };

      // Test primary text on background
      const textOnBackground = getContrast(colors.text.primary, colors.background);
      expect(textOnBackground).toBeGreaterThan(4.5);

      // Test white text on primary color
      const whiteOnPrimary = getContrast(colors.text.inverse, colors.primary);
      expect(whiteOnPrimary).toBeGreaterThan(3);
    });

    it('should have touch-friendly minimum sizes in layout', () => {
      expect(spacing.xl).toBeGreaterThanOrEqual(32);
      expect(spacing.xxl).toBeGreaterThanOrEqual(48);
    });
  });
});
