// ABOUTME: Service for managing task persistence using AsyncStorage
// Handles saving, loading, updating, and deleting tasks from local storage

import AsyncStorage from '@react-native-async-storage/async-storage';
import UserStorageService from './UserStorageService';
import ErrorHandler from '../utils/ErrorHandler';

const STORAGE_KEY = 'tasks';

class TaskStorageService {
  async getAllTasks() {
    try {
      const tasksJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (!tasksJson) {
        return [];
      }

      const tasks = JSON.parse(tasksJson);
      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async saveTask(task) {
    try {
      const tasks = await this.getAllTasks();
      tasks.push(task);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'save', () => this.saveTask(task));
      return false;
    }
  }

  async updateTask(updatedTask) {
    try {
      const tasks = await this.getAllTasks();
      const taskIndex = tasks.findIndex((task) => task.id === updatedTask.id);

      if (taskIndex === -1) {
        return false;
      }

      tasks[taskIndex] = updatedTask;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'update', () => this.updateTask(updatedTask));
      return false;
    }
  }

  async deleteTask(taskId) {
    try {
      const tasks = await this.getAllTasks();
      const filteredTasks = tasks.filter((task) => task.id !== taskId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTasks));
      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'delete', () => this.deleteTask(taskId));
      return false;
    }
  }

  async clearAllTasks() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'delete', () => this.clearAllTasks());
      return false;
    }
  }

  // Base method for filtering tasks to reduce duplication
  async getFilteredTasks(filterFn) {
    try {
      const allTasks = await this.getAllTasks();
      return allTasks.filter(filterFn);
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async getTasksByCategory(categoryId) {
    return this.getFilteredTasks((task) => task.category === categoryId);
  }

  async getCompletedTasks() {
    return this.getFilteredTasks((task) => task.completed);
  }

  async getPendingTasks() {
    return this.getFilteredTasks((task) => !task.completed);
  }

  async getTaskStats() {
    const tasks = await this.getAllTasks();
    const completed = tasks.filter((task) => task.completed).length;
    const pending = tasks.filter((task) => !task.completed).length;
    const totalXP = tasks.reduce((sum, task) => sum + (task.xpEarned || 0), 0);

    return {
      total: tasks.length,
      completed,
      pending,
      totalXP,
    };
  }

  // Multi-user support methods
  async getTasksForUser(userId) {
    return this.getFilteredTasks(
      (task) => task.assignedTo === userId || (!task.assignedTo && !task.assignedBy), // Include non-assigned tasks for backward compatibility
    );
  }

  async getTasksAssignedByUser(userId) {
    return this.getFilteredTasks((task) => task.assignedBy === userId);
  }

  async getAssignedTasks(userId) {
    return this.getFilteredTasks((task) => task.assignedTo === userId && task.assignedBy);
  }

  async getPartnerTasks(userId) {
    try {
      const currentUser = await UserStorageService.getCurrentUser();
      if (!currentUser || !currentUser.partnerId) {
        return [];
      }

      // Get tasks where current user assigned to partner OR partner assigned to current user
      return this.getFilteredTasks(
        (task) =>
          (task.assignedBy === userId && task.assignedTo === currentUser.partnerId) ||
          (task.assignedBy === currentUser.partnerId && task.assignedTo === userId),
      );
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async getOverdueTasks(userId) {
    const tasks = await this.getTasksForUser(userId);
    const now = new Date();
    return tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now);
  }

  async getUpcomingTasks(userId, hoursAhead = 24) {
    const tasks = await this.getTasksForUser(userId);
    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return tasks.filter(
      (task) =>
        !task.completed &&
        task.dueDate &&
        new Date(task.dueDate) >= now &&
        new Date(task.dueDate) <= futureTime,
    );
  }
}

export default new TaskStorageService();
