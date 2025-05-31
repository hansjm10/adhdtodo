// ABOUTME: Tests for TaskStorageService which handles local task persistence
// Verifies storage operations including save, load, update, and delete

import TaskStorageService from '../TaskStorageService';
import SecureStorageService from '../SecureStorageService';
import { createTask } from '../../utils/TaskModel';

// Mock SecureStorageService
jest.mock('../SecureStorageService');

describe('TaskStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Reset mock implementations to default
    SecureStorageService.setItem.mockImplementation(() => Promise.resolve());
    SecureStorageService.getItem.mockImplementation(() => Promise.resolve(null));
    SecureStorageService.removeItem.mockImplementation(() => Promise.resolve());
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should return stored tasks', async () => {
      const mockTasks = [createTask({ title: 'Task 1' }), createTask({ title: 'Task 2' })];

      SecureStorageService.getItem.mockResolvedValue(mockTasks);

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    it('should handle corrupted data gracefully', async () => {
      // SecureStorageService.getItem would return null for invalid JSON
      SecureStorageService.getItem.mockResolvedValue(null);

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('saveTask', () => {
    it('should save a new task', async () => {
      const task = createTask({ title: 'New Task' });

      await TaskStorageService.saveTask(task);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith(
        'tasks',
        expect.arrayContaining([expect.objectContaining({ title: 'New Task' })]),
      );
    });

    it('should add task to existing tasks', async () => {
      const existingTask = createTask({ title: 'Existing Task' });
      SecureStorageService.getItem.mockResolvedValue([existingTask]);

      const newTask = createTask({ title: 'New Task' });
      await TaskStorageService.saveTask(newTask);

      const savedData = SecureStorageService.setItem.mock.calls[0][1];
      expect(savedData).toHaveLength(2);
    });
  });

  describe('updateTask', () => {
    it('should update existing task', async () => {
      const task = createTask({ title: 'Original Title' });
      SecureStorageService.getItem.mockResolvedValue([task]);

      const updatedTask = { ...task, title: 'Updated Title' };
      await TaskStorageService.updateTask(updatedTask);

      const savedData = SecureStorageService.setItem.mock.calls[0][1];
      expect(savedData[0].title).toBe('Updated Title');
    });

    it('should not update non-existent task', async () => {
      SecureStorageService.getItem.mockResolvedValue([]);

      const task = createTask({ title: 'Non-existent' });
      const result = await TaskStorageService.updateTask(task);

      expect(result).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      const task = createTask({ title: 'Task to Delete' });
      SecureStorageService.getItem.mockResolvedValue([task]);

      await TaskStorageService.deleteTask(task.id);

      const savedData = SecureStorageService.setItem.mock.calls[0][1];
      expect(savedData).toHaveLength(0);
    });

    it('should not affect other tasks when deleting', async () => {
      const task1 = createTask({ title: 'Task 1' });
      const task2 = createTask({ title: 'Task 2' });
      SecureStorageService.getItem.mockResolvedValue([task1, task2]);

      await TaskStorageService.deleteTask(task1.id);

      const savedData = SecureStorageService.setItem.mock.calls[0][1];
      expect(savedData).toHaveLength(1);
      expect(savedData[0].title).toBe('Task 2');
    });
  });
});
