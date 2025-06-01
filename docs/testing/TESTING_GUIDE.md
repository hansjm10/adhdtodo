# Testing Guide

## Overview

This guide covers testing practices for the ADHD Todo app. We follow Test-Driven Development (TDD) principles and maintain comprehensive test coverage across unit, integration, and end-to-end tests.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Writing Tests](#writing-tests)
3. [Using Test Utilities](#using-test-utilities)
4. [Common Patterns](#common-patterns)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Test Structure

Our test suite is organized into three main categories:

```
tests/
├── unit/          # Isolated component and function tests
├── integration/   # Feature flow tests
├── e2e/          # Complete user journey tests
└── utils/        # Testing utilities and helpers
```

### Unit Tests

- Test individual functions and components in isolation
- Mock external dependencies
- Focus on business logic and component behavior
- Located alongside source files as `__tests__/*.test.js`

### Integration Tests

- Test complete features across multiple components
- Use real component interactions
- Verify navigation and state management
- Located in `tests/integration/`

### E2E Tests

- Test complete user workflows
- Run on simulators/devices
- Verify the app works as expected for users
- Located in `tests/e2e/` (when configured)

## Writing Tests

### Component Tests

Use `renderWithProviders` to render components with all necessary providers:

```javascript
import { renderWithProviders, fireEvent, createMockUser } from '../../tests/utils';
import ProfileScreen from '../ProfileScreen';

describe('ProfileScreen', () => {
  it('should display user profile information', () => {
    const user = createMockUser({
      name: 'John Doe',
      email: 'john@example.com',
    });

    const { getByText, getByTestId } = renderWithProviders(<ProfileScreen />, {
      initialState: { user },
    });

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('john@example.com')).toBeTruthy();
  });

  it('should handle logout', () => {
    const { getByText } = renderWithProviders(<ProfileScreen />);

    const logoutButton = getByText('Logout');
    fireEvent.press(logoutButton);

    // Verify logout behavior
  });
});
```

### Async Tests

Always use proper async patterns when testing asynchronous operations:

```javascript
import { renderWithProviders, waitFor, mockAsyncCall } from '../../tests/utils';
import TaskListScreen from '../TaskListScreen';
import TaskStorageService from '../../services/TaskStorageService';

// Mock the service
jest.mock('../../services/TaskStorageService');

describe('TaskListScreen', () => {
  beforeEach(() => {
    TaskStorageService.getUserTasks = mockAsyncCall([
      createMockTask({ title: 'Task 1' }),
      createMockTask({ title: 'Task 2' }),
    ]);
  });

  it('should load and display tasks', async () => {
    const { findByText } = renderWithProviders(<TaskListScreen />);

    // Wait for async data to load
    const task1 = await findByText('Task 1');
    const task2 = await findByText('Task 2');

    expect(task1).toBeTruthy();
    expect(task2).toBeTruthy();
  });
});
```

### Navigation Tests

Test navigation between screens using navigation helpers:

```javascript
import { renderWithProviders, createNavigationMock, fireEvent } from '../../tests/utils';
import TaskListScreen from '../TaskListScreen';

describe('TaskListScreen Navigation', () => {
  it('should navigate to create task screen', () => {
    const navigation = createNavigationMock();

    const { getByTestId } = renderWithProviders(<TaskListScreen navigation={navigation} />);

    const createButton = getByTestId('create-task-button');
    fireEvent.press(createButton);

    expect(navigation.navigate).toHaveBeenCalledWith('CreateTask');
  });
});
```

## Using Test Utilities

### Mock Factories

Create consistent test data using mock factories:

```javascript
import {
  createMockUser,
  createMockTask,
  createMockNotification,
  createMockPartnerUser,
  createMockCompletedTask,
  createMockAssignedTask,
} from '../tests/utils';

// Create basic mocks
const user = createMockUser();
const task = createMockTask();
const notification = createMockNotification();

// Create specialized mocks
const partner = createMockPartnerUser({ name: 'Partner Name' });
const completedTask = createMockCompletedTask({ xpEarned: 20 });
const assignedTask = createMockAssignedTask({
  assignedBy: partner.id,
  dueDate: new Date('2024-12-31'),
});
```

### Async Helpers

Handle asynchronous operations effectively:

```javascript
import {
  waitForAsyncUpdates,
  mockAsyncCall,
  mockAsyncError,
  createDeferredPromise,
  retryAsync,
} from '../tests/utils';

// Wait for state updates
await waitForAsyncUpdates();

// Mock successful async calls
const mockSave = mockAsyncCall({ success: true }, 100); // 100ms delay

// Mock failed async calls
const mockFailure = mockAsyncError('Network error', 50);

// Control promise resolution
const deferred = createDeferredPromise();
// ... later in test
deferred.resolve('Success!');

// Retry flaky operations
const result = await retryAsync(() => fetchData(), { maxAttempts: 3, delay: 100 });
```

### Component Testing Helpers

Test common component states:

```javascript
import { testLoadingState, testErrorState, testEmptyState, testSnapshot } from '../tests/utils';

describe('TaskList States', () => {
  it('should show loading state', async () => {
    await testLoadingState(TaskList, { isLoading: true });
  });

  it('should show error state', async () => {
    await testErrorState(TaskList, {}, new Error('Failed to load'));
  });

  it('should show empty state', async () => {
    await testEmptyState(TaskList);
  });

  it('should match snapshot', () => {
    testSnapshot(TaskList, { tasks: mockTasks }, 'TaskList with data');
  });
});
```

## Common Patterns

### Testing Forms

```javascript
describe('CreateTaskForm', () => {
  it('should validate required fields', async () => {
    const { getByPlaceholderText, getByText, queryByText } = renderWithProviders(
      <CreateTaskForm />,
    );

    const submitButton = getByText('Create Task');

    // Try to submit empty form
    fireEvent.press(submitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(getByText('Title is required')).toBeTruthy();
    });

    // Fill in the form
    const titleInput = getByPlaceholderText('Task title');
    fireEvent.changeText(titleInput, 'New Task');

    // Submit again
    fireEvent.press(submitButton);

    // Error should be gone
    await waitFor(() => {
      expect(queryByText('Title is required')).toBeFalsy();
    });
  });
});
```

### Testing Context Updates

```javascript
describe('Task Context', () => {
  it('should update task list when task is added', async () => {
    const { getByText, findByText } = renderWithProviders(<TaskManagementScreen />);

    // Add a task
    fireEvent.press(getByText('Add Task'));
    fireEvent.changeText(getByPlaceholderText('Title'), 'New Task');
    fireEvent.press(getByText('Save'));

    // Verify task appears in list
    const newTask = await findByText('New Task');
    expect(newTask).toBeTruthy();
  });
});
```

### Testing with Timers

```javascript
describe('Hyperfocus Timer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should count down timer', async () => {
    const { getByTestId } = renderWithProviders(<HyperfocusTimer />);

    expect(getByTestId('timer-display').props.children).toBe('25:00');

    // Advance timer by 1 minute
    await advanceTimersAndWait(60000);

    expect(getByTestId('timer-display').props.children).toBe('24:00');
  });
});
```

## Best Practices

### 1. Write Tests First (TDD)

- Write a failing test that defines desired functionality
- Write minimal code to make the test pass
- Refactor while keeping tests green

### 2. Keep Tests Focused

- One test should verify one behavior
- Use descriptive test names that explain what is being tested
- Avoid testing implementation details

### 3. Use Proper Async Handling

- Always await async operations
- Use `findBy` queries for elements that appear asynchronously
- Use `waitFor` for assertions on async state changes

### 4. Mock External Dependencies

- Mock API calls and external services
- Use mock factories for consistent test data
- Reset mocks between tests

### 5. Test User Behavior

- Test what users see and do, not implementation
- Use accessibility queries when possible
- Verify the app works for ADHD users specifically

### 6. Maintain Test Performance

- Mock heavy operations
- Use `beforeEach` and `afterEach` for setup/cleanup
- Run only necessary tests during development

## Troubleshooting

### Common Issues

#### "Unable to find element"

- Check if the element appears asynchronously (use `findBy` instead of `getBy`)
- Verify the test ID or text exists
- Check if the element is conditionally rendered

#### "Warning: An update was not wrapped in act(...)"

- Wrap state updates in `act()` or use `waitFor`
- Use async test utilities for async operations
- Ensure all promises are resolved before test ends

#### "Cannot read property of undefined"

- Check if mocks are properly set up
- Verify context providers are included
- Ensure navigation prop is passed or mocked

#### Test Timeouts

- Increase timeout for slow operations: `jest.setTimeout(10000)`
- Check for unresolved promises
- Verify async operations complete

### Debugging Tips

1. **Use debug()**: Print component tree

   ```javascript
   const { debug } = render(<Component />);
   debug(); // Prints component tree
   ```

2. **Check available queries**: See what's rendered

   ```javascript
   const { container } = render(<Component />);
   console.log(container.innerHTML);
   ```

3. **Add test IDs**: Make elements easier to find

   ```javascript
   <TouchableOpacity testID="submit-button">
   ```

4. **Use breakpoints**: Debug test execution
   ```javascript
   debugger; // Pause execution here
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test TaskListScreen.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should load tasks"

# Update snapshots
npm test -- -u
```

## Coverage Requirements

We aim for the following coverage targets:

- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

Critical paths should have 100% coverage.

---

For more examples, see the [Test Examples](./TEST_EXAMPLES.md) documentation.
