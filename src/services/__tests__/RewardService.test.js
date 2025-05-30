// ABOUTME: Tests for RewardService
// Verifies XP calculation, streak tracking, and reward logic

import AsyncStorage from '@react-native-async-storage/async-storage';
import RewardService from '../RewardService';
import TaskStorageService from '../TaskStorageService';
import { createTask, completeTask } from '../../utils/TaskModel';
import { REWARD_POINTS } from '../../constants/TaskConstants';

// Mock dependencies
jest.mock('../TaskStorageService');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('RewardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateTaskXP', () => {
    it('should return base XP for simple task completion', () => {
      const task = createTask({ title: 'Simple Task' });
      const xp = RewardService.calculateTaskXP(task);

      expect(xp).toBe(REWARD_POINTS.TASK_COMPLETION);
    });

    it('should add bonus XP for accurate time estimation', () => {
      const task = createTask({
        title: 'Timed Task',
        timeEstimate: 30,
      });
      task.timeSpent = 28; // Within 10% of estimate

      const xp = RewardService.calculateTaskXP(task);

      expect(xp).toBe(REWARD_POINTS.TASK_COMPLETION + REWARD_POINTS.TIME_ESTIMATE_ACCURATE);
    });

    it('should add bonus XP for completing categorized tasks', () => {
      const task = createTask({
        title: 'Categorized Task',
        category: 'work',
      });

      const xp = RewardService.calculateTaskXP(task);

      expect(xp).toBe(REWARD_POINTS.TASK_COMPLETION + 5); // Extra 5 XP for category
    });
  });

  describe('updateStreak', () => {
    it('should start new streak on first task completion', async () => {
      TaskStorageService.getCompletedTasks.mockResolvedValue([]);

      const streak = await RewardService.updateStreak();

      expect(streak.current).toBe(1);
      expect(streak.best).toBe(1);
    });

    it('should continue streak when completing task on same day', async () => {
      const todayTask = completeTask(createTask({ title: 'Today Task' }));
      todayTask.completedAt = new Date();

      TaskStorageService.getCompletedTasks.mockResolvedValue([todayTask]);

      const streak = await RewardService.updateStreak();

      expect(streak.current).toBe(1);
    });

    it('should increment streak for consecutive days', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Mock that we completed a task yesterday
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'last_completion_date') {
          return Promise.resolve(yesterday.toISOString());
        }
        if (key === 'streak_data') {
          return Promise.resolve(JSON.stringify({ current: 1, best: 1 }));
        }
        return Promise.resolve(null);
      });

      const streak = await RewardService.updateStreak();

      expect(streak.current).toBe(2);
    });

    it('should reset streak after missing a day', async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      // Mock that we completed a task two days ago (missed yesterday)
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'last_completion_date') {
          return Promise.resolve(twoDaysAgo.toISOString());
        }
        if (key === 'streak_data') {
          return Promise.resolve(JSON.stringify({ current: 3, best: 5 }));
        }
        return Promise.resolve(null);
      });

      const streak = await RewardService.updateStreak();

      expect(streak.current).toBe(1);
    });

    it('should track best streak', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Mock that we had a 5-day streak
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'last_completion_date') {
          return Promise.resolve(yesterday.toISOString());
        }
        if (key === 'streak_data') {
          return Promise.resolve(JSON.stringify({ current: 5, best: 5 }));
        }
        return Promise.resolve(null);
      });

      const streak = await RewardService.updateStreak();

      expect(streak.current).toBe(6);
      expect(streak.best).toBe(6);
    });
  });

  describe('getStats', () => {
    it('should calculate total stats correctly', async () => {
      const tasks = [
        completeTask(createTask({ title: 'Task 1' }), 10),
        completeTask(createTask({ title: 'Task 2' }), 15),
        completeTask(createTask({ title: 'Task 3' }), 20),
      ];

      TaskStorageService.getCompletedTasks.mockResolvedValue(tasks);
      TaskStorageService.getAllTasks.mockResolvedValue([
        ...tasks,
        createTask({ title: 'Pending' }),
      ]);

      const stats = await RewardService.getStats();

      expect(stats.totalXP).toBe(45);
      expect(stats.tasksCompleted).toBe(3);
      expect(stats.totalTasks).toBe(4);
      expect(stats.completionRate).toBe(75);
    });
  });
});
