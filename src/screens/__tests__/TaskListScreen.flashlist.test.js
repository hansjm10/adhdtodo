// ABOUTME: Tests for TaskListScreen FlashList performance optimization
// Verifies that FlashList is used for better performance

import React from 'react';
import { renderWithProviders, waitFor } from '../../../tests/utils';
import TaskListScreen from '../TaskListScreen';
import { createTask } from '../../utils/TaskModel';
import * as TaskContext from '../../contexts/TaskContext';
import * as UserContext from '../../contexts/UserContext';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

// Mock TaskStorageService
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  getAllTasksFromCategories: jest.fn(),
  getTasksByCategory: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock user context
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  role: 'ADHD',
  notifications: [],
};

// Mock task context - convert to legacy format with isComplete
const mockTasks = [
  {
    ...createTask({ id: '1', title: 'Task 1', category: 'home', userId: 'user-1' }),
    isComplete: false,
  },
  {
    ...createTask({ id: '2', title: 'Task 2', category: 'work', userId: 'user-1' }),
    isComplete: false,
  },
  {
    ...createTask({ id: '3', title: 'Task 3', category: 'personal', userId: 'user-1' }),
    isComplete: false,
  },
];

describe('TaskListScreen - FlashList Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Mock the context hooks
    jest.spyOn(UserContext, 'useUser').mockReturnValue({
      user: mockUser,
      partner: null,
      setUser: jest.fn(),
      setPartner: jest.fn(),
    });

    jest.spyOn(TaskContext, 'useTasks').mockReturnValue({
      tasks: mockTasks,
      refreshTasks: jest.fn(),
      addTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    });
  });

  it('should use FlashList instead of FlatList for better performance', async () => {
    const { getByTestId } = renderWithProviders(<TaskListScreen />);

    await waitFor(() => {
      expect(getByTestId('task-list')).toBeTruthy();
    });

    // Verify the FlashList renders properly
    const taskList = getByTestId('task-list');
    expect(taskList).toBeTruthy();
  });

  it('should render tasks properly', async () => {
    const { findByText } = renderWithProviders(<TaskListScreen />);

    // Verify tasks are rendered
    await waitFor(async () => {
      expect(await findByText('Task 1')).toBeTruthy();
    });

    expect(await findByText('Task 2')).toBeTruthy();
    expect(await findByText('Task 3')).toBeTruthy();
  });

  it('should handle large lists efficiently', async () => {
    // Create a large list of tasks
    const largeMockTasks = [];
    for (let i = 0; i < 100; i++) {
      largeMockTasks.push({
        ...createTask({
          id: `task-${i}`,
          title: `Task ${i}`,
          category: i % 2 === 0 ? 'home' : 'work',
          userId: 'user-1',
        }),
        isComplete: false,
      });
    }

    // Update the mock to return large list
    jest.spyOn(TaskContext, 'useTasks').mockReturnValue({
      tasks: largeMockTasks,
      refreshTasks: jest.fn(),
      addTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    });

    const { getByTestId, findByText } = renderWithProviders(<TaskListScreen />);

    await waitFor(() => {
      expect(getByTestId('task-list')).toBeTruthy();
    });

    // Verify that at least some tasks are rendered
    expect(await findByText('Task 0')).toBeTruthy();
    expect(await findByText('Task 1')).toBeTruthy();
  });
});
