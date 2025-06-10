// ABOUTME: Service for managing rewards, XP, and streak tracking
// Handles XP calculations, streak management, and reward statistics

import { BaseService } from './BaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TaskStorageService from './TaskStorageService';
import { REWARD_POINTS } from '../constants/TaskConstants';
import type { Task } from '../types';
import type { Result } from '../types/common.types';

const STREAK_KEY = 'streak_data';
const LAST_COMPLETION_KEY = 'last_completion_date';

export interface StreakData {
  current: number;
  best: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xp: number;
}

export interface RewardStats {
  totalXP: number;
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface IRewardService {
  calculateTaskXP(task: Task): number;
  updateStreak(): Promise<Result<StreakData>>;
  getStreakData(): Promise<Result<StreakData>>;
  getStats(): Promise<Result<RewardStats>>;
  checkForAchievements(task: Task): Promise<Result<Achievement[]>>;
}

class RewardService extends BaseService implements IRewardService {
  constructor() {
    super('Reward');
  }
  calculateTaskXP(task: Task): number {
    let xp = REWARD_POINTS.TASK_COMPLETION;

    // Bonus for accurate time estimation (within 10%)
    if (task.timeEstimate && task.timeSpent) {
      const accuracy = Math.abs(task.timeSpent - task.timeEstimate) / task.timeEstimate;
      if (accuracy <= 0.1) {
        xp += REWARD_POINTS.TIME_ESTIMATE_ACCURATE;
      }
    }

    // Bonus for categorized tasks
    if (task.category) {
      xp += 5; // Small bonus for organization
    }

    // Could add more bonuses based on priority, complexity, etc.

    return xp;
  }

  async updateStreak(): Promise<Result<StreakData>> {
    return this.wrapAsync('updateStreak', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastCompletionStr = await AsyncStorage.getItem(LAST_COMPLETION_KEY);
      const streakDataResult = await this.getStreakData();
      const streakData =
        streakDataResult.success && streakDataResult.data
          ? streakDataResult.data
          : { current: 0, best: 0 };

      if (!lastCompletionStr) {
        // First task ever completed
        await AsyncStorage.setItem(LAST_COMPLETION_KEY, today.toISOString());
        const newStreak = { current: 1, best: Math.max(1, streakData.best) };
        await this.setStreakData(newStreak);
        return newStreak;
      }

      const lastCompletion = new Date(lastCompletionStr);
      lastCompletion.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === 0) {
        // Same day, maintain streak but check if we need to start from stored data
        if (streakData.current === 0) {
          streakData.current = 1;
          streakData.best = Math.max(streakData.current, streakData.best);
          await this.setStreakData(streakData);
        }
        return streakData;
      }
      if (daysDiff === 1) {
        // Consecutive day, increment streak
        streakData.current = (streakData.current || 0) + 1;
        streakData.best = Math.max(streakData.current, streakData.best);
      } else {
        // Missed day(s), reset streak
        streakData.current = 1;
      }

      await AsyncStorage.setItem(LAST_COMPLETION_KEY, today.toISOString());
      await this.setStreakData(streakData);

      return streakData;
    });
  }

  async getStreakData(): Promise<Result<StreakData>> {
    return this.wrapAsync('getStreakData', async () => {
      const data = await AsyncStorage.getItem(STREAK_KEY);
      return data ? (JSON.parse(data) as StreakData) : { current: 0, best: 0 };
    });
  }

  private async setStreakData(streakData: StreakData): Promise<Result<void>> {
    return this.wrapAsync('setStreakData', async () => {
      await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(streakData));
    });
  }

  async getStats(): Promise<Result<RewardStats>> {
    return this.wrapAsync('getStats', async () => {
      const allTasks = await TaskStorageService.getAllTasks();
      const completedTasks = await TaskStorageService.getCompletedTasks();

      const totalXP = completedTasks.reduce((sum, task) => sum + (task.xpEarned ?? 0), 0);
      const tasksCompleted = completedTasks.length;
      const totalTasks = allTasks.length;
      const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

      const streakDataResult = await this.getStreakData();
      const streakData =
        streakDataResult.success && streakDataResult.data
          ? streakDataResult.data
          : { current: 0, best: 0 };

      return {
        totalXP,
        tasksCompleted,
        totalTasks,
        completionRate,
        currentStreak: streakData.current,
        bestStreak: streakData.best,
      };
    });
  }

  async checkForAchievements(task: Task): Promise<Result<Achievement[]>> {
    return this.wrapAsync(
      'checkForAchievements',
      async () => {
        const achievements: Achievement[] = [];
        const statsResult = await this.getStats();

        if (!statsResult.success || !statsResult.data) {
          return achievements;
        }

        const stats = statsResult.data;

        // First task achievement
        if (stats.tasksCompleted === 1) {
          achievements.push({
            id: 'first_task',
            title: 'First Step',
            description: 'Completed your first task!',
            xp: 20,
          });
        }

        // Streak achievements
        if (stats.currentStreak === 3) {
          achievements.push({
            id: 'streak_3',
            title: 'On a Roll',
            description: '3 day streak!',
            xp: 30,
          });
        }

        if (stats.currentStreak === 7) {
          achievements.push({
            id: 'streak_7',
            title: 'Week Warrior',
            description: '7 day streak!',
            xp: 50,
          });
        }

        // XP milestones
        if (stats.totalXP >= 100 && stats.totalXP - (task.xpEarned || 0) < 100) {
          achievements.push({
            id: 'xp_100',
            title: 'Century',
            description: 'Earned 100 XP!',
            xp: 25,
          });
        }

        return achievements;
      },
      { task },
    );
  }
}

export default new RewardService();
