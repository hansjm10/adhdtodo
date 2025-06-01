// ABOUTME: Tests for platform-specific vibration handling in HyperfocusScreen
// Verifies that vibration is handled correctly across different platforms

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform, Vibration } from 'react-native';
import HyperfocusScreen from '../hyperfocus';
import { AppProvider } from '../../../src/contexts/AppProvider';
import { createTask } from '../../../src/utils/TaskModel';

// Mock dependencies
jest.mock('react-native/Libraries/Vibration/Vibration', () => ({
  vibrate: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage');

// Mock TaskStorageService
jest.mock('../../../src/services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  updateTask: jest.fn(),
}));

const TaskStorageService = require('../../../src/services/TaskStorageService');

// Mock expo-router
const mockParams = { taskId: 'task1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
}));

// Test wrapper component with contexts
const TestWrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('HyperfocusScreen - Platform-specific Vibration', () => {
  const mockTask = {
    ...createTask({
      title: 'Test Task',
      timeSpent: 0,
      userId: 'user1',
    }),
    id: 'task1',
    isComplete: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default mocks
    TaskStorageService.getAllTasks.mockResolvedValue([mockTask]);
    TaskStorageService.updateTask.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('should vibrate with pattern on Android when timer completes', async () => {
      const { getByText } = render(
        <TestWrapper>
          <HyperfocusScreen />
        </TestWrapper>,
      );

      // Start the timer
      await waitFor(() => {
        fireEvent.press(getByText('Start'));
      });

      // Fast forward to timer completion (25 minutes)
      jest.advanceTimersByTime(25 * 60 * 1000);

      await waitFor(() => {
        expect(Vibration.vibrate).toHaveBeenCalledWith(100);
      });
    });

    it('should handle vibration pattern correctly on Android', async () => {
      const { getByText } = render(
        <TestWrapper>
          <HyperfocusScreen />
        </TestWrapper>,
      );

      // Start the timer
      await waitFor(() => {
        fireEvent.press(getByText('Start'));
      });

      // Fast forward to timer completion
      jest.advanceTimersByTime(25 * 60 * 1000);

      await waitFor(() => {
        expect(Vibration.vibrate).toHaveBeenCalledWith(100);
        expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('should use simple vibration on iOS when timer completes', async () => {
      const { getByText } = render(
        <TestWrapper>
          <HyperfocusScreen />
        </TestWrapper>,
      );

      // Start the timer
      await waitFor(() => {
        fireEvent.press(getByText('Start'));
      });

      // Fast forward to timer completion
      jest.advanceTimersByTime(25 * 60 * 1000);

      await waitFor(() => {
        // iOS should use simple vibration without duration
        expect(Vibration.vibrate).toHaveBeenCalledWith();
      });
    });
  });

  describe('Web Platform', () => {
    beforeEach(() => {
      Platform.OS = 'web';
    });

    it('should not attempt vibration on web platform', async () => {
      const { getByText } = render(
        <TestWrapper>
          <HyperfocusScreen />
        </TestWrapper>,
      );

      // Start the timer
      await waitFor(() => {
        fireEvent.press(getByText('Start'));
      });

      // Fast forward to timer completion
      jest.advanceTimersByTime(25 * 60 * 1000);

      await waitFor(() => {
        // Web platform should not vibrate
        expect(Vibration.vibrate).not.toHaveBeenCalled();
      });
    });
  });

  it('should handle missing Vibration API gracefully', async () => {
    // Temporarily remove vibrate function
    const originalVibrate = Vibration.vibrate;
    Vibration.vibrate = undefined;

    const { getByText } = render(
      <TestWrapper>
        <HyperfocusScreen />
      </TestWrapper>,
    );

    // Start the timer
    await waitFor(() => {
      fireEvent.press(getByText('Start'));
    });

    // Fast forward to timer completion
    jest.advanceTimersByTime(25 * 60 * 1000);

    // Should not throw error
    await waitFor(() => {
      expect(getByText('Great Work!')).toBeTruthy();
    });

    // Restore vibrate function
    Vibration.vibrate = originalVibrate;
  });
});
