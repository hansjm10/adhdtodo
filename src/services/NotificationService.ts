// ABOUTME: Simplified NotificationService that directly uses Supabase for all notification storage
// No local storage fallback, no manual cleanup - pure Supabase implementation

import { supabase } from './SupabaseService';
import { BaseService } from './BaseService';
import { NOTIFICATION_TYPES } from '../constants/UserConstants';
import UserStorageService from './UserStorageService';
import type { Notification, NotificationTypes, User, Task, Result } from '../types';
import { NotificationPriority } from '../types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface INotificationService {
  sendNotification(
    toUserId: string,
    type: NotificationTypes,
    data: Record<string, unknown>,
  ): Promise<Result<boolean>>;
  notifyTaskAssigned(task: Task, assignedByUser: User): Promise<Result<boolean>>;
  notifyTaskStarted(task: Task, startedByUser: User): Promise<Result<boolean>>;
  notifyTaskCompleted(task: Task, completedByUser: User): Promise<Result<boolean>>;
  notifyTaskOverdue(task: Task): Promise<Result<boolean>>;
  sendEncouragement(
    fromUserId: string,
    toUserId: string,
    message: string,
    taskId?: string | null,
  ): Promise<Result<boolean>>;
  sendCheckIn(fromUserId: string, toUserId: string, message: string): Promise<Result<boolean>>;
  getNotificationsForUser(userId: string): Promise<Result<Notification[]>>;
  getUnreadNotificationCount(userId: string): Promise<Result<number>>;
  markNotificationAsRead(notificationId: string): Promise<Result<boolean>>;
  markAllNotificationsAsRead(userId: string): Promise<Result<boolean>>;
  clearNotificationsForUser(userId: string): Promise<Result<boolean>>;
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

export class NotificationService extends BaseService implements INotificationService {
  private subscriptions = new Map<string, RealtimeChannel>();

  constructor() {
    super('Notification');
  }

  private transformDbNotificationToNotification(dbNotif: DbNotification): Notification {
    return {
      id: dbNotif.id,
      type: dbNotif.type as NotificationTypes,
      title: dbNotif.title,
      message: dbNotif.message,
      data: dbNotif.data ?? {},
      priority: (dbNotif.priority as NotificationPriority) ?? 'medium',
      read: dbNotif.read ?? false,
      createdAt: new Date(dbNotif.created_at ?? Date.now()),
      timestamp: new Date(dbNotif.created_at ?? Date.now()),
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
    const fromUserName = data.fromUserName ?? 'Your partner';
    const taskTitle = data.taskTitle ?? 'a task';

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
        return (data.message as string) ?? `${fromUserName} sent you encouragement`;
      case NOTIFICATION_TYPES.CHECK_IN:
        return (data.message as string) ?? `${fromUserName} is checking in on you`;
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
  ): Promise<Result<boolean>> {
    return this.wrapAsync(
      'sendNotification',
      async () => {
        const { error } = await supabase.from('notifications').insert({
          user_id: toUserId,
          type,
          title: this.generateTitle(type, data),
          message: this.generateMessage(type, data),
          data,
          priority: this.getPriority(type),
        });

        if (error) throw error;
        return true;
      },
      { toUserId, type, hasData: Object.keys(data).length > 0 },
    );
  }

  async notifyTaskAssigned(task: Task, assignedByUser: User): Promise<Result<boolean>> {
    return this.wrapAsync(
      'notifyTaskAssigned',
      async () => {
        if (!task.assignedTo) {
          return false;
        }

        const result = await this.sendNotification(
          task.assignedTo,
          NOTIFICATION_TYPES.TASK_ASSIGNED,
          {
            taskId: task.id,
            taskTitle: task.title,
            assignedByUserId: assignedByUser.id,
            fromUserName: assignedByUser.name,
          },
        );

        return result.success ? result.data! : false;
      },
      { taskId: task.id, assignedTo: task.assignedTo, assignedBy: assignedByUser.id },
    );
  }

  async notifyTaskStarted(task: Task, startedByUser: User): Promise<Result<boolean>> {
    return this.wrapAsync(
      'notifyTaskStarted',
      async () => {
        if (!task.assignedBy || task.assignedBy === startedByUser.id) {
          return true;
        }

        const result = await this.sendNotification(
          task.assignedBy,
          NOTIFICATION_TYPES.TASK_STARTED,
          {
            taskId: task.id,
            taskTitle: task.title,
            startedByUserId: startedByUser.id,
            fromUserName: startedByUser.name,
          },
        );

        return result.success ? result.data! : false;
      },
      { taskId: task.id, assignedBy: task.assignedBy, startedBy: startedByUser.id },
    );
  }

  async notifyTaskCompleted(task: Task, completedByUser: User): Promise<Result<boolean>> {
    return this.wrapAsync(
      'notifyTaskCompleted',
      async () => {
        if (!task.assignedBy || task.assignedBy === completedByUser.id) {
          return true;
        }

        const result = await this.sendNotification(
          task.assignedBy,
          NOTIFICATION_TYPES.TASK_COMPLETED,
          {
            taskId: task.id,
            taskTitle: task.title,
            completedByUserId: completedByUser.id,
            fromUserName: completedByUser.name,
            xpEarned: task.xpEarned,
          },
        );

        return result.success ? result.data! : false;
      },
      { taskId: task.id, assignedBy: task.assignedBy, completedBy: completedByUser.id },
    );
  }

  async notifyTaskOverdue(task: Task): Promise<Result<boolean>> {
    // Calculate userIds upfront for context
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

    return this.wrapAsync(
      'notifyTaskOverdue',
      async () => {
        const results = await Promise.all(
          userIds.map((userId) =>
            this.sendNotification(userId, NOTIFICATION_TYPES.TASK_OVERDUE, {
              taskId: task.id,
              taskTitle: task.title,
              dueDate: task.dueDate?.toISOString(),
            }),
          ),
        );

        return results.every((result) => result.success && result.data);
      },
      { taskId: task.id, userIds, dueDate: task.dueDate?.toISOString() },
    );
  }

  async sendEncouragement(
    fromUserId: string,
    toUserId: string,
    message: string,
    taskId?: string | null,
  ): Promise<Result<boolean>> {
    return this.wrapAsync(
      'sendEncouragement',
      async () => {
        const fromUserResult = await UserStorageService.getUserById(fromUserId);
        if (!fromUserResult.success || !fromUserResult.data) {
          return false;
        }

        const fromUser = fromUserResult.data;
        const result = await this.sendNotification(toUserId, NOTIFICATION_TYPES.ENCOURAGEMENT, {
          fromUserId,
          fromUserName: fromUser.name ?? 'Unknown User',
          message,
          taskId,
        });

        return result.success ? result.data! : false;
      },
      { fromUserId, toUserId, taskId },
    );
  }

  async sendCheckIn(
    fromUserId: string,
    toUserId: string,
    message: string,
  ): Promise<Result<boolean>> {
    return this.wrapAsync(
      'sendCheckIn',
      async () => {
        const fromUserResult = await UserStorageService.getUserById(fromUserId);
        if (!fromUserResult.success || !fromUserResult.data) {
          return false;
        }

        const fromUser = fromUserResult.data;
        const result = await this.sendNotification(toUserId, NOTIFICATION_TYPES.CHECK_IN, {
          fromUserId,
          fromUserName: fromUser.name ?? 'Unknown User',
          message,
        });

        return result.success ? result.data! : false;
      },
      { fromUserId, toUserId },
    );
  }

  async getNotificationsForUser(userId: string): Promise<Result<Notification[]>> {
    return this.wrapAsync(
      'getNotificationsForUser',
      async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        return (data || []).map(this.transformDbNotificationToNotification);
      },
      { userId },
    );
  }

  async getUnreadNotificationCount(userId: string): Promise<Result<number>> {
    return this.wrapAsync(
      'getUnreadNotificationCount',
      async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .is('read', false);

        if (error) throw error;

        return data?.length ?? 0;
      },
      { userId },
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<Result<boolean>> {
    return this.wrapAsync(
      'markNotificationAsRead',
      async () => {
        const { error } = await supabase
          .from('notifications')
          .update({
            read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId);

        if (error) throw error;
        return true;
      },
      { notificationId },
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<Result<boolean>> {
    return this.wrapAsync(
      'markAllNotificationsAsRead',
      async () => {
        const { error } = await supabase
          .from('notifications')
          .update({
            read: true,
            read_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .is('read', false);

        if (error) throw error;
        return true;
      },
      { userId },
    );
  }

  async clearNotificationsForUser(userId: string): Promise<Result<boolean>> {
    return this.wrapAsync(
      'clearNotificationsForUser',
      async () => {
        const { error } = await supabase.from('notifications').delete().eq('user_id', userId);

        if (error) throw error;
        return true;
      },
      { userId },
    );
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
        void sub.unsubscribe();
        this.subscriptions.delete(userId);
      }
    };
  }
}

export default new NotificationService();
export { NotificationService as NotificationServiceClass };
