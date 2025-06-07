// ABOUTME: Mock factory functions for creating test data
// Provides utilities to generate consistent test objects for users, tasks, and notifications

import {
  USER_ROLE,
  NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPES,
  PARTNERSHIP_STATUS,
} from '../../src/constants/UserConstants';
import { TASK_STATUS, TASK_PRIORITY } from '../../src/constants/TaskConstants';

/**
 * Create a mock user object with sensible defaults
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock user object
 */
export const createMockUser = (overrides = {}) => {
  const now = new Date();
  // Handle null/undefined overrides
  const safeOverrides = overrides || {};
  const userId =
    safeOverrides.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  return {
    id: userId,
    email: 'test@example.com',
    name: 'Test User',
    role: USER_ROLE.ADHD_USER,
    // Authentication fields
    passwordHash: 'mock-hash',
    passwordSalt: 'mock-salt',
    sessionToken: 'mock-session-token',
    lastLoginAt: now,
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
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    ...safeOverrides,
  };
};

/**
 * Create a mock task object with sensible defaults
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock task object
 */
export const createMockTask = (overrides = {}) => {
  const now = new Date();
  // Handle null/undefined overrides
  const safeOverrides = overrides || {};
  const taskId =
    safeOverrides.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const userId = safeOverrides.userId || 'user-123';

  // Determine status based on completed flag if provided
  let status = TASK_STATUS.PENDING;
  if (safeOverrides.completed === true) {
    status = TASK_STATUS.COMPLETED;
  } else if (safeOverrides.completed === false) {
    status = TASK_STATUS.PENDING;
  } else if (safeOverrides.status) {
    status = safeOverrides.status;
  }

  const completed = safeOverrides.completed !== undefined ? safeOverrides.completed : false;
  const completedAt = completed ? safeOverrides.completedAt || now : null;

  return {
    id: taskId,
    title: 'Test Task',
    description: 'Test Description',
    category: 'personal',
    status: status,
    priority: TASK_PRIORITY.MEDIUM,
    timeEstimate: 30, // minutes
    timeSpent: 0,
    completed: completed,
    completedAt: completedAt,
    createdAt: now,
    updatedAt: now,
    xpEarned: 0,
    streakContribution: false,
    // Accountability partner fields
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
    userId: userId,
    ...safeOverrides,
  };
};

/**
 * Create a mock notification object with sensible defaults
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock notification object
 */
export const createMockNotification = (overrides = {}) => {
  const now = new Date();
  // Handle null/undefined overrides
  const safeOverrides = overrides || {};
  const notificationId =
    safeOverrides.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  return {
    id: notificationId,
    userId: safeOverrides.userId || 'user-123',
    toUserId: safeOverrides.toUserId || 'user-123',
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: 'Task Assigned',
    message: 'You have a new task assigned',
    data: {
      taskId: 'task-123',
      taskTitle: 'Test Task',
      assignedBy: 'Partner User',
      dueDate: null,
      priority: TASK_PRIORITY.MEDIUM,
    },
    timestamp: now,
    createdAt: now,
    read: false,
    ...safeOverrides,
  };
};

/**
 * Create a mock partner user (convenience function)
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock partner user object
 */
export const createMockPartnerUser = (overrides = {}) => {
  return createMockUser({
    id: `partner-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    email: 'partner@example.com',
    name: 'Partner User',
    role: USER_ROLE.ACCOUNTABILITY_PARTNER,
    ...overrides,
  });
};

/**
 * Create a mock completed task (convenience function)
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock completed task object
 */
export const createMockCompletedTask = (overrides = {}) => {
  const completedAt = overrides.completedAt || new Date();

  return createMockTask({
    status: TASK_STATUS.COMPLETED,
    completed: true,
    completedAt: completedAt,
    xpEarned: 10,
    streakContribution: true,
    timeSpent: 25,
    ...overrides,
  });
};

/**
 * Create a mock assigned task (convenience function)
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock assigned task object
 */
export const createMockAssignedTask = (overrides = {}) => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

  return createMockTask({
    assignedBy: 'partner-123',
    assignedTo: 'user-123',
    dueDate: dueDate,
    title: 'Assigned Task',
    description: 'Task assigned by partner',
    ...overrides,
  });
};

/**
 * Create a mock encouragement notification (convenience function)
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock encouragement notification
 */
export const createMockEncouragementNotification = (overrides = {}) => {
  return createMockNotification({
    type: NOTIFICATION_TYPES.ENCOURAGEMENT,
    data: {
      message: 'You can do this!',
      fromUser: 'Partner User',
      taskId: null,
    },
    ...overrides,
  });
};

/**
 * Create a mock partnership object with sensible defaults
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Mock partnership object
 */
export const createMockPartnership = (overrides = {}) => {
  const now = new Date();
  // Handle null/undefined overrides
  const safeOverrides = overrides || {};
  const partnershipId =
    safeOverrides.id || `partnership-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const inviteCode =
    safeOverrides.inviteCode || Math.random().toString(36).substr(2, 6).toUpperCase();

  const status = safeOverrides.status || PARTNERSHIP_STATUS.PENDING;

  return {
    id: partnershipId,
    adhdUserId: safeOverrides.adhdUserId || 'user-123',
    partnerId: safeOverrides.partnerId || 'partner-123',
    status: status,
    inviteCode: inviteCode,
    inviteSentBy: safeOverrides.inviteSentBy || safeOverrides.adhdUserId || 'user-123',
    settings: {
      allowTaskAssignment: true,
      shareProgress: true,
      allowEncouragement: true,
      allowCheckIns: true,
      quietHoursStart: null,
      quietHoursEnd: null,
    },
    stats: {
      tasksAssigned: 0,
      tasksCompleted: 0,
      encouragementsSent: 0,
      checkInsCompleted: 0,
      partnershipDuration: 0,
    },
    createdAt: now,
    updatedAt: now,
    acceptedAt: status === PARTNERSHIP_STATUS.ACTIVE ? now : null,
    terminatedAt: status === PARTNERSHIP_STATUS.TERMINATED ? now : null,
    ...safeOverrides,
  };
};

/**
 * Create mock notification data for different types
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {Object} overrides - Additional data overrides
 * @returns {Object} Mock notification data
 */
export const createMockNotificationData = (type, overrides = {}) => {
  const baseData = {
    [NOTIFICATION_TYPES.TASK_ASSIGNED]: {
      taskId: 'task-123',
      taskTitle: 'Test Task',
      assignedBy: 'Partner User',
      dueDate: new Date(),
      priority: TASK_PRIORITY.HIGH,
    },
    [NOTIFICATION_TYPES.TASK_STARTED]: {
      taskId: 'task-123',
      taskTitle: 'Test Task',
      startedBy: 'Test User',
      startedAt: new Date(),
    },
    [NOTIFICATION_TYPES.TASK_COMPLETED]: {
      taskId: 'task-123',
      taskTitle: 'Test Task',
      completedBy: 'Test User',
      completedAt: new Date(),
      timeSpent: 30,
      xpEarned: 10,
    },
    [NOTIFICATION_TYPES.TASK_OVERDUE]: {
      taskId: 'task-123',
      taskTitle: 'Test Task',
      dueDate: new Date(Date.now() - 86400000), // Yesterday
    },
    [NOTIFICATION_TYPES.ENCOURAGEMENT]: {
      message: 'Keep going!',
      fromUser: 'Partner User',
      taskId: null,
    },
    [NOTIFICATION_TYPES.CHECK_IN]: {
      message: 'How are you doing?',
      fromUser: 'Partner User',
    },
  };

  return {
    ...baseData[type],
    ...overrides,
  };
};
