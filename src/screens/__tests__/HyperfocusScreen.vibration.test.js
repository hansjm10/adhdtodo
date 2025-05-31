// ABOUTME: Tests for platform-specific vibration handling in HyperfocusScreen
// Verifies that vibration is handled correctly across different platforms

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform, Vibration } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import HyperfocusScreen from '../HyperfocusScreen';
import { AppProvider } from '../../contexts/AppProvider';
import { createTask } from '../../utils/TaskModel';

// Mock dependencies
jest.mock('react-native/Libraries/Vibration/Vibration', () => ({
  vibrate: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage');

// Mock TaskStorageService
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  updateTask: jest.fn(),
}));

const TaskStorageService = require('../../services/TaskStorageService');

// Create a test navigation structure
const TestNavigator = ({ initialParams }) => {
  const Stack = require('@react-navigation/stack').createStackNavigator();

  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Hyperfocus"
            component={HyperfocusScreen}
            initialParams={initialParams}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
};

describe('HyperfocusScreen - Platform-specific Vibration', () => {
  const mockTask = createTask({
    id: 'task1',
    title: 'Test Task',
    timeSpent: 0,
  });

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
      const { getByText } = render(<TestNavigator initialParams={{ taskId: 'task1' }} />);

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
      const { getByText } = render(<TestNavigator initialParams={{ taskId: 'task1' }} />);

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
      const { getByText } = render(<TestNavigator initialParams={{ taskId: 'task1' }} />);

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
      const { getByText } = render(<TestNavigator initialParams={{ taskId: 'task1' }} />);

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

    const { getByText } = render(<TestNavigator initialParams={{ taskId: 'task1' }} />);

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
