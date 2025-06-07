/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ADHD-friendly primary color palette
        primary: {
          50: '#f0f9ff', // Light blue for subtle backgrounds
          100: '#e0f2fe', // Lighter blue for hover states
          200: '#bae6fd', // Light blue for secondary elements
          300: '#7dd3fc', // Medium light blue
          400: '#38bdf8', // Medium blue
          500: '#3b82f6', // Primary blue for main actions
          600: '#2563eb', // Darker blue for active states
          700: '#1d4ed8', // Dark blue for emphasis
          800: '#1e40af', // Darker blue for headers
          900: '#1e3a8a', // Darkest blue for high contrast text
        },

        // Success colors for completed tasks
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981', // Primary success color
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },

        // Warning colors for deadlines and attention
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Primary warning color
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        // Danger colors for urgent tasks and errors
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Primary danger color
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },

        // Neutral colors for text and backgrounds
        neutral: {
          50: '#f9fafb', // Lightest - for main backgrounds
          100: '#f3f4f6', // Light - for card backgrounds
          200: '#e5e7eb', // Light gray - for borders
          300: '#d1d5db', // Medium light - for disabled elements
          400: '#9ca3af', // Medium - for placeholders
          500: '#6b7280', // Medium dark - for secondary text
          600: '#4b5563', // Dark - for secondary headings
          700: '#374151', // Darker - for primary text
          800: '#1f2937', // Very dark - for headings
          900: '#111827', // Darkest - for high contrast text
        },

        // ADHD-specific colors for focus states
        focus: {
          ring: '#3b82f6', // Focus ring color
          background: '#f0f9ff', // Focus background
        },

        // Hyperfocus mode colors (calming, minimal distractions)
        hyperfocus: {
          background: '#f8fafc',
          text: '#1e293b',
          accent: '#6366f1',
        },

        // Scattered mode colors (organized chaos, visual structure)
        scattered: {
          background: '#fefbff',
          accent: '#8b5cf6',
          grid: '#e2e8f0',
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
