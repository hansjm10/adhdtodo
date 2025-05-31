// ABOUTME: Tests for UserModel utilities ensuring proper user creation and validation
// Covers user creation, validation, updates, and partnership management

import {
  generateUserId,
  createUser,
  validateUser,
  updateUser,
  updateUserStats,
  setUserPartner,
  updateNotificationPreferences,
  addCustomEncouragementMessage,
} from '../UserModel';
import { USER_ROLE, NOTIFICATION_PREFERENCES } from '../../constants/UserConstants';

describe('UserModel', () => {
  describe('generateUserId', () => {
    it('should generate unique user IDs', () => {
      const id1 = generateUserId();
      const id2 = generateUserId();

      expect(id1).toMatch(/^user_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^user_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createUser', () => {
    it('should create a user with default values', () => {
      const user = createUser();

      expect(user).toMatchObject({
        id: expect.stringMatching(/^user_\d+_[a-z0-9]{9}$/),
        email: '',
        name: '',
        role: USER_ROLE.ADHD_USER,
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
      });
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should create a user with provided data', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        role: USER_ROLE.PARTNER,
      };
      const user = createUser(userData);

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe(USER_ROLE.PARTNER);
    });
  });

  describe('validateUser', () => {
    it('should validate a valid user', () => {
      const user = createUser({
        email: 'test@example.com',
        name: 'Test User',
      });
      const result = validateUser(user);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid user object', () => {
      const result = validateUser(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid user object');
    });

    it('should reject user without email', () => {
      const user = createUser({ name: 'Test User' });
      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid email is required');
    });

    it('should reject user with invalid email', () => {
      const user = createUser({
        email: 'invalid-email',
        name: 'Test User',
      });
      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid email is required');
    });

    it('should reject user without name', () => {
      const user = createUser({ email: 'test@example.com' });
      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should reject user with empty name', () => {
      const user = createUser({
        email: 'test@example.com',
        name: '   ',
      });
      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should reject user with invalid role', () => {
      const user = createUser({
        email: 'test@example.com',
        name: 'Test User',
      });
      user.role = 'invalid_role';
      const result = validateUser(user);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid user role');
    });
  });

  describe('updateUser', () => {
    it('should update user fields and set updatedAt', () => {
      const user = createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const updatedUser = updateUser(user, {
        name: 'Updated Name',
        role: USER_ROLE.BOTH,
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.role).toBe(USER_ROLE.BOTH);
      expect(updatedUser.email).toBe('test@example.com'); // Unchanged
      expect(updatedUser.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateUserStats', () => {
    it('should update specific stats', () => {
      const user = createUser();
      const updatedUser = updateUserStats(user, {
        tasksCompleted: 5,
        totalXP: 100,
      });

      expect(updatedUser.stats.tasksCompleted).toBe(5);
      expect(updatedUser.stats.totalXP).toBe(100);
      expect(updatedUser.stats.tasksAssigned).toBe(0); // Unchanged
    });
  });

  describe('setUserPartner', () => {
    it('should set partner ID', () => {
      const user = createUser();
      const partnerId = 'partner_123';
      const updatedUser = setUserPartner(user, partnerId);

      expect(updatedUser.partnerId).toBe(partnerId);
      expect(updatedUser.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', () => {
      const user = createUser();
      const updatedUser = updateNotificationPreferences(user, {
        global: NOTIFICATION_PREFERENCES.IMPORTANT_ONLY,
        encouragement: false,
      });

      expect(updatedUser.notificationPreferences.global).toBe(
        NOTIFICATION_PREFERENCES.IMPORTANT_ONLY,
      );
      expect(updatedUser.notificationPreferences.encouragement).toBe(false);
      expect(updatedUser.notificationPreferences.taskAssigned).toBe(true); // Unchanged
    });
  });

  describe('addCustomEncouragementMessage', () => {
    it('should add custom encouragement message', () => {
      const user = createUser();
      const message = "You're doing great!";
      const updatedUser = addCustomEncouragementMessage(user, message);

      expect(updatedUser.encouragementMessages).toHaveLength(1);
      expect(updatedUser.encouragementMessages[0]).toBe(message);
    });

    it('should append to existing messages', () => {
      const user = createUser();
      user.encouragementMessages = ['Message 1'];
      const updatedUser = addCustomEncouragementMessage(user, 'Message 2');

      expect(updatedUser.encouragementMessages).toHaveLength(2);
      expect(updatedUser.encouragementMessages).toEqual(['Message 1', 'Message 2']);
    });
  });
});
