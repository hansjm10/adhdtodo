// ABOUTME: Tests for EditTaskScreen with Expo Router
// Verifies task editing UI and functionality with dynamic routing

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EditTaskScreen from '../[id]';
import { AppProvider } from '../../../src/contexts/AppProvider';
import { createTask } from '../../../src/utils/TaskModel';
import { TASK_CATEGORIES } from '../../../src/constants/TaskConstants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

// Create a mutable mock task that we can update
let _mockRouteTask = null;

// Mock expo-router
const mockBack = jest.fn();
const mockParams = { id: 'test-task-id' };
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
  useLocalSearchParams: () => mockParams,
}));

// Mock TaskStorageService at the module level
jest.mock('../../../src/services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

// Import after mocking
const TaskStorageService = require('../../../src/services/TaskStorageService');

// Test wrapper component with contexts
const TestWrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('EditTaskScreen ([id])', () => {
  const mockTask = createTask({
    title: 'Original Task',
    description: 'Original Description',
    category: TASK_CATEGORIES.HOME.id,
    timeEstimate: 30,
    userId: 'user1',
  });
  mockTask.id = 'test-task-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockBack.mockClear();
    // Reset context caches
    require('../../../src/contexts/TaskContext')._resetCache();
    require('../../../src/contexts/NotificationContext')._resetNotifications();

    // Set the mock task for the route
    _mockRouteTask = mockTask;

    // Setup default mocks
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'currentUser') {
        return Promise.resolve(JSON.stringify({ id: 'user1', name: 'Test User' }));
      }
      return Promise.resolve(null);
    });
    AsyncStorage.setItem.mockResolvedValue(undefined);
    TaskStorageService.getAllTasks.mockResolvedValue([mockTask]);
    TaskStorageService.updateTask.mockResolvedValue(true);
  });

  it.skip('should load and display existing task data', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <TestWrapper>
        <EditTaskScreen />
      </TestWrapper>,
    );

    await waitFor(
      () => {
        expect(getByPlaceholderText('Task title')).toBeTruthy();
      },
      { timeout: 10000 },
    );

    expect(getByPlaceholderText('Task title').props.value).toBe('Original Task');
    expect(getByPlaceholderText('Task description (optional)').props.value).toBe(
      'Original Description',
    );

    const homeCategory = getByTestId(`category-${TASK_CATEGORIES.HOME.id}`);
    expect(homeCategory).toHaveStyle({ opacity: 1 });

    const preset30 = getByTestId('time-preset-30');
    expect(preset30).toHaveStyle({ opacity: 1 });
  });

  it('should update task on save', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <TestWrapper>
        <EditTaskScreen />
      </TestWrapper>,
    );

    await waitFor(
      () => {
        expect(getByPlaceholderText('Task title').props.value).toBe('Original Task');
      },
      { timeout: 10000 },
    );

    fireEvent.changeText(getByPlaceholderText('Task title'), 'Updated Task');
    fireEvent.changeText(
      getByPlaceholderText('Task description (optional)'),
      'Updated Description',
    );
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(TaskStorageService.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-task-id',
          title: 'Updated Task',
          description: 'Updated Description',
        }),
      );
      expect(mockBack).toHaveBeenCalled();
    });
  }, 15000);

  it('should have delete button', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <EditTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('delete-button')).toBeTruthy();
    });
  });

  it('should show confirmation dialog on delete press', async () => {
    // Mock Alert.alert
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByTestId } = render(
      <TestWrapper>
        <EditTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('delete-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Task',
      'Are you sure you want to delete this task?',
      expect.any(Array),
    );

    alertSpy.mockRestore();
  });

  it('should handle task not found', async () => {
    // Clear the mock task to simulate task not found
    _mockRouteTask = null;
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByText } = render(
      <TestWrapper>
        <EditTaskScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Task not found')).toBeTruthy();
    });
  });
});
