// ABOUTME: Tests for race conditions in TaskStorageService chunking logic
// Demonstrates data integrity issues with concurrent operations

import TaskStorageService from '../TaskStorageService';
import SecureStorageService from '../SecureStorageService';
import { createTask } from '../../utils/TaskModel';

jest.mock('../SecureStorageService');
jest.mock('../UserStorageService');

describe('TaskStorageService Race Conditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Reset to default storage limit
    TaskStorageService.resetStorageLimit();
  });

  // Helper to simulate concurrent operations
  const runConcurrent = async (operations) => {
    return Promise.all(operations.map((op) => op()));
  };

  // Helper to simulate delayed storage operations
  const createDelayedStorageMock = (delays = {}) => {
    const mockStorage = new Map();

    SecureStorageService.getItem.mockImplementation(async (key) => {
      if (delays.getItem) await new Promise((resolve) => setTimeout(resolve, delays.getItem));
      const value = mockStorage.get(key);
      return value !== undefined ? value : null;
    });

    SecureStorageService.setItem.mockImplementation(async (key, value) => {
      if (delays.setItem) await new Promise((resolve) => setTimeout(resolve, delays.setItem));
      mockStorage.set(key, value);
    });

    SecureStorageService.removeItem.mockImplementation(async (key) => {
      if (delays.removeItem) await new Promise((resolve) => setTimeout(resolve, delays.removeItem));
      mockStorage.delete(key);
    });

    return mockStorage;
  };

  describe('Non-atomic multi-chunk writes', () => {
    it('should demonstrate partial read during multi-chunk save', async () => {
      // Use a very small storage limit to force chunking
      TaskStorageService.setStorageLimit(100);
      const mockStorage = createDelayedStorageMock({ setItem: 10 });

      // Initialize with empty index
      mockStorage.set('tasks_index', {});

      // Create tasks that will require multiple chunks
      const tasks = [
        createTask({ title: 'Task 1', description: 'A' }),
        createTask({ title: 'Task 2', description: 'B' }),
        createTask({ title: 'Task 3', description: 'C' }),
      ];

      // Save multiple tasks concurrently with a read in between
      let readResult = null;
      const operations = [
        async () => {
          // Save operation that will create multiple chunks
          for (const task of tasks) {
            await TaskStorageService.saveTask({ ...task, category: 'work' });
          }
        },
        async () => {
          // Read operation that happens during the save
          await new Promise((resolve) => setTimeout(resolve, 15)); // Read during chunk save
          readResult = await TaskStorageService.getTasksByCategory('work');
        },
      ];

      await runConcurrent(operations);

      // The read might have gotten partial data
      expect(readResult).toBeDefined();
      // This demonstrates the race condition - we might not get all tasks
      console.log('Read result length:', readResult.length);
      console.log('Expected length:', tasks.length);
    });

    it('should demonstrate cleanup race with concurrent reads', async () => {
      TaskStorageService.setStorageLimit(100);
      const mockStorage = createDelayedStorageMock({ removeItem: 20 });

      // Set up initial state with multiple chunks
      mockStorage.set('tasks_index', { task1: 'work', task2: 'work' });
      mockStorage.set('tasks_work', [createTask({ id: 'task1', title: 'Task 1' })]);
      mockStorage.set('tasks_work_1', [createTask({ id: 'task2', title: 'Task 2' })]);

      const readResults = [];
      const operations = [
        async () => {
          // Update operation that will trigger cleanup
          await TaskStorageService.updateTask({
            id: 'task1',
            title: 'Updated Task 1',
            category: 'work',
          });
        },
        async () => {
          // Multiple reads during cleanup
          for (let i = 0; i < 5; i++) {
            await new Promise((resolve) => setTimeout(resolve, i * 5));
            const tasks = await TaskStorageService.getTasksByCategory('work');
            readResults.push(tasks.length);
          }
        },
      ];

      await runConcurrent(operations);

      // Some reads might have gotten inconsistent data
      console.log('Read results:', readResults);
      // Results might vary due to race condition
      expect(readResults.some((length) => length !== readResults[0])).toBe(true);
    });
  });

  describe('Concurrent writes without locking', () => {
    it('should demonstrate data corruption with concurrent saves to same category', async () => {
      const mockStorage = createDelayedStorageMock({ setItem: 5 });
      mockStorage.set('tasks_index', {});

      const task1 = createTask({ title: 'Concurrent Task 1', category: 'work' });
      const task2 = createTask({ title: 'Concurrent Task 2', category: 'work' });
      const task3 = createTask({ title: 'Concurrent Task 3', category: 'work' });

      // Save three tasks concurrently to the same category
      await runConcurrent([
        () => TaskStorageService.saveTask(task1),
        () => TaskStorageService.saveTask(task2),
        () => TaskStorageService.saveTask(task3),
      ]);

      // Check final state
      const finalTasks = await TaskStorageService.getTasksByCategory('work');

      // Due to race condition, we might not have all three tasks
      console.log('Final task count:', finalTasks.length);
      console.log('Expected:', 3);

      // This test demonstrates that concurrent saves can overwrite each other
      // Without proper locking, some tasks might be lost
    });

    it('should demonstrate index corruption with concurrent category changes', async () => {
      const mockStorage = createDelayedStorageMock({ setItem: 10 });

      const taskId = 'shared-task';
      const task = createTask({ id: taskId, title: 'Shared Task', category: 'work' });

      mockStorage.set('tasks_index', { [taskId]: 'work' });
      mockStorage.set('tasks_work', [task]);

      // Multiple concurrent updates changing category
      const operations = [
        () => TaskStorageService.updateTask({ ...task, category: 'home' }),
        () => TaskStorageService.updateTask({ ...task, category: 'personal' }),
        () => TaskStorageService.updateTask({ ...task, category: 'urgent' }),
      ];

      await runConcurrent(operations);

      // Check final state
      const index = mockStorage.get('tasks_index');
      const taskCategories = ['home', 'personal', 'urgent', 'work'];

      let foundCount = 0;
      for (const category of taskCategories) {
        const tasks = mockStorage.get(`tasks_${category}`);
        if (tasks && tasks.length > 0) {
          foundCount++;
          console.log(`Task found in category: ${category}`);
        }
      }

      // Due to race conditions, task might exist in multiple categories
      // or the index might not match where the task actually is
      console.log('Task found in categories:', foundCount);
      console.log('Index says task is in:', index[taskId]);
    });
  });

  describe('Read-write race conditions', () => {
    it('should demonstrate stale reads during concurrent updates', async () => {
      const mockStorage = createDelayedStorageMock({ setItem: 15 });

      const taskId = 'test-task';
      const originalTask = createTask({
        id: taskId,
        title: 'Original Title',
        category: 'work',
        xpReward: 10,
      });

      mockStorage.set('tasks_index', { [taskId]: 'work' });
      mockStorage.set('tasks_work', [originalTask]);

      const readResults = [];
      const operations = [
        async () => {
          // Multiple updates
          for (let i = 1; i <= 5; i++) {
            await TaskStorageService.updateTask({
              ...originalTask,
              title: `Updated Title ${i}`,
              xpReward: i * 10,
            });
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        },
        async () => {
          // Concurrent reads
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 8));
            const tasks = await TaskStorageService.getTasksByCategory('work');
            if (tasks.length > 0) {
              readResults.push({
                title: tasks[0].title,
                xpReward: tasks[0].xpReward,
              });
            }
          }
        },
      ];

      await runConcurrent(operations);

      // Check for inconsistent reads
      console.log('Read results:', readResults);

      // Some reads might show intermediate states or stale data
      const uniqueTitles = new Set(readResults.map((r) => r.title));
      console.log('Unique titles seen:', Array.from(uniqueTitles));

      // This demonstrates that readers can see inconsistent states
      expect(uniqueTitles.size).toBeGreaterThan(1);
    });
  });

  describe('Chunk boundary race conditions', () => {
    it('should demonstrate issues when tasks cross chunk boundaries', async () => {
      // Set a limit that will cause tasks to span multiple chunks
      TaskStorageService.setStorageLimit(150);
      const mockStorage = createDelayedStorageMock({ setItem: 5 });
      mockStorage.set('tasks_index', {});

      // Create tasks that will span chunk boundaries
      const tasks = [];
      for (let i = 0; i < 10; i++) {
        tasks.push(
          createTask({
            title: `Task ${i}`,
            description: 'X'.repeat(20), // Make tasks bigger
            category: 'work',
          }),
        );
      }

      // Save tasks and concurrently delete from the middle
      const operations = [
        async () => {
          // Save all tasks
          for (const task of tasks) {
            await TaskStorageService.saveTask(task);
          }
        },
        async () => {
          // Wait for some tasks to be saved, then delete from middle
          await new Promise((resolve) => setTimeout(resolve, 20));

          // Delete tasks that might be at chunk boundaries
          await TaskStorageService.deleteTask(tasks[3].id);
          await TaskStorageService.deleteTask(tasks[4].id);
          await TaskStorageService.deleteTask(tasks[5].id);
        },
      ];

      await runConcurrent(operations);

      // Check final state
      const finalTasks = await TaskStorageService.getTasksByCategory('work');
      console.log('Final task count:', finalTasks.length);
      console.log('Expected after deletions:', tasks.length - 3);

      // Check chunk consistency
      let chunkCount = 0;
      for (let i = 0; i < 10; i++) {
        const chunkKey = i === 0 ? 'tasks_work' : `tasks_work_${i}`;
        if (mockStorage.get(chunkKey)) {
          chunkCount++;
        }
      }
      console.log('Number of chunks:', chunkCount);

      // This might show inconsistent chunk state due to race conditions
    });
  });
});
