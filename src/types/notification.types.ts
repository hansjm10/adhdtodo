// ABOUTME: TypeScript type definitions for Notification entities
// Includes notification types, priorities, and contexts

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationButton {
  text: string;
  action: () => void;
  style?: 'default' | 'primary' | 'danger';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string; // Using string for flexibility with NotificationTypes from user.types.ts
  priority: NotificationPriority;
  taskId?: string;
  userId?: string;
  fromUserId?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  buttons?: NotificationButton[];
}

export interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getNotificationsByType: (type: string) => Notification[];
  getUnreadNotifications: () => Notification[];
}

// Type guard
export function isNotification(obj: unknown): obj is Notification {
  if (!obj || typeof obj !== 'object' || obj === null) {
    return false;
  }

  const notification = obj as Record<string, unknown>;

  return (
    typeof notification.id === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string' &&
    typeof notification.type === 'string' &&
    Object.values(NotificationPriority).includes(notification.priority as NotificationPriority) &&
    typeof notification.read === 'boolean' &&
    notification.createdAt instanceof Date
  );
}
