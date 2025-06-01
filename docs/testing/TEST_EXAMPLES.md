# Test Examples

This document provides comprehensive examples of testing patterns used in the ADHD Todo app.

## Table of Contents

1. [Form Testing](#form-testing)
2. [Navigation Testing](#navigation-testing)
3. [Context Testing](#context-testing)
4. [Async Operation Testing](#async-operation-testing)
5. [Error Handling Testing](#error-handling-testing)
6. [Integration Test Examples](#integration-test-examples)

## Form Testing

### Basic Form Validation

```javascript
import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../tests/utils';
import CreateTaskScreen from '../../src/screens/CreateTaskScreen';

describe('CreateTaskScreen Form Validation', () => {
  it('should validate required fields', async () => {
    const { getByText, getByPlaceholderText, queryByText } = renderWithProviders(
      <CreateTaskScreen />,
    );

    // Try to submit without filling required fields
    const saveButton = getByText('Save Task');
    fireEvent.press(saveButton);

    // Check for validation errors
    await waitFor(() => {
      expect(getByText('Title is required')).toBeTruthy();
    });

    // Fill in the title
    const titleInput = getByPlaceholderText('What needs to be done?');
    fireEvent.changeText(titleInput, 'Complete project report');

    // Submit again
    fireEvent.press(saveButton);

    // Error should be gone
    await waitFor(() => {
      expect(queryByText('Title is required')).toBeFalsy();
    });
  });

  it('should validate time estimate format', async () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(<CreateTaskScreen />);

    const timeInput = getByPlaceholderText('Time estimate (minutes)');

    // Test invalid input
    fireEvent.changeText(timeInput, 'abc');
    fireEvent.press(getByText('Save Task'));

    await waitFor(() => {
      expect(getByText('Time estimate must be a number')).toBeTruthy();
    });

    // Test valid input
    fireEvent.changeText(timeInput, '30');
    fireEvent.press(getByText('Save Task'));

    await waitFor(() => {
      expect(queryByText('Time estimate must be a number')).toBeFalsy();
    });
  });
});
```

### Complex Form with Multiple Steps

```javascript
import { renderWithProviders, fireEvent, waitFor, createMockUser } from '../../tests/utils';
import TaskAssignmentScreen from '../../src/screens/TaskAssignmentScreen';

describe('TaskAssignmentScreen Multi-Step Form', () => {
  const partner = createMockUser({
    id: 'partner-123',
    name: 'Partner User',
    role: 'ACCOUNTABILITY_PARTNER',
  });

  it('should handle multi-step task assignment', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
      <TaskAssignmentScreen />,
      { initialState: { user: partner } },
    );

    // Step 1: Task Details
    expect(getByText('Step 1: Task Details')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Task title'), 'Review medication schedule');
    fireEvent.changeText(
      getByPlaceholderText('Description'),
      'Check if current schedule is working',
    );

    fireEvent.press(getByText('Next'));

    // Step 2: Priority and Timing
    await waitFor(() => {
      expect(getByText('Step 2: Priority & Timing')).toBeTruthy();
    });

    fireEvent.press(getByTestId('priority-high'));
    fireEvent.press(getByTestId('due-date-picker'));
    // Mock date selection

    fireEvent.press(getByText('Next'));

    // Step 3: Review and Assign
    await waitFor(() => {
      expect(getByText('Step 3: Review & Assign')).toBeTruthy();
      expect(getByText('Review medication schedule')).toBeTruthy();
      expect(getByText('Priority: High')).toBeTruthy();
    });

    fireEvent.press(getByText('Assign Task'));

    // Verify navigation back to dashboard
    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('PartnerDashboard');
    });
  });
});
```

## Navigation Testing

### Tab Navigation

```javascript
import { renderWithProviders, fireEvent, createNavigationMock } from '../../tests/utils';
import AppNavigator from '../../src/navigation/AppNavigator';

describe('Tab Navigation', () => {
  it('should navigate between tabs', () => {
    const { getByTestId } = renderWithProviders(<AppNavigator />);

    // Verify initial tab
    expect(getByTestId('tasks-screen')).toBeTruthy();

    // Navigate to Focus tab
    fireEvent.press(getByTestId('tab-focus'));
    expect(getByTestId('focus-screen')).toBeTruthy();

    // Navigate to Partner tab
    fireEvent.press(getByTestId('tab-partner'));
    expect(getByTestId('partner-screen')).toBeTruthy();

    // Navigate to Profile tab
    fireEvent.press(getByTestId('tab-profile'));
    expect(getByTestId('profile-screen')).toBeTruthy();
  });
});
```

### Stack Navigation with Parameters

```javascript
import {
  renderWithProviders,
  fireEvent,
  createNavigationMock,
  createRouteMock,
} from '../../tests/utils';
import TaskListScreen from '../../src/screens/TaskListScreen';
import { createMockTask } from '../../tests/utils';

describe('TaskListScreen Navigation', () => {
  it('should navigate to edit screen with task data', () => {
    const navigation = createNavigationMock();
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Task 1' }),
      createMockTask({ id: 'task-2', title: 'Task 2' }),
    ];

    const { getByText } = renderWithProviders(<TaskListScreen navigation={navigation} />, {
      initialState: { tasks },
    });

    // Click on a task
    fireEvent.press(getByText('Task 1'));

    // Verify navigation with correct params
    expect(navigation.navigate).toHaveBeenCalledWith('EditTask', {
      taskId: 'task-1',
      task: tasks[0],
    });
  });

  it('should handle deep linking', () => {
    const route = createRouteMock({
      taskId: 'task-123',
      fromNotification: true,
    });

    const { getByTestId } = renderWithProviders(<EditTaskScreen route={route} />);

    // Verify the screen loaded with the correct task
    expect(getByTestId('task-id')).toHaveTextContent('task-123');
    expect(getByTestId('notification-badge')).toBeTruthy();
  });
});
```

## Context Testing

### Testing Context Updates

```javascript
import { renderWithProviders, fireEvent, waitFor, act } from '../../tests/utils';
import { useTask } from '../../src/contexts/TaskContext';
import TaskDashboard from '../../src/components/TaskDashboard';

// Component that uses context
const TaskCounter = () => {
  const { tasks } = useTask();
  return <Text testID="task-count">{tasks.length}</Text>;
};

describe('Task Context Updates', () => {
  it('should update task count when tasks are added', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <View>
        <TaskCounter />
        <TaskDashboard />
      </View>,
    );

    // Initial count
    expect(getByTestId('task-count')).toHaveTextContent('0');

    // Add a task
    fireEvent.press(getByText('Add Task'));
    fireEvent.changeText(getByTestId('task-input'), 'New Task');
    fireEvent.press(getByText('Save'));

    // Verify count updated
    await waitFor(() => {
      expect(getByTestId('task-count')).toHaveTextContent('1');
    });
  });
});
```

### Testing Multiple Context Interactions

```javascript
import { renderWithProviders, createMockUser, createMockTask } from '../../tests/utils';
import { useUser } from '../../src/contexts/UserContext';
import { useTask } from '../../src/contexts/TaskContext';
import { useNotification } from '../../src/contexts/NotificationContext';

const ContextInteractionComponent = () => {
  const { user } = useUser();
  const { tasks, completeTask } = useTask();
  const { showNotification } = useNotification();

  const handleCompleteTask = async (taskId) => {
    await completeTask(taskId);
    showNotification({
      type: 'success',
      message: 'Task completed! +10 XP',
    });
  };

  return (
    <View>
      <Text testID="user-xp">{user?.stats?.totalXP || 0}</Text>
      {tasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          testID={`task-${task.id}`}
          onPress={() => handleCompleteTask(task.id)}
        >
          <Text>{task.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

describe('Context Interactions', () => {
  it('should update user XP when task is completed', async () => {
    const user = createMockUser({ stats: { totalXP: 0 } });
    const task = createMockTask({ id: 'task-1', title: 'Test Task' });

    const { getByTestId, queryByText } = renderWithProviders(<ContextInteractionComponent />, {
      initialState: {
        user,
        tasks: [task],
        notifications: [],
      },
    });

    // Initial XP
    expect(getByTestId('user-xp')).toHaveTextContent('0');

    // Complete task
    fireEvent.press(getByTestId('task-task-1'));

    // Verify XP updated and notification shown
    await waitFor(() => {
      expect(getByTestId('user-xp')).toHaveTextContent('10');
      expect(queryByText('Task completed! +10 XP')).toBeTruthy();
    });
  });
});
```

## Async Operation Testing

### Testing API Calls

```javascript
import { renderWithProviders, waitFor, mockAsyncCall, mockAsyncError } from '../../tests/utils';
import TaskService from '../../src/services/TaskService';
import TaskListScreen from '../../src/screens/TaskListScreen';

jest.mock('../../src/services/TaskService');

describe('TaskListScreen API Integration', () => {
  it('should load tasks from API', async () => {
    const mockTasks = [createMockTask({ title: 'Task 1' }), createMockTask({ title: 'Task 2' })];

    TaskService.fetchUserTasks = mockAsyncCall(mockTasks, 100);

    const { getByTestId, findByText } = renderWithProviders(<TaskListScreen />);

    // Should show loading initially
    expect(getByTestId('loading-indicator')).toBeTruthy();

    // Wait for tasks to load
    const task1 = await findByText('Task 1');
    const task2 = await findByText('Task 2');

    expect(task1).toBeTruthy();
    expect(task2).toBeTruthy();
    expect(queryByTestId('loading-indicator')).toBeFalsy();
  });

  it('should handle API errors gracefully', async () => {
    TaskService.fetchUserTasks = mockAsyncError('Network error');

    const { findByText, getByText } = renderWithProviders(<TaskListScreen />);

    // Wait for error message
    await findByText(/error loading tasks/i);

    // Test retry functionality
    TaskService.fetchUserTasks = mockAsyncCall([]);
    fireEvent.press(getByText('Retry'));

    await waitFor(() => {
      expect(queryByText(/error loading tasks/i)).toBeFalsy();
    });
  });
});
```

### Testing Debounced Operations

```javascript
import { renderWithProviders, fireEvent, waitFor, advanceTimersAndWait } from '../../tests/utils';
import SearchableTaskList from '../../src/components/SearchableTaskList';

describe('SearchableTaskList Debouncing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce search input', async () => {
    const onSearch = jest.fn();
    const { getByPlaceholderText } = renderWithProviders(
      <SearchableTaskList onSearch={onSearch} debounceMs={300} />,
    );

    const searchInput = getByPlaceholderText('Search tasks...');

    // Type multiple characters quickly
    fireEvent.changeText(searchInput, 'T');
    fireEvent.changeText(searchInput, 'Te');
    fireEvent.changeText(searchInput, 'Test');

    // Search should not be called yet
    expect(onSearch).not.toHaveBeenCalled();

    // Advance timers
    await advanceTimersAndWait(300);

    // Search should be called once with final value
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('Test');
  });
});
```

## Error Handling Testing

### Component Error Boundaries

```javascript
import { renderWithProviders } from '../../tests/utils';
import ErrorBoundary from '../../src/components/ErrorBoundary';

const BrokenComponent = () => {
  throw new Error('Component crashed!');
};

describe('ErrorBoundary', () => {
  // Suppress console errors for this test
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should catch and display component errors', () => {
    const { getByText, queryByText } = renderWithProviders(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(getByText(/something went wrong/i)).toBeTruthy();
    expect(getByText(/Component crashed!/)).toBeTruthy();
    expect(queryByText('Report Issue')).toBeTruthy();
  });

  it('should allow error recovery', () => {
    const { getByText, rerender } = renderWithProviders(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    fireEvent.press(getByText('Try Again'));

    // Rerender with working component
    rerender(
      <ErrorBoundary>
        <Text>Working Component</Text>
      </ErrorBoundary>,
    );

    expect(getByText('Working Component')).toBeTruthy();
  });
});
```

### Network Error Handling

```javascript
import { renderWithProviders, mockFetch, waitFor } from '../../tests/utils';
import PartnershipService from '../../src/services/PartnershipService';
import PartnerInviteScreen from '../../src/screens/PartnerInviteScreen';

describe('Network Error Handling', () => {
  it('should handle network timeouts', async () => {
    global.fetch = mockFetch({
      '/api/partnership/invite': {
        ok: false,
        status: 408,
        data: { error: 'Request timeout' },
      },
    });

    const { getByPlaceholderText, getByText, findByText } = renderWithProviders(
      <PartnerInviteScreen />,
    );

    fireEvent.changeText(getByPlaceholderText('Invite code'), 'ABC123');
    fireEvent.press(getByText('Join Partnership'));

    // Should show timeout error
    await findByText(/request timeout/i);
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('should handle offline mode', async () => {
    // Mock offline status
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const { getByText } = renderWithProviders(<PartnerInviteScreen />);

    expect(getByText(/you are offline/i)).toBeTruthy();
    expect(getByText('Retry when online')).toBeDisabled();
  });
});
```

## Integration Test Examples

### Complete User Flow

```javascript
import { renderWithProviders, fireEvent, waitFor, createMockUser } from '../../tests/utils';
import App from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Complete Task Creation Flow', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should complete full task creation and completion flow', async () => {
    const { getByText, getByPlaceholderText, findByText, getByTestId } = renderWithProviders(
      <App />,
    );

    // Login
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    // Wait for main screen
    await findByText('My Tasks');

    // Navigate to create task
    fireEvent.press(getByTestId('create-task-fab'));

    // Fill task form
    fireEvent.changeText(
      getByPlaceholderText('What needs to be done?'),
      'Complete integration tests',
    );
    fireEvent.changeText(
      getByPlaceholderText('Add more details...'),
      'Write comprehensive test examples',
    );
    fireEvent.press(getByTestId('priority-high'));
    fireEvent.changeText(getByPlaceholderText('Time estimate'), '60');

    // Save task
    fireEvent.press(getByText('Save Task'));

    // Verify navigation back to list
    await findByText('My Tasks');
    expect(getByText('Complete integration tests')).toBeTruthy();

    // Start the task
    fireEvent.press(getByText('Complete integration tests'));
    fireEvent.press(getByText('Start Task'));

    // Navigate to hyperfocus mode
    await findByText('Hyperfocus Mode');
    expect(getByTestId('timer-display')).toBeTruthy();

    // Complete the task
    fireEvent.press(getByText('Complete Task'));

    // Verify completion
    await waitFor(() => {
      expect(getByText('Task Completed!')).toBeTruthy();
      expect(getByText('+10 XP')).toBeTruthy();
    });
  });
});
```

### Partnership Flow Integration

```javascript
import {
  renderWithProviders,
  fireEvent,
  waitFor,
  createMockUser,
  createMockPartnerUser,
  mockAsyncCall,
} from '../../tests/utils';
import App from '../../App';
import PartnershipService from '../../src/services/PartnershipService';

jest.mock('../../src/services/PartnershipService');

describe('Partnership Integration Flow', () => {
  it('should handle complete partnership setup', async () => {
    const adhdUser = createMockUser({
      id: 'user-1',
      name: 'ADHD User',
      role: 'ADHD_USER',
    });

    const partner = createMockPartnerUser({
      id: 'partner-1',
      name: 'Support Partner',
    });

    // Mock partnership service
    PartnershipService.generateInviteCode = mockAsyncCall('ABC123');
    PartnershipService.acceptInvite = mockAsyncCall({
      success: true,
      partnership: { id: 'partnership-1' },
    });

    const { getByText, getByTestId, findByText } = renderWithProviders(<App />, {
      initialState: { user: adhdUser },
    });

    // Navigate to partnership screen
    fireEvent.press(getByTestId('tab-partner'));

    // Generate invite code
    fireEvent.press(getByText('Generate Invite Code'));

    // Display invite code
    await findByText('ABC123');
    expect(getByText('Share this code with your partner')).toBeTruthy();

    // Simulate partner accepting invite
    PartnershipService.getPartnership = mockAsyncCall({
      id: 'partnership-1',
      adhdUser: adhdUser,
      partner: partner,
      status: 'active',
    });

    // Refresh to see partnership
    fireEvent.press(getByText('Refresh'));

    // Verify partnership established
    await waitFor(() => {
      expect(getByText('Support Partner')).toBeTruthy();
      expect(getByText('Partnership Active')).toBeTruthy();
    });
  });
});
```

## Tips for Writing Good Tests

1. **Test behavior, not implementation**: Focus on what users see and do
2. **Use meaningful test descriptions**: Test names should explain the scenario
3. **Keep tests independent**: Each test should be able to run in isolation
4. **Mock external dependencies**: Don't make real API calls in tests
5. **Test edge cases**: Empty states, errors, loading states
6. **Use test utilities**: Leverage the provided helpers for consistency
7. **Follow AAA pattern**: Arrange, Act, Assert
8. **Clean up after tests**: Reset mocks and clear storage

Remember: Good tests make refactoring safer and development faster!
