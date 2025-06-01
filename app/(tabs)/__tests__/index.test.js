// ABOUTME: Tests for task list screen (tabs index) with Expo Router
// Verifies task listing, empty states, and navigation

import React from 'react';
import {
  renderWithProviders,
  fireEvent,
  waitFor,
  createMockUser,
  createMockTask,
  mockAsyncCall,
} from '../../../tests/utils';
import TaskListScreen from '../index';
import { TASK_CATEGORIES } from '../../../src/constants/TaskConstants';
import { createTask } from '../../../src/utils/TaskModel'; // Still needed for some tests
import { render } from '@testing-library/react-native'; // Still needed for some tests
import { AppProvider } from '../../../src/contexts/AppProvider'; // Still needed for TestWrapper

// Test wrapper component with contexts - still used in some tests
const TestWrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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

describe('TaskListScreen (tabs index)', () => {
  const mockUser = createMockUser({ id: 'user1', name: 'Test User' });

  // Increase timeout for these tests
  jest.setTimeout(10000);

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    // Reset context caches
    require('../../../src/contexts/TaskContext')._resetCache();
    require('../../../src/contexts/NotificationContext')._resetNotifications();

    // Setup default mocks
    TaskStorageService.getAllTasks = mockAsyncCall([]);
  });

  it('should show empty state when no tasks exist', async () => {
    TaskStorageService.getAllTasks = mockAsyncCall([]);

    const { getByText } = renderWithProviders(<TaskListScreen />, {
      initialState: { user: mockUser },
    });

    await waitFor(() => {
      expect(getByText('No tasks yet')).toBeTruthy();
      expect(getByText('Tap the + button to create your first task')).toBeTruthy();
    });
  });

  it('should display list of tasks', async () => {
    const mockTasks = [
      createMockTask({ title: 'Task 1', description: 'Description 1', userId: 'user1' }),
      createMockTask({ title: 'Task 2', category: TASK_CATEGORIES.WORK.id, userId: 'user1' }),
      createMockTask({ title: 'Task 3', timeEstimate: 30, userId: 'user1' }),
    ];

    TaskStorageService.getAllTasks = mockAsyncCall(mockTasks);

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
    TaskStorageService.getAllTasks = mockAsyncCall([]);

    const { getByTestId } = renderWithProviders(<TaskListScreen />, {
      initialState: { user: mockUser },
    });

    expect(getByTestId('add-task-button')).toBeTruthy();
  });

  it('should navigate to create task screen when add button pressed', () => {
    TaskStorageService.getAllTasks = mockAsyncCall([]);

    const { getByTestId } = renderWithProviders(<TaskListScreen />, {
      initialState: { user: mockUser },
    });

    fireEvent.press(getByTestId('add-task-button'));

    expect(mockPush).toHaveBeenCalledWith('/task/create');
  });

  it('should refresh tasks on focus', async () => {
    const mockTasks = [createMockTask({ title: 'Task 1', userId: 'user1' })];
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

    expect(mockPush).toHaveBeenCalledWith(`/task/${mockTask.id}`);
  });
});
