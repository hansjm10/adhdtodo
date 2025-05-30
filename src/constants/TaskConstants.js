// ABOUTME: Constants for task management including categories, time presets, and status types
// Defines predefined categories, time estimation options, and task states

export const TASK_CATEGORIES = {
  HOME: {
    id: 'home',
    label: 'Home',
    color: '#FF6B6B',
    icon: '🏠',
  },
  WORK: {
    id: 'work',
    label: 'Work',
    color: '#4ECDC4',
    icon: '💼',
  },
  PERSONAL: {
    id: 'personal',
    label: 'Personal',
    color: '#45B7D1',
    icon: '👤',
  },
};

export const TIME_PRESETS = [
  { minutes: 5, label: '5 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
];

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const REWARD_POINTS = {
  TASK_COMPLETION: 10,
  STREAK_BONUS: 5,
  TIME_ESTIMATE_ACCURATE: 15,
  CATEGORY_COMPLETION: 20,
};
