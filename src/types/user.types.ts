// ABOUTME: TypeScript type definitions for User entities and related types
// Includes User, Partnership, and notification preference types

export enum UserRole {
  ADHD_USER = 'adhd_user',
  PARTNER = 'partner',
  BOTH = 'both',
}

export enum PartnershipStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DECLINED = 'declined',
  TERMINATED = 'terminated',
}

export enum NotificationTypes {
  TASK_ASSIGNED = 'task_assigned',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  ENCOURAGEMENT = 'encouragement',
  CHECK_IN = 'check_in',
  DEADLINE_CHANGE_REQUEST = 'deadline_change_request',
}

export enum NotificationPreference {
  ALL = 'all',
  IMPORTANT_ONLY = 'important_only',
  SILENT = 'silent',
}

export interface UserStats {
  tasksAssigned: number;
  tasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
}

export interface UserNotificationPreferences {
  global: NotificationPreference;
  taskAssigned: boolean;
  taskStarted: boolean;
  taskCompleted: boolean;
  taskOverdue: boolean;
  encouragement: boolean;
  checkIn: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  // Authentication fields
  passwordHash: string | null;
  passwordSalt: string | null;
  sessionToken: string | null;
  lastLoginAt: Date | null;
  partnerId: string | null;
  notificationPreferences: UserNotificationPreferences;
  encouragementMessages: string[];
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface PartnershipSettings {
  allowTaskAssignment: boolean;
  shareProgress: boolean;
  allowEncouragement: boolean;
  allowCheckIns: boolean;
  quietHoursStart: string | null; // e.g., "22:00"
  quietHoursEnd: string | null; // e.g., "08:00"
}

export interface PartnershipStats {
  tasksAssigned: number;
  tasksCompleted: number;
  encouragementsSent: number;
  checkInsCompleted: number;
  partnershipDuration: number; // in days
}

export interface Partnership {
  id: string;
  adhdUserId: string | null;
  partnerId: string | null;
  status: PartnershipStatus;
  inviteCode: string;
  inviteSentBy: string | null;
  settings: PartnershipSettings;
  stats: PartnershipStats;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  terminatedAt: Date | null;
}

// Type guards
export function isUser(obj: unknown): obj is User {
  if (!obj || typeof obj !== 'object' || obj === null) {
    return false;
  }

  const user = obj as Record<string, unknown>;

  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    Object.values(UserRole).includes(user.role as UserRole)
  );
}

export function isPartnership(obj: unknown): obj is Partnership {
  if (!obj || typeof obj !== 'object' || obj === null) {
    return false;
  }

  const partnership = obj as Record<string, unknown>;

  return (
    typeof partnership.id === 'string' &&
    Object.values(PartnershipStatus).includes(partnership.status as PartnershipStatus)
  );
}
