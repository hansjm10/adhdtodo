// ABOUTME: Custom ESLint rule to enforce use of standardized mock factories
// Detects manual mock object creation and suggests using factory functions

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce use of standardized mock factories instead of manual mock objects',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      useSupabaseChannelMock:
        'Use createSupabaseChannelMock() from standardMocks instead of manual mock object',
      useSupabaseQueryMock:
        'Use createSupabaseQueryBuilderMock() from standardMocks instead of manual mock object',
      useSupabaseMock:
        'Use createSupabaseMock() from standardMocks instead of manual Supabase mock',
      useAsyncStorageMock: 'Use createAsyncStorageMock() from standardMocks instead of manual mock',
      avoidJestMockSupabase:
        'Avoid mocking SupabaseService locally - it is mocked globally in tests/setup.js',
      useStandardMockImport: 'Import mock factories from tests/utils/standardMocks',
    },
    schema: [],
  },

  create(context) {
    // Track if standardMocks is imported
    let hasStandardMocksImport = false;

    // Common mock patterns to detect
    const channelMockPattern = /\bon:\s*:\s*jest\.fn\(\).*subscribe:\s*:\s*jest\.fn\(\)/s;
    const queryBuilderPattern = /\bselect:\s*:\s*jest\.fn\(\).*\beq:\s*:\s*jest\.fn\(\)/s;
    const asyncStoragePattern = /\bgetItem:\s*:\s*jest\.fn\(\).*\bsetItem:\s*:\s*jest\.fn\(\)/s;

    return {
      // Check for standardMocks import
      ImportDeclaration(node) {
        if (node.source.value.includes('standardMocks')) {
          hasStandardMocksImport = true;
        }
      },

      // Check for manual mock object creation
      ObjectExpression(node) {
        const sourceCode = context.getSourceCode();
        const objectText = sourceCode.getText(node);

        // Skip if in a non-test file
        const filename = context.getFilename();
        if (!filename.includes('.test.') && !filename.includes('.spec.')) {
          return;
        }

        // Check for Supabase channel mock pattern
        if (channelMockPattern.test(objectText)) {
          context.report({
            node,
            messageId: 'useSupabaseChannelMock',
            fix(fixer) {
              return fixer.replaceText(node, 'createSupabaseChannelMock()');
            },
          });
        }

        // Check for query builder mock pattern
        if (queryBuilderPattern.test(objectText)) {
          context.report({
            node,
            messageId: 'useSupabaseQueryMock',
            fix(fixer) {
              return fixer.replaceText(node, 'createSupabaseQueryBuilderMock()');
            },
          });
        }

        // Check for AsyncStorage mock pattern
        if (asyncStoragePattern.test(objectText)) {
          context.report({
            node,
            messageId: 'useAsyncStorageMock',
            fix(fixer) {
              return fixer.replaceText(node, 'createAsyncStorageMock()');
            },
          });
        }
      },

      // Check for local SupabaseService mocking
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'jest' &&
          node.callee.property.name === 'mock' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value.includes('SupabaseService')
        ) {
          const filename = context.getFilename();

          // Exceptions for files that need custom mocks
          const exceptions = [
            'CollaborativeEditingService.test',
            'PartnershipService.test',
            'setup.js',
          ];

          if (!exceptions.some((exception) => filename.includes(exception))) {
            context.report({
              node,
              messageId: 'avoidJestMockSupabase',
              fix(fixer) {
                // Replace with a comment
                return fixer.replaceText(
                  node.parent,
                  '// SupabaseService is already mocked globally in tests/setup.js',
                );
              },
            });
          }
        }
      },

      // Suggest importing standardMocks if using manual mocks
      'Program:exit'() {
        const filename = context.getFilename();
        if (!filename.includes('.test.') && !filename.includes('.spec.')) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        // If file contains mock patterns but no standardMocks import
        if (
          !hasStandardMocksImport &&
          (channelMockPattern.test(text) ||
            queryBuilderPattern.test(text) ||
            asyncStoragePattern.test(text))
        ) {
          const firstImport = sourceCode.ast.body.find((node) => node.type === 'ImportDeclaration');

          if (firstImport) {
            context.report({
              node: firstImport,
              messageId: 'useStandardMockImport',
              fix(fixer) {
                const importStatement =
                  "import { createSupabaseChannelMock, createSupabaseQueryBuilderMock, createAsyncStorageMock } from '../../../tests/utils/standardMocks';\n";
                return fixer.insertTextBefore(firstImport, importStatement);
              },
            });
          }
        }
      },
    };
  },
};
