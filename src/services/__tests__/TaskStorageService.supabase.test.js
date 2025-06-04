// ABOUTME: Tests for TaskStorageService Supabase implementation
// Verifies all task operations using Supabase including CRUD, queries, and real-time subscriptions

import { TaskStorageService } from '../TaskStorageService';
import { supabase } from '../SupabaseService';
import { createTask } from '../../utils/TaskModel';
import { TaskStatus, TaskPriority } from '../../types/task.types';

// Mock Supabase
jest.mock('../SupabaseService', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock SecureLogger to avoid console spam in tests
jest.mock('../SecureLogger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('TaskStorageService - Supabase Implementation', () => {
  let taskService;
  const mockUser = { id: 'test-user-123' };

  // Helper to create mock Supabase query builder
  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  });

  // Helper to create mock channel
  const createMockChannel = () => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    taskService = new TaskStorageService();

    // Default auth mock
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('getAllTasks', () => {
    it('should return empty array when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const tasks = await taskService.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it('should fetch all tasks for authenticated user', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          user_id: mockUser.id,
          title: 'Test Task 1',
          description: 'Description 1',
          category: 'work',
          priority: 'high',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'task-2',
          user_id: mockUser.id,
          title: 'Test Task 2',
          description: 'Description 2',
          category: 'personal',
          priority: 'medium',
          status: 'completed',
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const tasks = await taskService.getAllTasks();

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        `user_id.eq.${mockUser.id},assigned_to.eq.${mockUser.id}`,
      );
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Test Task 1');
      expect(tasks[0].status).toBe(TaskStatus.PENDING);
      expect(tasks[1].title).toBe('Test Task 2');
      expect(tasks[1].status).toBe(TaskStatus.COMPLETED);
      expect(tasks[1].completed).toBe(true);
    });

    it('should use cache on subsequent calls within cache duration', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          user_id: mockUser.id,
          title: 'Cached Task',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      // First call - should hit database
      const tasks1 = await taskService.getAllTasks();
      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const tasks2 = await taskService.getAllTasks();
      expect(supabase.from).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(tasks2).toEqual(tasks1);
    });

    it('should handle database errors gracefully', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const tasks = await taskService.getAllTasks();
      expect(tasks).toEqual([]);
    });
  });

  describe('saveTask', () => {
    it('should save a new task to the database', async () => {
      const newTask = createTask({
        title: 'New Task',
        description: 'Task description',
        category: 'work',
        priority: TaskPriority.HIGH,
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: {
          ...newTask,
          id: 'generated-id',
          user_id: mockUser.id,
        },
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await taskService.saveTask(newTask);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.single).toHaveBeenCalled();
    });

    it('should return false when user is not authenticated', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const newTask = createTask({ title: 'New Task' });
      const result = await taskService.saveTask(newTask);

      expect(result).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should invalidate cache after saving', async () => {
      // First, populate cache
      const mockTasks = [
        {
          id: 'task-1',
          user_id: mockUser.id,
          title: 'Existing Task',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockTasks,
        error: null,
      });
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'new-task-id' },
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      // Get tasks to populate cache
      await taskService.getAllTasks();
      jest.clearAllMocks();

      // Save new task
      const newTask = createTask({ title: 'New Task' });
      await taskService.saveTask(newTask);

      // Next getAllTasks should hit database again
      await taskService.getAllTasks();
      expect(supabase.from).toHaveBeenCalledTimes(2); // Once for save, once for getAllTasks
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      const updatedTask = createTask({
        id: 'task-123',
        title: 'Updated Task',
        status: TaskStatus.COMPLETED,
        completed: true,
        completedAt: new Date(),
      });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.or.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await taskService.updateTask(updatedTask);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', updatedTask.id);
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        `user_id.eq.${mockUser.id},assigned_to.eq.${mockUser.id}`,
      );
    });

    it('should handle update errors', async () => {
      const updatedTask = createTask({ id: 'task-123', title: 'Updated Task' });

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.or.mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await taskService.updateTask(updatedTask);
      expect(result).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task by id', async () => {
      const taskId = 'task-to-delete';

      const mockQueryBuilder = createMockQueryBuilder();
      // The last method in the chain returns the promise
      mockQueryBuilder.eq.mockImplementation(() => {
        // Check if this is the last eq call (user_id)
        if (mockQueryBuilder.eq.mock.calls.length === 2) {
          return Promise.resolve({
            data: null,
            error: null,
          });
        }
        return mockQueryBuilder;
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await taskService.deleteTask(taskId);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', taskId);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should only delete tasks owned by the user', async () => {
      const taskId = 'other-users-task';

      const mockQueryBuilder = createMockQueryBuilder();
      supabase.from.mockReturnValue(mockQueryBuilder);

      await taskService.deleteTask(taskId);

      // Verify it includes user_id check
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('getTasksByCategory', () => {
    it('should fetch tasks filtered by category', async () => {
      const category = 'work';
      const mockTasks = [
        {
          id: 'task-1',
          user_id: mockUser.id,
          title: 'Work Task 1',
          category: 'work',
          created_at: new Date().toISOString(),
        },
        {
          id: 'task-2',
          user_id: mockUser.id,
          title: 'Work Task 2',
          category: 'work',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const tasks = await taskService.getTasksByCategory(category);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category', category);
      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.category === category)).toBe(true);
    });

    it('should support pagination options', async () => {
      const category = 'work';
      const options = { page: 2, pageSize: 10 };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.range.mockResolvedValue({
        data: [],
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      await taskService.getTasksByCategory(category, options);

      expect(mockQueryBuilder.range).toHaveBeenCalledWith(10, 19); // offset = (page-1) * pageSize
    });
  });

  describe('getTaskStats', () => {
    it('should calculate task statistics correctly', async () => {
      const mockTasks = [
        { status: 'completed', xp_earned: 10 },
        { status: 'completed', xp_earned: 15 },
        { status: 'pending', xp_earned: 0 },
        { status: 'in_progress', xp_earned: 0 },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.or.mockResolvedValue({
        data: mockTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const stats = await taskService.getTaskStats();

      expect(stats).toEqual({
        total: 4,
        completed: 2,
        pending: 1,
        totalXP: 25,
      });
    });

    it('should return zero stats when no tasks exist', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.or.mockResolvedValue({
        data: [],
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const stats = await taskService.getTaskStats();

      expect(stats).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        totalXP: 0,
      });
    });
  });

  describe('getOverdueTasks', () => {
    it('should fetch tasks past their due date', async () => {
      const now = new Date();
      const overdueTasks = [
        {
          id: 'overdue-1',
          user_id: mockUser.id,
          title: 'Overdue Task',
          due_date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: overdueTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const tasks = await taskService.getOverdueTasks(mockUser.id);

      expect(mockQueryBuilder.lt).toHaveBeenCalledWith('due_date', expect.any(String));
      expect(mockQueryBuilder.neq).toHaveBeenCalledWith('status', TaskStatus.COMPLETED);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Overdue Task');
    });
  });

  describe('getUpcomingTasks', () => {
    it('should fetch tasks due within specified hours', async () => {
      const now = new Date();
      const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const upcomingTasks = [
        {
          id: 'upcoming-1',
          user_id: mockUser.id,
          title: 'Upcoming Task',
          due_date: in12Hours.toISOString(),
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: upcomingTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const tasks = await taskService.getUpcomingTasks(mockUser.id, 24);

      expect(mockQueryBuilder.gte).toHaveBeenCalledWith('due_date', expect.any(String));
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith('due_date', expect.any(String));
      expect(mockQueryBuilder.neq).toHaveBeenCalledWith('status', TaskStatus.COMPLETED);
      expect(tasks).toHaveLength(1);
    });

    it('should use default 24 hours when not specified', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      await taskService.getUpcomingTasks(mockUser.id);

      // Should still be called with proper date filters
      expect(mockQueryBuilder.gte).toHaveBeenCalled();
      expect(mockQueryBuilder.lte).toHaveBeenCalled();
    });
  });

  describe('Real-time subscriptions', () => {
    it('should subscribe to task updates for a user', async () => {
      const mockChannel = createMockChannel();
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = taskService.subscribeToTaskUpdates(mockUser.id, callback);

      expect(supabase.channel).toHaveBeenCalledWith(`tasks:${mockUser.id}`);
      expect(mockChannel.on).toHaveBeenCalledTimes(2); // Once for user_id, once for assigned_to
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle task insert events', async () => {
      const mockChannel = createMockChannel();
      let capturedHandler;

      mockChannel.on.mockImplementation((event, options, handler) => {
        if (options.filter === `user_id=eq.${mockUser.id}`) {
          capturedHandler = handler;
        }
        return mockChannel;
      });

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      taskService.subscribeToTaskUpdates(mockUser.id, callback);

      // Simulate INSERT event
      const newTask = {
        id: 'new-task',
        user_id: mockUser.id,
        title: 'Real-time Task',
        created_at: new Date().toISOString(),
      };

      capturedHandler({
        eventType: 'INSERT',
        new: newTask,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-task',
          title: 'Real-time Task',
        }),
        'INSERT',
      );
    });

    it('should invalidate cache on real-time updates', async () => {
      const mockChannel = createMockChannel();
      let capturedHandler;

      mockChannel.on.mockImplementation((event, options, handler) => {
        if (options.filter === `user_id=eq.${mockUser.id}`) {
          capturedHandler = handler;
        }
        return mockChannel;
      });

      supabase.channel.mockReturnValue(mockChannel);

      // First populate cache
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: [{ id: 'existing-task' }],
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      await taskService.getAllTasks();
      jest.clearAllMocks();

      // Subscribe to updates
      const callback = jest.fn();
      taskService.subscribeToTaskUpdates(mockUser.id, callback);

      // Trigger update event
      capturedHandler({
        eventType: 'UPDATE',
        new: { id: 'updated-task' },
      });

      // Next getAllTasks should hit database
      await taskService.getAllTasks();
      expect(supabase.from).toHaveBeenCalled();
    });
  });

  describe('Partner task operations', () => {
    it('should fetch tasks assigned by user', async () => {
      const mockTasks = [
        {
          id: 'assigned-task',
          assigned_by: mockUser.id,
          user_id: 'other-user',
          title: 'Task I assigned',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const tasks = await taskService.getTasksAssignedByUser(mockUser.id);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('assigned_by', mockUser.id);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].assignedBy).toBe(mockUser.id);
    });

    it('should fetch partner tasks (assigned by or to user)', async () => {
      const mockTasks = [
        {
          id: 'partner-task',
          assigned_by: mockUser.id,
          user_id: 'partner-id',
          title: 'Partner Task',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.order.mockResolvedValue({
        data: mockTasks,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const tasks = await taskService.getPartnerTasks(mockUser.id);

      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        `assigned_by.eq.${mockUser.id},assigned_to.eq.${mockUser.id}`,
      );
      expect(mockQueryBuilder.neq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(tasks).toHaveLength(1);
    });
  });
});
