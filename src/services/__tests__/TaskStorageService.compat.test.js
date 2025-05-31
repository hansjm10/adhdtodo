// ABOUTME: Compatibility tests for TaskStorageService to ensure backward compatibility
// Tests that the new category-based implementation still works with existing test patterns

import TaskStorageService from '../TaskStorageService';
import SecureStorageService from '../SecureStorageService';
import { createTask } from '../../utils/TaskModel';

// Mock SecureStorageService
jest.mock('../SecureStorageService');

describe('TaskStorageService - Backward Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Reset mock implementations to default
    SecureStorageService.setItem.mockImplementation(() => Promise.resolve());
    SecureStorageService.getItem.mockImplementation((key) => {
      // Return empty index to indicate we're using new format
      if (key === 'tasks_index') return Promise.resolve({});
      return Promise.resolve(null);
    });
    SecureStorageService.removeItem.mockImplementation(() => Promise.resolve());
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should return stored tasks from old format', async () => {
      const mockTasks = [
        createTask({ title: 'Task 1', category: 'home' }),
        createTask({ title: 'Task 2', category: 'work' }),
      ];

      // Mock to simulate old format that gets migrated
      let migrated = false;
      const migratedData = {};

      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks' && !migrated) return Promise.resolve(mockTasks);
        if (key === 'tasks_index' && !migrated) return Promise.resolve(null);
        // After migration
        return Promise.resolve(migratedData[key] || null);
      });

      SecureStorageService.setItem.mockImplementation((key, value) => {
        migratedData[key] = value;
        if (key === 'tasks_index') migrated = true;
        return Promise.resolve();
      });

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.find((t) => t.title === 'Task 1')).toBeTruthy();
      expect(tasks.find((t) => t.title === 'Task 2')).toBeTruthy();
    });

    it('should handle corrupted data gracefully', async () => {
      SecureStorageService.getItem.mockResolvedValue(null);

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('saveTask', () => {
    it('should save a new task', async () => {
      const task = createTask({ title: 'New Task', category: 'home' });

      await TaskStorageService.saveTask(task);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith(
        'tasks_home',
        expect.arrayContaining([expect.objectContaining({ title: 'New Task' })]),
      );
    });

    it('should add task to existing tasks', async () => {
      const existingTask = createTask({ title: 'Existing Task', category: 'home' });
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index') return Promise.resolve({ [existingTask.id]: 'home' });
        if (key === 'tasks_home') return Promise.resolve([existingTask]);
        return Promise.resolve(null);
      });

      const newTask = createTask({ title: 'New Task', category: 'home' });
      await TaskStorageService.saveTask(newTask);

      const savedData = SecureStorageService.setItem.mock.calls.find(
        (call) => call[0] === 'tasks_home',
      )[1];
      expect(savedData).toHaveLength(2);
    });
  });

  describe('updateTask', () => {
    it('should update existing task', async () => {
      const task = createTask({ title: 'Original Title', category: 'home' });
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index') return Promise.resolve({ [task.id]: 'home' });
        if (key === 'tasks_home') return Promise.resolve([task]);
        return Promise.resolve(null);
      });

      const updatedTask = { ...task, title: 'Updated Title' };
      await TaskStorageService.updateTask(updatedTask);

      const savedData = SecureStorageService.setItem.mock.calls.find(
        (call) => call[0] === 'tasks_home',
      )[1];
      expect(savedData[0].title).toBe('Updated Title');
    });

    it('should not update non-existent task', async () => {
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index') return Promise.resolve({});
        return Promise.resolve(null);
      });

      const task = createTask({ title: 'Non-existent' });
      const result = await TaskStorageService.updateTask(task);

      expect(result).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      const task = createTask({ title: 'Task to Delete', category: 'home' });
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index') return Promise.resolve({ [task.id]: 'home' });
        if (key === 'tasks_home') return Promise.resolve([task]);
        return Promise.resolve(null);
      });

      await TaskStorageService.deleteTask(task.id);

      const savedData = SecureStorageService.setItem.mock.calls.find(
        (call) => call[0] === 'tasks_home',
      )[1];
      expect(savedData).toHaveLength(0);
    });

    it('should not affect other tasks when deleting', async () => {
      const task1 = createTask({ title: 'Task 1', category: 'home' });
      const task2 = createTask({ title: 'Task 2', category: 'home' });
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index')
          return Promise.resolve({
            [task1.id]: 'home',
            [task2.id]: 'home',
          });
        if (key === 'tasks_home') return Promise.resolve([task1, task2]);
        return Promise.resolve(null);
      });

      await TaskStorageService.deleteTask(task1.id);

      const savedData = SecureStorageService.setItem.mock.calls.find(
        (call) => call[0] === 'tasks_home',
      )[1];
      expect(savedData).toHaveLength(1);
      expect(savedData[0].title).toBe('Task 2');
    });
  });
});
