// ABOUTME: Tests for FocusModeScreen - verifies mode selection and task filtering
// Tests the focus mode selection screen functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import FocusModeScreen from '../FocusModeScreen';
import TaskStorageService from '../../services/TaskStorageService';
import { createTask } from '../../utils/TaskModel';

// Mock dependencies
jest.mock('../../services/TaskStorageService');

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

const wrapper = ({ children }) => <NavigationContainer>{children}</NavigationContainer>;

describe('FocusModeScreen', () => {
  const mockTasks = [
    { ...createTask({ title: 'Long Task', timeEstimate: 60 }), id: '1' },
    { ...createTask({ title: 'Medium Task', timeEstimate: 30 }), id: '2' },
    { ...createTask({ title: 'Quick Task 1', timeEstimate: 5 }), id: '3' },
    { ...createTask({ title: 'Quick Task 2', timeEstimate: 15 }), id: '4' },
    { ...createTask({ title: 'No Estimate Task' }), id: '5' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    TaskStorageService.getPendingTasks.mockResolvedValue(mockTasks);
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

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    await waitFor(() => {
      fireEvent.press(getByText('Long Task'));
    });

    // Task should be selected, button should work without alert
    fireEvent.press(getByText('Start Hyperfocus Mode'));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should not navigate when no task is selected', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    // Try to press the button without selecting a task
    const startButton = getByText('Start Hyperfocus Mode');
    fireEvent.press(startButton);

    // Navigation should not have been called since no task was selected
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate to Hyperfocus screen when starting hyperfocus mode', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    await waitFor(() => {
      fireEvent.press(getByText('Long Task'));
    });

    fireEvent.press(getByText('Start Hyperfocus Mode'));

    expect(mockNavigate).toHaveBeenCalledWith('Hyperfocus', { taskId: expect.any(String) });
  });

  it('should display time estimates correctly', async () => {
    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    await waitFor(() => {
      expect(getByText('60 min')).toBeTruthy();
      expect(getByText('30 min')).toBeTruthy();
      expect(getByText('5 min')).toBeTruthy();
      expect(getByText('No estimate')).toBeTruthy();
    });
  });

  it('should show empty state when no tasks available', async () => {
    TaskStorageService.getPendingTasks.mockResolvedValue([]);

    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Hyperfocus Mode'));
    });

    expect(getByText('No tasks available')).toBeTruthy();
  });

  it('should show empty state when no quick tasks available for scattered mode', async () => {
    TaskStorageService.getPendingTasks.mockResolvedValue([
      createTask({ id: '1', title: 'Long Task', timeEstimate: 60 }),
    ]);

    const { getByText } = render(<FocusModeScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Scattered Mode'));
    });

    expect(getByText('No quick tasks (≤15 min) available')).toBeTruthy();
  });
});
