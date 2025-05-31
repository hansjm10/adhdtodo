// ABOUTME: User model utilities for creating and managing user accounts
// Provides functions to create users, manage partnerships, and handle notifications

import { USER_ROLE, NOTIFICATION_PREFERENCES } from '../constants/UserConstants';

export const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createUser = (userData = {}) => {
  const now = new Date();

  return {
    id: generateUserId(),
    email: userData.email || '',
    name: userData.name || '',
    role: userData.role || USER_ROLE.ADHD_USER,
    partnerId: null, // Will be set when partnership is established
    notificationPreferences: {
      global: NOTIFICATION_PREFERENCES.ALL,
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

export const validateUser = (user) => {
  const errors = [];

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

  const validRoles = Object.values(USER_ROLE);
  if (!validRoles.includes(user.role)) {
    errors.push('Invalid user role');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const updateUser = (user, updates) => {
  return {
    ...user,
    ...updates,
    updatedAt: new Date(),
  };
};

export const updateUserStats = (user, statUpdates) => {
  return {
    ...user,
    stats: {
      ...user.stats,
      ...statUpdates,
    },
    updatedAt: new Date(),
  };
};

export const setUserPartner = (user, partnerId) => {
  return {
    ...user,
    partnerId,
    updatedAt: new Date(),
  };
};

export const updateNotificationPreferences = (user, preferences) => {
  return {
    ...user,
    notificationPreferences: {
      ...user.notificationPreferences,
      ...preferences,
    },
    updatedAt: new Date(),
  };
};

export const addCustomEncouragementMessage = (user, message) => {
  return {
    ...user,
    encouragementMessages: [...user.encouragementMessages, message],
    updatedAt: new Date(),
  };
};
