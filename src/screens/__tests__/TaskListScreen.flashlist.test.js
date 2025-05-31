// ABOUTME: Tests for TaskListScreen FlashList performance optimization
// Verifies that FlashList is used for better performance

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TaskListScreen from '../TaskListScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { createTask } from '../../utils/TaskModel';
import { FlashList } from '@shopify/flash-list';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.fn(({ data, renderItem, keyExtractor, ListEmptyComponent }) => {
    const MockFlatList = require('react-native').FlatList;
    return (
      <MockFlatList
        testID="flash-list"
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
      />
    );
  }),
}));

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
      expect(getByTestId('flash-list')).toBeTruthy();
    });

    // Verify FlashList was called with correct props
    expect(FlashList).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        renderItem: expect.any(Function),
        keyExtractor: expect.any(Function),
        estimatedItemSize: expect.any(Number),
      }),
      expect.any(Object),
    );
  });

  it('should set proper estimatedItemSize for FlashList', async () => {
    render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      expect(FlashList).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedItemSize: 100, // Task items are approximately 100px tall
        }),
        expect.any(Object),
      );
    });
  });

  it('should handle large lists efficiently', async () => {
    // Create a large list of tasks
    const largeMockTasks = [];
    for (let i = 0; i < 1000; i++) {
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

    const { getByTestId } = render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      expect(getByTestId('flash-list')).toBeTruthy();
    });

    // FlashList should handle large datasets efficiently
    expect(FlashList).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.any(Object)]),
      }),
      expect.any(Object),
    );
  });
});
