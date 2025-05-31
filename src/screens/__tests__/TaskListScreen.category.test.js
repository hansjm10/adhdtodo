// ABOUTME: Tests for TaskListScreen category filtering functionality
// Verifies that category filters work correctly and update the task list

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TaskListScreen from '../TaskListScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

// Mock TaskStorageService at the module level
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

// Import after mocking
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

describe('TaskListScreen - Category Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    // Reset context caches
    require('../../contexts/TaskContext')._resetCache();
    require('../../contexts/NotificationContext')._resetNotifications();

    // Setup default mocks
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'currentUser') {
        return Promise.resolve(JSON.stringify({ id: 'user1', name: 'Test User' }));
      }
      return Promise.resolve(null);
    });
    AsyncStorage.setItem.mockResolvedValue(undefined);
    TaskStorageService.getAllTasks.mockResolvedValue([]);
  });

  it('should display category filter with all categories', async () => {
    const { getByText } = render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      // Check "All Tasks" filter
      expect(getByText('All Tasks')).toBeTruthy();
    });

    // Check all category filters
    Object.values(TASK_CATEGORIES).forEach((category) => {
      expect(getByText(category.label)).toBeTruthy();
    });
  });

  it('should have "All Tasks" selected by default', async () => {
    const { getByText } = render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      const allText = getByText('All Tasks');
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
      { id: '1', title: 'Work Task', category: 'work', completed: false, userId: 'user1' },
      { id: '2', title: 'Home Task', category: 'home', completed: false, userId: 'user1' },
      { id: '3', title: 'Personal Task', category: 'personal', completed: false, userId: 'user1' },
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

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

    // After filtering, only work tasks should be visible
    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
      // Other tasks should not be visible
      expect(queryByText('Home Task')).toBeNull();
      expect(queryByText('Personal Task')).toBeNull();
    });
  });

  it('should show all tasks when "All Tasks" is selected after filtering', async () => {
    const mockTasks = [
      { id: '1', title: 'Work Task', category: 'work', completed: false, userId: 'user1' },
      { id: '2', title: 'Home Task', category: 'home', completed: false, userId: 'user1' },
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

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

    // Click "All Tasks" to reset filter
    await act(async () => {
      fireEvent.press(getByText('All Tasks'));
    });

    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
      expect(getByText('Home Task')).toBeTruthy();
    });
  });

  it('should refresh filtered tasks on pull to refresh', async () => {
    const mockTasks = [
      { id: '1', title: 'Work Task', category: 'work', completed: false, userId: 'user1' },
    ];

    TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

    const { getByTestId, getByText } = render(<TaskListScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
    });

    // Select Work category
    fireEvent.press(getByText('Work'));

    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
    });

    // Trigger refresh
    const flatList = getByTestId('task-list');
    const { refreshControl } = flatList.props;

    await act(async () => {
      refreshControl.props.onRefresh();
    });

    // Should still show work tasks after refresh
    await waitFor(() => {
      expect(getByText('Work Task')).toBeTruthy();
    });
  });
});
