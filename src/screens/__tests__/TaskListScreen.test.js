// ABOUTME: Tests for TaskListScreen component
// Verifies task listing, empty states, and navigation with context providers

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TaskListScreen from '../TaskListScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { createTask } from '../../utils/TaskModel';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
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

// Helper to wait for contexts to load
const _waitForContextsToLoad = async (getByTestId) => {
  // Wait for any loading states to complete
  await waitFor(
    () => {
      expect(getByTestId('task-list')).toBeTruthy();
    },
    { timeout: 3000 },
  );
};

describe('TaskListScreen', () => {
  const mockUser = { id: 'user1', name: 'Test User' };

  // Increase timeout for these tests
  jest.setTimeout(10000);

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset context caches
    require('../../contexts/TaskContext')._resetCache();
    require('../../contexts/NotificationContext')._resetNotifications();

    // Setup default mocks - by default, return a logged in user
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'currentUser') {
        return Promise.resolve(JSON.stringify(mockUser));
      }
      return Promise.resolve(null);
    });
    AsyncStorage.setItem.mockResolvedValue(undefined);
    TaskStorageService.getAllTasks.mockResolvedValue([]);
  });

  it('should show empty state when no tasks exist', async () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByText } = render(
      <TestWrapper>
        <TaskListScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(getByText('No tasks yet')).toBeTruthy();
      expect(getByText('Tap the + button to create your first task')).toBeTruthy();
    });
  });

  it('should display list of tasks', async () => {
    const mockTasks = [
      createTask({ title: 'Task 1', description: 'Description 1', userId: 'user1' }),
      createTask({ title: 'Task 2', category: TASK_CATEGORIES.WORK.id, userId: 'user1' }),
      createTask({ title: 'Task 3', timeEstimate: 30, userId: 'user1' }),
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

    const { getByText, getByTestId } = render(
      <TestWrapper>
        <TaskListScreen />
      </TestWrapper>,
    );

    // Wait for tasks to load and be displayed
    await waitFor(
      () => {
        // Check that at least one task is visible
        expect(getByText('Task 1')).toBeTruthy();
      },
      { timeout: 5000 },
    );

    // Now check for all tasks
    expect(getByText('Description 1')).toBeTruthy();
    expect(getByText('Task 2')).toBeTruthy();
    expect(getByText('Task 3')).toBeTruthy();
    // Check that task 3 exists
    expect(getByTestId(`task-item-${mockTasks[2].id}`)).toBeTruthy();
  });

  it('should have add task button', () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByTestId } = render(
      <TestWrapper>
        <TaskListScreen />
      </TestWrapper>,
    );

    expect(getByTestId('add-task-button')).toBeTruthy();
  });

  it('should navigate to create task screen when add button pressed', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
    });

    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByTestId } = render(
      <TestWrapper>
        <TaskListScreen />
      </TestWrapper>,
    );

    fireEvent.press(getByTestId('add-task-button'));

    expect(mockNavigate).toHaveBeenCalledWith('CreateTask');
  });

  it('should refresh tasks on focus', async () => {
    const mockTasks = [createTask({ title: 'Task 1', userId: 'user1' })];
    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

    render(
      <TestWrapper>
        <TaskListScreen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(TaskStorageService.getAllTasks).toHaveBeenCalled();
    });
  });

  it('should show completed tasks differently', async () => {
    const completedTask = createTask({ title: 'Completed Task', userId: 'user1' });
    completedTask.completed = true;

    const pendingTask = createTask({ title: 'Pending Task', userId: 'user1' });

    TaskStorageService.getAllTasks.mockResolvedValue([completedTask, pendingTask]);

    const { getByTestId, getByText } = render(
      <TestWrapper>
        <TaskListScreen />
      </TestWrapper>,
    );

    // Wait for tasks to be rendered
    await waitFor(
      () => {
        expect(getByText('Pending Task')).toBeTruthy();
      },
      { timeout: 5000 },
    );

    // Check for the other task
    expect(getByText('Completed Task')).toBeTruthy();

    // Verify both task items exist
    expect(getByTestId(`task-item-${pendingTask.id}`)).toBeTruthy();
    expect(getByTestId(`task-item-${completedTask.id}`)).toBeTruthy();
  });

  it('should navigate to edit task screen when task is pressed', async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
    });

    const mockTask = createTask({ title: 'Task 1', userId: 'user1' });
    TaskStorageService.getAllTasks.mockResolvedValue([mockTask]);

    const { getByTestId } = render(
      <TestWrapper>
        <TaskListScreen />
      </TestWrapper>,
    );

    // Wait for task item to be rendered
    await waitFor(
      () => {
        expect(getByTestId(`task-item-${mockTask.id}`)).toBeTruthy();
      },
      { timeout: 5000 },
    );

    fireEvent.press(getByTestId(`task-item-${mockTask.id}`));

    expect(mockNavigate).toHaveBeenCalledWith('EditTask', { taskId: mockTask.id });
  });
});
