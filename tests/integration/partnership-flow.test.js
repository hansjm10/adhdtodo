// ABOUTME: Integration tests for partnership flows
// Tests invite sending, accepting, task sharing, and partner collaboration

import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import {
  renderAppWithAuth,
  clearAllStorage,
  createTestUser,
  createTestTask,
  createTestPartnership,
  setupMocks,
  cleanupIntegrationTest,
} from './setup';
import PartnershipService from '../../src/services/PartnershipService';
import UserStorageService from '../../src/services/UserStorageService';
import TaskStorageService from '../../src/services/TaskStorageService';

// Mock Alert and Share
jest.spyOn(Alert, 'alert');
jest.spyOn(Share, 'share');

describe('Partnership Flow Integration Tests', () => {
  let user;
  let partner;

  beforeEach(async () => {
    await clearAllStorage();
    setupMocks();
    user = createTestUser({ username: 'mainuser' });
    partner = createTestUser({ id: 'partner-id', username: 'partneruser' });
  });

  afterEach(async () => {
    await cleanupIntegrationTest();
  });

  describe('Partnership Invitation Flow', () => {
    it('should send partnership invite and share code', async () => {
      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Navigate to Partnership tab
      await waitFor(() => {
        expect(getByTestId('tab-partner')).toBeTruthy();
      });

      fireEvent.press(getByTestId('tab-partner'));

      // Wait for partnership screen
      await waitFor(() => {
        expect(getByText('Send Invite')).toBeTruthy();
      });

      // Mock invite generation
      jest.spyOn(PartnershipService, 'generateInviteCode').mockResolvedValue({
        success: true,
        inviteCode: 'ABC123',
      });

      fireEvent.press(getByText('Send Invite'));

      // Verify share dialog appears
      await waitFor(() => {
        expect(Share.share).toHaveBeenCalledWith({
          message: expect.stringContaining('ABC123'),
          title: 'ADHD Todo Partnership Invite',
        });
      });
    });

    it('should accept partnership invite with valid code', async () => {
      const { getByTestId, getByText, getByPlaceholderText } = await renderAppWithAuth({ user });

      // Navigate to Partnership tab
      fireEvent.press(getByTestId('tab-partner'));

      await waitFor(() => {
        expect(getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Enter Invite Code'));

      // Wait for invite code screen
      await waitFor(() => {
        expect(getByPlaceholderText('Enter 6-character code')).toBeTruthy();
      });

      // Enter invite code
      fireEvent.changeText(getByPlaceholderText('Enter 6-character code'), 'ABC123');

      // Mock successful partnership creation
      jest.spyOn(PartnershipService, 'acceptInvite').mockResolvedValue({
        success: true,
        partnership: createTestPartnership({
          userId1: partner.id,
          userId2: user.id,
          inviteCode: 'ABC123',
        }),
        partner: partner,
      });

      fireEvent.press(getByText('Accept Invite'));

      // Should show success and navigate back
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          expect.stringContaining('partnership'),
          expect.any(Array),
        );
      });

      // Should now show partner info
      await waitFor(() => {
        expect(getByText('partneruser')).toBeTruthy();
      });
    });

    it('should handle invalid invite code', async () => {
      const { getByTestId, getByText, getByPlaceholderText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-partner'));

      await waitFor(() => {
        expect(getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(getByPlaceholderText('Enter 6-character code')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter 6-character code'), 'WRONG1');

      jest.spyOn(PartnershipService, 'acceptInvite').mockResolvedValue({
        success: false,
        error: 'Invalid invite code',
      });

      fireEvent.press(getByText('Accept Invite'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Code',
          'Invalid invite code',
          expect.any(Array),
        );
      });
    });
  });

  describe('Task Assignment to Partner', () => {
    it('should assign task to partner from task assignment screen', async () => {
      // Set up existing partnership
      const partnership = createTestPartnership({
        userId1: user.id,
        userId2: partner.id,
      });

      jest.spyOn(PartnershipService, 'getUserPartnership').mockResolvedValue(partnership);
      jest.spyOn(UserStorageService, 'getUser').mockResolvedValue(partner);

      const task = createTestTask({
        title: 'Task to Assign',
        userId: user.id,
      });

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Navigate to Partnership tab
      fireEvent.press(getByTestId('tab-partner'));

      await waitFor(() => {
        expect(getByText('Assign Tasks')).toBeTruthy();
      });

      fireEvent.press(getByText('Assign Tasks'));

      // Wait for task assignment screen
      await waitFor(() => {
        expect(getByText('Select tasks to assign')).toBeTruthy();
      });

      // Mock available tasks
      jest.spyOn(TaskStorageService, 'getTasks').mockResolvedValue([task]);

      // Select task
      const taskCheckbox = getByTestId(`assign-task-${task.id}`);
      fireEvent.press(taskCheckbox);

      // Mock assignment
      jest.spyOn(PartnershipService, 'assignTasksToPartner').mockResolvedValue({
        success: true,
        assignedTasks: [{ ...task, assignedTo: partner.id }],
      });

      fireEvent.press(getByText('Assign Selected'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          expect.stringContaining('assigned'),
          expect.any(Array),
        );
      });
    });

    it('should show assigned tasks in partner dashboard', async () => {
      // Set up partnership and assigned tasks
      const partnership = createTestPartnership({
        userId1: user.id,
        userId2: partner.id,
      });

      const assignedTasks = [
        createTestTask({
          title: 'Clean kitchen',
          userId: user.id,
          assignedTo: partner.id,
        }),
        createTestTask({
          title: 'Buy groceries',
          userId: user.id,
          assignedTo: partner.id,
        }),
      ];

      jest.spyOn(PartnershipService, 'getUserPartnership').mockResolvedValue(partnership);
      jest.spyOn(UserStorageService, 'getUser').mockResolvedValue(partner);
      jest.spyOn(PartnershipService, 'getPartnerTasks').mockResolvedValue({
        assignedToPartner: assignedTasks,
        assignedByPartner: [],
      });

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Navigate to partner dashboard
      fireEvent.press(getByTestId('tab-partner'));

      await waitFor(() => {
        expect(getByText('View Dashboard')).toBeTruthy();
      });

      fireEvent.press(getByText('View Dashboard'));

      // Should show assigned tasks
      await waitFor(() => {
        expect(getByText('Clean kitchen')).toBeTruthy();
        expect(getByText('Buy groceries')).toBeTruthy();
      });

      // Should show partner name
      expect(getByText('Tasks for partneruser')).toBeTruthy();
    });
  });

  describe('Partnership Dissolution', () => {
    it('should remove partnership when requested', async () => {
      const partnership = createTestPartnership({
        userId1: user.id,
        userId2: partner.id,
      });

      jest.spyOn(PartnershipService, 'getUserPartnership').mockResolvedValue(partnership);
      jest.spyOn(UserStorageService, 'getUser').mockResolvedValue(partner);

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      fireEvent.press(getByTestId('tab-partner'));

      await waitFor(() => {
        expect(getByText('Remove Partnership')).toBeTruthy();
      });

      // Mock partnership removal
      jest.spyOn(PartnershipService, 'removePartnership').mockResolvedValue({
        success: true,
      });

      fireEvent.press(getByText('Remove Partnership'));

      // Confirm removal
      const alertCall = Alert.alert.mock.calls.find((call) => call[0] === 'Remove Partnership');
      expect(alertCall).toBeTruthy();

      const removeButton = alertCall[2].find((btn) => btn.text === 'Remove');
      await removeButton.onPress();

      // Should show no partnership state
      await waitFor(() => {
        expect(getByText('Send Invite')).toBeTruthy();
        expect(getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Partner Task Completion Notifications', () => {
    it('should notify when partner completes assigned task', async () => {
      const partnership = createTestPartnership({
        userId1: user.id,
        userId2: partner.id,
      });

      const task = createTestTask({
        title: 'Partner Task',
        userId: user.id,
        assignedTo: partner.id,
        isCompleted: false,
      });

      jest.spyOn(PartnershipService, 'getUserPartnership').mockResolvedValue(partnership);
      jest.spyOn(PartnershipService, 'getPartnerTasks').mockResolvedValue({
        assignedToPartner: [task],
        assignedByPartner: [],
      });

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Navigate to partner dashboard
      fireEvent.press(getByTestId('tab-partner'));

      await waitFor(() => {
        expect(getByText('View Dashboard')).toBeTruthy();
      });

      fireEvent.press(getByText('View Dashboard'));

      await waitFor(() => {
        expect(getByText('Partner Task')).toBeTruthy();
      });

      // Simulate partner completing task
      const completedTask = { ...task, isCompleted: true };
      jest.spyOn(PartnershipService, 'getPartnerTasks').mockResolvedValue({
        assignedToPartner: [completedTask],
        assignedByPartner: [],
      });

      // Refresh dashboard
      fireEvent.press(getByText('Refresh'));

      await waitFor(() => {
        expect(getByTestId(`task-completed-${task.id}`)).toBeTruthy();
      });

      // Should show completion indicator
      expect(getByText('✓')).toBeTruthy();
    });
  });

  describe('Partnership Sync', () => {
    it('should sync tasks between partners', async () => {
      const partnership = createTestPartnership({
        userId1: user.id,
        userId2: partner.id,
      });

      // User's tasks
      const userTasks = [
        createTestTask({ title: 'My Task 1', userId: user.id }),
        createTestTask({
          title: 'Shared Task',
          userId: user.id,
          assignedTo: partner.id,
        }),
      ];

      // Partner's tasks assigned to user
      const partnerTasks = [
        createTestTask({
          title: 'Partner Task for Me',
          userId: partner.id,
          assignedTo: user.id,
        }),
      ];

      jest.spyOn(PartnershipService, 'getUserPartnership').mockResolvedValue(partnership);
      jest.spyOn(PartnershipService, 'syncPartnerTasks').mockResolvedValue({
        success: true,
        userTasks,
        partnerTasks,
      });

      const { getByTestId, getByText } = await renderAppWithAuth({ user });

      // Navigate to tasks
      fireEvent.press(getByTestId('tab-tasks'));

      await waitFor(() => {
        expect(getByText('My Task 1')).toBeTruthy();
      });

      // Should show tasks assigned by partner
      expect(getByText('Partner Task for Me')).toBeTruthy();

      // Should indicate which tasks are from partner
      expect(getByText('From: partneruser')).toBeTruthy();
    });
  });
});
