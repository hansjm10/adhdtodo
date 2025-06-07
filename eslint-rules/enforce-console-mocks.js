// ABOUTME: Custom ESLint rule to enforce use of setupConsoleMocks
// Detects manual console mocking and suggests using the standard helper

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce use of setupConsoleMocks() instead of manual console mocking',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      useSetupConsoleMocks:
        'Use setupConsoleMocks() from standardMocks instead of manually mocking console methods',
      useExpectNoConsoleErrors:
        'Use expectNoConsoleErrors() instead of manually checking console.error calls',
    },
    schema: [],
  },

  create(context) {
    return {
      // Detect manual console mocking patterns
      AssignmentExpression(node) {
        const filename = context.getFilename();
        if (!filename.includes('.test.') && !filename.includes('.spec.')) {
          return;
        }

        // Check for console.error = jest.fn() pattern
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.name === 'console' &&
          ['error', 'warn', 'info', 'log'].includes(node.left.property.name) &&
          node.right.type === 'CallExpression' &&
          node.right.callee.type === 'MemberExpression' &&
          node.right.callee.object.name === 'jest' &&
          node.right.callee.property.name === 'fn'
        ) {
          context.report({
            node,
            messageId: 'useSetupConsoleMocks',
          });
        }

        // Check for global.console.error = jest.fn() pattern
        if (
          node.left.type === 'MemberExpression' &&
          node.left.object.type === 'MemberExpression' &&
          node.left.object.object.name === 'global' &&
          node.left.object.property.name === 'console' &&
          ['error', 'warn', 'info', 'log'].includes(node.left.property.name)
        ) {
          context.report({
            node,
            messageId: 'useSetupConsoleMocks',
          });
        }
      },

      // Detect manual console.error checking
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'CallExpression' &&
          node.callee.object.callee.name === 'expect' &&
          node.callee.property.name === 'not' &&
          node.parent.type === 'MemberExpression' &&
          node.parent.property.name === 'toHaveBeenCalled' &&
          node.callee.object.arguments.length > 0 &&
          node.callee.object.arguments[0].type === 'MemberExpression' &&
          node.callee.object.arguments[0].object.name === 'console' &&
          node.callee.object.arguments[0].property.name === 'error'
        ) {
          context.report({
            node: node.parent.parent,
            messageId: 'useExpectNoConsoleErrors',
            fix(fixer) {
              return fixer.replaceText(node.parent.parent, 'expectNoConsoleErrors()');
            },
          });
        }
      },
    };
  },
};
