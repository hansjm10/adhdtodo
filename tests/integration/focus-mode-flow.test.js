// ABOUTME: Integration tests for focus mode flows
// Tests hyperfocus mode, scattered mode, timers, breaks, and rewards

import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Vibration } from 'react-native';
import {
  renderAppWithAuth,
  clearAllStorage,
  createTestUser,
  createTestTask,
  setupMocks,
  cleanupIntegrationTest,
  mockTaskService,
} from './setup';
import RewardService from '../../src/services/RewardService';

// Mock Alert and Vibration
jest.spyOn(Alert, 'alert');
jest.mock('react-native/Libraries/Vibration/Vibration', () => ({
  vibrate: jest.fn(),
  cancel: jest.fn(),
}));

// Mock timers
jest.useFakeTimers();

describe('Focus Mode Flow Integration Tests', () => {
  let user;
  let tasks;

  beforeEach(async () => {
    await clearAllStorage();
    setupMocks();
    user = createTestUser();

    // Create test tasks
    tasks = [
      createTestTask({
        title: 'Focus Task 1',
        category: 'Work',
        priority: 'high',
        timeEstimate: 25,
        userId: user.id,
      }),
      createTestTask({
        title: 'Focus Task 2',
        category: 'Personal',
        priority: 'medium',
        timeEstimate: 15,
        userId: user.id,
      }),
      createTestTask({
        title: 'Focus Task 3',
        category: 'Work',
        priority: 'low',
        timeEstimate: 30,
        userId: user.id,
      }),
    ];

    mockTaskService.getAllTasks.mockResolvedValue(tasks);
  });

  afterEach(async () => {
    jest.clearAllTimers();
    await cleanupIntegrationTest();
  });

  describe('Hyperfocus Mode Flow', () => {
    it('should enter hyperfocus mode and complete focused task', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Navigate to Focus tab
      await waitFor(() => {
        expect(getByTestId('tab-focus')).toBeTruthy();
      });

      fireEvent.press(getByTestId('tab-focus'));

      // Select Hyperfocus mode
      await waitFor(() => {
        expect(getByText('Hyperfocus Mode')).toBeTruthy();
      });

      fireEvent.press(getByText('Hyperfocus Mode'));

      // Should show task selection
      await waitFor(() => {
        expect(getByText('Select a task to focus on')).toBeTruthy();
        expect(getByText('Focus Task 1')).toBeTruthy();
      });

      // Select task
      fireEvent.press(getByText('Focus Task 1'));

      // Should start timer
      await waitFor(() => {
        expect(getByText('25:00')).toBeTruthy();
        expect(getByText('Start')).toBeTruthy();
      });

      fireEvent.press(getByText('Start'));

      // Timer should be running
      await waitFor(() => {
        expect(getByText('Pause')).toBeTruthy();
      });

      // Fast forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(getByText('20:00')).toBeTruthy();
      });

      // Complete task early
      const completeButton = getByText('Complete Task');
      fireEvent.press(completeButton);

      // Mock task completion
      const completedTask = { ...tasks[0], isCompleted: true };
      mockTaskService.toggleTaskCompletion.mockResolvedValue(completedTask);

      // Should show completion modal
      await waitFor(() => {
        expect(getByText('Task Completed!')).toBeTruthy();
        expect(getByText('Great focus!')).toBeTruthy();
      });

      // Should earn points
      jest.spyOn(RewardService, 'addPoints').mockResolvedValue({
        points: 50,
        totalPoints: 150,
      });

      fireEvent.press(getByText('Continue'));

      // Should return to focus mode selection
      await waitFor(() => {
        expect(getByText('Hyperfocus Mode')).toBeTruthy();
      });
    });

    it('should handle timer completion and break periods', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-focus'));

      await waitFor(() => {
        expect(getByText('Hyperfocus Mode')).toBeTruthy();
      });

      fireEvent.press(getByText('Hyperfocus Mode'));

      await waitFor(() => {
        expect(getByText('Focus Task 1')).toBeTruthy();
      });

      fireEvent.press(getByText('Focus Task 1'));
      fireEvent.press(getByText('Start'));

      // Fast forward to timer completion (25 minutes)
      act(() => {
        jest.advanceTimersByTime(25 * 60 * 1000);
      });

      // Should vibrate and show break prompt
      await waitFor(() => {
        expect(Vibration.vibrate).toHaveBeenCalled();
        expect(getByText('Time for a break!')).toBeTruthy();
      });

      // Start break
      fireEvent.press(getByText('Start Break'));

      // Should show 5-minute break timer
      await waitFor(() => {
        expect(getByText('5:00')).toBeTruthy();
        expect(getByText('Break Time')).toBeTruthy();
      });

      // Fast forward break
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Should prompt to continue or stop
      await waitFor(() => {
        expect(getByText('Break Complete!')).toBeTruthy();
        expect(getByText('Continue Working')).toBeTruthy();
        expect(getByText('End Session')).toBeTruthy();
      });
    });

    it('should pause and resume timer', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-focus'));
      fireEvent.press(getByText('Hyperfocus Mode'));
      fireEvent.press(getByText('Focus Task 1'));
      fireEvent.press(getByText('Start'));

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      await waitFor(() => {
        expect(getByText('15:00')).toBeTruthy();
      });

      // Pause timer
      fireEvent.press(getByText('Pause'));

      await waitFor(() => {
        expect(getByText('Resume')).toBeTruthy();
      });

      // Advance time while paused
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Timer should still show 15:00
      expect(getByText('15:00')).toBeTruthy();

      // Resume timer
      fireEvent.press(getByText('Resume'));

      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(getByText('10:00')).toBeTruthy();
      });
    });
  });

  describe('Scattered Mode Flow', () => {
    it('should show random tasks and allow quick switching', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-focus'));

      await waitFor(() => {
        expect(getByText('Scattered Mode')).toBeTruthy();
      });

      fireEvent.press(getByText('Scattered Mode'));

      // Should show a random task
      await waitFor(() => {
        const hasTask = tasks.some((task) => {
          try {
            getByText(task.title);
            return true;
          } catch {
            return false;
          }
        });
        expect(hasTask).toBeTruthy();
      });

      // Should have next button
      expect(getByText('Next Task')).toBeTruthy();

      // Get current task title
      let currentTaskTitle;
      tasks.forEach((task) => {
        try {
          getByText(task.title);
          currentTaskTitle = task.title;
        } catch {
          // Not this task
        }
      });

      // Switch to next task
      fireEvent.press(getByText('Next Task'));

      // Should show different task
      await waitFor(() => {
        const hasDifferentTask = tasks.some((task) => {
          if (task.title === currentTaskTitle) return false;
          try {
            getByText(task.title);
            return true;
          } catch {
            return false;
          }
        });
        expect(hasDifferentTask).toBeTruthy();
      });
    });

    it('should complete tasks in scattered mode with bonus points', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-focus'));
      fireEvent.press(getByText('Scattered Mode'));

      // Wait for a task to appear
      await waitFor(() => {
        expect(getByText('Complete Task')).toBeTruthy();
      });

      // Mock task completion with bonus
      jest.spyOn(RewardService, 'addPoints').mockResolvedValue({
        points: 75, // Extra points for scattered mode
        totalPoints: 225,
      });

      fireEvent.press(getByText('Complete Task'));

      // Should show completion with bonus
      await waitFor(() => {
        expect(getByText('Quick Win!')).toBeTruthy();
        expect(getByText('+75 points')).toBeTruthy();
      });

      // Continue to next task
      fireEvent.press(getByText('Next Task'));

      // Should show another task
      await waitFor(() => {
        expect(getByText('Complete Task')).toBeTruthy();
      });
    });

    it('should track scattered mode statistics', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-focus'));
      fireEvent.press(getByText('Scattered Mode'));

      // Complete multiple tasks
      for (let i = 0; i < 3; i++) {
        await waitFor(() => {
          expect(getByText('Complete Task')).toBeTruthy();
        });

        mockTaskService.toggleTaskCompletion.mockResolvedValue({
          ...tasks[i],
          isCompleted: true,
        });

        fireEvent.press(getByText('Complete Task'));

        await waitFor(() => {
          expect(getByText('Quick Win!')).toBeTruthy();
        });

        if (i < 2) {
          fireEvent.press(getByText('Next Task'));
        } else {
          fireEvent.press(getByText('End Session'));
        }
      }

      // Should show session summary
      await waitFor(() => {
        expect(getByText('Session Complete!')).toBeTruthy();
        expect(getByText('3 tasks completed')).toBeTruthy();
      });
    });
  });

  describe('Focus Mode Rewards', () => {
    it('should track streaks and award bonus points', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Complete tasks on consecutive days
      jest.spyOn(RewardService, 'checkStreak').mockResolvedValue({
        currentStreak: 3,
        bonusPoints: 100,
      });

      fireEvent.press(getByTestId('tab-focus'));
      fireEvent.press(getByText('Hyperfocus Mode'));
      fireEvent.press(getByText('Focus Task 1'));
      fireEvent.press(getByText('Start'));

      // Complete task
      mockTaskService.toggleTaskCompletion.mockResolvedValue({
        ...tasks[0],
        isCompleted: true,
      });

      fireEvent.press(getByText('Complete Task'));

      // Should show streak bonus
      await waitFor(() => {
        expect(getByText('3-day streak!')).toBeTruthy();
        expect(getByText('+100 bonus points')).toBeTruthy();
      });
    });

    it('should unlock achievements for focus milestones', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Mock achievement unlock
      jest.spyOn(RewardService, 'checkAchievements').mockResolvedValue({
        newAchievements: [
          {
            id: 'focus-master',
            title: 'Focus Master',
            description: 'Complete 10 focus sessions',
            points: 500,
          },
        ],
      });

      fireEvent.press(getByTestId('tab-focus'));
      fireEvent.press(getByText('Hyperfocus Mode'));
      fireEvent.press(getByText('Focus Task 1'));
      fireEvent.press(getByText('Start'));

      // Fast forward and complete
      act(() => {
        jest.advanceTimersByTime(25 * 60 * 1000);
      });

      // Should show achievement
      await waitFor(() => {
        expect(getByText('Achievement Unlocked!')).toBeTruthy();
        expect(getByText('Focus Master')).toBeTruthy();
        expect(getByText('+500 points')).toBeTruthy();
      });
    });
  });

  describe('Focus Mode Settings', () => {
    it('should allow customizing timer durations', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-focus'));

      // Access settings
      await waitFor(() => {
        expect(getByText('Settings')).toBeTruthy();
      });

      fireEvent.press(getByText('Settings'));

      // Should show timer options
      await waitFor(() => {
        expect(getByText('Focus Duration')).toBeTruthy();
        expect(getByText('Break Duration')).toBeTruthy();
      });

      // Change focus duration
      const focusPicker = getByTestId('focus-duration-picker');
      fireEvent(focusPicker, 'onValueChange', 45);

      // Change break duration
      const breakPicker = getByTestId('break-duration-picker');
      fireEvent(breakPicker, 'onValueChange', 10);

      fireEvent.press(getByText('Save Settings'));

      // Start hyperfocus with new duration
      fireEvent.press(getByText('Hyperfocus Mode'));
      fireEvent.press(getByText('Focus Task 1'));

      // Should show new duration
      await waitFor(() => {
        expect(getByText('45:00')).toBeTruthy();
      });
    });
  });
});
