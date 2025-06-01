// ABOUTME: TypeScript type definitions for Task entities and related types
// Includes Task, TaskCategory, and task-related enums

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface TaskCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface TimePreset {
  minutes: number;
  label: string;
}

export interface PartnerNotificationStatus {
  onStart: boolean;
  onComplete: boolean;
  onOverdue: boolean;
}

export interface TaskEncouragement {
  message: string;
  fromUserId: string;
  timestamp: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  timeEstimate: number | null; // in minutes
  timeSpent: number; // in minutes
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  xpEarned: number;
  streakContribution: boolean;
  // Accountability partner fields
  assignedBy: string | null; // User ID of partner who assigned
  assignedTo: string | null; // User ID of ADHD user
  dueDate: Date | null;
  preferredStartTime: Date | null;
  startedAt: Date | null;
  partnerNotified: PartnerNotificationStatus;
  encouragementReceived: TaskEncouragement[];
  userId: string | null; // User ID who owns the task
}

// Task categories constant
export const TASK_CATEGORIES: Record<string, TaskCategory> = {
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

// Time presets constant
export const TIME_PRESETS: TimePreset[] = [
  { minutes: 5, label: '5 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
];

// Reward points constants
export const REWARD_POINTS = {
  TASK_COMPLETION: 10,
  STREAK_BONUS: 5,
  TIME_ESTIMATE_ACCURATE: 15,
  CATEGORY_COMPLETION: 20,
} as const;

// Type guards
export function isTask(obj: any): obj is Task {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Object.values(TaskStatus).includes(obj.status) &&
    Object.values(TaskPriority).includes(obj.priority)
  );
}

export function isTaskCategory(obj: any): obj is TaskCategory {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.label === 'string' &&
    typeof obj.color === 'string' &&
    typeof obj.icon === 'string'
  );
}