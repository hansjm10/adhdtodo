// ABOUTME: Service for managing task persistence using AsyncStorage
// Handles saving, loading, updating, and deleting tasks from local storage

import AsyncStorage from '@react-native-async-storage/async-storage';
import UserStorageService from './UserStorageService';

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
      console.error('Error loading tasks:', error);
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
      console.error('Error saving task:', error);
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
      console.error('Error updating task:', error);
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
      console.error('Error deleting task:', error);
      return false;
    }
  }

  async clearAllTasks() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing tasks:', error);
      return false;
    }
  }

  async getTasksByCategory(categoryId) {
    const tasks = await this.getAllTasks();
    return tasks.filter((task) => task.category === categoryId);
  }

  async getCompletedTasks() {
    const tasks = await this.getAllTasks();
    return tasks.filter((task) => task.completed);
  }

  async getPendingTasks() {
    const tasks = await this.getAllTasks();
    return tasks.filter((task) => !task.completed);
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
    const tasks = await this.getAllTasks();
    return tasks.filter(
      (task) => task.assignedTo === userId || (!task.assignedTo && !task.assignedBy), // Include non-assigned tasks for backward compatibility
    );
  }

  async getTasksAssignedByUser(userId) {
    const tasks = await this.getAllTasks();
    return tasks.filter((task) => task.assignedBy === userId);
  }

  async getAssignedTasks(userId) {
    const tasks = await this.getAllTasks();
    return tasks.filter((task) => task.assignedTo === userId && task.assignedBy);
  }

  async getPartnerTasks(userId) {
    try {
      const currentUser = await UserStorageService.getCurrentUser();
      if (!currentUser || !currentUser.partnerId) {
        return [];
      }

      const tasks = await this.getAllTasks();
      // Get tasks where current user assigned to partner OR partner assigned to current user
      return tasks.filter(
        (task) =>
          (task.assignedBy === userId && task.assignedTo === currentUser.partnerId) ||
          (task.assignedBy === currentUser.partnerId && task.assignedTo === userId),
      );
    } catch (error) {
      console.error('Error getting partner tasks:', error);
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
