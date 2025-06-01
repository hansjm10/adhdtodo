// ABOUTME: Service for managing notifications between accountability partners
// Handles sending notifications for task events and encouragement messages

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_TYPES } from '../constants/UserConstants';
import UserStorageService from './UserStorageService';
import { Notification, NotificationPriority } from '../types';
import { User, NotificationTypes } from '../types';
import { Task } from '../types';

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
}

interface StoredNotification extends Omit<Notification, 'createdAt'> {
  toUserId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

class NotificationService implements INotificationService {
  // Store for pending notifications (in production, this would be a proper queue/backend)
  private pendingNotifications: StoredNotification[] = [];
  private readonly STORAGE_KEY = '@adhdtodo:notifications';
  private readonly MAX_NOTIFICATIONS = 100; // Limit to prevent unbounded growth

  constructor() {
    void this.loadNotifications();
  }

  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.pendingNotifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private async saveNotifications(): Promise<void> {
    try {
      // Keep only the most recent notifications to prevent unbounded growth
      const toSave = this.pendingNotifications.slice(-this.MAX_NOTIFICATIONS);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  async sendNotification(
    toUserId: string,
    type: NotificationTypes,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const user = await UserStorageService.getUserById(toUserId);
      if (!user) {
        // User not found - in production this would be logged
        return false;
      }

      // Check user's notification preferences
      if (!this.shouldSendNotification(user, type)) {
        return false;
      }

      const notification: StoredNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        toUserId,
        type,
        data,
        timestamp: new Date(),
        read: false,
        title: '', // Will be set by consuming code
        message: '', // Will be set by consuming code
        priority: NotificationPriority.MEDIUM,
      };

      // In a real app, this would send push notifications
      // For now, we'll store them locally
      this.pendingNotifications.push(notification);

      // Save to persistent storage
      await this.saveNotifications();

      // In production, this would trigger actual notification delivery
      return true;
    } catch (error) {
      // Error handling would be more robust in production
      return false;
    }
  }

  private shouldSendNotification(user: User, type: NotificationTypes): boolean {
    const prefs = user.notificationPreferences;

    if (prefs.global === 'silent') {
      return false;
    }

    if (prefs.global === 'important_only') {
      // Only send critical notifications
      return [NOTIFICATION_TYPES.TASK_OVERDUE, NOTIFICATION_TYPES.DEADLINE_CHANGE_REQUEST].includes(
        type,
      );
    }

    // Check specific notification type preferences
    switch (type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return prefs.taskAssigned !== false;
      case NOTIFICATION_TYPES.TASK_STARTED:
        return prefs.taskStarted !== false;
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return prefs.taskCompleted !== false;
      case NOTIFICATION_TYPES.TASK_OVERDUE:
        return prefs.taskOverdue !== false;
      case NOTIFICATION_TYPES.ENCOURAGEMENT:
        return prefs.encouragement !== false;
      case NOTIFICATION_TYPES.CHECK_IN:
        return prefs.checkIn !== false;
      default:
        return true;
    }
  }

  async notifyTaskAssigned(task: Task, assignedByUser: User): Promise<boolean> {
    if (!task.assignedTo) return false;
    return await this.sendNotification(task.assignedTo, NOTIFICATION_TYPES.TASK_ASSIGNED, {
      taskId: task.id,
      taskTitle: task.title,
      assignedBy: assignedByUser.name,
      dueDate: task.dueDate,
      priority: task.priority,
    });
  }

  async notifyTaskStarted(task: Task, startedByUser: User): Promise<boolean> {
    if (!task.assignedBy) return false;

    return await this.sendNotification(task.assignedBy, NOTIFICATION_TYPES.TASK_STARTED, {
      taskId: task.id,
      taskTitle: task.title,
      startedBy: startedByUser.name,
      startedAt: task.startedAt,
    });
  }

  async notifyTaskCompleted(task: Task, completedByUser: User): Promise<boolean> {
    if (!task.assignedBy) return false;

    return await this.sendNotification(task.assignedBy, NOTIFICATION_TYPES.TASK_COMPLETED, {
      taskId: task.id,
      taskTitle: task.title,
      completedBy: completedByUser.name,
      completedAt: task.completedAt,
      timeSpent: task.timeSpent,
      xpEarned: task.xpEarned,
    });
  }

  async notifyTaskOverdue(task: Task): Promise<boolean> {
    if (!task.assignedBy) return false;

    return await this.sendNotification(task.assignedBy, NOTIFICATION_TYPES.TASK_OVERDUE, {
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.dueDate,
    });
  }

  async sendEncouragement(
    fromUserId: string,
    toUserId: string,
    message: string,
    taskId: string | null = null,
  ): Promise<boolean> {
    const fromUser = await UserStorageService.getUserById(fromUserId);
    if (!fromUser) return false;

    return await this.sendNotification(toUserId, NOTIFICATION_TYPES.ENCOURAGEMENT, {
      message,
      fromUser: fromUser.name,
      taskId,
    });
  }

  async sendCheckIn(fromUserId: string, toUserId: string, message: string): Promise<boolean> {
    const fromUser = await UserStorageService.getUserById(fromUserId);
    if (!fromUser) return false;

    return await this.sendNotification(toUserId, NOTIFICATION_TYPES.CHECK_IN, {
      message,
      fromUser: fromUser.name,
    });
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    // In a real app, this would fetch from a backend
    // Convert StoredNotification to Notification by mapping timestamp to createdAt
    return this.pendingNotifications
      .filter((n) => n.toUserId === userId)
      .map((n) => ({
        ...n,
        createdAt: n.timestamp,
      })) as Notification[];
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const userNotifications = await this.getNotificationsForUser(userId);
    return userNotifications.filter((n) => !n.read).length;
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const notification = this.pendingNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotifications();
      return true;
    }
    return false;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const userNotifications = this.pendingNotifications.filter((n) => n.toUserId === userId);
    userNotifications.forEach((n) => {
      n.read = true;
    });
    await this.saveNotifications();
    return true;
  }

  async clearNotificationsForUser(userId: string): Promise<boolean> {
    this.pendingNotifications = this.pendingNotifications.filter((n) => n.toUserId !== userId);
    await this.saveNotifications();
    return true;
  }
}

export default new NotificationService();
