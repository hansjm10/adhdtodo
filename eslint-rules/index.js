// ABOUTME: Custom ESLint rules for enforcing test consistency
// Exports all custom rules for use in ESLint configuration

module.exports = {
  rules: {
    'enforce-mock-factories': require('./enforce-mock-factories'),
    'enforce-console-mocks': require('./enforce-console-mocks'),
    'enforce-test-data-factories': require('./enforce-test-data-factories'),
  },
};
