// ABOUTME: Tests for TaskStorageService which handles local task persistence
// Verifies storage operations including save, load, update, and delete

import TaskStorageService from '../TaskStorageService';
import SecureStorageService from '../SecureStorageService';
import UserStorageService from '../UserStorageService';
import { createTask } from '../../utils/TaskModel';

// Mock SecureStorageService
jest.mock('../SecureStorageService');
jest.mock('../UserStorageService');

describe('TaskStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Reset mock implementations to default
    SecureStorageService.setItem.mockImplementation(() => Promise.resolve());
    SecureStorageService.getItem.mockImplementation((key) => {
      // Always return an empty index to indicate new format is in use
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
      const task = createTask({ title: 'Non-existent', category: 'home' });
      // Task not in index means it doesn't exist
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index') return Promise.resolve({});
        return Promise.resolve(null);
      });

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

  describe('getPartnerTasks', () => {
    const mockUser = {
      id: 'user_123',
      name: 'Test User',
      partnerId: 'partner_456',
    };

    const partnerAssignedTask = createTask({
      id: 'task_1',
      title: 'Partner Assigned Task',
      assignedBy: 'partner_456',
      assignedTo: 'user_123',
    });

    const userAssignedTask = createTask({
      id: 'task_2',
      title: 'User Assigned Task',
      assignedBy: 'user_123',
      assignedTo: 'partner_456',
    });

    const unrelatedTask = createTask({
      id: 'task_3',
      title: 'Unrelated Task',
      assignedBy: 'other_user',
      assignedTo: 'another_user',
    });

    beforeEach(() => {
      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index') {
          return Promise.resolve({
            task_1: 'work',
            task_2: 'work',
            task_3: 'work',
          });
        }
        if (key === 'tasks_work') {
          return Promise.resolve([partnerAssignedTask, userAssignedTask, unrelatedTask]);
        }
        return Promise.resolve(null);
      });
    });

    it('should return tasks between user and partner', async () => {
      const tasks = await TaskStorageService.getPartnerTasks('user_123');

      expect(tasks).toHaveLength(2);
      expect(tasks).toContainEqual(expect.objectContaining({ title: 'Partner Assigned Task' }));
      expect(tasks).toContainEqual(expect.objectContaining({ title: 'User Assigned Task' }));
    });

    it('should return empty array when currentUser is null', async () => {
      UserStorageService.getCurrentUser.mockResolvedValue(null);

      const tasks = await TaskStorageService.getPartnerTasks('user_123');

      expect(tasks).toEqual([]);
    });

    it('should return empty array when currentUser.partnerId is null', async () => {
      UserStorageService.getCurrentUser.mockResolvedValue({
        ...mockUser,
        partnerId: null,
      });

      const tasks = await TaskStorageService.getPartnerTasks('user_123');

      expect(tasks).toEqual([]);
    });

    it('should handle tasks with null assignedBy or assignedTo fields', async () => {
      const taskWithNullAssignedBy = createTask({
        id: 'task_4',
        title: 'Task with null assignedBy',
        assignedBy: null,
        assignedTo: 'partner_456',
      });

      const taskWithNullAssignedTo = createTask({
        id: 'task_5',
        title: 'Task with null assignedTo',
        assignedBy: 'user_123',
        assignedTo: null,
      });

      SecureStorageService.getItem.mockImplementation((key) => {
        if (key === 'tasks_index') {
          return Promise.resolve({
            task_1: 'work',
            task_4: 'work',
            task_5: 'work',
          });
        }
        if (key === 'tasks_work') {
          return Promise.resolve([
            partnerAssignedTask,
            taskWithNullAssignedBy,
            taskWithNullAssignedTo,
          ]);
        }
        return Promise.resolve(null);
      });

      const tasks = await TaskStorageService.getPartnerTasks('user_123');

      // Should only return the valid partner task
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Partner Assigned Task');
    });

    it('should handle getCurrentUser errors gracefully', async () => {
      UserStorageService.getCurrentUser.mockRejectedValue(new Error('User service error'));

      const tasks = await TaskStorageService.getPartnerTasks('user_123');

      expect(tasks).toEqual([]);
    });
  });
});
