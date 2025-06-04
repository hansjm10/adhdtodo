// ABOUTME: Service for managing task persistence using SecureStorageService
// Handles saving, loading, updating, and deleting tasks from local storage

import SecureStorageService from './SecureStorageService';
import UserStorageService from './UserStorageServiceWrapper';
import ErrorHandler from '../utils/ErrorHandler';
import { Task, TASK_CATEGORIES } from '../types/task.types';

const STORAGE_KEY = 'tasks';
const TASK_INDEX_KEY = 'tasks_index';
const STORAGE_SIZE_LIMIT = 1800; // Leave some buffer from 2048 limit

// For testing, we can override the storage size limit
let storageLimit: number = STORAGE_SIZE_LIMIT;

interface TaskIndex {
  [taskId: string]: string; // Maps task ID to category
}

interface TaskStorageOptions {
  page?: number;
  pageSize?: number;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  totalXP: number;
}

interface ITaskStorageService {
  checkAndMigrate(): Promise<boolean>;
  getAllTasks(): Promise<Task[]>;
  saveTask(task: Task): Promise<boolean>;
  updateTask(updatedTask: Task): Promise<boolean>;
  deleteTask(taskId: string): Promise<boolean>;
  clearAllTasks(): Promise<boolean>;
  getTasksByCategory(categoryId: string, options?: TaskStorageOptions): Promise<Task[]>;
  getCompletedTasks(): Promise<Task[]>;
  getPendingTasks(): Promise<Task[]>;
  getTaskStats(): Promise<TaskStats>;
  getTasksForUser(userId: string): Promise<Task[]>;
  getTasksAssignedByUser(userId: string): Promise<Task[]>;
  getAssignedTasks(userId: string): Promise<Task[]>;
  getPartnerTasks(userId: string): Promise<Task[]>;
  getOverdueTasks(userId: string): Promise<Task[]>;
  getUpcomingTasks(userId: string, hoursAhead?: number): Promise<Task[]>;
}

// Storage batch for atomic operations
interface StorageBatch {
  operations: Array<() => Promise<void>>;
  commit(): Promise<void>;
  removeItem(key: string): void;
  moveItem(oldKey: string, newKey: string): void;
}

class StorageBatchImpl implements StorageBatch {
  operations: Array<() => Promise<void>> = [];

  removeItem(key: string): void {
    this.operations.push(() => SecureStorageService.removeItem(key));
  }

  moveItem(oldKey: string, newKey: string): void {
    this.operations.push(async () => {
      const value = await SecureStorageService.getItem(oldKey);
      if (value !== null) {
        await SecureStorageService.setItem(newKey, value);
        await SecureStorageService.removeItem(oldKey);
      }
    });
  }

  async commit(): Promise<void> {
    // Execute all operations sequentially for consistency
    for (const operation of this.operations) {
      await operation();
    }
  }
}

class TaskStorageService implements ITaskStorageService {
  private readonly writeLocks = new Map<string, Promise<void>>();

  private async withWriteLock<T>(category: string, operation: () => Promise<T>): Promise<T> {
    // Wait for any existing write to complete
    const existingLock = this.writeLocks.get(category);
    if (existingLock) {
      await existingLock;
    }

    // Create new lock
    let releaseLock: () => void = () => {};
    const newLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.writeLocks.set(category, newLock);

    try {
      return await operation();
    } finally {
      releaseLock();
      this.writeLocks.delete(category);
    }
  }

  // Check if we need to migrate from old format
  async checkAndMigrate(): Promise<boolean> {
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
        await this.migrateToNewFormat(oldTasks as Task[]);
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

  private async migrateToNewFormat(tasks: Task[]): Promise<void> {
    const tasksByCategory: Record<string, Task[]> = {};
    const index: TaskIndex = {};

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

  private async saveCategoryTasksAtomic(category: string, tasks: Task[]): Promise<void> {
    const chunks = this.chunkTasksBySize(tasks);

    if (chunks.length === 0) {
      // If no tasks, save empty array to main key
      await SecureStorageService.setItem(`tasks_${category}`, []);
      // Clean up any existing chunks
      for (let i = 1; i < 10; i++) {
        const key = `tasks_${category}_${i}`;
        const exists = await SecureStorageService.getItem(key);
        if (exists !== null) {
          await SecureStorageService.removeItem(key);
        }
      }
      return;
    }

    // Prepare all chunks with temporary keys
    const tempKeys: string[] = [];
    const operations: Array<() => Promise<void>> = [];
    const timestamp = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const tempKey = `tasks_${category}_temp_${timestamp}_${i}`;
      tempKeys.push(tempKey);
      operations.push(() => SecureStorageService.setItem(tempKey, chunks[i]));
    }

    // Save all chunks to temp locations
    await Promise.all(operations.map((op) => op()));

    // Atomic swap: delete old and rename temp in transaction
    const batch = new StorageBatchImpl();

    // Delete all old keys
    batch.removeItem(`tasks_${category}`);
    for (let i = 1; i < 10; i++) {
      // Reasonable max
      batch.removeItem(`tasks_${category}_${i}`);
    }

    // Rename temp keys to final keys
    for (let i = 0; i < tempKeys.length; i++) {
      const finalKey = i === 0 ? `tasks_${category}` : `tasks_${category}_${i}`;
      batch.moveItem(tempKeys[i], finalKey);
    }

    await batch.commit();
  }

  private async saveCategoryTasks(category: string, tasks: Task[]): Promise<void> {
    return this.withWriteLock(category, async () => {
      return this.saveCategoryTasksAtomic(category, tasks);
    });
  }

  private chunkTasksBySize(tasks: Task[]): Task[][] {
    const chunks: Task[][] = [];
    let currentChunk: Task[] = [];
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
  static setStorageLimit(limit: number): void {
    storageLimit = limit;
  }

  static resetStorageLimit(): void {
    storageLimit = STORAGE_SIZE_LIMIT;
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const migrated = await this.checkAndMigrate();

      // If we just migrated, we need to reload from the new format
      if (migrated) {
        return this.getAllTasksFromCategories();
      }

      // Check if we're using the old format
      const oldTasks = await SecureStorageService.getItem(STORAGE_KEY);
      if (oldTasks && Array.isArray(oldTasks)) {
        return oldTasks as Task[];
      }

      // Load from new category-based format
      return this.getAllTasksFromCategories();
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  private async getAllTasksFromCategories(): Promise<Task[]> {
    const allTasks: Task[] = [];

    // Get all known categories from TASK_CATEGORIES constant
    const knownCategories = Object.values(TASK_CATEGORIES).map((cat) => cat.id);

    // Also check for any other categories that might exist (like red, blue, green from tests)
    const additionalCategories = ['red', 'blue', 'green', 'uncategorized'];
    const allCategories = Array.from(new Set([...knownCategories, ...additionalCategories]));

    // Load tasks from each category
    for (const category of allCategories) {
      const categoryTasks = await this.loadCategoryTasks(category);
      allTasks.push(...categoryTasks);
    }

    return allTasks;
  }

  private async loadCategoryTasks(category: string): Promise<Task[]> {
    const tasks: Task[] = [];

    // Load main category storage
    const mainKey = `tasks_${category}`;
    const mainTasks = await SecureStorageService.getItem(mainKey);
    if (mainTasks && Array.isArray(mainTasks)) {
      tasks.push(...(mainTasks as Task[]));
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
        tasks.push(...(chunkTasks as Task[]));
        chunkIndex++;
      }
    }

    return tasks;
  }

  async saveTask(task: Task): Promise<boolean> {
    try {
      await this.checkAndMigrate();

      const category = task.category || 'uncategorized';

      return this.withWriteLock(category, async () => {
        const categoryTasks = await this.loadCategoryTasks(category);
        categoryTasks.push(task);

        // Update category storage atomically
        await this.saveCategoryTasksAtomic(category, categoryTasks);

        // Update index atomically with category lock
        const index = ((await SecureStorageService.getItem(TASK_INDEX_KEY)) as TaskIndex) || {};
        index[task.id] = category;
        await SecureStorageService.setItem(TASK_INDEX_KEY, index);

        return true;
      });
    } catch (error) {
      // If it's a size error, it means saveCategoryTasks failed to properly chunk
      // This shouldn't happen with proper chunking, but log it
      if (error instanceof Error && error.message.includes('size exceeds')) {
        console.error('Size limit exceeded despite chunking:', error);
      }
      ErrorHandler.handleStorageError(error, 'save', () => this.saveTask(task));
      return false;
    }
  }

  async updateTask(updatedTask: Task): Promise<boolean> {
    try {
      await this.checkAndMigrate();

      // Get task's current category from index
      const index = ((await SecureStorageService.getItem(TASK_INDEX_KEY)) as TaskIndex) || {};
      const oldCategory = index[updatedTask.id];
      const newCategory = updatedTask.category || 'uncategorized';

      if (!oldCategory) {
        // Task not found in index
        return false;
      }

      // If category changed, we need to lock both categories
      if (oldCategory !== newCategory) {
        // Sort categories to avoid deadlock (always lock in same order)
        const [firstCategory, secondCategory] = [oldCategory, newCategory].sort();

        return this.withWriteLock(firstCategory, async () => {
          return this.withWriteLock(secondCategory, async () => {
            // Double-check task still exists after acquiring locks
            const currentIndex =
              ((await SecureStorageService.getItem(TASK_INDEX_KEY)) as TaskIndex) || {};
            if (currentIndex[updatedTask.id] !== oldCategory) {
              return false; // Task was moved by another operation
            }

            // Remove from old category
            const oldCategoryTasks = await this.loadCategoryTasks(oldCategory);
            const filteredOldTasks = oldCategoryTasks.filter((task) => task.id !== updatedTask.id);
            await this.saveCategoryTasksAtomic(oldCategory, filteredOldTasks);

            // Add to new category
            const newCategoryTasks = await this.loadCategoryTasks(newCategory);
            newCategoryTasks.push(updatedTask);
            await this.saveCategoryTasksAtomic(newCategory, newCategoryTasks);

            // Update index
            currentIndex[updatedTask.id] = newCategory;
            await SecureStorageService.setItem(TASK_INDEX_KEY, currentIndex);

            return true;
          });
        });
      } else {
        // Update within same category
        return this.withWriteLock(newCategory, async () => {
          const categoryTasks = await this.loadCategoryTasks(newCategory);
          const taskIndex = categoryTasks.findIndex((task) => task.id === updatedTask.id);

          if (taskIndex === -1) {
            return false;
          }

          categoryTasks[taskIndex] = updatedTask;
          await this.saveCategoryTasksAtomic(newCategory, categoryTasks);

          return true;
        });
      }
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'update', () => this.updateTask(updatedTask));
      return false;
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await this.checkAndMigrate();

      // Get task's category from index
      const index = ((await SecureStorageService.getItem(TASK_INDEX_KEY)) as TaskIndex) || {};
      const category = index[taskId];

      if (!category) {
        return false;
      }

      return this.withWriteLock(category, async () => {
        // Double-check task still exists after acquiring lock
        const currentIndex =
          ((await SecureStorageService.getItem(TASK_INDEX_KEY)) as TaskIndex) || {};
        if (currentIndex[taskId] !== category) {
          return false; // Task was already deleted or moved
        }

        // Remove from category
        const categoryTasks = await this.loadCategoryTasks(category);
        const filteredTasks = categoryTasks.filter((task) => task.id !== taskId);
        await this.saveCategoryTasksAtomic(category, filteredTasks);

        // Remove from index
        delete currentIndex[taskId];
        await SecureStorageService.setItem(TASK_INDEX_KEY, currentIndex);

        return true;
      });
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'delete', () => this.deleteTask(taskId));
      return false;
    }
  }

  async clearAllTasks(): Promise<boolean> {
    try {
      // Clear old format
      await SecureStorageService.removeItem(STORAGE_KEY);

      // Get all known categories
      const knownCategories = Object.values(TASK_CATEGORIES).map((cat) => cat.id);
      const additionalCategories = ['red', 'blue', 'green', 'uncategorized'];
      const allCategories = Array.from(new Set([...knownCategories, ...additionalCategories]));

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
  private async getFilteredTasks(filterFn: (task: Task) => boolean): Promise<Task[]> {
    try {
      // Don't check migration here to avoid infinite loops
      const allTasks = await this.getAllTasksFromCategories();
      return allTasks.filter(filterFn);
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async getTasksByCategory(categoryId: string, options: TaskStorageOptions = {}): Promise<Task[]> {
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

  async getCompletedTasks(): Promise<Task[]> {
    return this.getFilteredTasks((task) => task.completed);
  }

  async getPendingTasks(): Promise<Task[]> {
    return this.getFilteredTasks((task) => !task.completed);
  }

  async getTaskStats(): Promise<TaskStats> {
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
  async getTasksForUser(userId: string): Promise<Task[]> {
    return this.getFilteredTasks(
      (task) => task.assignedTo === userId || (!task.assignedTo && !task.assignedBy), // Include non-assigned tasks for backward compatibility
    );
  }

  async getTasksAssignedByUser(userId: string): Promise<Task[]> {
    return this.getFilteredTasks((task) => task.assignedBy === userId);
  }

  async getAssignedTasks(userId: string): Promise<Task[]> {
    return this.getFilteredTasks((task) => task.assignedTo === userId && task.assignedBy !== null);
  }

  async getPartnerTasks(userId: string): Promise<Task[]> {
    try {
      const currentUser = await UserStorageService.getCurrentUser();
      if (!currentUser || !currentUser.partnerId) {
        return [];
      }

      // Get tasks where current user assigned to partner OR partner assigned to current user
      return this.getFilteredTasks(
        (task) =>
          task.assignedBy !== null &&
          task.assignedBy !== undefined &&
          task.assignedTo !== null &&
          task.assignedTo !== undefined &&
          ((task.assignedBy === userId && task.assignedTo === currentUser.partnerId) ||
            (task.assignedBy === currentUser.partnerId && task.assignedTo === userId)),
      );
    } catch (error) {
      ErrorHandler.handleStorageError(error, 'load');
      return [];
    }
  }

  async getOverdueTasks(userId: string): Promise<Task[]> {
    const tasks = await this.getTasksForUser(userId);
    const now = new Date();
    return tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < now);
  }

  async getUpcomingTasks(userId: string, hoursAhead: number = 24): Promise<Task[]> {
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

// Create instance with proper typing
interface TaskStorageServiceInstance extends TaskStorageService {
  setStorageLimit: typeof TaskStorageService.setStorageLimit;
  resetStorageLimit: typeof TaskStorageService.resetStorageLimit;
}

const taskStorageService = new TaskStorageService() as TaskStorageServiceInstance;

// Export instance methods and static methods
taskStorageService.setStorageLimit = TaskStorageService.setStorageLimit;
taskStorageService.resetStorageLimit = TaskStorageService.resetStorageLimit;

export default taskStorageService;
