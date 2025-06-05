// ABOUTME: User model utilities for creating and managing user accounts
// Provides functions to create users, manage partnerships, and handle notifications

import type {
  User,
  UserNotificationPreferences} from '../types/user.types';
import {
  UserRole,
  NotificationPreference
} from '../types/user.types';

export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createUser = (userData: Partial<User> = {}): User => {
  const now = new Date();

  return {
    id: generateUserId(),
    email: userData.email || '',
    name: userData.name || '',
    role: userData.role || UserRole.ADHD_USER,
    // Authentication fields
    passwordHash: userData.passwordHash || null,
    passwordSalt: userData.passwordSalt || null,
    sessionToken: userData.sessionToken || null,
    lastLoginAt: userData.lastLoginAt || null,
    partnerId: null, // Will be set when partnership is established
    notificationPreferences: {
      global: NotificationPreference.ALL,
      taskAssigned: true,
      taskStarted: true,
      taskCompleted: true,
      taskOverdue: true,
      encouragement: true,
      checkIn: true,
    },
    encouragementMessages: [], // Custom messages from partner
    stats: {
      tasksAssigned: 0,
      tasksCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalXP: 0,
    },
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  };
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateUser = (user: Partial<User>): ValidationResult => {
  const errors: string[] = [];

  if (!user || typeof user !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid user object'],
    };
  }

  if (!user.email || typeof user.email !== 'string' || !user.email.includes('@')) {
    errors.push('Valid email is required');
  }

  if (!user.name || user.name.trim() === '') {
    errors.push('Name is required');
  }

  const validRoles = Object.values(UserRole);
  if (!user.role || !validRoles.includes(user.role)) {
    errors.push('Invalid user role');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const updateUser = (user: User, updates: Partial<User>): User => {
  return {
    ...user,
    ...updates,
    updatedAt: new Date(),
  };
};

export const updateUserStats = (user: User, statUpdates: Partial<User['stats']>): User => {
  return {
    ...user,
    stats: {
      ...user.stats,
      ...statUpdates,
    },
    updatedAt: new Date(),
  };
};

export const setUserPartner = (user: User, partnerId: string): User => {
  return {
    ...user,
    partnerId,
    updatedAt: new Date(),
  };
};

export const updateNotificationPreferences = (
  user: User,
  preferences: Partial<UserNotificationPreferences>,
): User => {
  return {
    ...user,
    notificationPreferences: {
      ...user.notificationPreferences,
      ...preferences,
    },
    updatedAt: new Date(),
  };
};

export const addCustomEncouragementMessage = (user: User, message: string): User => {
  return {
    ...user,
    encouragementMessages: [...user.encouragementMessages, message],
    updatedAt: new Date(),
  };
};
