// ABOUTME: Tests for ScatteredScreen with Expo Router
// Verifies rapid task switching functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ScatteredScreen from '../scattered';
import { AppProvider } from '../../../src/contexts/AppProvider';
import RewardService from '../../../src/services/RewardService';
import { createTask } from '../../../src/utils/TaskModel';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../src/services/RewardService');

// Mock TaskStorageService at the module level
jest.mock('../../../src/services/TaskStorageService', () => ({
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  getPendingTasks: jest.fn(),
}));

// Import after mocking
const TaskStorageService = require('../../../src/services/TaskStorageService');

// Mock expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

describe('ScatteredScreen', () => {
  const mockQuickTasks = [
    {
      ...createTask({ title: 'Quick Task 1', timeEstimate: 5, userId: 'user1' }),
      id: '1',
      isComplete: false,
    },
    {
      ...createTask({ title: 'Quick Task 2', timeEstimate: 10, userId: 'user1' }),
      id: '2',
      isComplete: false,
    },
    {
      ...createTask({ title: 'Quick Task 3', timeEstimate: 15, userId: 'user1' }),
      id: '3',
      isComplete: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockBack.mockClear();
    // Reset context caches
    require('../../../src/contexts/TaskContext')._resetCache();
    require('../../../src/contexts/NotificationContext')._resetNotifications();

    // Setup default mocks
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'currentUser') {
        return Promise.resolve(JSON.stringify({ id: 'user1', name: 'Test User' }));
      }
      return Promise.resolve(null);
    });
    AsyncStorage.setItem.mockResolvedValue(undefined);

    TaskStorageService.getAllTasks.mockResolvedValue(mockQuickTasks);
    TaskStorageService.getPendingTasks.mockResolvedValue(mockQuickTasks);
    TaskStorageService.updateTask.mockResolvedValue(true);
    RewardService.calculateTaskXP.mockReturnValue(10);
    RewardService.updateStreak.mockResolvedValue({ current: 1, best: 1 });
  });

  it('should load and display quick tasks', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(
      () => {
        expect(getByText('Quick Task 1')).toBeTruthy();
      },
      { timeout: 10000 },
    );

    expect(getByText('5 minutes')).toBeTruthy();
    expect(getByText('1 of 3')).toBeTruthy();
  }, 15000);

  it('should filter out tasks longer than 15 minutes', async () => {
    const allTasks = [
      ...mockQuickTasks,
      {
        ...createTask({ title: 'Long Task', timeEstimate: 30, userId: 'user1' }),
        id: '4',
        isComplete: false,
      },
    ];
    TaskStorageService.getAllTasks.mockResolvedValue(allTasks);
    TaskStorageService.getPendingTasks.mockResolvedValue(allTasks);

    const { getByText, queryByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Quick Task 1')).toBeTruthy();
      expect(queryByText('Long Task')).toBeNull();
    });
  });

  it('should show alert when no quick tasks available', async () => {
    const longTask = {
      ...createTask({ title: 'Long Task', timeEstimate: 30, userId: 'user1' }),
      id: '1',
      isComplete: false,
    };
    TaskStorageService.getAllTasks.mockResolvedValue([longTask]);
    TaskStorageService.getPendingTasks.mockResolvedValue([longTask]);

    render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'No Quick Tasks Available',
        'Add some tasks with 5-15 minute time estimates to use Scattered Mode.',
        expect.any(Array),
      );
    });
  });

  it('should complete task and update stats', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Quick Task 1')).toBeTruthy();
    });

    fireEvent.press(getByText('Complete ✓'));

    await waitFor(() => {
      expect(TaskStorageService.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: true,
          xp: 10,
        }),
      );
      expect(RewardService.updateStreak).toHaveBeenCalled();
      expect(getByText('⚡ 1 done')).toBeTruthy();
      expect(getByText('🏆 10 XP')).toBeTruthy();
    });
  });

  it('should move to next task after completing', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Quick Task 1')).toBeTruthy();
    });

    fireEvent.press(getByText('Complete ✓'));

    await waitFor(() => {
      expect(getByText('Quick Task 2')).toBeTruthy();
      expect(getByText('2 of 3')).toBeTruthy();
    });
  });

  it('should skip to next task', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Quick Task 1')).toBeTruthy();
    });

    fireEvent.press(getByText('Skip →'));

    await waitFor(() => {
      expect(getByText('Quick Task 2')).toBeTruthy();
      expect(getByText('2 of 3')).toBeTruthy();
    });
  });

  it('should show completion alert when all tasks done', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    // Complete all tasks
    await waitFor(() => {
      fireEvent.press(getByText('Complete ✓'));
    });

    await waitFor(() => {
      fireEvent.press(getByText('Complete ✓'));
    });

    await waitFor(() => {
      fireEvent.press(getByText('Complete ✓'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        '🎉 Amazing Sprint!',
        'You completed 3 tasks and earned 30 XP!',
        expect.any(Array),
      );
    });
  });

  it('should show alert when trying to skip past last task', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    // Skip to last task
    await waitFor(() => {
      fireEvent.press(getByText('Skip →'));
    });

    await waitFor(() => {
      fireEvent.press(getByText('Skip →'));
    });

    // Try to skip again
    fireEvent.press(getByText('Skip →'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'No More Tasks',
        "You've gone through all quick tasks. Try completing some!",
        expect.any(Array),
      );
    });
  });

  it('should show progress bar', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('1 of 3')).toBeTruthy();
    });
  });

  it('should display task details correctly', async () => {
    const tasksWithDetails = [
      {
        ...createTask({
          title: 'Task with Description',
          description: 'This is a description',
          timeEstimate: 10,
          category: 'work',
          userId: 'user1',
        }),
        id: '1',
        isComplete: false,
      },
    ];
    TaskStorageService.getAllTasks.mockResolvedValue(tasksWithDetails);
    TaskStorageService.getPendingTasks.mockResolvedValue(tasksWithDetails);

    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('Task with Description')).toBeTruthy();
      expect(getByText('This is a description')).toBeTruthy();
      expect(getByText('work')).toBeTruthy();
      expect(getByText('+10 XP')).toBeTruthy();
    });
  });

  it('should show exit confirmation', async () => {
    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      const exitButton = getByText('✕');
      fireEvent.press(exitButton);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Exit Scattered Mode?',
      "You've completed 0 tasks so far!",
      expect.any(Array),
    );
  });

  it('should calculate XP correctly for each task', async () => {
    // Clear previous mock and set new implementation
    RewardService.calculateTaskXP.mockReset();
    RewardService.calculateTaskXP
      .mockReturnValueOnce(15) // First task preview
      .mockReturnValueOnce(15) // First task completion
      .mockReturnValueOnce(20) // Second task preview
      .mockReturnValueOnce(20) // Second task completion
      .mockReturnValueOnce(10); // Third task preview

    const { getByText } = render(<ScatteredScreen />, { wrapper });

    await waitFor(() => {
      expect(getByText('+15 XP')).toBeTruthy();
    });

    fireEvent.press(getByText('Complete ✓'));

    await waitFor(() => {
      expect(getByText('+20 XP')).toBeTruthy();
      expect(getByText('🏆 15 XP')).toBeTruthy();
    });
  });
});
