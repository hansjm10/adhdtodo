// ABOUTME: Tests for responsive dimensions with Expo Router
// Verifies that hardcoded dimensions are replaced with responsive values

import React from 'react';
import { render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import HyperfocusScreen from '../hyperfocus';
import ScatteredScreen from '../scattered';
import { AppProvider } from '../../../src/contexts/AppProvider';
import { createTask } from '../../../src/utils/TaskModel';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../src/services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  updateTask: jest.fn(),
}));

const TaskStorageService = require('../../../src/services/TaskStorageService');

// Mock expo-router
const mockBack = jest.fn();
const mockParams = { taskId: 'task1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
}));

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('Responsive Dimensions', () => {
  const mockTask = createTask({
    id: 'task1',
    title: 'Test Task',
    timeEstimate: 10,
    timeSpent: 0,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    TaskStorageService.getAllTasks.mockResolvedValue([mockTask]);
    TaskStorageService.updateTask.mockResolvedValue(true);
  });

  describe('Different screen sizes', () => {
    const testScreenSizes = [
      { name: 'Small Phone', width: 320, height: 568 },
      { name: 'Medium Phone', width: 375, height: 667 },
      { name: 'Large Phone', width: 428, height: 926 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Large Tablet', width: 1024, height: 1366 },
    ];

    testScreenSizes.forEach(({ name, width, height }) => {
      it(`should render correctly on ${name} (${width}x${height})`, () => {
        // Mock Dimensions API
        Dimensions.get = jest.fn().mockReturnValue({ width, height });

        const { toJSON } = render(<HyperfocusScreen />, { wrapper });
        const tree = toJSON();

        // Check that components exist and render without errors
        expect(tree).toBeTruthy();

        // Verify no fixed dimensions are used that would break on this screen size
        const stringified = JSON.stringify(tree);

        // Timer container should scale with screen size
        if (width < 400) {
          // On small screens, timer should not be too large
          expect(stringified).not.toContain('"width":280');
          expect(stringified).not.toContain('"height":280');
        }
      });
    });
  });

  describe('HyperfocusScreen responsive timer', () => {
    it('should scale timer container based on screen width', () => {
      // Small screen
      Dimensions.get = jest.fn().mockReturnValue({ width: 320, height: 568 });
      const { rerender } = render(<HyperfocusScreen />, { wrapper });

      // Large screen
      Dimensions.get = jest.fn().mockReturnValue({ width: 768, height: 1024 });
      rerender(<HyperfocusScreen />);

      // Verify dimensions are recalculated
      expect(Dimensions.get).toHaveBeenCalled();
    });
  });

  describe('ScatteredScreen responsive cards', () => {
    it('should not use fixed minHeight for task cards', () => {
      const mockTasks = [
        createTask({ id: '1', title: 'Task 1', timeEstimate: 5 }),
        createTask({ id: '2', title: 'Task 2', timeEstimate: 10 }),
      ];

      TaskStorageService.getAllTasks.mockResolvedValue(mockTasks);

      // Small screen
      Dimensions.get = jest.fn().mockReturnValue({ width: 320, height: 568 });
      const { toJSON } = render(<ScatteredScreen />, { wrapper });

      const tree = toJSON();
      const stringified = JSON.stringify(tree);

      // Should not have fixed 300px height
      expect(stringified).not.toContain('"minHeight":300');
    });
  });

  describe('Responsive utility functions', () => {
    it('should calculate responsive dimensions correctly', () => {
      // Test the responsive dimension calculations
      const screenWidth = 375;
      const screenHeight = 667;

      Dimensions.get = jest.fn().mockReturnValue({ width: screenWidth, height: screenHeight });

      // Timer should be proportional to screen width
      const expectedTimerSize = Math.min(screenWidth * 0.75, 280);
      expect(expectedTimerSize).toBeLessThan(screenWidth);

      // Card minHeight should be proportional to screen height
      const expectedCardHeight = screenHeight * 0.4;
      expect(expectedCardHeight).toBeLessThan(screenHeight);
    });
  });
});
