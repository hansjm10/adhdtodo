// ABOUTME: Tests for EditTaskScreen component
// Verifies task editing UI and functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EditTaskScreen from '../EditTaskScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { createTask } from '../../utils/TaskModel';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
// Create a mutable mock task that we can update
let mockRouteTask = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      task: mockRouteTask,
    },
  }),
}));

// Mock TaskStorageService at the module level
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

// Import after mocking
const TaskStorageService = require('../../services/TaskStorageService');

// Test wrapper component with contexts
const TestWrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('EditTaskScreen', () => {
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
    // Reset context caches
    require('../../contexts/TaskContext')._resetCache();
    require('../../contexts/NotificationContext')._resetNotifications();

    // Set the mock task for the route
    mockRouteTask = mockTask;

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
    const mockGoBack = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      goBack: mockGoBack,
    });

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
      expect(mockGoBack).toHaveBeenCalled();
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
    mockRouteTask = null;
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
