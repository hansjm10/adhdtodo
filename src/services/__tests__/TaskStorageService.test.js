// ABOUTME: Tests for TaskStorageService which handles local task persistence
// Verifies storage operations including save, load, update, and delete

import AsyncStorage from '@react-native-async-storage/async-storage';
import TaskStorageService from '../TaskStorageService';
import { createTask } from '../../utils/TaskModel';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('TaskStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear.mockClear();
    AsyncStorage.getAllKeys.mockClear();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should return stored tasks', async () => {
      const mockTasks = [createTask({ title: 'Task 1' }), createTask({ title: 'Task 2' })];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockTasks));

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    it('should handle corrupted data gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json');

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('saveTask', () => {
    it('should save a new task', async () => {
      const task = createTask({ title: 'New Task' });

      await TaskStorageService.saveTask(task);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'tasks',
        expect.stringContaining('New Task'),
      );
    });

    it('should add task to existing tasks', async () => {
      const existingTask = createTask({ title: 'Existing Task' });
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([existingTask]));

      const newTask = createTask({ title: 'New Task' });
      await TaskStorageService.saveTask(newTask);

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
    });
  });

  describe('updateTask', () => {
    it('should update existing task', async () => {
      const task = createTask({ title: 'Original Title' });
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([task]));

      const updatedTask = { ...task, title: 'Updated Title' };
      await TaskStorageService.updateTask(updatedTask);

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData[0].title).toBe('Updated Title');
    });

    it('should not update non-existent task', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const task = createTask({ title: 'Non-existent' });
      const result = await TaskStorageService.updateTask(task);

      expect(result).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      const task = createTask({ title: 'Task to Delete' });
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([task]));

      await TaskStorageService.deleteTask(task.id);

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(0);
    });

    it('should not affect other tasks when deleting', async () => {
      const task1 = createTask({ title: 'Task 1' });
      const task2 = createTask({ title: 'Task 2' });
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([task1, task2]));

      await TaskStorageService.deleteTask(task1.id);

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].title).toBe('Task 2');
    });
  });
});
