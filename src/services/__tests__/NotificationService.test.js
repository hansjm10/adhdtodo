// ABOUTME: Comprehensive unit tests for NotificationService
// Tests notification sending, preferences, and storage functionality

import { NotificationService } from '../NotificationService';
import { supabase } from '../SupabaseService';
import UserStorageService from '../UserStorageService';
import SecureLogger from '../SecureLogger';
import { NOTIFICATION_TYPES, NOTIFICATION_PREFERENCES } from '../../constants/UserConstants';
import { testDataFactories } from '../../../tests/utils';

// SupabaseService is already mocked globally in tests/setup.js
jest.mock('../UserStorageService');
jest.mock('../SecureLogger');

describe('NotificationService', () => {
  const mockUser = testDataFactories.user({
    id: 'user_123',
    name: 'Test User',
    notificationPreferences: {
      global: NOTIFICATION_PREFERENCES.ALL,
      taskAssigned: true,
      taskStarted: true,
      taskCompleted: true,
      taskOverdue: true,
      encouragement: true,
      checkIn: true,
    },
  });

  const _mockPartnerUser = testDataFactories.user({
    id: 'partner_456',
    name: 'Partner User',
    notificationPreferences: {
      global: NOTIFICATION_PREFERENCES.ALL,
    },
  });

  const mockTask = testDataFactories.task({
    id: 'task_123',
    title: 'Test Task',
    userId: 'user_123',
    assignedTo: 'partner_456',
  });

  let notificationService;

  // Helper to create mock query builder
  const createMockQueryBuilder = (data = null, error = null) => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data, error }),
    };

    // Make methods that can be terminal return promises
    builder.insert.mockImplementation(() => {
      return Promise.resolve({ data, error });
    });
    builder.update.mockImplementation(() => {
      if (builder.eq.mock.calls.length > 0) {
        return Promise.resolve({ data, error });
      }
      return builder;
    });
    builder.limit.mockImplementation(() => {
      return Promise.resolve({ data: Array.isArray(data) ? data : [data], error });
    });

    builder.then = (resolve) => resolve({ data: Array.isArray(data) ? data : [data], error });
    return builder;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create new instance for each test
    notificationService = new NotificationService();

    // Default mock implementations
    UserStorageService.getUserById.mockResolvedValue(mockUser);

    // Mock Supabase auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'current-user-id' } },
      error: null,
    });

    // Mock Supabase query builder
    supabase.from.mockImplementation(() => createMockQueryBuilder());

    // Mock channel for subscriptions
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    };
    supabase.channel.mockReturnValue(mockChannel);
  });

  describe('getNotificationsForUser', () => {
    it('should load notifications from Supabase', async () => {
      const dbNotifications = [
        testDataFactories.notification({
          id: 'notif_1',
          user_id: 'user_123',
          type: NOTIFICATION_TYPES.TASK_ASSIGNED,
          title: 'Task Assigned',
          message: 'You have a new task',
          read: false,
          created_at: new Date().toISOString(),
        }),
        testDataFactories.notification({
          id: 'notif_2',
          user_id: 'user_123',
          type: NOTIFICATION_TYPES.TASK_COMPLETED,
          title: 'Task Completed',
          message: 'Task completed!',
          read: true,
          created_at: new Date().toISOString(),
        }),
      ];

      supabase.from.mockImplementation(() => createMockQueryBuilder(dbNotifications));

      const notifications = await notificationService.getNotificationsForUser('user_123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(notifications).toHaveLength(2);
      expect(notifications[0].type).toBe(NOTIFICATION_TYPES.TASK_ASSIGNED);
    });

    it('should handle empty results gracefully', async () => {
      supabase.from.mockImplementation(() => createMockQueryBuilder([]));

      const notifications = await notificationService.getNotificationsForUser('user_123');

      expect(notifications).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      supabase.from.mockImplementation(() => createMockQueryBuilder(null, new Error('DB error')));

      const notifications = await notificationService.getNotificationsForUser('user_123');

      expect(SecureLogger.error).toHaveBeenCalledWith('Failed to fetch notifications', {
        code: 'NOTIF_003',
        context: 'DB error',
      });
      expect(notifications).toEqual([]);
    });
  });

  describe('sendNotification', () => {
    it('should save notification to Supabase', async () => {
      const mockInsertResult = { id: 'new-notif-id' };
      supabase.from.mockImplementation(() => createMockQueryBuilder(mockInsertResult));

      const result = await notificationService.sendNotification(
        'user_123',
        NOTIFICATION_TYPES.TASK_ASSIGNED,
        { taskId: 'task_123', fromUserName: 'Test User' },
      );

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(result).toBe(true);
    });

    it('should handle insert errors', async () => {
      supabase.from.mockImplementation(() =>
        createMockQueryBuilder(null, new Error('Insert failed')),
      );

      const result = await notificationService.sendNotification(
        'user_123',
        NOTIFICATION_TYPES.TASK_ASSIGNED,
        { taskId: 'task_123' },
      );

      expect(result).toBe(false);
      expect(SecureLogger.error).toHaveBeenCalledWith('Failed to send notification', {
        code: 'NOTIF_001',
        context: 'Insert failed',
      });
    });
  });

  describe('notifyTaskAssigned', () => {
    it('should create task assigned notification', async () => {
      supabase.from.mockImplementation(() => createMockQueryBuilder({ id: 'notif_123' }));

      const result = await notificationService.notifyTaskAssigned(mockTask, mockUser);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('notifications');
    });

    it('should handle user not found', async () => {
      // When task has no assignedTo, it should return false
      const taskWithoutAssignee = { ...mockTask, assignedTo: null };

      const result = await notificationService.notifyTaskAssigned(taskWithoutAssignee, mockUser);

      expect(result).toBe(false);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      supabase.from.mockImplementation(() => createMockQueryBuilder({ id: 'notif_123' }));

      const result = await notificationService.markNotificationAsRead('notif_123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(result).toBe(true);
    });

    it('should handle update errors', async () => {
      supabase.from.mockImplementation(() =>
        createMockQueryBuilder(null, new Error('Update failed')),
      );

      const result = await notificationService.markNotificationAsRead('notif_123');

      expect(result).toBe(false);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', async () => {
      const unreadNotifications = [
        { id: 'notif_1', read: false },

        { id: 'notif_2', read: false },
      ];
      supabase.from.mockImplementation(() => createMockQueryBuilder(unreadNotifications));

      const count = await notificationService.getUnreadNotificationCount('user_123');

      expect(count).toBe(2);
    });

    it('should return 0 when no unread notifications', async () => {
      supabase.from.mockImplementation(() => createMockQueryBuilder([]));

      const count = await notificationService.getUnreadNotificationCount('user_123');

      expect(count).toBe(0);
    });
  });

  describe('subscribeToNotifications', () => {
    it('should set up real-time subscription', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = notificationService.subscribeToNotifications('user_123', callback);

      expect(supabase.channel).toHaveBeenCalledWith('notifications:user_123');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        }),
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });
});
