// ABOUTME: ESLint configuration for ADHD Todo React Native app
// ABOUTME: Enforces code quality and consistency standards

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-native'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React specific
    'react/prop-types': 'off',
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
      },
    ],
    'prefer-const': 'error',
    'no-var': 'error',

    // Code style
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'always'],
  },
  overrides: [
    {
      files: ['*.test.js', '*.spec.js', '__tests__/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
