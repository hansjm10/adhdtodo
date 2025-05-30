// ABOUTME: Tests for TaskListScreen category filtering functionality
// Verifies that category filters work correctly and update the task list

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TaskListScreen from '../TaskListScreen';
import TaskStorageService from '../../services/TaskStorageService';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';

// Mock the storage service
jest.mock('../../services/TaskStorageService');

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const wrapper = ({ children }) => <NavigationContainer>{children}</NavigationContainer>;

describe('TaskListScreen - Category Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should display category filter with all categories', async () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByText } = render(<TaskListScreen />, { wrapper });

    // Check "All" filter
    expect(getByText('All')).toBeTruthy();

    // Check all category filters
    Object.values(TASK_CATEGORIES).forEach((category) => {
      expect(getByText(category.label)).toBeTruthy();
    });
  });

  it('should have "All" selected by default', async () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByText } = render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      const allText = getByText('All');
      // Check if the text has the active style
      expect(allText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            color: '#333',
            fontWeight: '600',
          }),
        ]),
      );
    });
  });

  it('should filter tasks by category when category is selected', async () => {
    const mockTasks = [
      { id: '1', title: 'Work Task', category: 'work', completed: false },
      { id: '2', title: 'Home Task', category: 'home', completed: false },
      { id: '3', title: 'Personal Task', category: 'personal', completed: false },
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);
    TaskStorageService.getTasksByCategory.mockImplementation((categoryId) =>
      Promise.resolve(mockTasks.filter((task) => task.category === categoryId)),
    );

    const { getByText, queryByText } = render(<TaskListScreen />, { wrapper });

    // Initially all tasks should be visible
    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
      expect(getByText('Home Task')).toBeTruthy();
      expect(getByText('Personal Task')).toBeTruthy();
    });

    // Click on Work category
    await act(async () => {
      fireEvent.press(getByText('Work'));
    });

    await waitFor(() => {
      expect(TaskStorageService.getTasksByCategory).toHaveBeenCalledWith('work');
    });

    // After filtering, only work tasks should be visible
    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
    });

    // Other tasks should not be visible
    expect(queryByText('Home Task')).toBeNull();
    expect(queryByText('Personal Task')).toBeNull();
  });

  it('should show all tasks when "All" is selected after filtering', async () => {
    const mockTasks = [
      { id: '1', title: 'Work Task', category: 'work', completed: false },
      { id: '2', title: 'Home Task', category: 'home', completed: false },
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);
    TaskStorageService.getTasksByCategory.mockImplementation((categoryId) =>
      Promise.resolve(mockTasks.filter((task) => task.category === categoryId)),
    );

    const { getByText, queryByText } = render(<TaskListScreen />, { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
    });

    // Filter by Work
    await act(async () => {
      fireEvent.press(getByText('Work'));
    });

    await waitFor(() => {
      expect(queryByText('Home Task')).toBeNull();
    });

    // Click "All" to reset filter
    await act(async () => {
      fireEvent.press(getByText('All'));
    });

    await waitFor(() => {
      expect(TaskStorageService.getAllTasks).toHaveBeenCalled();
      expect(getByText('Work Task')).toBeTruthy();
      expect(getByText('Home Task')).toBeTruthy();
    });
  });

  it('should refresh filtered tasks on pull to refresh', async () => {
    const mockTasks = [{ id: '1', title: 'Work Task', category: 'work', completed: false }];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);
    TaskStorageService.getTasksByCategory.mockResolvedValue(mockTasks);

    const { getByTestId, getByText } = render(<TaskListScreen />, { wrapper });

    // Select Work category
    fireEvent.press(getByText('Work'));

    await waitFor(() => {
      expect(TaskStorageService.getTasksByCategory).toHaveBeenCalledWith('work');
    });

    // Trigger refresh
    const flatList = getByTestId('task-list');
    const { refreshControl } = flatList.props;

    await waitFor(() => {
      refreshControl.props.onRefresh();
    });

    // Should call getTasksByCategory again with the same filter
    await waitFor(() => {
      expect(TaskStorageService.getTasksByCategory).toHaveBeenCalledTimes(2);
      expect(TaskStorageService.getTasksByCategory).toHaveBeenLastCalledWith('work');
    });
  });
});
