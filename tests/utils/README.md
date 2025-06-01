# Test Utilities

This directory contains a comprehensive set of testing utilities designed to make writing tests for the ADHD Todo app easier, more consistent, and more maintainable.

## Quick Start

```javascript
import {
  renderWithProviders,
  createMockUser,
  createMockTask,
  mockAsyncCall,
  createNavigationMock,
} from '../tests/utils';

describe('MyComponent', () => {
  it('should work with all utilities', async () => {
    const user = createMockUser({ name: 'Test User' });
    const task = createMockTask({ title: 'Test Task' });
    const navigation = createNavigationMock();

    const { getByText } = renderWithProviders(<MyComponent navigation={navigation} />, {
      initialState: { user, tasks: [task] },
    });

    expect(getByText('Test User')).toBeTruthy();
  });
});
```

## Available Utilities

### Core Test Utilities (`testUtils.js`)

- **`renderWithProviders`**: Renders components with all necessary providers (AppProvider, NavigationContainer)
- **`waitForLoadingToFinish`**: Waits for loading indicators to disappear
- **`getByTestIdSafe`**: Gets element by test ID with helpful error messages

### Mock Factories (`mockFactories.js`)

- **`createMockUser`**: Creates a user object with sensible defaults
- **`createMockTask`**: Creates a task object
- **`createMockNotification`**: Creates a notification object
- **`createMockPartnerUser`**: Creates an accountability partner user
- **`createMockCompletedTask`**: Creates a completed task
- **`createMockAssignedTask`**: Creates a partner-assigned task
- **`createMockEncouragementNotification`**: Creates an encouragement notification
- **`createMockNotificationData`**: Creates notification data by type

### Navigation Helpers (`navigationHelpers.js`)

- **`createNavigationMock`**: Creates a mock navigation object
- **`createRouteMock`**: Creates a mock route object
- **`createNavigationState`**: Creates navigation state
- **`expectNavigationCalledWith`**: Assert navigation was called correctly
- **`resetNavigationMocks`**: Reset all navigation mocks
- **`simulateNavigationEvent`**: Simulate navigation events (focus, blur)

### Async Helpers (`asyncHelpers.js`)

- **`waitForAsyncUpdates`**: Wait for next tick/async updates
- **`mockAsyncCall`**: Create a mock that returns a promise
- **`mockAsyncError`**: Create a mock that rejects
- **`createDeferredPromise`**: Create controllable promise
- **`mockAsyncStorage`**: Mock AsyncStorage with test data
- **`advanceTimersAndWait`**: Advance fake timers and wait
- **`mockFetch`**: Mock fetch API calls
- **`retryAsync`**: Retry async operations

### Component Helpers (`componentHelpers.js`)

- **`testLoadingState`**: Test component loading states
- **`testErrorState`**: Test component error states
- **`testEmptyState`**: Test component empty states
- **`testSnapshot`**: Create component snapshots
- **`testFormValidation`**: Test form validation rules
- **`testListRendering`**: Test list components
- **`testAccessibility`**: Test accessibility features
- **`testModalVisibility`**: Test modal show/hide

## Usage Examples

### Testing a Screen with Navigation

```javascript
import { renderWithProviders, createNavigationMock, fireEvent } from '../tests/utils';
import HomeScreen from '../../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('should navigate to details screen', () => {
    const navigation = createNavigationMock();

    const { getByText } = renderWithProviders(<HomeScreen navigation={navigation} />);

    fireEvent.press(getByText('View Details'));

    expect(navigation.navigate).toHaveBeenCalledWith('Details', { id: '123' });
  });
});
```

### Testing Async Operations

```javascript
import { renderWithProviders, mockAsyncCall, waitFor } from '../tests/utils';
import TaskService from '../../src/services/TaskService';
import TaskList from '../../src/components/TaskList';

jest.mock('../../src/services/TaskService');

describe('TaskList', () => {
  it('should load tasks', async () => {
    const mockTasks = [createMockTask({ title: 'Task 1' }), createMockTask({ title: 'Task 2' })];

    TaskService.loadTasks = mockAsyncCall(mockTasks);

    const { findByText } = renderWithProviders(<TaskList />);

    expect(await findByText('Task 1')).toBeTruthy();
    expect(await findByText('Task 2')).toBeTruthy();
  });
});
```

### Testing Forms

```javascript
import { renderWithProviders, fireEvent, waitFor } from '../tests/utils';
import LoginForm from '../../src/components/LoginForm';

describe('LoginForm', () => {
  it('should validate email format', async () => {
    const { getByPlaceholderText, getByText, queryByText } = renderWithProviders(<LoginForm />);

    const emailInput = getByPlaceholderText('Email');
    const submitButton = getByText('Login');

    // Invalid email
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(getByText('Invalid email format')).toBeTruthy();
    });

    // Valid email
    fireEvent.changeText(emailInput, 'user@example.com');

    await waitFor(() => {
      expect(queryByText('Invalid email format')).toBeFalsy();
    });
  });
});
```

### Testing with Mock Data

```javascript
import {
  renderWithProviders,
  createMockUser,
  createMockTask,
  createMockNotification,
} from '../tests/utils';
import Dashboard from '../../src/screens/Dashboard';

describe('Dashboard', () => {
  it('should display user data correctly', () => {
    const user = createMockUser({
      name: 'John Doe',
      stats: { tasksCompleted: 10, currentStreak: 5 },
    });

    const tasks = [
      createMockTask({ title: 'Morning routine', completed: true }),
      createMockTask({ title: 'Work on project' }),
    ];

    const notifications = [
      createMockNotification({
        type: 'TASK_ASSIGNED',
        data: { taskTitle: 'Review documents' },
      }),
    ];

    const { getByText } = renderWithProviders(<Dashboard />, {
      initialState: {
        user,
        tasks,
        notifications,
      },
    });

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('10 tasks completed')).toBeTruthy();
    expect(getByText('5 day streak')).toBeTruthy();
  });
});
```

## Best Practices

1. **Import from the index file**: Use `from '../tests/utils'` for cleaner imports
2. **Use mock factories**: Create consistent test data with factories
3. **Reset mocks between tests**: Use `beforeEach` to reset mocks
4. **Test user interactions**: Focus on what users see and do
5. **Handle async properly**: Always await async operations
6. **Use meaningful test data**: Make test data realistic

## File Structure

```
tests/utils/
├── index.js              # Central export file
├── testUtils.js          # Core rendering utilities
├── mockFactories.js      # Data creation utilities
├── navigationHelpers.js  # Navigation testing utilities
├── asyncHelpers.js       # Async operation utilities
├── componentHelpers.js   # Component testing utilities
└── __tests__/           # Tests for the utilities
    ├── testUtils.test.js
    ├── mockFactories.test.js
    ├── navigationHelpers.test.js
    ├── asyncHelpers.test.js
    └── componentHelpers.test.js
```

## Contributing

When adding new utilities:

1. Add the utility to the appropriate file
2. Export it from the index.js file
3. Write tests for the utility
4. Document it in this README
5. Add usage examples

## Troubleshooting

### Common Issues

**"Cannot find module '../tests/utils'"**

- Make sure you're importing from the correct relative path
- The utils directory should be at `tests/utils/`

**"Navigation is undefined"**

- Pass navigation as a prop or use createNavigationMock()
- Make sure NavigationContainer is included (renderWithProviders does this)

**"Warning: An update was not wrapped in act(...)"**

- Use waitFor or waitForAsyncUpdates for async operations
- Wrap state updates in act() if needed

For more examples and detailed documentation, see:

- [Testing Guide](../../docs/testing/TESTING_GUIDE.md)
- [Test Examples](../../docs/testing/TEST_EXAMPLES.md)
