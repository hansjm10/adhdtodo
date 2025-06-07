# Custom ESLint Rules for Test Consistency

This directory contains custom ESLint rules that enforce the use of standardized mock factories and test utilities.

## Rules

### 1. `enforce-mock-factories` (Error)

Enforces the use of standardized mock factories from `tests/utils/standardMocks.js` instead of creating manual mock objects.

**What it detects:**

- Manual Supabase channel mocks (objects with `on`, `subscribe` methods)
- Manual query builder mocks (objects with `select`, `eq` methods)
- Manual AsyncStorage mocks (objects with `getItem`, `setItem` methods)
- Local `jest.mock('SupabaseService')` calls (should use global mock)

**Examples:**

❌ **Bad:**

```javascript
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
  send: jest.fn(),
};
```

✅ **Good:**

```javascript
import { createSupabaseChannelMock } from '../../../tests/utils/standardMocks';
const mockChannel = createSupabaseChannelMock();
```

❌ **Bad:**

```javascript
jest.mock('../services/SupabaseService', () => ({
  supabase: {
    /* manual mock */
  },
}));
```

✅ **Good:**

```javascript
// SupabaseService is already mocked globally in tests/setup.js
```

### 2. `enforce-console-mocks` (Warning)

Enforces the use of `setupConsoleMocks()` helper instead of manually mocking console methods.

**What it detects:**

- Manual console method assignments (`console.error = jest.fn()`)
- Manual console assertions instead of helper methods

**Examples:**

❌ **Bad:**

```javascript
const originalError = console.error;
console.error = jest.fn();
// ... test code ...
expect(console.error).not.toHaveBeenCalled();
```

✅ **Good:**

```javascript
import { setupConsoleMocks } from '../../../tests/utils/standardMocks';

describe('MyComponent', () => {
  const { expectNoConsoleErrors } = setupConsoleMocks();

  it('should not log errors', () => {
    // ... test code ...
    expectNoConsoleErrors();
  });
});
```

### 3. `enforce-test-data-factories` (Warning)

Enforces the use of test data factories instead of manually creating test objects.

**What it detects:**

- Manual user objects (with fields like `email`, `name`, `role`)
- Manual task objects (with fields like `title`, `description`, `userId`)
- Manual notification objects
- Manual partnership objects

**Examples:**

❌ **Bad:**

```javascript
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'adhd_user',
  partnerId: null,
};
```

✅ **Good:**

```javascript
import { testDataFactories } from '../../../tests/utils/standardMocks';

const mockUser = testDataFactories.user({
  name: 'Test User',
});
```

## Configuration

These rules are automatically applied to test files (`.test.js`, `.spec.js`, etc.) through the ESLint configuration:

```javascript
// In eslint.config.js
rules: {
  'custom-rules/enforce-mock-factories': 'error',
  'custom-rules/enforce-console-mocks': 'warn',
  'custom-rules/enforce-test-data-factories': 'warn',
}
```

## Auto-fixing

Some violations can be automatically fixed:

```bash
# Fix all auto-fixable violations
npm run lint

# Just check without fixing
npm run lint:check
```

## Exceptions

### Files that can use custom Supabase mocks:

- `CollaborativeEditingService.test.js` - Needs specific mock behavior
- `PartnershipService.test.js` - Needs specific mock behavior
- `setup.js` - Global mock definition

All other test files should rely on the global Supabase mock.

## Benefits

1. **Consistency**: All tests use the same mock patterns
2. **Maintainability**: Mock updates only need to happen in one place
3. **Reliability**: Standardized mocks reduce test flakiness
4. **Developer Experience**: Clear errors guide developers to best practices
5. **Code Quality**: Prevents duplicate and conflicting mock implementations
