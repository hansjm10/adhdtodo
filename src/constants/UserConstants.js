// ABOUTME: Constants for user roles, partnership status, and notification preferences
// Defines enums and constants used throughout the accountability partner system

export const USER_ROLE = {
  ADHD_USER: 'adhd_user',
  PARTNER: 'partner',
  BOTH: 'both', // User can be both ADHD user and partner in different relationships
};

export const PARTNERSHIP_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  DECLINED: 'declined',
  TERMINATED: 'terminated',
};

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_STARTED: 'task_started',
  TASK_COMPLETED: 'task_completed',
  TASK_OVERDUE: 'task_overdue',
  ENCOURAGEMENT: 'encouragement',
  CHECK_IN: 'check_in',
  DEADLINE_CHANGE_REQUEST: 'deadline_change_request',
};

export const NOTIFICATION_PREFERENCES = {
  ALL: 'all',
  IMPORTANT_ONLY: 'important_only',
  SILENT: 'silent',
};

export const ENCOURAGEMENT_TRIGGERS = {
  TASK_START: 'task_start',
  HALFWAY_POINT: 'halfway_point',
  NEAR_COMPLETION: 'near_completion',
  AFTER_BREAK: 'after_break',
  STRUGGLE_DETECTED: 'struggle_detected',
};

export const DEFAULT_ENCOURAGEMENT_MESSAGES = [
  "You've got this! 💪",
  "Great job starting! That's often the hardest part.",
  "Keep going, you're doing amazing!",
  'Remember: progress, not perfection!',
  "I'm proud of you for tackling this!",
  "You're crushing it! 🌟",
  "One step at a time - you're doing great!",
  'Your effort is inspiring!',
  'Almost there, keep pushing!',
  "You're stronger than you think!",
];
