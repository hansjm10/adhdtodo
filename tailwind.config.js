/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dark theme background colors
        background: {
          primary: '#0A0A0B', // Main app background
          secondary: '#131316', // Card backgrounds
          tertiary: '#1A1A1E', // Elevated surfaces
          hover: '#202024', // Hover states
          active: '#252529', // Active/pressed states
        },

        // Premium accent colors (purple-based)
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7', // Main purple accent
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },

        // Success colors (muted green)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Primary success
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        // Warning colors (amber)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        // Danger colors (muted red)
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },

        // Text colors for dark theme
        text: {
          primary: '#FFFFFF', // Main text
          secondary: '#A1A1AA', // Secondary text
          tertiary: '#71717A', // Muted text
          disabled: '#52525B', // Disabled text
          inverse: '#18181B', // Text on light backgrounds
        },

        // Border colors
        border: {
          default: '#27272A', // Default borders
          light: '#3F3F46', // Light borders
          focus: '#a855f7', // Focus borders (primary-500)
        },

        // Surface colors (for cards, modals, etc.)
        surface: {
          0: '#0A0A0B', // Base background
          1: '#131316', // First elevation
          2: '#1A1A1E', // Second elevation
          3: '#202024', // Third elevation
          4: '#252529', // Fourth elevation
        },

        // ADHD-specific mode colors
        focus: {
          ring: '#a855f7',
          background: 'rgba(168, 85, 247, 0.1)',
        },

        hyperfocus: {
          background: '#0F0F11',
          text: '#FFFFFF',
          accent: '#8b5cf6',
        },

        scattered: {
          background: '#0A0A0B',
          accent: '#a855f7',
          grid: '#27272A',
        },
      },

      // Typography scale inspired by Apple's SF Pro
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],

        // ADHD-friendly text sizes
        'task-title': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'task-description': ['14px', { lineHeight: '20px' }],
        'screen-title': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'section-title': ['20px', { lineHeight: '28px', fontWeight: '600' }],
      },

      // Spacing based on 8pt grid system
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',

        // ADHD-specific spacing
        'card-padding': '16px',
        'screen-padding': '20px',
        'task-spacing': '12px',
      },

      // Border radius for Mac-inspired rounded corners
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',

        // Component-specific radius
        card: '12px',
        button: '8px',
        input: '8px',
        'task-item': '10px',
      },

      // Shadows for depth and layering
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        button: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'button-pressed': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.1)',
        focus: '0 0 0 3px rgb(59 130 246 / 0.15)',
      },

      // Animation durations for smooth transitions
      animation: {
        'task-complete': 'pulse 0.5s ease-in-out',
        'task-appear': 'slideIn 0.3s ease-out',
        'button-press': 'buttonPress 0.1s ease-in-out',
      },

      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        buttonPress: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
