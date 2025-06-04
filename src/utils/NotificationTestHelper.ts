// ABOUTME: Test helper for demonstrating notification functionality
// Creates sample notifications for testing the notification UI components

import NotificationService from '../services/NotificationService';
import UserStorageService from '../services/UserStorageServiceWrapper';
import { NotificationTypes } from '../types/user.types';

export const createTestNotifications = async (): Promise<void> => {
  try {
    const currentUser = await UserStorageService.getCurrentUser();
    if (!currentUser) {
      // No user logged in
      return;
    }

    // Create sample notifications
    const notifications = [
      {
        type: NotificationTypes.TASK_ASSIGNED,
        data: {
          taskId: 'task_1',
          taskTitle: 'Complete project documentation',
          assignedBy: 'Sarah',
          dueDate: new Date(Date.now() + 86400000), // Tomorrow
          priority: 'high',
        },
      },
      {
        type: NotificationTypes.ENCOURAGEMENT,
        data: {
          message: "You're doing great! Keep up the amazing work! 💪",
          fromUser: 'John',
          taskId: 'task_2',
        },
      },
      {
        type: NotificationTypes.TASK_COMPLETED,
        data: {
          taskId: 'task_3',
          taskTitle: 'Morning exercise routine',
          completedBy: 'You',
          completedAt: new Date(),
          timeSpent: 1800, // 30 minutes
          xpEarned: 50,
        },
      },
      {
        type: NotificationTypes.TASK_OVERDUE,
        data: {
          taskId: 'task_4',
          taskTitle: 'Review pull requests',
          dueDate: new Date(Date.now() - 3600000), // 1 hour ago
        },
      },
      {
        type: NotificationTypes.CHECK_IN,
        data: {
          message: "Hey! How's your day going? Need any help with your tasks?",
          fromUser: 'Emma',
        },
      },
    ];

    // Send notifications with slight delays to demonstrate queuing
    for (let i = 0; i < notifications.length; i++) {
      setTimeout(() => {
        NotificationService.sendNotification(
          currentUser.id,
          notifications[i].type,
          notifications[i].data,
        );
      }, i * 2000); // 2 second delay between each
    }

    // Test notifications created successfully
  } catch (error) {
    console.error('Error creating test notifications:', error);
  }
};

// Helper to clear all notifications for testing
export const clearTestNotifications = async (): Promise<void> => {
  try {
    const currentUser = await UserStorageService.getCurrentUser();
    if (currentUser) {
      await NotificationService.clearNotificationsForUser(currentUser.id);
      // All notifications cleared
    }
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};
