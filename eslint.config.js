// ABOUTME: ESLint flat configuration for ADHD Todo React Native app
// ABOUTME: Enforces code quality and consistency standards

const js = require('@eslint/js');
const reactPlugin = require('eslint-plugin-react');
const reactNativePlugin = require('eslint-plugin-react-native');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const globals = require('globals');
const customRules = require('./eslint-rules');

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
      'no-void': 'off', // Allow void for ignoring floating promises

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
      '@typescript-eslint/no-explicit-any': 'error', // Changed from warn to error

      // Ban problematic types
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'with-single-extends',
          allowObjectTypes: 'never',
        },
      ],

      // Strict type safety rules
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // Promise handling
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: true,
          ignoreIIFE: false,
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksConditionals: true,
          checksVoidReturn: true,
          checksSpreads: true,
        },
      ],
      '@typescript-eslint/require-await': 'error',

      // Type improvements
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-parameters': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      // Code quality
      '@typescript-eslint/no-implied-eval': 'error',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/no-deprecated': 'warn', // Warn for now since we may have some

      // React specific overrides
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+

      // Additional React rules for better code quality
      'react/jsx-no-bind': [
        'error',
        {
          ignoreRefs: true,
          allowArrowFunctions: true,
          allowFunctions: false,
          allowBind: false,
        },
      ],
      'react/no-unused-prop-types': 'error',
      'react/no-unused-state': 'error',
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/no-array-index-key': 'error',
      'react/no-unstable-nested-components': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-pascal-case': 'error',
      'react/self-closing-comp': 'error',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/hook-use-state': 'error',
      'react/jsx-no-constructed-context-values': 'error',

      // React Native specific rules
      'react-native/no-unused-styles': 'error',
      'react-native/split-platform-components': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-single-element-style-arrays': 'error',

      // General JavaScript best practices
      'no-console': [
        'error',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-throw-literal': 'error',
      'prefer-template': 'error',
      'no-useless-concat': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-else-return': ['error', { allowElseIf: false }],

      // Security and error prevention
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-implied-eval': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-new-wrappers': 'error',
      radix: 'error',
      'no-void': 'off', // Allow void for ignoring floating promises
      'no-with': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-return-await': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'handle-callback-err': 'error',
      'no-implicit-globals': 'error',
      'consistent-return': 'error',
      'no-confusing-arrow': ['error', { allowParens: true }],
      'no-constant-binary-expression': 'error',
      'no-constructor-return': 'error',
      'no-promise-executor-return': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-private-class-members': 'error',
      'require-atomic-updates': 'error',

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
    plugins: {
      'custom-rules': customRules,
    },
    rules: {
      'no-console': 'off',
      // Custom rules to enforce test consistency
      'custom-rules/enforce-mock-factories': 'error',
      'custom-rules/enforce-console-mocks': 'warn',
      'custom-rules/enforce-test-data-factories': 'warn',
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
