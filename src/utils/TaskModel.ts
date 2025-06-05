// ABOUTME: Task model utilities for creating and validating tasks
// Provides functions to create tasks with proper structure and validate task data

import type { Task, TaskEncouragement } from '../types/task.types';
import { TaskStatus, TaskPriority } from '../types/task.types';
import type { ValidationResult } from './UserModel';

export const generateTaskId = (): string => {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export const createTask = (taskData: Partial<Task> = {}): Task => {
  const now = new Date();

  return {
    id: generateTaskId(),
    title: taskData.title ?? '',
    description: taskData.description ?? '',
    category: taskData.category ?? null,
    status: taskData.status ?? TaskStatus.PENDING,
    priority: taskData.priority ?? TaskPriority.MEDIUM,
    timeEstimate: taskData.timeEstimate ?? null,
    timeSpent: 0,
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    xpEarned: 0,
    streakContribution: false,
    // Accountability partner fields
    assignedBy: taskData.assignedBy ?? null, // User ID of partner who assigned
    assignedTo: taskData.assignedTo ?? null, // User ID of ADHD user
    dueDate: taskData.dueDate ?? null,
    preferredStartTime: taskData.preferredStartTime ?? null,
    startedAt: null,
    partnerNotified: {
      onStart: false,
      onComplete: false,
      onOverdue: false,
    },
    encouragementReceived: [],
    userId: taskData.userId ?? null, // User ID who owns the task
  };
};

export const validateTask = (task: Partial<Task>): ValidationResult => {
  const errors: string[] = [];

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

  const validStatuses = Object.values(TaskStatus);
  if (task.status && !validStatuses.includes(task.status)) {
    errors.push('Invalid task status');
  }

  const validPriorities = Object.values(TaskPriority);
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

export const updateTask = (task: Task, updates: Partial<Task>): Task => {
  return {
    ...task,
    ...updates,
    updatedAt: new Date(),
  };
};

export const completeTask = (task: Task, xpEarned: number = 10): Task => {
  return {
    ...task,
    completed: true,
    completedAt: new Date(),
    status: TaskStatus.COMPLETED,
    xpEarned,
    updatedAt: new Date(),
  };
};

export const startTask = (task: Task): Task => {
  return {
    ...task,
    status: TaskStatus.IN_PROGRESS,
    startedAt: new Date(),
    updatedAt: new Date(),
  };
};

export const assignTask = (
  task: Task,
  assignedBy: string,
  assignedTo: string,
  dueDate: Date | null = null,
  preferredStartTime: Date | null = null,
): Task => {
  return {
    ...task,
    assignedBy,
    assignedTo,
    dueDate,
    preferredStartTime,
    updatedAt: new Date(),
  };
};

export const addEncouragement = (
  task: Task,
  encouragement: Omit<TaskEncouragement, 'timestamp'>,
): Task => {
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

export const markPartnerNotified = (
  task: Task,
  notificationType: keyof Task['partnerNotified'],
): Task => {
  return {
    ...task,
    partnerNotified: {
      ...task.partnerNotified,
      [notificationType]: true,
    },
    updatedAt: new Date(),
  };
};

export const isOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.completed) {
    return false;
  }
  return new Date() > new Date(task.dueDate);
};

export const getTimeUntilDue = (task: Task): number | null => {
  if (!task.dueDate || task.completed) {
    return null;
  }
  const now = new Date();
  const due = new Date(task.dueDate);
  return due.getTime() - now.getTime();
};
