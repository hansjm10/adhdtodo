// ABOUTME: Tests for mock factory utilities
// Verifies that mock factories create valid test data with proper structure

import {
  createMockUser,
  createMockTask,
  createMockNotification,
  createMockPartnerUser,
  createMockCompletedTask,
  createMockAssignedTask,
  createMockEncouragementNotification,
  createMockNotificationData,
} from '../mockFactories';
import {
  USER_ROLE,
  NOTIFICATION_TYPES,
  NOTIFICATION_PREFERENCES,
} from '../../../src/constants/UserConstants';
import { TASK_STATUS, TASK_PRIORITY } from '../../../src/constants/TaskConstants';

describe('Mock Factories', () => {
  describe('createMockUser', () => {
    it('should create a valid user with default values', () => {
      const user = createMockUser();

      expect(user).toMatchObject(
        // eslint-disable-next-line custom-rules/enforce-test-data-factories
        {
          id: expect.stringMatching(/^user-\d+-[a-z0-9]{5}$/),
          email: 'test@example.com',
          name: 'Test User',
          role: USER_ROLE.ADHD_USER,
          passwordHash: 'mock-hash',
          passwordSalt: 'mock-salt',
          sessionToken: 'mock-session-token',
          partnerId: null,
          notificationPreferences: {
            global: NOTIFICATION_PREFERENCES.ALL,
            taskAssigned: true,
            taskStarted: true,
            taskCompleted: true,
            taskOverdue: true,
            encouragement: true,
            checkIn: true,
          },
          encouragementMessages: [],
          stats: {
            tasksAssigned: 0,
            tasksCompleted: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalXP: 0,
          },
        },
      );

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.lastActiveAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should allow overriding default values', () => {
      // eslint-disable-next-line custom-rules/enforce-test-data-factories
      const customData = {
        id: 'custom-id',
        email: 'custom@test.com',
        name: 'Custom User',
        role: USER_ROLE.ACCOUNTABILITY_PARTNER,
        partnerId: 'partner-123',
      };

      const user = createMockUser(customData);

      expect(user).toMatchObject(customData);
    });

    it('should generate unique IDs for each user', () => {
      const user1 = createMockUser();
      const user2 = createMockUser();

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('createMockTask', () => {
    it('should create a valid task with default values', () => {
      const task = createMockTask();

      expect(task).toMatchObject(
        // eslint-disable-next-line custom-rules/enforce-test-data-factories
        {
          id: expect.stringMatching(/^task-\d+-[a-z0-9]{5}$/),
          title: 'Test Task',
          description: 'Test Description',
          category: 'personal',
          status: TASK_STATUS.PENDING,
          priority: TASK_PRIORITY.MEDIUM,
          timeEstimate: 30,
          timeSpent: 0,
          completed: false,
          completedAt: null,
          xpEarned: 0,
          streakContribution: false,
          assignedBy: null,
          assignedTo: null,
          dueDate: null,
          preferredStartTime: null,
          startedAt: null,
          partnerNotified: {
            onStart: false,
            onComplete: false,
            onOverdue: false,
          },
          encouragementReceived: [],
          userId: 'user-123',
        },
      );

      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow overriding default values', () => {
      const customData = {
        title: 'Custom Task',
        status: TASK_STATUS.IN_PROGRESS,
        priority: TASK_PRIORITY.HIGH,
        userId: 'custom-user',
      };

      const task = createMockTask(customData);

      expect(task).toMatchObject(customData);
    });
  });

  describe('createMockNotification', () => {
    it('should create a valid notification with default values', () => {
      const notification = createMockNotification();

      expect(notification).toMatchObject({
        id: expect.stringMatching(/^notif-\d+-[a-z0-9]{5}$/),
        toUserId: 'user-123',
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        data: {
          taskId: 'task-123',
          taskTitle: 'Test Task',
          assignedBy: 'Partner User',
          dueDate: null,
          priority: TASK_PRIORITY.MEDIUM,
        },
        read: false,
      });

      expect(notification.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createMockPartnerUser', () => {
    it('should create a partner user with correct role', () => {
      const partner = createMockPartnerUser();

      expect(partner.role).toBe(USER_ROLE.ACCOUNTABILITY_PARTNER);
      expect(partner.email).toBe('partner@example.com');
      expect(partner.name).toBe('Partner User');
      expect(partner.id).toMatch(/^partner-\d+-[a-z0-9]{5}$/);
    });
  });

  describe('createMockCompletedTask', () => {
    it('should create a completed task with proper fields', () => {
      const task = createMockCompletedTask();

      expect(task.status).toBe(TASK_STATUS.COMPLETED);
      expect(task.completed).toBe(true);
      expect(task.completedAt).toBeInstanceOf(Date);
      expect(task.xpEarned).toBe(10);
      expect(task.streakContribution).toBe(true);
      expect(task.timeSpent).toBe(25);
    });
  });

  describe('createMockAssignedTask', () => {
    it('should create an assigned task with partner fields', () => {
      const task = createMockAssignedTask();

      expect(task.assignedBy).toBe('partner-123');
      expect(task.assignedTo).toBe('user-123');
      expect(task.dueDate).toBeInstanceOf(Date);
      expect(task.title).toBe('Assigned Task');
      expect(task.description).toBe('Task assigned by partner');

      // Due date should be in the future
      const now = new Date();
      expect(task.dueDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('createMockEncouragementNotification', () => {
    it('should create an encouragement notification', () => {
      const notification = createMockEncouragementNotification();

      expect(notification.type).toBe(NOTIFICATION_TYPES.ENCOURAGEMENT);
      expect(notification.data).toEqual({
        message: 'You can do this!',
        fromUser: 'Partner User',
        taskId: null,
      });
    });
  });

  describe('createMockNotificationData', () => {
    it('should create correct data for each notification type', () => {
      const types = Object.values(NOTIFICATION_TYPES);

      types.forEach((type) => {
        const data = createMockNotificationData(type);

        expect(data).toBeDefined();

        // Verify type-specific fields
        switch (type) {
          case NOTIFICATION_TYPES.TASK_ASSIGNED:
            expect(data).toHaveProperty('taskId');
            expect(data).toHaveProperty('taskTitle');
            expect(data).toHaveProperty('assignedBy');
            expect(data).toHaveProperty('priority');
            break;
          case NOTIFICATION_TYPES.TASK_STARTED:
            expect(data).toHaveProperty('taskId');
            expect(data).toHaveProperty('startedBy');
            expect(data).toHaveProperty('startedAt');
            break;
          case NOTIFICATION_TYPES.TASK_COMPLETED:
            expect(data).toHaveProperty('taskId');
            expect(data).toHaveProperty('completedBy');
            expect(data).toHaveProperty('completedAt');
            expect(data).toHaveProperty('timeSpent');
            expect(data).toHaveProperty('xpEarned');
            break;
          case NOTIFICATION_TYPES.TASK_OVERDUE:
            expect(data).toHaveProperty('taskId');
            expect(data).toHaveProperty('dueDate');
            break;
          case NOTIFICATION_TYPES.ENCOURAGEMENT:
            expect(data).toHaveProperty('message');
            expect(data).toHaveProperty('fromUser');
            break;
          case NOTIFICATION_TYPES.CHECK_IN:
            expect(data).toHaveProperty('message');
            expect(data).toHaveProperty('fromUser');
            break;
        }
      });
    });

    it('should allow overriding notification data', () => {
      const customData = { message: 'Custom message' };
      const data = createMockNotificationData(NOTIFICATION_TYPES.ENCOURAGEMENT, customData);

      expect(data.message).toBe('Custom message');
    });
  });
});
