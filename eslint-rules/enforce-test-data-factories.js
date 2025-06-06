// ABOUTME: Custom ESLint rule to enforce use of test data factories
// Detects manual test data creation and suggests using factory functions

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce use of test data factories instead of manual test object creation',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      useUserFactory: 'Use testDataFactories.user() instead of creating user objects manually',
      useTaskFactory: 'Use testDataFactories.task() instead of creating task objects manually',
      useNotificationFactory:
        'Use testDataFactories.notification() instead of creating notification objects manually',
      usePartnershipFactory:
        'Use testDataFactories.partnership() instead of creating partnership objects manually',
    },
    schema: [],
  },

  create(context) {
    // Patterns to identify test data objects
    const userFields = ['email', 'name', 'role', 'partnerId'];
    const taskFields = ['title', 'description', 'userId', 'completed', 'priority', 'category'];
    const notificationFields = ['userId', 'type', 'title', 'message', 'read'];
    const partnershipFields = ['adhdUserId', 'partnerId', 'status', 'inviteCode'];

    function hasFields(properties, fields, threshold = 0.6) {
      const propNames = properties.map((p) => p.key.name || p.key.value);
      const matchCount = fields.filter((field) => propNames.includes(field)).length;
      return matchCount >= fields.length * threshold;
    }

    return {
      ObjectExpression(node) {
        const filename = context.getFilename();
        if (!filename.includes('.test.') && !filename.includes('.spec.')) {
          return;
        }

        // Skip if it's already a factory call
        if (
          node.parent.type === 'CallExpression' &&
          node.parent.callee.type === 'MemberExpression' &&
          node.parent.callee.object.name === 'testDataFactories'
        ) {
          return;
        }

        const properties = node.properties.filter((p) => p.type === 'Property');

        // Check for user object pattern
        if (hasFields(properties, userFields)) {
          context.report({
            node,
            messageId: 'useUserFactory',
          });
        }

        // Check for task object pattern
        if (hasFields(properties, taskFields)) {
          context.report({
            node,
            messageId: 'useTaskFactory',
          });
        }

        // Check for notification object pattern
        if (hasFields(properties, notificationFields)) {
          context.report({
            node,
            messageId: 'useNotificationFactory',
          });
        }

        // Check for partnership object pattern
        if (hasFields(properties, partnershipFields)) {
          context.report({
            node,
            messageId: 'usePartnershipFactory',
          });
        }
      },
    };
  },
};
