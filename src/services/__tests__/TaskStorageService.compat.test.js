// ABOUTME: Compatibility tests for TaskStorageService to ensure backward compatibility
// Tests that the new category-based implementation still works with existing test patterns

import TaskStorageService from '../TaskStorageService';
import { supabase } from '../SupabaseService';
import { createTask } from '../../utils/TaskModel';

// Mock Supabase
jest.mock('../SupabaseService', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock SecureLogger to avoid console spam
jest.mock('../SecureLogger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('TaskStorageService - Backward Compatibility', () => {
  const mockUser = { id: 'test-user-123' };
  let mockTasks = [];

  // Helper to create mock query builder
  const createMockQueryBuilder = (data = null, error = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    then: (resolve, reject) => {
      if (error) {
        reject?.(error);
      } else {
        resolve({ data, error });
      }
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTasks = [];

    // Default auth mock
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Default from mock
    supabase.from.mockImplementation((table) => {
      if (table === 'tasks') {
        return createMockQueryBuilder(mockTasks);
      }
      return createMockQueryBuilder();
    });
  });

  describe('getAllTasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should return stored tasks', async () => {
      const dbTasks = [
        {
          id: 'task-1',
          user_id: mockUser.id,
          title: 'Task 1',
          category: 'home',
          status: 'pending',
          priority: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'task-2',
          user_id: mockUser.id,
          title: 'Task 2',
          category: 'work',
          status: 'pending',
          priority: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: dbTasks, error: null }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.find((t) => t.title === 'Task 1')).toBeTruthy();
      expect(tasks.find((t) => t.title === 'Task 2')).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const tasks = await TaskStorageService.getAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('saveTask', () => {
    it('should save a new task', async () => {
      const task = createTask({ title: 'New Task', category: 'home', userId: mockUser.id });

      const queryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { ...task, id: 'new-task-id' }, error: null }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const result = await TaskStorageService.saveTask(task);
      expect(result).toBe(true);
      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Task',
          category: 'home',
          user_id: mockUser.id,
        }),
      );
    });

    it('should handle save errors', async () => {
      const task = createTask({ title: 'New Task', category: 'home' });

      const queryBuilder = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const result = await TaskStorageService.saveTask(task);
      expect(result).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('should update existing task', async () => {
      const task = createTask({ id: 'task-123', title: 'Original Title', category: 'home' });
      const updatedTask = { ...task, title: 'Updated Title' };

      const queryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedTask, error: null }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const result = await TaskStorageService.updateTask(updatedTask);
      expect(result).toBe(true);
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Title',
        }),
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'task-123');
    });

    it('should handle update errors', async () => {
      const task = createTask({ id: 'task-123', title: 'Task' });

      const queryBuilder = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const result = await TaskStorageService.updateTask(task);
      expect(result).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      const queryBuilder = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const result = await TaskStorageService.deleteTask('task-123');
      expect(result).toBe(true);
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'task-123');
    });

    it('should handle delete errors', async () => {
      const queryBuilder = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Delete failed') }),
      };
      supabase.from.mockReturnValue(queryBuilder);

      const result = await TaskStorageService.deleteTask('task-123');
      expect(result).toBe(false);
    });
  });
});
