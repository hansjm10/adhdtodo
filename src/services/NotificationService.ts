// ABOUTME: Simplified NotificationService that directly uses Supabase for all notification storage
// No local storage fallback, no manual cleanup - pure Supabase implementation

import { supabase } from './SupabaseService';
import { NOTIFICATION_TYPES } from '../constants/UserConstants';
import UserStorageService from './UserStorageService';
import SecureLogger from './SecureLogger';
import { Notification, NotificationPriority, NotificationTypes, User, Task } from '../types';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface INotificationService {
  sendNotification(
    toUserId: string,
    type: NotificationTypes,
    data: Record<string, unknown>,
  ): Promise<boolean>;
  notifyTaskAssigned(task: Task, assignedByUser: User): Promise<boolean>;
  notifyTaskStarted(task: Task, startedByUser: User): Promise<boolean>;
  notifyTaskCompleted(task: Task, completedByUser: User): Promise<boolean>;
  notifyTaskOverdue(task: Task): Promise<boolean>;
  sendEncouragement(
    fromUserId: string,
    toUserId: string,
    message: string,
    taskId?: string | null,
  ): Promise<boolean>;
  sendCheckIn(fromUserId: string, toUserId: string, message: string): Promise<boolean>;
  getNotificationsForUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  clearNotificationsForUser(userId: string): Promise<boolean>;
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void,
  ): () => void;
}

// Database notification type mapping
interface DbNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: string;
  read?: boolean;
  read_at?: string | null;
  created_at?: string;
  expires_at?: string;
}

export class NotificationService implements INotificationService {
  private subscriptions = new Map<string, RealtimeChannel>();

  private transformDbNotificationToNotification(dbNotif: DbNotification): Notification {
    return {
      id: dbNotif.id,
      type: dbNotif.type as NotificationTypes,
      title: dbNotif.title,
      message: dbNotif.message,
      data: dbNotif.data || {},
      priority: (dbNotif.priority as NotificationPriority) || 'medium',
      read: dbNotif.read || false,
      createdAt: new Date(dbNotif.created_at || Date.now()),
      timestamp: new Date(dbNotif.created_at || Date.now()),
    };
  }

  private generateTitle(type: NotificationTypes, _data: Record<string, unknown>): string {
    switch (type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return 'New Task Assigned';
      case NOTIFICATION_TYPES.TASK_STARTED:
        return 'Task Started';
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return 'Task Completed!';
      case NOTIFICATION_TYPES.TASK_OVERDUE:
        return 'Task Overdue';
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
        return 'Encouragement';
      case NOTIFICATION_TYPES.CHECK_IN:
        return 'Partner Check-In';
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return 'Deadline Change Request';
      default:
        return 'Notification';
    }
  }

  private generateMessage(type: NotificationTypes, data: Record<string, unknown>): string {
    const fromUserName = data.fromUserName || 'Your partner';
    const taskTitle = data.taskTitle || 'a task';

    switch (type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return `${fromUserName} assigned you "${taskTitle}"`;
      case NOTIFICATION_TYPES.TASK_STARTED:
        return `${fromUserName} started working on "${taskTitle}"`;
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return `${fromUserName} completed "${taskTitle}"`;
      case NOTIFICATION_TYPES.TASK_OVERDUE:
        return `"${taskTitle}" is overdue`;
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
        return (data.message as string) || `${fromUserName} sent you encouragement`;
      case NOTIFICATION_TYPES.CHECK_IN:
        return (data.message as string) || `${fromUserName} is checking in on you`;
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return `${fromUserName} requested a deadline change for "${taskTitle}"`;
      default:
        return 'You have a new notification';
    }
  }

  private getPriority(type: NotificationTypes): NotificationPriority {
    switch (type) {
      case NOTIFICATION_TYPES.TASK_OVERDUE:
      case NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST:
        return NotificationPriority.HIGH;
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
      case NOTIFICATION_TYPES.CHECK_IN:
        return NotificationPriority.LOW;
      default:
        return NotificationPriority.MEDIUM;
    }
  }

  async sendNotification(
    toUserId: string,
    type: NotificationTypes,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: toUserId,
        type,
        title: this.generateTitle(type, data),
        message: this.generateMessage(type, data),
        data,
        priority: this.getPriority(type),
      });

      if (error) {
        SecureLogger.error('Failed to send notification', {
          code: 'NOTIF_001',
          context: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      SecureLogger.error('Failed to send notification', {
        code: 'NOTIF_002',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async notifyTaskAssigned(task: Task, assignedByUser: User): Promise<boolean> {
    if (!task.assignedTo) return false;

    return this.sendNotification(task.assignedTo, NOTIFICATION_TYPES.TASK_ASSIGNED, {
      taskId: task.id,
      taskTitle: task.title,
      assignedByUserId: assignedByUser.id,
      fromUserName: assignedByUser.name,
    });
  }

  async notifyTaskStarted(task: Task, startedByUser: User): Promise<boolean> {
    if (!task.assignedBy || task.assignedBy === startedByUser.id) return true;

    return this.sendNotification(task.assignedBy, NOTIFICATION_TYPES.TASK_STARTED, {
      taskId: task.id,
      taskTitle: task.title,
      startedByUserId: startedByUser.id,
      fromUserName: startedByUser.name,
    });
  }

  async notifyTaskCompleted(task: Task, completedByUser: User): Promise<boolean> {
    if (!task.assignedBy || task.assignedBy === completedByUser.id) return true;

    return this.sendNotification(task.assignedBy, NOTIFICATION_TYPES.TASK_COMPLETED, {
      taskId: task.id,
      taskTitle: task.title,
      completedByUserId: completedByUser.id,
      fromUserName: completedByUser.name,
      xpEarned: task.xpEarned,
    });
  }

  async notifyTaskOverdue(task: Task): Promise<boolean> {
    const userIds: string[] = [];

    // Notify the task owner
    if (task.userId) {
      userIds.push(task.userId);
    }

    // Notify the assigned user if different
    if (task.assignedTo && task.assignedTo !== task.userId) {
      userIds.push(task.assignedTo);
    }

    // Notify the assigner if different
    if (task.assignedBy && task.assignedBy !== task.userId && task.assignedBy !== task.assignedTo) {
      userIds.push(task.assignedBy);
    }

    const results = await Promise.all(
      userIds.map((userId) =>
        this.sendNotification(userId, NOTIFICATION_TYPES.TASK_OVERDUE, {
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate?.toISOString(),
        }),
      ),
    );

    return results.every((result) => result);
  }

  async sendEncouragement(
    fromUserId: string,
    toUserId: string,
    message: string,
    taskId?: string | null,
  ): Promise<boolean> {
    const fromUser = await UserStorageService.getUserById(fromUserId);
    if (!fromUser) return false;

    return this.sendNotification(toUserId, NOTIFICATION_TYPES.ENCOURAGEMENT, {
      fromUserId,
      fromUserName: fromUser.name,
      message,
      taskId,
    });
  }

  async sendCheckIn(fromUserId: string, toUserId: string, message: string): Promise<boolean> {
    const fromUser = await UserStorageService.getUserById(fromUserId);
    if (!fromUser) return false;

    return this.sendNotification(toUserId, NOTIFICATION_TYPES.CHECK_IN, {
      fromUserId,
      fromUserName: fromUser.name,
      message,
    });
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        SecureLogger.error('Failed to fetch notifications', {
          code: 'NOTIF_003',
          context: error.message,
        });
        return [];
      }

      return (data || []).map(this.transformDbNotificationToNotification);
    } catch (error) {
      SecureLogger.error('Failed to get notifications', {
        code: 'NOTIF_004',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .is('read', false);

      if (error) {
        SecureLogger.error('Failed to count unread notifications', {
          code: 'NOTIF_005',
          context: error.message,
        });
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      SecureLogger.error('Failed to get unread count', {
        code: 'NOTIF_006',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) {
        SecureLogger.error('Failed to mark notification as read', {
          code: 'NOTIF_007',
          context: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      SecureLogger.error('Failed to mark as read', {
        code: 'NOTIF_008',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .is('read', false);

      if (error) {
        SecureLogger.error('Failed to mark all notifications as read', {
          code: 'NOTIF_009',
          context: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      SecureLogger.error('Failed to mark all as read', {
        code: 'NOTIF_010',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async clearNotificationsForUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('notifications').delete().eq('user_id', userId);

      if (error) {
        SecureLogger.error('Failed to clear notifications', {
          code: 'NOTIF_011',
          context: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      SecureLogger.error('Failed to clear notifications', {
        code: 'NOTIF_012',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void,
  ): () => void {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbNotification>) => {
          if (payload.new) {
            const notification = this.transformDbNotificationToNotification(
              payload.new as DbNotification,
            );
            callback(notification);
          }
        },
      )
      .subscribe();

    // Store subscription
    this.subscriptions.set(userId, channel);

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(userId);
      if (sub) {
        sub.unsubscribe();
        this.subscriptions.delete(userId);
      }
    };
  }
}

export default new NotificationService();
export { NotificationService as NotificationServiceClass };
