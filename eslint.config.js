// ABOUTME: ESLint flat configuration for ADHD Todo React Native app
// ABOUTME: Enforces code quality and consistency standards

const js = require('@eslint/js');
const reactPlugin = require('eslint-plugin-react');
const reactNativePlugin = require('eslint-plugin-react-native');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  // ESLint recommended rules
  js.configs.recommended,

  {
    // Global configuration for all JavaScript files
    files: ['**/*.js', '**/*.jsx'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    plugins: {
      react: reactPlugin,
      'react-native': reactNativePlugin,
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      // React plugin recommended rules
      ...reactPlugin.configs.recommended.rules,

      // React specific overrides
      'react/prop-types': 'off', // PropTypes are superseded by TypeScript in modern React
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+

      // General JavaScript
      'no-console': [
        'error',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],
      'no-debugger': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none', // Don't check error variables in catch blocks
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',

      // Code style
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
    },
  },

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-native': reactNativePlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript ESLint recommended rules
      ...typescriptPlugin.configs.recommended.rules,

      // React plugin recommended rules
      ...reactPlugin.configs.recommended.rules,

      // TypeScript specific overrides
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // React specific overrides
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+

      // General
      'no-console': [
        'error',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Code style
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
    },
  },

  // Test files configuration
  {
    files: [
      '*.test.js',
      '*.spec.js',
      '*.test.ts',
      '*.spec.ts',
      '*.test.tsx',
      '*.spec.tsx',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      'tests/**/*.js',
      'tests/**/*.ts',
      'tests/**/*.tsx',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      '.expo/',
      '.expo-shared/',
      'dist/',
      'build/',
      'android/',
      'ios/',
      'coverage/',
      '*.log',
      '.husky/',
      'web-build/',
    ],
  },
];
