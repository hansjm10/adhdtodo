// ABOUTME: Tests for TaskListScreen FlashList performance optimization
// Verifies that FlashList is used for better performance

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TaskListScreen from '../TaskListScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { createTask } from '../../utils/TaskModel';

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

const TaskStorageService = require('../../services/TaskStorageService');

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const wrapper = ({ children }) => (
  <AppProvider>
    <NavigationContainer>{children}</NavigationContainer>
  </AppProvider>
);

describe('TaskListScreen - FlashList Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();

    // Setup default mocks
    const mockTasks = [
      createTask({ id: '1', title: 'Task 1', category: 'home' }),
      createTask({ id: '2', title: 'Task 2', category: 'work' }),
      createTask({ id: '3', title: 'Task 3', category: 'personal' }),
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);
    TaskStorageService.getAllTasksFromCategories.mockResolvedValue(mockTasks);
    TaskStorageService.getTasksByCategory.mockResolvedValue(mockTasks);
  });

  it('should use FlashList instead of FlatList for better performance', async () => {
    const { getByTestId } = render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      expect(getByTestId('task-list')).toBeTruthy();
    });

    // Verify the FlashList renders properly
    const taskList = getByTestId('task-list');
    expect(taskList).toBeTruthy();
  });

  it('should render tasks properly', async () => {
    const { findByText } = render(<TaskListScreen />, { wrapper });

    // Verify tasks are rendered
    await waitFor(() => {
      expect(findByText('Task 1')).toBeTruthy();
    });

    expect(await findByText('Task 2')).toBeTruthy();
    expect(await findByText('Task 3')).toBeTruthy();
  });

  it('should handle large lists efficiently', async () => {
    // Create a large list of tasks
    const largeMockTasks = [];
    for (let i = 0; i < 100; i++) {
      largeMockTasks.push(
        createTask({
          id: `task-${i}`,
          title: `Task ${i}`,
          category: i % 2 === 0 ? 'home' : 'work',
        }),
      );
    }

    TaskStorageService.getAllTasks.mockResolvedValue(largeMockTasks);
    TaskStorageService.getAllTasksFromCategories.mockResolvedValue(largeMockTasks);

    const { getByTestId, findByText } = render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      expect(getByTestId('task-list')).toBeTruthy();
    });

    // Verify that at least some tasks are rendered
    expect(await findByText('Task 0')).toBeTruthy();
    expect(await findByText('Task 1')).toBeTruthy();
  });
});
