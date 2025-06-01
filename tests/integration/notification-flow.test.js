// ABOUTME: Integration tests for notification flows
// Tests reminders, viewing, clearing, and various notification types

import { fireEvent, waitFor } from '../utils';
import { Alert } from 'react-native';
import {
  renderAppWithAuth,
  clearAllStorage,
  createTestUser,
  createTestTask,
  createTestNotification,
  createTestPartnership,
  setupMocks,
  cleanupIntegrationTest,
  mockNotificationService,
  mockTaskService,
} from './setup';
import NotificationService from '../../src/services/NotificationService';
import PartnershipService from '../../src/services/PartnershipService';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock timers for scheduled notifications
jest.useFakeTimers();

describe('Notification Flow Integration Tests', () => {
  let user;
  let partner;

  beforeEach(async () => {
    await clearAllStorage();
    setupMocks();
    user = createTestUser();
    partner = createTestUser({ id: 'partner-id', username: 'partneruser' });
  });

  afterEach(async () => {
    jest.clearAllTimers();
    await cleanupIntegrationTest();
  });

  describe('Task Reminder Notifications', () => {
    it('should show task reminder notifications', async () => {
      const task = createTestTask({
        title: 'Important Meeting',
        dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now
        userId: user.id,
      });

      const notification = createTestNotification({
        type: 'task_reminder',
        title: 'Task Due Soon',
        message: 'Important Meeting is due in 30 minutes',
        taskId: task.id,
        userId: user.id,
      });

      mockTaskService.getAllTasks.mockResolvedValue([task]);
      mockNotificationService.getNotificationsForUser.mockResolvedValue([notification]);

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Should show notification badge
      await waitFor(() => {
        expect(getByTestId('notification-badge')).toBeTruthy();
        expect(getByText('1')).toBeTruthy(); // Badge count
      });

      // Click notification badge
      fireEvent.press(getByTestId('notification-badge'));

      // Should navigate to notification list
      await waitFor(() => {
        expect(getByText('Notifications')).toBeTruthy();
        expect(getByText('Task Due Soon')).toBeTruthy();
        expect(getByText('Important Meeting is due in 30 minutes')).toBeTruthy();
      });

      // Click on notification
      fireEvent.press(getByText('Task Due Soon'));

      // Should navigate to task details
      await waitFor(() => {
        expect(getByText('Important Meeting')).toBeTruthy();
      });
    });

    it('should schedule automatic task reminders', async () => {
      const task = createTestTask({
        title: 'Doctor Appointment',
        dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        reminderEnabled: true,
        reminderMinutes: 30, // Remind 30 mins before
        userId: user.id,
      });

      mockTaskService.getAllTasks.mockResolvedValue([task]);

      // Mock scheduling
      jest.spyOn(NotificationService, 'scheduleTaskReminder').mockResolvedValue({
        success: true,
        notificationId: 'reminder-1',
      });

      const { getByText, getByPlaceholderText } = await renderAppWithAuth({ user });

      // Create new task with reminder
      fireEvent.press(getByText('Create Task'));

      await waitFor(() => {
        expect(getByPlaceholderText('Task Title')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Task Title'), 'Doctor Appointment');

      // Enable reminder
      const reminderSwitch = getByText('Enable Reminder');
      fireEvent.press(reminderSwitch);

      // Set reminder time
      const reminderPicker = getByText('30 minutes before');
      fireEvent.press(reminderPicker);

      mockTaskService.saveTask.mockResolvedValue(task);

      fireEvent.press(getByText('Save Task'));

      // Verify reminder was scheduled
      await waitFor(() => {
        expect(NotificationService.scheduleTaskReminder).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Doctor Appointment',
            reminderMinutes: 30,
          }),
        );
      });
    });
  });

  describe('Partner Notifications', () => {
    it('should show notification when partner completes assigned task', async () => {
      const partnership = createTestPartnership({
        userId1: user.id,
        userId2: partner.id,
      });

      const task = createTestTask({
        title: 'Clean garage',
        userId: user.id,
        assignedTo: partner.id,
        isCompleted: true,
      });

      const notification = createTestNotification({
        type: 'partner_task_completed',
        title: 'Partner Task Completed',
        message: 'partneruser completed "Clean garage"',
        taskId: task.id,
        userId: user.id,
      });

      jest.spyOn(PartnershipService, 'getUserPartnership').mockResolvedValue(partnership);
      mockNotificationService.getNotificationsForUser.mockResolvedValue([notification]);

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Should show notification
      await waitFor(() => {
        expect(getByTestId('notification-badge')).toBeTruthy();
      });

      fireEvent.press(getByTestId('notification-badge'));

      await waitFor(() => {
        expect(getByText('Partner Task Completed')).toBeTruthy();
        expect(getByText('partneruser completed "Clean garage"')).toBeTruthy();
      });
    });

    it('should show notification when partner assigns new task', async () => {
      const partnership = createTestPartnership({
        userId1: user.id,
        userId2: partner.id,
      });

      const task = createTestTask({
        title: 'Review document',
        userId: partner.id,
        assignedTo: user.id,
      });

      const notification = createTestNotification({
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'partneruser assigned you "Review document"',
        taskId: task.id,
        userId: user.id,
      });

      jest.spyOn(PartnershipService, 'getUserPartnership').mockResolvedValue(partnership);
      mockNotificationService.getNotificationsForUser.mockResolvedValue([notification]);

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(getByTestId('notification-badge')).toBeTruthy();
      });

      // Should show in-app notification banner
      await waitFor(() => {
        expect(getByTestId('notification-banner')).toBeTruthy();
        expect(getByText('New Task Assigned')).toBeTruthy();
      });

      // Banner should auto-dismiss after 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(() => getByTestId('notification-banner')).toThrow();
      });
    });
  });

  describe('Achievement Notifications', () => {
    it('should show achievement unlocked notifications', async () => {
      const notification = createTestNotification({
        type: 'achievement_unlocked',
        title: 'Achievement Unlocked!',
        message: 'You earned "Task Master" - Complete 50 tasks',
        userId: user.id,
        metadata: {
          achievementId: 'task-master',
          points: 500,
        },
      });

      mockNotificationService.getNotificationsForUser.mockResolvedValue([notification]);

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Should show special achievement notification
      await waitFor(() => {
        expect(getByTestId('achievement-notification')).toBeTruthy();
        expect(getByText('Achievement Unlocked!')).toBeTruthy();
        expect(getByText('Task Master')).toBeTruthy();
        expect(getByText('+500 points')).toBeTruthy();
      });

      // Should have celebratory styling
      const achievementView = getByTestId('achievement-notification');
      expect(achievementView.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String),
        }),
      );
    });
  });

  describe('Notification Management', () => {
    it('should mark notifications as read', async () => {
      const notifications = [
        createTestNotification({
          title: 'Notification 1',
          read: false,
          userId: user.id,
        }),
        createTestNotification({
          title: 'Notification 2',
          read: false,
          userId: user.id,
        }),
      ];

      mockNotificationService.getNotificationsForUser.mockResolvedValue(notifications);

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Badge should show 2
      await waitFor(() => {
        expect(getByText('2')).toBeTruthy();
      });

      fireEvent.press(getByTestId('notification-badge'));

      await waitFor(() => {
        expect(getByText('Notification 1')).toBeTruthy();
      });

      // Mark first notification as read
      const firstNotification = getByTestId(`notification-${notifications[0].id}`);
      fireEvent.press(firstNotification);

      // Mock marking as read
      mockNotificationService.markAsRead.mockResolvedValue({ success: true });
      mockNotificationService.getNotificationsForUser.mockResolvedValue([
        { ...notifications[0], read: true },
        notifications[1],
      ]);

      // Badge should update to 1
      await waitFor(() => {
        expect(getByText('1')).toBeTruthy();
      });
    });

    it('should clear all notifications', async () => {
      const notifications = [
        createTestNotification({ title: 'Notification 1', userId: user.id }),
        createTestNotification({ title: 'Notification 2', userId: user.id }),
        createTestNotification({ title: 'Notification 3', userId: user.id }),
      ];

      mockNotificationService.getNotificationsForUser.mockResolvedValue(notifications);

      const { getByTestId, getByText, queryByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('notification-badge'));

      await waitFor(() => {
        expect(getByText('Clear All')).toBeTruthy();
      });

      // Mock clearing
      mockNotificationService.clearAllNotifications.mockResolvedValue({ success: true });
      mockNotificationService.getNotificationsForUser.mockResolvedValue([]);

      fireEvent.press(getByText('Clear All'));

      // Confirm clear
      const alertCall = Alert.alert.mock.calls.find(
        (call) => call[0] === 'Clear All Notifications',
      );
      expect(alertCall).toBeTruthy();

      const clearButton = alertCall[2].find((btn) => btn.text === 'Clear');
      await clearButton.onPress();

      // Should show empty state
      await waitFor(() => {
        expect(getByText('No notifications')).toBeTruthy();
        expect(queryByText('Notification 1')).toBeFalsy();
      });
    });

    it('should delete individual notifications', async () => {
      const notifications = [
        createTestNotification({ title: 'Keep this', userId: user.id }),
        createTestNotification({ title: 'Delete this', userId: user.id }),
      ];

      mockNotificationService.getNotificationsForUser.mockResolvedValue(notifications);

      const { getByTestId, getByText, queryByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('notification-badge'));

      await waitFor(() => {
        expect(getByText('Delete this')).toBeTruthy();
      });

      // Swipe to delete (or press delete button)
      const deleteButton = getByTestId(`delete-notification-${notifications[1].id}`);
      fireEvent.press(deleteButton);

      // Mock deletion
      mockNotificationService.deleteNotification.mockResolvedValue({ success: true });
      mockNotificationService.getNotificationsForUser.mockResolvedValue([notifications[0]]);

      // Should only show first notification
      await waitFor(() => {
        expect(getByText('Keep this')).toBeTruthy();
        expect(queryByText('Delete this')).toBeFalsy();
      });
    });
  });

  describe('Notification Settings', () => {
    it('should allow configuring notification preferences', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Navigate to profile
      fireEvent.press(getByTestId('tab-profile'));

      await waitFor(() => {
        expect(getByText('Notification Settings')).toBeTruthy();
      });

      fireEvent.press(getByText('Notification Settings'));

      // Should show notification toggles
      await waitFor(() => {
        expect(getByText('Task Reminders')).toBeTruthy();
        expect(getByText('Partner Updates')).toBeTruthy();
        expect(getByText('Achievement Alerts')).toBeTruthy();
      });

      // Disable partner updates
      const partnerToggle = getByTestId('notification-toggle-partner');
      fireEvent(partnerToggle, 'onValueChange', false);

      // Mock saving preferences
      jest.spyOn(NotificationService, 'updatePreferences').mockResolvedValue({
        success: true,
      });

      fireEvent.press(getByText('Save Preferences'));

      await waitFor(() => {
        expect(NotificationService.updatePreferences).toHaveBeenCalledWith(
          user.id,
          expect.objectContaining({
            partnerUpdates: false,
          }),
        );
      });
    });
  });

  describe('Real-time Notifications', () => {
    it('should show notifications in real-time while app is open', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Initially no notifications
      mockNotificationService.getNotificationsForUser.mockResolvedValue([]);

      await waitFor(() => {
        expect(() => getByTestId('notification-badge')).toThrow();
      });

      // Simulate new notification arriving
      const newNotification = createTestNotification({
        type: 'task_reminder',
        title: 'Urgent Task',
        message: 'Meeting starting in 5 minutes',
        userId: user.id,
      });

      mockNotificationService.getNotificationsForUser.mockResolvedValue([newNotification]);

      // Trigger notification check (simulating real-time update)
      jest.advanceTimersByTime(10000); // 10 second interval

      // Should show notification badge and banner
      await waitFor(() => {
        expect(getByTestId('notification-badge')).toBeTruthy();
        expect(getByTestId('notification-banner')).toBeTruthy();
        expect(getByText('Urgent Task')).toBeTruthy();
      });
    });
  });
});
