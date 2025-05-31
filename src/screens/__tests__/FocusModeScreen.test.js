// ABOUTME: Tests for FocusModeScreen - verifies mode selection and task filtering
// Tests the focus mode selection screen functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import FocusModeScreen from '../FocusModeScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { createTask } from '../../utils/TaskModel';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

// Mock TaskStorageService at the module level
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  getPendingTasks: jest.fn(),
}));

// Import after mocking
const TaskStorageService = require('../../services/TaskStorageService');

// Mock Alert
jest.spyOn(Alert, 'alert');

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

describe('FocusModeScreen', () => {
  const mockTasks = [
    { ...createTask({ title: 'Long Task', timeEstimate: 60, userId: 'user1' }), id: '1' },
    { ...createTask({ title: 'Medium Task', timeEstimate: 30, userId: 'user1' }), id: '2' },
    { ...createTask({ title: 'Quick Task 1', timeEstimate: 5, userId: 'user1' }), id: '3' },
    { ...createTask({ title: 'Quick Task 2', timeEstimate: 15, userId: 'user1' }), id: '4' },
    { ...createTask({ title: 'No Estimate Task', userId: 'user1' }), id: '5' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
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

    // Set up tasks that aren't completed
    const pendingTasks = mockTasks.map((task) => ({ ...task, isComplete: false }));
    TaskStorageService.getAllTasks.mockResolvedValue(pendingTasks);
    TaskStorageService.getPendingTasks.mockResolvedValue(pendingTasks);
  });

  it('should display both focus modes', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Hyperfocus Mode')).toBeTruthy();
      expect(getByText('Scattered Mode')).toBeTruthy();
    });
  });

  it('should show hyperfocus mode features', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Deep focus on a single task with timed sessions and breaks')).toBeTruthy();
      expect(getByText('• 25-minute sessions')).toBeTruthy();
      expect(getByText('• Built-in breaks')).toBeTruthy();
      expect(getByText('• Distraction-free')).toBeTruthy();
    });
  });

  it('should show scattered mode features', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Quick task switching for high-energy, low-focus times')).toBeTruthy();
      expect(getByText('• 5-15 minute tasks')).toBeTruthy();
      expect(getByText('• Rapid switching')).toBeTruthy();
      expect(getByText('• Momentum building')).toBeTruthy();
    });
  });

  it('should select hyperfocus mode when tapped', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    expect(getByText('Select a Task to Focus On')).toBeTruthy();
  });

  it('should show all tasks when hyperfocus mode is selected', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    await waitFor(() => {
      expect(getByText('Long Task')).toBeTruthy();
      expect(getByText('Medium Task')).toBeTruthy();
      expect(getByText('Quick Task 1')).toBeTruthy();
      expect(getByText('No Estimate Task')).toBeTruthy();
    });
  });

  it('should show only quick tasks when scattered mode is selected', async () => {
    const { getByText, queryByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Scattered Mode'));
    });

    await waitFor(() => {
      expect(getByText('Quick Tasks Available (2)')).toBeTruthy();
      expect(getByText('Quick Task 1')).toBeTruthy();
      expect(getByText('Quick Task 2')).toBeTruthy();
      // Long tasks should not be shown
      expect(queryByText('Long Task')).toBeNull();
      expect(queryByText('Medium Task')).toBeNull();
    });
  });

  it('should select a task when tapped', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    // Wait for the component to render
    await waitFor(() => {
      expect(getByText('Hyperfocus Mode')).toBeTruthy();
    });

    // Select hyperfocus mode
    fireEvent.press(getByText('Hyperfocus Mode'));

    // Wait for tasks to be displayed
    await waitFor(() => {
      expect(getByText('Long Task')).toBeTruthy();
    });

    // Select a task
    fireEvent.press(getByText('Long Task'));

    // Task should be selected, button should work without alert
    fireEvent.press(getByText('Start Hyperfocus Mode'));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should not navigate when no task is selected', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    // Wait for the component to render
    await waitFor(() => {
      expect(getByText('Hyperfocus Mode')).toBeTruthy();
    });

    // Select hyperfocus mode
    fireEvent.press(getByText('Hyperfocus Mode'));

    // Wait for button to be visible
    await waitFor(() => {
      expect(getByText('Start Hyperfocus Mode')).toBeTruthy();
    });

    // Try to press the button without selecting a task
    const startButton = getByText('Start Hyperfocus Mode');
    fireEvent.press(startButton);

    // Navigation should not have been called since no task was selected
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate to Hyperfocus screen when starting hyperfocus mode', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    // Wait for the component to render
    await waitFor(() => {
      expect(getByText('Hyperfocus Mode')).toBeTruthy();
    });

    // Select hyperfocus mode
    fireEvent.press(getByText('Hyperfocus Mode'));

    // Wait for tasks to be displayed
    await waitFor(() => {
      expect(getByText('Long Task')).toBeTruthy();
    });

    // Select a task
    fireEvent.press(getByText('Long Task'));

    // Start hyperfocus mode
    fireEvent.press(getByText('Start Hyperfocus Mode'));

    expect(mockNavigate).toHaveBeenCalledWith('Hyperfocus', { taskId: expect.any(String) });
  });

  it('should display time estimates correctly', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    // Wait for the component to render
    await waitFor(() => {
      expect(getByText('Hyperfocus Mode')).toBeTruthy();
    });

    // Select hyperfocus mode
    fireEvent.press(getByText('Hyperfocus Mode'));

    // Wait for time estimates to be displayed
    await waitFor(() => {
      expect(getByText('60 min')).toBeTruthy();
      expect(getByText('30 min')).toBeTruthy();
      expect(getByText('5 min')).toBeTruthy();
      expect(getByText('No estimate')).toBeTruthy();
    });
  });

  it('should show empty state when no tasks available', async () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);
    TaskStorageService.getPendingTasks.mockResolvedValue([]);

    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    expect(getByText('No tasks available')).toBeTruthy();
  });

  it('should show empty state when no quick tasks available for scattered mode', async () => {
    const longTask = createTask({ id: '1', title: 'Long Task', timeEstimate: 60, userId: 'user1' });
    TaskStorageService.getAllTasks.mockResolvedValue([longTask]);
    TaskStorageService.getPendingTasks.mockResolvedValue([longTask]);

    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Scattered Mode'));
    });

    expect(getByText('No quick tasks (≤15 min) available')).toBeTruthy();
  });
});
