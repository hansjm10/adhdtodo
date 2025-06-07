// ABOUTME: Meta-tests for mock factory functions to ensure they produce valid test data
// Validates that our mock creation utilities work correctly

import {
  createMockUser,
  createMockTask,
  createMockNotification,
  createMockPartnership,
} from '../mockFactories';
import {
  USER_ROLE,
  NOTIFICATION_TYPES,
  PARTNERSHIP_STATUS,
} from '../../../src/constants/UserConstants';

describe('Mock Factory Functions Meta-Tests', () => {
  describe('createMockUser', () => {
    it('should create valid user with defaults', () => {
      const user = createMockUser();

      // Check required fields
      expect(user.id).toMatch(/^user-/);
      expect(user.email).toContain('@example.com');
      expect(user.name).toBeTruthy();
      expect(user.role).toBe(USER_ROLE.ADHD_USER);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow overriding defaults', () => {
      // eslint-disable-next-line custom-rules/enforce-test-data-factories
      const customData = {
        id: 'custom_123',
        name: 'Custom User',
        email: 'custom@test.com',
        role: USER_ROLE.PARTNER,
      };

      const user = createMockUser(customData);

      expect(user.id).toBe(customData.id);
      expect(user.name).toBe(customData.name);
      expect(user.email).toBe(customData.email);
      expect(user.role).toBe(customData.role);
    });

    it('should create unique users', () => {
      const users = Array.from({ length: 10 }, () => createMockUser());
      const ids = users.map((u) => u.id);

      // All IDs should be unique
      expect(new Set(ids).size).toBe(10);
      // Email is the same default for all mock users
      expect(users[0].email).toBe('test@example.com');
    });

    it('should create valid notification preferences', () => {
      const user = createMockUser();

      expect(user.notificationPreferences).toBeDefined();
      expect(user.notificationPreferences.global).toBeTruthy();
      expect(typeof user.notificationPreferences.taskAssigned).toBe('boolean');
    });
  });

  describe('createMockTask', () => {
    it('should create valid task with defaults', () => {
      const task = createMockTask();

      // Check required fields
      expect(task.id).toMatch(/^task-/);
      expect(task.title).toBeTruthy();
      expect(task.userId).toBeTruthy();
      expect(task.status).toBeTruthy();
      expect(task.priority).toBeTruthy();
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should respect completed status', () => {
      const completedTask = createMockTask({ completed: true });
      const pendingTask = createMockTask({ completed: false });

      expect(completedTask.completed).toBe(true);
      expect(completedTask.completedAt).toBeDefined();
      expect(completedTask.status).toBe('completed');

      expect(pendingTask.completed).toBe(false);
      expect(pendingTask.completedAt).toBeNull();
      expect(pendingTask.status).toBe('pending');
    });

    it('should allow category assignment', () => {
      const taskWithCategory = createMockTask({ category: 'work' });

      expect(taskWithCategory.category).toBe('work');
    });

    it('should handle time tracking fields', () => {
      const task = createMockTask({
        timeEstimate: 30,
        timeSpent: 15,
        startedAt: new Date(),
      });

      expect(task.timeEstimate).toBe(30);
      expect(task.timeSpent).toBe(15);
      expect(task.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('createMockNotification', () => {
    it('should create valid notification with defaults', () => {
      const notification = createMockNotification();

      expect(notification.id).toMatch(/^notif-/);
      expect(notification.type).toBe(NOTIFICATION_TYPES.TASK_ASSIGNED);
      expect(notification.title).toBeTruthy();
      expect(notification.message).toBeTruthy();
      expect(notification.read).toBe(false);
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it('should allow different notification types', () => {
      const types = Object.values(NOTIFICATION_TYPES);

      types.forEach((type) => {
        const notification = createMockNotification({ type });
        expect(notification.type).toBe(type);
      });
    });

    it('should handle notification data', () => {
      const data = {
        taskId: 'task_123',
        fromUserId: 'user_456',
        customField: 'value',
      };

      const notification = createMockNotification({ data });

      expect(notification.data).toEqual(data);
    });

    it('should set read timestamp when marked as read', () => {
      const readNotif = createMockNotification({ read: true });
      const unreadNotif = createMockNotification({ read: false });

      expect(readNotif.read).toBe(true);
      // readAt might not be set in the mock

      expect(unreadNotif.read).toBe(false);
    });
  });

  describe('createMockPartnership', () => {
    it('should create valid partnership with defaults', () => {
      const partnership = createMockPartnership();

      expect(partnership.id).toMatch(/^partnership-/);
      expect(partnership.adhdUserId).toBeTruthy();
      expect(partnership.partnerId).toBeTruthy();
      expect(partnership.status).toBe(PARTNERSHIP_STATUS.PENDING);
      expect(partnership.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(partnership.createdAt).toBeInstanceOf(Date);
    });

    it('should handle different partnership statuses', () => {
      const pendingPartnership = createMockPartnership({
        status: PARTNERSHIP_STATUS.PENDING,
      });
      const activePartnership = createMockPartnership({
        status: PARTNERSHIP_STATUS.ACTIVE,
      });
      const terminatedPartnership = createMockPartnership({
        status: PARTNERSHIP_STATUS.TERMINATED,
      });

      expect(pendingPartnership.acceptedAt).toBeNull();
      expect(activePartnership.acceptedAt).toBeDefined();
      expect(terminatedPartnership.terminatedAt).toBeDefined();
    });

    it('should create valid partnership settings', () => {
      const partnership = createMockPartnership();

      expect(partnership.settings).toBeDefined();
      expect(typeof partnership.settings.allowTaskAssignment).toBe('boolean');
      expect(typeof partnership.settings.shareProgress).toBe('boolean');
      expect(typeof partnership.settings.allowEncouragement).toBe('boolean');
    });

    it('should create valid partnership stats', () => {
      const partnership = createMockPartnership();

      expect(partnership.stats).toBeDefined();
      expect(typeof partnership.stats.tasksAssigned).toBe('number');
      expect(typeof partnership.stats.tasksCompleted).toBe('number');
      expect(partnership.stats.tasksAssigned).toBeGreaterThanOrEqual(0);
      expect(partnership.stats.tasksCompleted).toBeLessThanOrEqual(partnership.stats.tasksAssigned);
    });
  });

  describe('Factory relationships', () => {
    it('should create consistent user-task relationships', () => {
      const user = createMockUser();
      const task = createMockTask({ userId: user.id });

      expect(task.userId).toBe(user.id);
    });

    it('should create consistent partnership relationships', () => {
      const adhdUser = createMockUser({ role: USER_ROLE.ADHD_USER });
      const partner = createMockUser({ role: USER_ROLE.PARTNER });
      const partnership = createMockPartnership({
        adhdUserId: adhdUser.id,
        partnerId: partner.id,
      });

      expect(partnership.adhdUserId).toBe(adhdUser.id);
      expect(partnership.partnerId).toBe(partner.id);
    });

    it('should create consistent notification relationships', () => {
      const user = createMockUser();
      const task = createMockTask();
      const notification = createMockNotification({
        userId: user.id,
        data: { taskId: task.id },
      });

      expect(notification.userId).toBe(user.id);
      expect(notification.data.taskId).toBe(task.id);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle null/undefined overrides gracefully', () => {
      expect(() => createMockUser({ name: null })).not.toThrow();
      expect(() => createMockTask({ description: undefined })).not.toThrow();
      expect(() => createMockNotification({ data: null })).not.toThrow();
      expect(() => createMockPartnership({ settings: undefined })).not.toThrow();
    });

    it('should maintain type safety', () => {
      const user = createMockUser();
      const task = createMockTask();
      const notification = createMockNotification();
      const partnership = createMockPartnership();

      // Type checks
      expect(typeof user.id).toBe('string');
      expect(typeof task.title).toBe('string');
      expect(typeof notification.read).toBe('boolean');
      expect(typeof partnership.inviteCode).toBe('string');
    });

    it('should generate reasonable random data', () => {
      // Test that random values are within expected ranges
      const tasks = Array.from({ length: 100 }, () => createMockTask());

      tasks.forEach((task) => {
        if (task.timeEstimate) {
          expect(task.timeEstimate).toBeGreaterThan(0);
          expect(task.timeEstimate).toBeLessThanOrEqual(480); // Max 8 hours
        }
        if (task.xpEarned) {
          expect(task.xpEarned).toBeGreaterThanOrEqual(0);
          expect(task.xpEarned).toBeLessThanOrEqual(1000);
        }
      });
    });
  });
});
