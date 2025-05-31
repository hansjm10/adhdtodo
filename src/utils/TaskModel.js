// ABOUTME: Task model utilities for creating and validating tasks
// Provides functions to create tasks with proper structure and validate task data

import { TASK_STATUS, TASK_PRIORITY } from '../constants/TaskConstants';

export const generateTaskId = () => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createTask = (taskData = {}) => {
  const now = new Date();

  return {
    id: generateTaskId(),
    title: taskData.title || '',
    description: taskData.description || '',
    category: taskData.category || null,
    status: taskData.status || TASK_STATUS.PENDING,
    priority: taskData.priority || TASK_PRIORITY.MEDIUM,
    timeEstimate: taskData.timeEstimate || null,
    timeSpent: 0,
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    xpEarned: 0,
    streakContribution: false,
    // Accountability partner fields
    assignedBy: taskData.assignedBy || null, // User ID of partner who assigned
    assignedTo: taskData.assignedTo || null, // User ID of ADHD user
    dueDate: taskData.dueDate || null,
    preferredStartTime: taskData.preferredStartTime || null,
    startedAt: null,
    partnerNotified: {
      onStart: false,
      onComplete: false,
      onOverdue: false,
    },
    encouragementReceived: [],
    userId: taskData.userId || null, // User ID who owns the task
  };
};

export const validateTask = (task) => {
  const errors = [];

  if (!task || typeof task !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid task object'],
    };
  }

  if (!task.title || task.title === '') {
    if (task.title === '') {
      errors.push('Title cannot be empty');
    } else {
      errors.push('Title is required');
    }
  } else if (typeof task.title === 'string' && task.title.trim() === '') {
    errors.push('Title cannot be empty');
  }

  const validStatuses = Object.values(TASK_STATUS);
  if (task.status && !validStatuses.includes(task.status)) {
    errors.push('Invalid task status');
  }

  const validPriorities = Object.values(TASK_PRIORITY);
  if (task.priority && !validPriorities.includes(task.priority)) {
    errors.push('Invalid task priority');
  }

  if (task.timeEstimate !== null && task.timeEstimate !== undefined) {
    if (typeof task.timeEstimate !== 'number' || task.timeEstimate < 0) {
      errors.push('Time estimate must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const updateTask = (task, updates) => {
  return {
    ...task,
    ...updates,
    updatedAt: new Date(),
  };
};

export const completeTask = (task, xpEarned = 10) => {
  return {
    ...task,
    completed: true,
    completedAt: new Date(),
    status: TASK_STATUS.COMPLETED,
    xpEarned,
    updatedAt: new Date(),
  };
};

export const startTask = (task) => {
  return {
    ...task,
    status: TASK_STATUS.IN_PROGRESS,
    startedAt: new Date(),
    updatedAt: new Date(),
  };
};

export const assignTask = (
  task,
  assignedBy,
  assignedTo,
  dueDate = null,
  preferredStartTime = null,
) => {
  return {
    ...task,
    assignedBy,
    assignedTo,
    dueDate,
    preferredStartTime,
    updatedAt: new Date(),
  };
};

export const addEncouragement = (task, encouragement) => {
  return {
    ...task,
    encouragementReceived: [
      ...task.encouragementReceived,
      {
        message: encouragement.message,
        fromUserId: encouragement.fromUserId,
        timestamp: new Date(),
      },
    ],
    updatedAt: new Date(),
  };
};

export const markPartnerNotified = (task, notificationType) => {
  return {
    ...task,
    partnerNotified: {
      ...task.partnerNotified,
      [notificationType]: true,
    },
    updatedAt: new Date(),
  };
};

export const isOverdue = (task) => {
  if (!task.dueDate || task.completed) {
    return false;
  }
  return new Date() > new Date(task.dueDate);
};

export const getTimeUntilDue = (task) => {
  if (!task.dueDate || task.completed) {
    return null;
  }
  const now = new Date();
  const due = new Date(task.dueDate);
  return due - now;
};
