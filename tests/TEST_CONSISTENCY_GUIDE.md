# Test Consistency Guide

This guide ensures all tests follow consistent patterns for mocking and setup.

## ESLint Enforcement

We have custom ESLint rules that automatically enforce these patterns:

- **`enforce-mock-factories`** (Error): Prevents manual mock object creation
- **`enforce-console-mocks`** (Warning): Enforces use of setupConsoleMocks()
- **`enforce-test-data-factories`** (Warning): Enforces use of test data factories

Run `npm run lint` to check for violations and auto-fix where possible.

## 1. Import Standard Mocks

Always import from `standardMocks.js` for consistent behavior:

```javascript
import {
  createSupabaseMock,
  createSupabaseChannelMock,
  createSupabaseQueryBuilderMock,
  createAsyncStorageMock,
  createUserStorageServiceMock,
  createTaskStorageServiceMock,
  createNotificationServiceMock,
  createPartnershipServiceMock,
  setupConsoleMocks,
  testDataFactories,
} from '../../../tests/utils/standardMocks';
```

## 2. Mock Module Pattern

Use consistent patterns for mocking modules:

```javascript
// For Supabase
jest.mock('../SupabaseService', () => {
  const { createSupabaseMock } = require('../../../tests/utils/standardMocks');
  return {
    supabase: createSupabaseMock(),
  };
});

// For services
jest.mock('../../services/UserStorageService', () => {
  const { createUserStorageServiceMock } = require('../../../tests/utils/standardMocks');
  return {
    __esModule: true,
    default: createUserStorageServiceMock(),
  };
});

// For AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const { createAsyncStorageMock } = require('../../../tests/utils/standardMocks');
  return createAsyncStorageMock();
});
```

## 3. Test Setup Pattern

```javascript
describe('ComponentOrService', () => {
  // Use setupConsoleMocks for consistent console handling
  const { expectNoConsoleErrors, expectNoConsoleWarnings } = setupConsoleMocks();

  // Import mocked services at top of describe
  const { supabase } = require('../SupabaseService');
  const UserStorageService = require('../../services/UserStorageService').default;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock return values to defaults
    // Only override specific methods needed for the test
  });

  afterEach(() => {
    cleanup(); // For React component tests
  });
});
```

## 4. Test-Specific Mock Overrides

When a test needs specific mock behavior:

```javascript
it('should handle specific scenario', async () => {
  // Create custom mock for this test
  const customQueryBuilder = createSupabaseQueryBuilderMock(
    { id: 'test-123', title: 'Test' }, // data
    null, // error
  );

  // Override default mock for this test only
  supabase.from.mockReturnValueOnce(customQueryBuilder);

  // Test implementation
  const result = await myFunction();

  // Assertions
  expect(result).toBeDefined();
  expectNoConsoleErrors();
});
```

## 5. Async Testing Pattern

```javascript
it('should handle async operations', async () => {
  // Setup
  const mockData = testDataFactories.user({ id: 'user-123' });
  UserStorageService.getCurrentUser.mockResolvedValueOnce(mockData);

  // Execute
  const { getByTestId } = render(<MyComponent />);

  // Wait for async operations
  await waitFor(() => {
    expect(getByTestId('user-name')).toHaveTextContent(mockData.name);
  });

  // Verify no errors
  expectNoConsoleErrors();
});
```

## 6. Common Patterns to Avoid

### ❌ Don't create inline mock objects

```javascript
// Bad
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
  send: jest.fn(),
};
```

### ✅ Use standard mock factories

```javascript
// Good
const mockChannel = createSupabaseChannelMock();
```

### ❌ Don't mock console methods individually

```javascript
// Bad
const originalError = console.error;
console.error = jest.fn();
```

### ✅ Use setupConsoleMocks

```javascript
// Good
const { expectNoConsoleErrors } = setupConsoleMocks();
```

### ❌ Don't create test data manually

```javascript
// Bad
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  // ... many fields
};
```

### ✅ Use test data factories

```javascript
// Good
const mockUser = testDataFactories.user({ name: 'Test User' });
```

## 7. Mock Cleanup Pattern

Always clean up subscriptions and timers:

```javascript
it('should handle subscriptions', async () => {
  const unsubscribe = jest.fn();
  UserStorageService.subscribeToUserUpdates.mockReturnValueOnce({ unsubscribe });

  const component = render(<MyComponent />);

  // Test behavior

  // Cleanup
  unmount(component);
  expect(unsubscribe).toHaveBeenCalled();
});
```
