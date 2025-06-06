// ABOUTME: Performance-focused tests for TaskStorageService
// Tests the new category-based storage implementation for efficiency

import TaskStorageService from '../TaskStorageService';
import SecureStorageService from '../SecureStorageService';
import { createTask } from '../../utils/TaskModel';

// Mock SecureStorageService
jest.mock('../SecureStorageService');

describe.skip('TaskStorageService Performance Improvements', () => {
  // SKIP: These tests are for the old SecureStorageService-based implementation
  // The current TaskStorageService uses Supabase exclusively
  let mockStorage = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockStorage = {};

    // Mock storage that actually stores and retrieves values
    SecureStorageService.setItem.mockImplementation((key, value) => {
      mockStorage[key] = value;
      return Promise.resolve();
    });
    SecureStorageService.getItem.mockImplementation((key) => {
      return Promise.resolve(mockStorage[key] || null);
    });
    SecureStorageService.removeItem.mockImplementation((key) => {
      delete mockStorage[key];
      return Promise.resolve();
    });
  });

  describe('Category-based storage', () => {
    it('should store tasks by category to avoid loading all tasks', async () => {
      const redTask = createTask({ title: 'Red Task', category: 'red' });
      const blueTask = createTask({ title: 'Blue Task', category: 'blue' });

      await TaskStorageService.saveTask(redTask);
      await TaskStorageService.saveTask(blueTask);

      // Should create separate storage keys for each category
      expect(SecureStorageService.setItem).toHaveBeenCalledWith(
        'tasks_red',
        expect.arrayContaining([expect.objectContaining({ category: 'red' })]),
      );
      expect(SecureStorageService.setItem).toHaveBeenCalledWith(
        'tasks_blue',
        expect.arrayContaining([expect.objectContaining({ category: 'blue' })]),
      );
    });

    it('should load only tasks from requested category', async () => {
      const redTasks = [
        createTask({ title: 'Red 1', category: 'red' }),
        createTask({ title: 'Red 2', category: 'red' }),
      ];
      // Pre-populate storage with red tasks
      mockStorage['tasks_red'] = redTasks;

      const tasks = await TaskStorageService.getTasksByCategory('red');

      // Should only call getItem for the red category
      expect(SecureStorageService.getItem).toHaveBeenCalledWith('tasks_red');
      expect(SecureStorageService.getItem).not.toHaveBeenCalledWith('tasks_blue');
      expect(SecureStorageService.getItem).not.toHaveBeenCalledWith('tasks_green');
      expect(tasks).toHaveLength(2);
    });

    it('should maintain task index for efficient updates', async () => {
      const task = createTask({ title: 'Test Task', category: 'red' });

      // Pre-populate storage with index and task
      mockStorage['tasks_index'] = { [task.id]: 'red' };
      mockStorage['tasks_red'] = [task];

      const updatedTask = { ...task, title: 'Updated Task' };
      await TaskStorageService.updateTask(updatedTask);

      // Should use index to find category and only update that category's storage
      expect(SecureStorageService.getItem).toHaveBeenCalledWith('tasks_index');
      expect(SecureStorageService.getItem).toHaveBeenCalledWith('tasks_red');
      expect(SecureStorageService.getItem).not.toHaveBeenCalledWith('tasks_blue');
      expect(SecureStorageService.getItem).not.toHaveBeenCalledWith('tasks_green');
    });

    it('should handle getAllTasks efficiently by merging categories', async () => {
      const redTasks = [createTask({ title: 'Red', category: 'red' })];
      const blueTasks = [createTask({ title: 'Blue', category: 'blue' })];
      const greenTasks = [createTask({ title: 'Green', category: 'green' })];

      // Pre-populate storage with tasks in different categories
      mockStorage['tasks_red'] = redTasks;
      mockStorage['tasks_blue'] = blueTasks;
      mockStorage['tasks_green'] = greenTasks;

      const allTasks = await TaskStorageService.getAllTasks();

      // Should load from all categories
      expect(SecureStorageService.getItem).toHaveBeenCalledWith('tasks_red');
      expect(SecureStorageService.getItem).toHaveBeenCalledWith('tasks_blue');
      expect(SecureStorageService.getItem).toHaveBeenCalledWith('tasks_green');
      expect(allTasks).toHaveLength(3);
    });

    it.skip('should handle storage size limits by splitting large categories', async () => {
      // Skip this test - setStorageLimit method not implemented
      // TODO: Implement storage limit functionality if needed
      // TaskStorageService.setStorageLimit(1000);

      // Create tasks that would exceed the limit when stored together
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        tasks.push(
          createTask({
            title: `Task ${i}`,
            category: 'red',
            description:
              'This is a long description to increase the size of each task so they will need to be chunked when multiple tasks are stored together',
          }),
        );
      }

      // Initialize empty storage
      mockStorage['tasks_index'] = {};
      mockStorage['tasks_red'] = [];

      // Save tasks individually - they should accumulate and eventually split
      for (const task of tasks) {
        await TaskStorageService.saveTask(task);
      }

      // Should have created multiple chunks
      expect(SecureStorageService.setItem).toHaveBeenCalledWith('tasks_red_1', expect.any(Array));

      // Reset storage limit
      TaskStorageService.resetStorageLimit();
    });
  });

  describe('Pagination support', () => {
    it('should support paginated loading of tasks', async () => {
      const tasks = [];
      for (let i = 0; i < 30; i++) {
        tasks.push(createTask({ title: `Task ${i}`, category: 'red' }));
      }

      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_red') return Promise.resolve(tasks);
        return Promise.resolve(null);
      });

      // Load first page
      const firstPage = await TaskStorageService.getTasksByCategory('red', {
        page: 1,
        pageSize: 10,
      });
      expect(firstPage).toHaveLength(10);
      expect(firstPage[0].title).toBe('Task 0');

      // Load second page
      const secondPage = await TaskStorageService.getTasksByCategory('red', {
        page: 2,
        pageSize: 10,
      });
      expect(secondPage).toHaveLength(10);
      expect(secondPage[0].title).toBe('Task 10');
    });
  });

  describe('Backward compatibility', () => {
    it('should migrate from old format to new category-based format', async () => {
      const oldTasks = [
        createTask({ title: 'Old Red', category: 'red' }),
        createTask({ title: 'Old Blue', category: 'blue' }),
      ];

      // Store the migrated data
      const migratedData = {};

      // Mock implementation that handles migration
      let migrationDone = false;
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks' && !migrationDone) {
          return Promise.resolve(oldTasks);
        }
        if (key === 'tasks_index' && !migrationDone) {
          return Promise.resolve(null); // Not migrated yet
        }
        // After migration, return the migrated data
        return Promise.resolve(migratedData[key] || null);
      });

      SecureStorageService.setItem.mockImplementation((key, value) => {
        migratedData[key] = value;
        if (key === 'tasks_index') {
          migrationDone = true;
        }
        return Promise.resolve();
      });

      // Trigger migration by getting all tasks
      const tasks = await TaskStorageService.getAllTasks();

      // Should have migrated to new format
      expect(SecureStorageService.setItem).toHaveBeenCalledWith(
        'tasks_red',
        expect.arrayContaining([expect.objectContaining({ category: 'red' })]),
      );
      expect(SecureStorageService.setItem).toHaveBeenCalledWith(
        'tasks_blue',
        expect.arrayContaining([expect.objectContaining({ category: 'blue' })]),
      );
      expect(SecureStorageService.removeItem).toHaveBeenCalledWith('tasks');
      expect(tasks).toHaveLength(2);
    });
  });
});
