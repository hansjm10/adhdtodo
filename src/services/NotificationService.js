// ABOUTME: Service for managing notifications between accountability partners
// Handles sending notifications for task events and encouragement messages

import { NOTIFICATION_TYPES } from '../constants/UserConstants';
import UserStorageService from './UserStorageService';

class NotificationService {
  // Store for pending notifications (in production, this would be a proper queue/backend)
  pendingNotifications = [];

  async sendNotification(toUserId, type, data) {
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

      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        toUserId,
        type,
        data,
        timestamp: new Date(),
        read: false,
      };

      // In a real app, this would send push notifications
      // For now, we'll store them locally
      this.pendingNotifications.push(notification);

      // In production, this would trigger actual notification delivery
      return true;
    } catch (error) {
      // Error handling would be more robust in production
      return false;
    }
  }

  shouldSendNotification(user, type) {
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

  async notifyTaskAssigned(task, assignedByUser) {
    return await this.sendNotification(task.assignedTo, NOTIFICATION_TYPES.TASK_ASSIGNED, {
      taskId: task.id,
      taskTitle: task.title,
      assignedBy: assignedByUser.name,
      dueDate: task.dueDate,
      priority: task.priority,
    });
  }

  async notifyTaskStarted(task, startedByUser) {
    if (!task.assignedBy) return false;

    return await this.sendNotification(task.assignedBy, NOTIFICATION_TYPES.TASK_STARTED, {
      taskId: task.id,
      taskTitle: task.title,
      startedBy: startedByUser.name,
      startedAt: task.startedAt,
    });
  }

  async notifyTaskCompleted(task, completedByUser) {
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

  async notifyTaskOverdue(task) {
    if (!task.assignedBy) return false;

    return await this.sendNotification(task.assignedBy, NOTIFICATION_TYPES.TASK_OVERDUE, {
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.dueDate,
    });
  }

  async sendEncouragement(fromUserId, toUserId, message, taskId = null) {
    const fromUser = await UserStorageService.getUserById(fromUserId);
    if (!fromUser) return false;

    return await this.sendNotification(toUserId, NOTIFICATION_TYPES.ENCOURAGEMENT, {
      message,
      fromUser: fromUser.name,
      taskId,
    });
  }

  async sendCheckIn(fromUserId, toUserId, message) {
    const fromUser = await UserStorageService.getUserById(fromUserId);
    if (!fromUser) return false;

    return await this.sendNotification(toUserId, NOTIFICATION_TYPES.CHECK_IN, {
      message,
      fromUser: fromUser.name,
    });
  }

  async getNotificationsForUser(userId) {
    // In a real app, this would fetch from a backend
    return this.pendingNotifications.filter((n) => n.toUserId === userId);
  }

  async getUnreadNotificationCount(userId) {
    const userNotifications = await this.getNotificationsForUser(userId);
    return userNotifications.filter((n) => !n.read).length;
  }

  async markNotificationAsRead(notificationId) {
    const notification = this.pendingNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  async markAllNotificationsAsRead(userId) {
    const userNotifications = this.pendingNotifications.filter((n) => n.toUserId === userId);
    userNotifications.forEach((n) => {
      n.read = true;
    });
    return true;
  }

  async clearNotificationsForUser(userId) {
    this.pendingNotifications = this.pendingNotifications.filter((n) => n.toUserId !== userId);
    return true;
  }
}

export default new NotificationService();
