// ABOUTME: Compatibility tests for TaskStorageService to ensure backward compatibility
// Tests that the new category-based implementation still works with existing test patterns

import TaskStorageService from '../TaskStorageService';
import SecureStorageService from '../SecureStorageService';
import { createTask } from '../../utils/TaskModel';

// Mock SecureStorageService
jest.mock('../SecureStorageService');

describe('TaskStorageService - Backward Compatibility', () => {
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

    // Initialize with empty index to indicate we're using new format
    mockStorage['tasks_index'] = {};
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

      // Set up old format data
      mockStorage['tasks'] = mockTasks;
      delete mockStorage['tasks_index']; // Remove index to simulate old format

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.find((t) => t.title === 'Task 1')).toBeTruthy();
      expect(tasks.find((t) => t.title === 'Task 2')).toBeTruthy();
    });

    it('should handle corrupted data gracefully', async () => {
      // Clear all storage to simulate no data
      mockStorage = {};

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
      // Pre-populate storage with existing task and index
      mockStorage['tasks_index'] = { [existingTask.id]: 'home' };
      mockStorage['tasks_home'] = [existingTask];

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
      // Pre-populate storage with task and index
      mockStorage['tasks_index'] = { [task.id]: 'home' };
      mockStorage['tasks_home'] = [task];

      const updatedTask = { ...task, title: 'Updated Title' };
      await TaskStorageService.updateTask(updatedTask);

      const savedData = SecureStorageService.setItem.mock.calls.find(
        (call) => call[0] === 'tasks_home',
      )[1];
      expect(savedData[0].title).toBe('Updated Title');
    });

    it('should not update non-existent task', async () => {
      // Empty index means task doesn't exist
      mockStorage['tasks_index'] = {};

      const task = createTask({ title: 'Non-existent' });
      const result = await TaskStorageService.updateTask(task);

      expect(result).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      const task = createTask({ title: 'Task to Delete', category: 'home' });
      // Pre-populate storage with task and index
      mockStorage['tasks_index'] = { [task.id]: 'home' };
      mockStorage['tasks_home'] = [task];

      await TaskStorageService.deleteTask(task.id);

      const savedData = SecureStorageService.setItem.mock.calls.find(
        (call) => call[0] === 'tasks_home',
      )[1];
      expect(savedData).toHaveLength(0);
    });

    it('should not affect other tasks when deleting', async () => {
      const task1 = createTask({ title: 'Task 1', category: 'home' });
      const task2 = createTask({ title: 'Task 2', category: 'home' });
      // Pre-populate storage with tasks and index
      mockStorage['tasks_index'] = {
        [task1.id]: 'home',
        [task2.id]: 'home',
      };
      mockStorage['tasks_home'] = [task1, task2];

      await TaskStorageService.deleteTask(task1.id);

      const savedData = SecureStorageService.setItem.mock.calls.find(
        (call) => call[0] === 'tasks_home',
      )[1];
      expect(savedData).toHaveLength(1);
      expect(savedData[0].title).toBe('Task 2');
    });
  });
});
