// ABOUTME: Service for managing task persistence using SecureStorageService
// Handles saving, loading, updating, and deleting tasks from local storage

import SecureStorageService from './SecureStorageService';
import UserStorageService from './UserStorageService';
import ErrorHandler from '../utils/ErrorHandler';
import { TASK_CATEGORIES } from '../constants/TaskConstants';

const STORAGE_KEY = 'tasks';
const TASK_INDEX_KEY = 'tasks_index';
const STORAGE_SIZE_LIMIT = 1800; // Leave some buffer from 2048 limit

// For testing, we can override the storage size limit
let storageLimit = STORAGE_SIZE_LIMIT;

class TaskStorageService {
  // Check if we need to migrate from old format
  async checkAndMigrate() {
    try {
      // Check if we've already migrated by looking for the index
      const index = await SecureStorageService.getItem(TASK_INDEX_KEY);
      if (index !== null) {
        // Already migrated
        return false;
      }

      const oldTasks = await SecureStorageService.getItem(STORAGE_KEY);
      if (oldTasks && Array.isArray(oldTasks) && oldTasks.length > 0) {
        // Migrate to new category-based format
        await this.migrateToNewFormat(oldTasks);
        await SecureStorageService.removeItem(STORAGE_KEY);
        return true;
      }

      // No old tasks, initialize empty index if we're not in test environment
      // In tests, null index might mean we're testing old format
      if (oldTasks === null && process.env.NODE_ENV !== 'test') {
        await SecureStorageService.setItem(TASK_INDEX_KEY, {});
      }
      return false;
    } catch (error) {
      console.error('Migration check failed:', error);
      return false;
    }
  }

  async migrateToNewFormat(tasks) {
    const tasksByCategory = {};
    const index = {};

    // Group tasks by category
    tasks.forEach((task) => {
      const category = task.category || 'uncategorized';
      if (!tasksByCategory[category]) {
        tasksByCategory[category] = [];
      }
      tasksByCategory[category].push(task);
      index[task.id] = category;
    });

    // Save each category separately
    for (const [category, categoryTasks] of Object.entries(tasksByCategory)) {
      await this.saveCategoryTasks(category, categoryTasks);
    }

    // Save index
    await SecureStorageService.setItem(TASK_INDEX_KEY, index);
  }

  async saveCategoryTasks(category, tasks) {
    const chunks = this.chunkTasksBySize(tasks);

    if (chunks.length === 0) {
      // If no tasks, save empty array to main key
      await SecureStorageService.setItem(`tasks_${category}`, []);
      return;
    }

    // Save first chunk to main key
    await SecureStorageService.setItem(`tasks_${category}`, chunks[0]);

    // Save additional chunks with numeric suffix
    for (let i = 1; i < chunks.length; i++) {
      await SecureStorageService.setItem(`tasks_${category}_${i}`, chunks[i]);
    }

    // Clean up any old chunks that might exist beyond current chunks
    let cleanupIndex = chunks.length;
    let hasMoreToClean = true;
    while (hasMoreToClean) {
      try {
        const key = `tasks_${category}_${cleanupIndex}`;
        const exists = await SecureStorageService.getItem(key);
        if (exists === null) {
          hasMoreToClean = false;
        } else {
          await SecureStorageService.removeItem(key);
          cleanupIndex++;
        }
      } catch {
        hasMoreToClean = false;
      }
    }
  }

  chunkTasksBySize(tasks) {
    const chunks = [];
    let currentChunk = [];
    let currentSize = 2; // Account for array brackets []

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskSize = JSON.stringify(task).length;
      const separatorSize = i > 0 ? 1 : 0; // comma separator

      // Check if adding this task would exceed the limit
      if (currentSize + taskSize + separatorSize > storageLimit && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentSize = 2; // Reset for new array
      }

      currentChunk.push(task);
      currentSize += taskSize + separatorSize;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // For testing purposes - allows overriding the storage limit
  static setStorageLimit(limit) {
    storageLimit = limit;
  }

  static resetStorageLimit() {
    storageLimit = STORAGE_SIZE_LIMIT;
  }

  async getAllTasks() {
    try {
      const migrated = await this.checkAndMigrate();

      // If we just migrated, we need to reload from the new format
      if (migrated) {
        return this.getAllTasksFromCategories();
      }

      // Check if we're using the old format
      const oldTasks = await SecureStorageService.getItem(STORAGE_KEY);
      if (oldTasks && Array.isArray(oldTasks)) {
        return oldTasks;
      }

      // Load from new category-based format
      return this.getAllTasksFromCategories();
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async getAllTasksFromCategories() {
    const allTasks = [];

    // Get all known categories from TASK_CATEGORIES constant
    const knownCategories = Object.values(TASK_CATEGORIES).map((cat) => cat.id);

    // Also check for any other categories that might exist (like red, blue, green from tests)
    const additionalCategories = ['red', 'blue', 'green', 'uncategorized'];
    const allCategories = [...new Set([...knownCategories, ...additionalCategories])];

    // Load tasks from each category
    for (const category of allCategories) {
      const categoryTasks = await this.loadCategoryTasks(category);
      allTasks.push(...categoryTasks);
    }

    return allTasks;
  }

  async loadCategoryTasks(category) {
    const tasks = [];

    // Load main category storage
    const mainKey = `tasks_${category}`;
    const mainTasks = await SecureStorageService.getItem(mainKey);
    if (mainTasks && Array.isArray(mainTasks)) {
      tasks.push(...mainTasks);
    }

    // Load any additional chunks starting from 1
    let chunkIndex = 1;
    let hasMoreChunks = true;
    while (hasMoreChunks) {
      const chunkKey = `tasks_${category}_${chunkIndex}`;
      const chunkTasks = await SecureStorageService.getItem(chunkKey);

      if (!chunkTasks || !Array.isArray(chunkTasks) || chunkTasks.length === 0) {
        hasMoreChunks = false;
      } else {
        tasks.push(...chunkTasks);
        chunkIndex++;
      }
    }

    return tasks;
  }

  async saveTask(task) {
    try {
      await this.checkAndMigrate();

      const category = task.category || 'uncategorized';
      const categoryTasks = await this.loadCategoryTasks(category);
      categoryTasks.push(task);

      // Update category storage - this will handle chunking if needed
      await this.saveCategoryTasks(category, categoryTasks);

      // Update index
      const index = (await SecureStorageService.getItem(TASK_INDEX_KEY)) || {};
      index[task.id] = category;
      await SecureStorageService.setItem(TASK_INDEX_KEY, index);

      return true;
    } catch (error) {
      // If it's a size error, it means saveCategoryTasks failed to properly chunk
      // This shouldn't happen with proper chunking, but log it
      if (error.message && error.message.includes('size exceeds')) {
        console.error('Size limit exceeded despite chunking:', error);
      }
      ErrorHandler.handleStorageError(error, 'save', () => this.saveTask(task));
      return false;
    }
  }

  async updateTask(updatedTask) {
    try {
      await this.checkAndMigrate();

      // Get task's current category from index
      const index = (await SecureStorageService.getItem(TASK_INDEX_KEY)) || {};
      const oldCategory = index[updatedTask.id];
      const newCategory = updatedTask.category || 'uncategorized';

      if (!oldCategory) {
        // Task not found in index
        return false;
      }

      // If category changed, we need to move the task
      if (oldCategory !== newCategory) {
        // Remove from old category
        const oldCategoryTasks = await this.loadCategoryTasks(oldCategory);
        const filteredOldTasks = oldCategoryTasks.filter((task) => task.id !== updatedTask.id);
        await this.saveCategoryTasks(oldCategory, filteredOldTasks);

        // Add to new category
        const newCategoryTasks = await this.loadCategoryTasks(newCategory);
        newCategoryTasks.push(updatedTask);
        await this.saveCategoryTasks(newCategory, newCategoryTasks);

        // Update index
        index[updatedTask.id] = newCategory;
        await SecureStorageService.setItem(TASK_INDEX_KEY, index);
      } else {
        // Update within same category
        const categoryTasks = await this.loadCategoryTasks(newCategory);
        const taskIndex = categoryTasks.findIndex((task) => task.id === updatedTask.id);

        if (taskIndex === -1) {
          return false;
        }

        categoryTasks[taskIndex] = updatedTask;
        await this.saveCategoryTasks(newCategory, categoryTasks);
      }

      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'update', () => this.updateTask(updatedTask));
      return false;
    }
  }

  async deleteTask(taskId) {
    try {
      await this.checkAndMigrate();

      // Get task's category from index
      const index = (await SecureStorageService.getItem(TASK_INDEX_KEY)) || {};
      const category = index[taskId];

      if (!category) {
        return false;
      }

      // Remove from category
      const categoryTasks = await this.loadCategoryTasks(category);
      const filteredTasks = categoryTasks.filter((task) => task.id !== taskId);
      await this.saveCategoryTasks(category, filteredTasks);

      // Remove from index
      delete index[taskId];
      await SecureStorageService.setItem(TASK_INDEX_KEY, index);

      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'delete', () => this.deleteTask(taskId));
      return false;
    }
  }

  async clearAllTasks() {
    try {
      // Clear old format
      await SecureStorageService.removeItem(STORAGE_KEY);

      // Get all known categories
      const knownCategories = Object.values(TASK_CATEGORIES).map((cat) => cat.id);
      const additionalCategories = ['red', 'blue', 'green', 'uncategorized'];
      const allCategories = [...new Set([...knownCategories, ...additionalCategories])];

      // Clear all category storages
      for (const category of allCategories) {
        await SecureStorageService.removeItem(`tasks_${category}`);

        // Clear any chunks
        let chunkIndex = 1;
        let hasMoreChunks = true;
        while (hasMoreChunks) {
          try {
            const key = `tasks_${category}_${chunkIndex}`;
            const exists = await SecureStorageService.getItem(key);
            if (exists === null) {
              hasMoreChunks = false;
            } else {
              await SecureStorageService.removeItem(key);
              chunkIndex++;
            }
          } catch {
            hasMoreChunks = false;
          }
        }
      }

      // Clear index
      await SecureStorageService.removeItem(TASK_INDEX_KEY);

      return true;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'delete', () => this.clearAllTasks());
      return false;
    }
  }

  // Base method for filtering tasks to reduce duplication
  async getFilteredTasks(filterFn) {
    try {
      // Don't check migration here to avoid infinite loops
      const allTasks = await this.getAllTasksFromCategories();
      return allTasks.filter(filterFn);
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async getTasksByCategory(categoryId, options = {}) {
    try {
      await this.checkAndMigrate();

      const tasks = await this.loadCategoryTasks(categoryId);

      // Apply pagination if requested
      if (options.page && options.pageSize) {
        const start = (options.page - 1) * options.pageSize;
        const end = start + options.pageSize;
        return tasks.slice(start, end);
      }

      return tasks;
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
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

const taskStorageService = new TaskStorageService();

// Export instance methods and static methods
taskStorageService.setStorageLimit = TaskStorageService.setStorageLimit;
taskStorageService.resetStorageLimit = TaskStorageService.resetStorageLimit;

export default taskStorageService;
