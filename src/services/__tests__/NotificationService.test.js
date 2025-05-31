// ABOUTME: Comprehensive unit tests for NotificationService
// Tests notification sending, preferences, and storage functionality

import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../NotificationService';
import UserStorageService from '../UserStorageService';
import { NOTIFICATION_TYPES, NOTIFICATION_PREFERENCES } from '../../constants/UserConstants';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../UserStorageService');

describe('NotificationService', () => {
  const mockUser = {
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
  };

  const mockPartnerUser = {
    id: 'partner_456',
    name: 'Partner User',
    notificationPreferences: {
      global: NOTIFICATION_PREFERENCES.ALL,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset NotificationService state
    NotificationService.pendingNotifications = [];

    // Default mock implementations
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    UserStorageService.getUserById.mockResolvedValue(mockUser);
  });

  describe('loadNotifications', () => {
    it('should load notifications from AsyncStorage on initialization', async () => {
      const storedNotifications = [
        { id: 'notif_1', toUserId: 'user_123', type: 'task_assigned', read: false },
        { id: 'notif_2', toUserId: 'user_123', type: 'task_completed', read: true },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedNotifications));

      await NotificationService.loadNotifications();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@adhdtodo:notifications');
      expect(NotificationService.pendingNotifications).toEqual(storedNotifications);
    });

    it('should handle empty storage gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      await NotificationService.loadNotifications();

      expect(NotificationService.pendingNotifications).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await NotificationService.loadNotifications();

      expect(consoleError).toHaveBeenCalledWith('Error loading notifications:', expect.any(Error));
      expect(NotificationService.pendingNotifications).toEqual([]);

      consoleError.mockRestore();
    });
  });

  describe('saveNotifications', () => {
    it('should save notifications to AsyncStorage', async () => {
      NotificationService.pendingNotifications = [
        { id: 'notif_1', toUserId: 'user_123', type: 'task_assigned' },
        { id: 'notif_2', toUserId: 'user_456', type: 'task_completed' },
      ];

      await NotificationService.saveNotifications();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@adhdtodo:notifications',
        JSON.stringify(NotificationService.pendingNotifications),
      );
    });

    it('should limit saved notifications to MAX_NOTIFICATIONS', async () => {
      // Create more than MAX_NOTIFICATIONS
      const notifications = [];
      for (let i = 0; i < NotificationService.MAX_NOTIFICATIONS + 10; i++) {
        notifications.push({
          id: `notif_${i}`,
          toUserId: 'user_123',
          type: 'task_assigned',
        });
      }
      NotificationService.pendingNotifications = notifications;

      await NotificationService.saveNotifications();

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData.length).toBe(NotificationService.MAX_NOTIFICATIONS);
      expect(savedData[0].id).toBe('notif_10'); // Should keep most recent
    });

    it('should handle save errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      AsyncStorage.setItem.mockRejectedValue(new Error('Save error'));

      NotificationService.pendingNotifications = [{ id: 'notif_1' }];
      await NotificationService.saveNotifications();

      expect(consoleError).toHaveBeenCalledWith('Error saving notifications:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const result = await NotificationService.sendNotification(
        'user_123',
        NOTIFICATION_TYPES.TASK_ASSIGNED,
        { taskTitle: 'Test Task' },
      );

      expect(result).toBe(true);
      expect(UserStorageService.getUserById).toHaveBeenCalledWith('user_123');
      expect(NotificationService.pendingNotifications.length).toBe(1);

      const notification = NotificationService.pendingNotifications[0];
      expect(notification).toMatchObject({
        toUserId: 'user_123',
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        data: { taskTitle: 'Test Task' },
        read: false,
      });
      expect(notification.id).toMatch(/^notif_\d+_[a-z0-9]+$/);
      expect(notification.timestamp).toBeInstanceOf(Date);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return false if user not found', async () => {
      UserStorageService.getUserById.mockResolvedValue(null);

      const result = await NotificationService.sendNotification(
        'unknown_user',
        NOTIFICATION_TYPES.TASK_ASSIGNED,
        {},
      );

      expect(result).toBe(false);
      expect(NotificationService.pendingNotifications.length).toBe(0);
    });

    it('should respect user notification preferences', async () => {
      const silentUser = {
        ...mockUser,
        notificationPreferences: {
          global: NOTIFICATION_PREFERENCES.SILENT,
        },
      };
      UserStorageService.getUserById.mockResolvedValue(silentUser);

      const result = await NotificationService.sendNotification(
        'user_123',
        NOTIFICATION_TYPES.TASK_ASSIGNED,
        {},
      );

      expect(result).toBe(false);
      expect(NotificationService.pendingNotifications.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      UserStorageService.getUserById.mockRejectedValue(new Error('Database error'));

      const result = await NotificationService.sendNotification(
        'user_123',
        NOTIFICATION_TYPES.TASK_ASSIGNED,
        {},
      );

      expect(result).toBe(false);
      expect(NotificationService.pendingNotifications.length).toBe(0);
    });
  });

  describe('shouldSendNotification', () => {
    it('should return false for silent global preference', () => {
      const user = {
        notificationPreferences: { global: NOTIFICATION_PREFERENCES.SILENT },
      };

      const result = NotificationService.shouldSendNotification(
        user,
        NOTIFICATION_TYPES.TASK_ASSIGNED,
      );
      expect(result).toBe(false);
    });

    it('should only allow critical notifications for important_only preference', () => {
      const user = {
        notificationPreferences: { global: NOTIFICATION_PREFERENCES.IMPORTANT_ONLY },
      };

      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.TASK_OVERDUE),
      ).toBe(true);
      expect(
        NotificationService.shouldSendNotification(
          user,
          NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST,
        ),
      ).toBe(true);
      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.TASK_ASSIGNED),
      ).toBe(false);
      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.ENCOURAGEMENT),
      ).toBe(false);
    });

    it('should respect specific notification type preferences', () => {
      const user = {
        notificationPreferences: {
          global: NOTIFICATION_PREFERENCES.ALL,
          taskAssigned: false,
          taskStarted: true,
          taskCompleted: false,
          taskOverdue: true,
          encouragement: false,
          checkIn: true,
        },
      };

      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.TASK_ASSIGNED),
      ).toBe(false);
      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.TASK_STARTED),
      ).toBe(true);
      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.TASK_COMPLETED),
      ).toBe(false);
      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.TASK_OVERDUE),
      ).toBe(true);
      expect(
        NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.ENCOURAGEMENT),
      ).toBe(false);
      expect(NotificationService.shouldSendNotification(user, NOTIFICATION_TYPES.CHECK_IN)).toBe(
        true,
      );
    });

    it('should default to true for unknown notification types', () => {
      const user = {
        notificationPreferences: { global: NOTIFICATION_PREFERENCES.ALL },
      };

      const result = NotificationService.shouldSendNotification(user, 'unknown_type');
      expect(result).toBe(true);
    });
  });

  describe('Task notification methods', () => {
    const mockTask = {
      id: 'task_123',
      title: 'Test Task',
      assignedTo: 'user_123',
      assignedBy: 'partner_456',
      dueDate: new Date('2024-12-31'),
      priority: 'high',
      startedAt: new Date(),
      completedAt: new Date(),
      timeSpent: 3600,
      xpEarned: 50,
    };

    describe('notifyTaskAssigned', () => {
      it('should send task assigned notification', async () => {
        const result = await NotificationService.notifyTaskAssigned(mockTask, mockPartnerUser);

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0]).toMatchObject({
          toUserId: 'user_123',
          type: NOTIFICATION_TYPES.TASK_ASSIGNED,
          data: {
            taskId: 'task_123',
            taskTitle: 'Test Task',
            assignedBy: 'Partner User',
            dueDate: mockTask.dueDate,
            priority: 'high',
          },
        });
      });
    });

    describe('notifyTaskStarted', () => {
      it('should send task started notification to assigner', async () => {
        const result = await NotificationService.notifyTaskStarted(mockTask, mockUser);

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0]).toMatchObject({
          toUserId: 'partner_456',
          type: NOTIFICATION_TYPES.TASK_STARTED,
          data: {
            taskId: 'task_123',
            taskTitle: 'Test Task',
            startedBy: 'Test User',
            startedAt: mockTask.startedAt,
          },
        });
      });

      it('should return false if task has no assignedBy', async () => {
        const taskWithoutAssigner = { ...mockTask, assignedBy: null };
        const result = await NotificationService.notifyTaskStarted(taskWithoutAssigner, mockUser);

        expect(result).toBe(false);
        expect(NotificationService.pendingNotifications.length).toBe(0);
      });
    });

    describe('notifyTaskCompleted', () => {
      it('should send task completed notification', async () => {
        const result = await NotificationService.notifyTaskCompleted(mockTask, mockUser);

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0]).toMatchObject({
          toUserId: 'partner_456',
          type: NOTIFICATION_TYPES.TASK_COMPLETED,
          data: {
            taskId: 'task_123',
            taskTitle: 'Test Task',
            completedBy: 'Test User',
            completedAt: mockTask.completedAt,
            timeSpent: 3600,
            xpEarned: 50,
          },
        });
      });

      it('should return false if task has no assignedBy', async () => {
        const taskWithoutAssigner = { ...mockTask, assignedBy: null };
        const result = await NotificationService.notifyTaskCompleted(taskWithoutAssigner, mockUser);

        expect(result).toBe(false);
      });
    });

    describe('notifyTaskOverdue', () => {
      it('should send task overdue notification', async () => {
        const result = await NotificationService.notifyTaskOverdue(mockTask);

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0]).toMatchObject({
          toUserId: 'partner_456',
          type: NOTIFICATION_TYPES.TASK_OVERDUE,
          data: {
            taskId: 'task_123',
            taskTitle: 'Test Task',
            dueDate: mockTask.dueDate,
          },
        });
      });

      it('should return false if task has no assignedBy', async () => {
        const taskWithoutAssigner = { ...mockTask, assignedBy: null };
        const result = await NotificationService.notifyTaskOverdue(taskWithoutAssigner);

        expect(result).toBe(false);
      });
    });
  });

  describe('Social notification methods', () => {
    beforeEach(() => {
      UserStorageService.getUserById
        .mockResolvedValueOnce(mockUser) // For fromUser lookup
        .mockResolvedValueOnce(mockPartnerUser); // For toUser lookup
    });

    describe('sendEncouragement', () => {
      it('should send encouragement notification', async () => {
        const result = await NotificationService.sendEncouragement(
          'user_123',
          'partner_456',
          'You can do it!',
          'task_123',
        );

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0]).toMatchObject({
          toUserId: 'partner_456',
          type: NOTIFICATION_TYPES.ENCOURAGEMENT,
          data: {
            message: 'You can do it!',
            fromUser: 'Test User',
            taskId: 'task_123',
          },
        });
      });

      it('should send encouragement without taskId', async () => {
        const result = await NotificationService.sendEncouragement(
          'user_123',
          'partner_456',
          'Keep going!',
        );

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0].data.taskId).toBe(null);
      });

      it('should return false if fromUser not found', async () => {
        UserStorageService.getUserById.mockReset();
        UserStorageService.getUserById.mockResolvedValue(null);

        const result = await NotificationService.sendEncouragement(
          'unknown_user',
          'partner_456',
          'Message',
        );

        expect(result).toBe(false);
      });
    });

    describe('sendCheckIn', () => {
      it('should send check-in notification', async () => {
        const result = await NotificationService.sendCheckIn(
          'user_123',
          'partner_456',
          'How are you doing today?',
        );

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0]).toMatchObject({
          toUserId: 'partner_456',
          type: NOTIFICATION_TYPES.CHECK_IN,
          data: {
            message: 'How are you doing today?',
            fromUser: 'Test User',
          },
        });
      });

      it('should return false if fromUser not found', async () => {
        UserStorageService.getUserById.mockReset();
        UserStorageService.getUserById.mockResolvedValue(null);

        const result = await NotificationService.sendCheckIn(
          'unknown_user',
          'partner_456',
          'Message',
        );

        expect(result).toBe(false);
      });
    });
  });

  describe('Notification retrieval and management', () => {
    beforeEach(() => {
      NotificationService.pendingNotifications = [
        { id: 'notif_1', toUserId: 'user_123', type: 'task_assigned', read: false },
        { id: 'notif_2', toUserId: 'user_123', type: 'task_completed', read: true },
        { id: 'notif_3', toUserId: 'partner_456', type: 'encouragement', read: false },
        { id: 'notif_4', toUserId: 'user_123', type: 'check_in', read: false },
      ];
    });

    describe('getNotificationsForUser', () => {
      it('should return notifications for specific user', async () => {
        const notifications = await NotificationService.getNotificationsForUser('user_123');

        expect(notifications.length).toBe(3);
        expect(notifications.every((n) => n.toUserId === 'user_123')).toBe(true);
      });

      it('should return empty array for user with no notifications', async () => {
        const notifications = await NotificationService.getNotificationsForUser('unknown_user');

        expect(notifications).toEqual([]);
      });
    });

    describe('getUnreadNotificationCount', () => {
      it('should return count of unread notifications', async () => {
        const count = await NotificationService.getUnreadNotificationCount('user_123');

        expect(count).toBe(2); // notif_1 and notif_4 are unread
      });

      it('should return 0 for user with no notifications', async () => {
        const count = await NotificationService.getUnreadNotificationCount('unknown_user');

        expect(count).toBe(0);
      });
    });

    describe('markNotificationAsRead', () => {
      it('should mark notification as read', async () => {
        const result = await NotificationService.markNotificationAsRead('notif_1');

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications[0].read).toBe(true);
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });

      it('should return false for non-existent notification', async () => {
        const result = await NotificationService.markNotificationAsRead('notif_999');

        expect(result).toBe(false);
      });
    });

    describe('markAllNotificationsAsRead', () => {
      it('should mark all user notifications as read', async () => {
        const result = await NotificationService.markAllNotificationsAsRead('user_123');

        expect(result).toBe(true);

        const userNotifications = NotificationService.pendingNotifications.filter(
          (n) => n.toUserId === 'user_123',
        );
        expect(userNotifications.every((n) => n.read === true)).toBe(true);

        // Partner notification should remain unread
        const partnerNotification = NotificationService.pendingNotifications.find(
          (n) => n.toUserId === 'partner_456',
        );
        expect(partnerNotification.read).toBe(false);

        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });
    });

    describe('clearNotificationsForUser', () => {
      it('should remove all notifications for user', async () => {
        const result = await NotificationService.clearNotificationsForUser('user_123');

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications.length).toBe(1);
        expect(NotificationService.pendingNotifications[0].toUserId).toBe('partner_456');
        expect(AsyncStorage.setItem).toHaveBeenCalled();
      });

      it('should handle clearing for user with no notifications', async () => {
        const result = await NotificationService.clearNotificationsForUser('unknown_user');

        expect(result).toBe(true);
        expect(NotificationService.pendingNotifications.length).toBe(4); // Unchanged
      });
    });
  });
});
