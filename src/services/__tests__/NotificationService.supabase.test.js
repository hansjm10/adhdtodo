// ABOUTME: Tests for NotificationService Supabase implementation
// Verifies all notification operations using Supabase including CRUD and real-time subscriptions

import { NotificationService } from '../NotificationService';
import { supabase } from '../SupabaseService';
import { NotificationTypes } from '../../types';
import { testDataFactories } from '../../../tests/utils';
import UserStorageService from '../UserStorageService';

// SupabaseService is already mocked globally in tests/setup.js

// Mock SecureLogger
jest.mock('../SecureLogger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Mock UserStorageService
jest.mock('../UserStorageService');

describe('NotificationService - Supabase Implementation', () => {
  let notificationService;
  const mockUser = { id: 'test-user-123' };
  const mockPartner = { id: 'partner-user-456' };

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
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
  });

  // Helper to create mock channel
  const createMockChannel = () => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();

    // Default auth mock
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('sendNotification', () => {
    it('should create a notification in the database', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.sendNotification(
        mockPartner.id,
        NotificationTypes.TASK_ASSIGNED,
        { taskId: 'task-123', taskTitle: 'Test Task' },
      );

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        // eslint-disable-next-line custom-rules/enforce-test-data-factories
        expect.objectContaining({
          user_id: mockPartner.id,
          type: NotificationTypes.TASK_ASSIGNED,
          title: expect.any(String),
          message: expect.any(String),
          data: { taskId: 'task-123', taskTitle: 'Test Task' },
          priority: expect.any(String),
        }),
      );
    });

    it('should return false on database error', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.sendNotification(
        mockPartner.id,
        NotificationTypes.TASK_ASSIGNED,
        {},
      );

      expect(result).toBe(false);
    });
  });

  describe('Task notification methods', () => {
    const mockTask = testDataFactories.task({
      id: 'task-123',
      title: 'Test Task',
      assignedBy: 'assigner-123',
      assignedTo: 'partner-456',
      userId: 'owner-789',
    });

    const mockAssigner = testDataFactories.user({
      id: 'assigner-123',
      name: 'Test Assigner',
    });

    const mockStartedByUser = testDataFactories.user({
      id: 'started-by-456',
      name: 'Started By User',
    });

    const mockCompletedByUser = testDataFactories.user({
      id: 'completed-by-789',
      name: 'Completed By User',
    });

    it('should notify when task is assigned', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.notifyTaskAssigned(mockTask, mockAssigner);

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'partner-456',
          type: NotificationTypes.TASK_ASSIGNED,
          data: expect.objectContaining({
            taskId: mockTask.id,
            assignedByUserId: mockAssigner.id,
          }),
        }),
      );
    });

    it('should notify when task is started', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.notifyTaskStarted(mockTask, mockStartedByUser);

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'assigner-123', // Notify the assigner
          type: NotificationTypes.TASK_STARTED,
          data: expect.objectContaining({
            taskId: mockTask.id,
            startedByUserId: mockStartedByUser.id,
          }),
        }),
      );
    });

    it('should notify when task is completed', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.notifyTaskCompleted(mockTask, mockCompletedByUser);

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'assigner-123', // Notify the assigner
          type: NotificationTypes.TASK_COMPLETED,
          data: expect.objectContaining({
            taskId: mockTask.id,
            completedByUserId: mockCompletedByUser.id,
          }),
        }),
      );
    });

    it('should notify when task is overdue', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.notifyTaskOverdue(mockTask);

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationTypes.TASK_OVERDUE,
          priority: 'high',
        }),
      );
    });
  });

  describe('Encouragement and check-in', () => {
    beforeEach(() => {
      // Mock UserStorageService.getUserById to return user data
      UserStorageService.getUserById = jest.fn().mockImplementation((userId) => {
        if (userId === mockUser.id) {
          return Promise.resolve(testDataFactories.user({ id: mockUser.id, name: 'Test User' }));
        }
        return Promise.resolve(null);
      });
    });

    it('should send encouragement message', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.sendEncouragement(
        mockUser.id,
        mockPartner.id,
        'You got this!',
        'task-123',
      );

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockPartner.id,
          type: NotificationTypes.ENCOURAGEMENT,
          message: expect.stringContaining('You got this!'),
          data: expect.objectContaining({
            fromUserId: mockUser.id,
            taskId: 'task-123',
          }),
        }),
      );
    });

    it('should send check-in message', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.insert.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.sendCheckIn(
        mockUser.id,
        mockPartner.id,
        'How are you doing?',
      );

      expect(result).toBe(true);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockPartner.id,
          type: NotificationTypes.CHECK_IN,
          message: expect.stringContaining('How are you doing?'),
        }),
      );
    });
  });

  describe('getNotificationsForUser', () => {
    it('should fetch all notifications for a user', async () => {
      const mockNotifications = [
        // eslint-disable-next-line custom-rules/enforce-test-data-factories
        {
          id: 'notif-1',
          user_id: mockUser.id,
          type: NotificationTypes.TASK_ASSIGNED,
          title: 'New Task',
          message: 'You have a new task',
          data: {},
          read: false,
          created_at: new Date().toISOString(),
        },
        // eslint-disable-next-line custom-rules/enforce-test-data-factories
        {
          id: 'notif-2',
          user_id: mockUser.id,
          type: NotificationTypes.ENCOURAGEMENT,
          title: 'Encouragement',
          message: 'Keep going!',
          data: {},
          read: true,
          created_at: new Date().toISOString(),
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit.mockResolvedValue({
        data: mockNotifications,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const notifications = await notificationService.getNotificationsForUser(mockUser.id);

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);

      expect(notifications).toHaveLength(2);
      expect(notifications[0].type).toBe(NotificationTypes.TASK_ASSIGNED);
      expect(notifications[1].type).toBe(NotificationTypes.ENCOURAGEMENT);
    });

    it('should return empty array on error', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.limit.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const notifications = await notificationService.getNotificationsForUser(mockUser.id);
      expect(notifications).toEqual([]);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should count unread notifications correctly', async () => {
      const mockNotifications = [
        { id: '1', read: false },

        { id: '2', read: false },

        { id: '3', read: true },
      ];

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.is.mockResolvedValue({
        data: mockNotifications.filter((n) => !n.read),
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const count = await notificationService.getUnreadNotificationCount(mockUser.id);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQueryBuilder.is).toHaveBeenCalledWith('read', false);
      expect(count).toBe(2);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notif-123';

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockImplementation((field, value) => {
        if (field === 'id' && value === notificationId) {
          return Promise.resolve({
            data: null,
            error: null,
          });
        }
        return mockQueryBuilder;
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.markNotificationAsRead(notificationId);

      expect(result).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        read: true,
        read_at: expect.any(String),
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', notificationId);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.is.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.markAllNotificationsAsRead(mockUser.id);

      expect(result).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        read: true,
        read_at: expect.any(String),
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockQueryBuilder.is).toHaveBeenCalledWith('read', false);
    });
  });

  describe('clearNotificationsForUser', () => {
    it('should delete all notifications for a user', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.clearNotificationsForUser(mockUser.id);

      expect(result).toBe(true);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should return false on error', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.eq.mockResolvedValue({
        data: null,
        error: new Error('Delete failed'),
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await notificationService.clearNotificationsForUser(mockUser.id);
      expect(result).toBe(false);
    });
  });

  describe('Real-time subscriptions', () => {
    it('should subscribe to notifications for a user', async () => {
      const mockChannel = createMockChannel();
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = notificationService.subscribeToNotifications(mockUser.id, callback);

      expect(supabase.channel).toHaveBeenCalledWith(`notifications:${mockUser.id}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${mockUser.id}`,
        }),
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle notification insert events', async () => {
      const mockChannel = createMockChannel();
      let capturedHandler;

      mockChannel.on.mockImplementation((event, options, handler) => {
        capturedHandler = handler;
        return mockChannel;
      });

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      notificationService.subscribeToNotifications(mockUser.id, callback);

      // Simulate INSERT event
      // eslint-disable-next-line custom-rules/enforce-test-data-factories
      const newNotification = {
        id: 'new-notif',
        user_id: mockUser.id,
        type: NotificationTypes.TASK_ASSIGNED,
        title: 'New Task',
        message: 'You have been assigned a task',
        created_at: new Date().toISOString(),
      };

      capturedHandler({
        eventType: 'INSERT',
        new: newNotification,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-notif',
          type: NotificationTypes.TASK_ASSIGNED,
          title: 'New Task',
        }),
      );
    });
  });

  describe('Automatic cleanup', () => {
    it('should not require manual cleanup as database handles TTL', async () => {
      // With Supabase, cleanup is handled by database policies or scheduled functions
      // This test verifies that the service doesn't need to implement manual cleanup
      expect(notificationService.cleanupOldNotifications).toBeUndefined();
      expect(notificationService.startCleanupJob).toBeUndefined();
    });
  });
});
