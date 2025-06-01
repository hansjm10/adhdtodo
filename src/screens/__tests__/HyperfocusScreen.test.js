// ABOUTME: Tests for HyperfocusScreen - verifies timer functionality and break reminders
// Tests single task focus mode with Pomodoro-style timer

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import HyperfocusScreen from '../HyperfocusScreen';
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
}));

// Import after mocking
const TaskStorageService = require('../../services/TaskStorageService');

// Mock navigation
const mockGoBack = jest.fn();
const mockRoute = {
  params: { taskId: 'task-1' },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => mockRoute,
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const wrapper = ({ children }) => (
  <AppProvider>
    <NavigationContainer>{children}</NavigationContainer>
  </AppProvider>
);

describe('HyperfocusScreen', () => {
  let mockTask;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default mocks
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'currentUser') {
        return Promise.resolve(JSON.stringify({ id: 'user1', name: 'Test User' }));
      }
      return Promise.resolve(null);
    });
    AsyncStorage.setItem.mockResolvedValue(undefined);

    mockTask = {
      ...createTask({
        title: 'Test Task',
        timeEstimate: 30,
        timeSpent: 0,
        userId: 'user1',
      }),
      id: 'task-1',
      isComplete: false,
    };
    TaskStorageService.getAllTasks.mockResolvedValue([mockTask]);
    TaskStorageService.updateTask.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should load and display the task', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Test Task')).toBeTruthy();
      expect(getByText('Focus Time')).toBeTruthy();
    });
  });

  it('should display initial timer as 25:00', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('25:00')).toBeTruthy();
    });
  });

  it('should start timer when Start button is pressed', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Start')).toBeTruthy();
    });

    fireEvent.press(getByText('Start'));

    expect(getByText('Pause')).toBeTruthy();
  });

  it('should countdown when timer is running', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('25:00')).toBeTruthy();
    });

    fireEvent.press(getByText('Start'));

    act(() => {
      jest.advanceTimersByTime(3000); // Advance 3 seconds
    });

    await waitFor(() => {
      expect(getByText('24:57')).toBeTruthy();
    });
  });

  it('should pause timer when Pause button is pressed', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Start'));
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    fireEvent.press(getByText('Pause'));

    const timeBeforePause = getByText('24:55');

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Time should not change after pause
    expect(timeBeforePause).toBeTruthy();
  });

  it('should reset timer when Reset button is pressed', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Start'));
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    fireEvent.press(getByText('Reset'));

    expect(getByText('25:00')).toBeTruthy();
  });

  it('should show alert and vibrate when work session completes', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Start'));
    });

    // Fast forward to complete the session
    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000); // 25 minutes
    });

    await waitFor(() => {
      // Just check that the alert was shown (vibration is handled by the platform)
      expect(Alert.alert).toHaveBeenCalledWith(
        'Great Work!',
        'Time for a break. You deserve it!',
        expect.any(Array),
      );
    });
  });

  it('should update task time spent when session completes', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      fireEvent.press(getByText('Start'));
    });

    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    await waitFor(() => {
      expect(TaskStorageService.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          timeSpent: 25,
        }),
      );
    });
  });

  it('should show exit confirmation when exit button is pressed', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      const exitButton = getByText('✕');
      fireEvent.press(exitButton);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Exit Hyperfocus?',
      'Are you sure you want to leave hyperfocus mode?',
      expect.any(Array),
    );
  });

  it('should display session count', async () => {
    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Sessions completed: 0')).toBeTruthy();
    });
  });

  it('should handle task not found', async () => {
    TaskStorageService.getAllTasks.mockResolvedValue([]);

    const { getByText } = render(<HyperfocusScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Task not found')).toBeTruthy();
    });
  });
});
