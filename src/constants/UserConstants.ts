// ABOUTME: Constants for user roles, partnership status, and notification preferences
// Defines enums and constants used throughout the accountability partner system

// Re-export enums from types for backward compatibility
export { UserRole as USER_ROLE } from '../types/user.types';
export { PartnershipStatus as PARTNERSHIP_STATUS } from '../types/user.types';
export { NotificationTypes as NOTIFICATION_TYPES } from '../types/user.types';
export { NotificationPreference as NOTIFICATION_PREFERENCES } from '../types/user.types';

export const ENCOURAGEMENT_TRIGGERS = {
  TASK_START: 'task_start',
  HALFWAY_POINT: 'halfway_point',
  NEAR_COMPLETION: 'near_completion',
  AFTER_BREAK: 'after_break',
  STRUGGLE_DETECTED: 'struggle_detected',
} as const;

export const DEFAULT_ENCOURAGEMENT_MESSAGES: readonly string[] = [
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
