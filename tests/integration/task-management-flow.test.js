// ABOUTME: Integration tests for task management flows
// Tests creating, viewing, editing, completing, and filtering tasks

import { fireEvent, waitFor } from '../utils';
import { Alert } from 'react-native';
import {
  renderAppWithAuth,
  clearAllStorage,
  createTestTask,
  createTestUser,
  setupMocks,
  cleanupIntegrationTest,
  mockTaskService,
} from './setup';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Task Management Flow Integration Tests', () => {
  let user;

  beforeEach(async () => {
    await clearAllStorage();
    setupMocks();
    user = createTestUser();
  });

  afterEach(async () => {
    await cleanupIntegrationTest();
  });

  describe('Task Creation Flow', () => {
    it('should complete full task creation flow', async () => {
      const { getByTestId, getByText, getByPlaceholderText } = await renderAppWithAuth({ user });

      // Navigate to task creation
      await waitFor(() => {
        expect(getByText('Create Task')).toBeTruthy();
      });

      fireEvent.press(getByText('Create Task'));

      // Wait for create task screen
      await waitFor(() => {
        expect(getByPlaceholderText('Task Title')).toBeTruthy();
      });

      // Fill in task details
      fireEvent.changeText(getByPlaceholderText('Task Title'), 'Complete project report');
      fireEvent.changeText(
        getByPlaceholderText('Description (optional)'),
        'Finish the quarterly report and send to team',
      );

      // Select category
      const categoryPicker = getByTestId('category-picker');
      fireEvent(categoryPicker, 'onValueChange', 'Work');

      // Select priority
      const priorityPicker = getByTestId('priority-picker');
      fireEvent(priorityPicker, 'onValueChange', 'high');

      // Set time estimate
      const timePicker = getByTestId('time-picker');
      fireEvent(timePicker, 'onValueChange', 60);

      // Mock successful task save
      const newTask = createTestTask({
        title: 'Complete project report',
        description: 'Finish the quarterly report and send to team',
        category: 'Work',
        priority: 'high',
        timeEstimate: 60,
        userId: user.id,
      });

      mockTaskService.saveTask.mockResolvedValue(newTask);
      mockTaskService.getAllTasks.mockResolvedValue([newTask]);

      // Save task
      fireEvent.press(getByText('Save Task'));

      // Should navigate back to task list
      await waitFor(() => {
        expect(getByText('Complete project report')).toBeTruthy();
      });

      // Verify task is displayed with correct details
      expect(getByText('Work')).toBeTruthy();
      expect(getByText('60 min')).toBeTruthy();
    });

    it('should validate required fields during task creation', async () => {
      const { getByText, getByPlaceholderText } = await renderAppWithAuth({ user });

      fireEvent.press(getByText('Create Task'));

      await waitFor(() => {
        expect(getByPlaceholderText('Task Title')).toBeTruthy();
      });

      // Try to save without title
      fireEvent.press(getByText('Save Task'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Missing Information',
          'Please enter a task title',
          expect.any(Array),
        );
      });
    });

    it('should handle task creation errors gracefully', async () => {
      const { getByText, getByPlaceholderText } = await renderAppWithAuth({ user });

      fireEvent.press(getByText('Create Task'));

      await waitFor(() => {
        expect(getByPlaceholderText('Task Title')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Task Title'), 'New Task');

      // Mock save failure
      mockTaskService.saveTask.mockRejectedValue(new Error('Storage error'));

      fireEvent.press(getByText('Save Task'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('save'),
          expect.any(Array),
        );
      });
    });
  });

  describe('Task List and Filtering', () => {
    it('should display tasks by category and allow filtering', async () => {
      // Create tasks in different categories
      const tasks = [
        createTestTask({ title: 'Work Task 1', category: 'Work', userId: user.id }),
        createTestTask({ title: 'Personal Task', category: 'Personal', userId: user.id }),
        createTestTask({ title: 'Work Task 2', category: 'Work', userId: user.id }),
        createTestTask({ title: 'Health Task', category: 'Health', userId: user.id }),
      ];

      mockTaskService.getAllTasks.mockResolvedValue(tasks);

      const { getByText, queryByText } = await renderAppWithAuth({ user });

      // Wait for tasks to load
      await waitFor(() => {
        expect(getByText('Work Task 1')).toBeTruthy();
      });

      // All tasks should be visible initially
      expect(getByText('Personal Task')).toBeTruthy();
      expect(getByText('Work Task 2')).toBeTruthy();
      expect(getByText('Health Task')).toBeTruthy();

      // Filter by Work category
      fireEvent.press(getByText('Work'));

      await waitFor(() => {
        expect(getByText('Work Task 1')).toBeTruthy();
        expect(getByText('Work Task 2')).toBeTruthy();
      });

      // Non-work tasks should be hidden
      expect(queryByText('Personal Task')).toBeFalsy();
      expect(queryByText('Health Task')).toBeFalsy();

      // Switch to Personal category
      fireEvent.press(getByText('Personal'));

      await waitFor(() => {
        expect(getByText('Personal Task')).toBeTruthy();
      });

      expect(queryByText('Work Task 1')).toBeFalsy();
    });

    it('should search tasks by title', async () => {
      const tasks = [
        createTestTask({ title: 'Call doctor', userId: user.id }),
        createTestTask({ title: 'Buy groceries', userId: user.id }),
        createTestTask({ title: 'Call mom', userId: user.id }),
        createTestTask({ title: 'Send email', userId: user.id }),
      ];

      mockTaskService.getAllTasks.mockResolvedValue(tasks);

      const { getByPlaceholderText, getByText, queryByText } = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(getByText('Call doctor')).toBeTruthy();
      });

      // Search for "call"
      const searchInput = getByPlaceholderText('Search tasks...');
      fireEvent.changeText(searchInput, 'call');

      await waitFor(() => {
        expect(getByText('Call doctor')).toBeTruthy();
        expect(getByText('Call mom')).toBeTruthy();
      });

      // Other tasks should be hidden
      expect(queryByText('Buy groceries')).toBeFalsy();
      expect(queryByText('Send email')).toBeFalsy();
    });
  });

  describe('Task Edit Flow', () => {
    it('should complete task edit flow', async () => {
      const task = createTestTask({
        title: 'Original Task',
        description: 'Original description',
        category: 'Work',
        priority: 'medium',
        userId: user.id,
      });

      mockTaskService.getAllTasks.mockResolvedValue([task]);

      const { getByText, getByPlaceholderText, getByTestId } = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(getByText('Original Task')).toBeTruthy();
      });

      // Press on task to edit
      fireEvent.press(getByText('Original Task'));

      // Wait for edit screen
      await waitFor(() => {
        expect(getByPlaceholderText('Task Title')).toBeTruthy();
      });

      // Modify task details
      const titleInput = getByPlaceholderText('Task Title');
      fireEvent.changeText(titleInput, 'Updated Task');

      const descInput = getByPlaceholderText('Description (optional)');
      fireEvent.changeText(descInput, 'Updated description');

      const priorityPicker = getByTestId('priority-picker');
      fireEvent(priorityPicker, 'onValueChange', 'high');

      // Mock successful update
      const updatedTask = {
        ...task,
        title: 'Updated Task',
        description: 'Updated description',
        priority: 'high',
      };

      mockTaskService.saveTask.mockResolvedValue(updatedTask);
      mockTaskService.getAllTasks.mockResolvedValue([updatedTask]);

      // Save changes
      fireEvent.press(getByText('Save Changes'));

      // Should navigate back and show updated task
      await waitFor(() => {
        expect(getByText('Updated Task')).toBeTruthy();
      });
    });

    it('should allow task deletion from edit screen', async () => {
      const task = createTestTask({ title: 'Task to Delete', userId: user.id });
      mockTaskService.getAllTasks.mockResolvedValue([task]);

      const { getByText, queryByText } = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(getByText('Task to Delete')).toBeTruthy();
      });

      fireEvent.press(getByText('Task to Delete'));

      await waitFor(() => {
        expect(getByText('Delete Task')).toBeTruthy();
      });

      // Mock successful deletion
      mockTaskService.deleteTask.mockResolvedValue(true);
      mockTaskService.getAllTasks.mockResolvedValue([]);

      fireEvent.press(getByText('Delete Task'));

      // Confirm deletion in alert
      const alertCall = Alert.alert.mock.calls.find((call) => call[0] === 'Delete Task');
      expect(alertCall).toBeTruthy();

      const deleteButton = alertCall[2].find((btn) => btn.text === 'Delete');
      await deleteButton.onPress();

      // Should navigate back to empty task list
      await waitFor(() => {
        expect(queryByText('Task to Delete')).toBeFalsy();
      });
    });
  });

  describe('Task Completion Flow', () => {
    it('should mark tasks as complete and show rewards', async () => {
      const task = createTestTask({
        title: 'Complete Me',
        isCompleted: false,
        userId: user.id,
      });

      mockTaskService.getAllTasks.mockResolvedValue([task]);

      const { getByText, getByTestId } = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(getByText('Complete Me')).toBeTruthy();
      });

      // Find checkbox for the task
      const checkbox = getByTestId(`task-checkbox-${task.id}`);

      // Mock successful completion
      const completedTask = { ...task, isCompleted: true };
      mockTaskService.toggleTaskCompletion.mockResolvedValue(completedTask);
      mockTaskService.getAllTasks.mockResolvedValue([completedTask]);

      fireEvent.press(checkbox);

      // Should show completion animation/feedback
      await waitFor(() => {
        expect(getByTestId(`task-completed-${task.id}`)).toBeTruthy();
      });
    });

    it('should allow uncompleting tasks', async () => {
      const task = createTestTask({
        title: 'Completed Task',
        isCompleted: true,
        userId: user.id,
      });

      mockTaskService.getAllTasks.mockResolvedValue([task]);

      const { getByText, getByTestId } = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(getByText('Completed Task')).toBeTruthy();
      });

      const checkbox = getByTestId(`task-checkbox-${task.id}`);

      // Mock uncompleting
      const uncompletedTask = { ...task, isCompleted: false };
      mockTaskService.toggleTaskCompletion.mockResolvedValue(uncompletedTask);
      mockTaskService.getAllTasks.mockResolvedValue([uncompletedTask]);

      fireEvent.press(checkbox);

      await waitFor(() => {
        expect(getByTestId(`task-uncompleted-${task.id}`)).toBeTruthy();
      });
    });
  });

  describe('Task Assignment to Partners', () => {
    it('should assign task to partner', async () => {
      const task = createTestTask({
        title: 'Shared Task',
        userId: user.id,
      });

      const partner = createTestUser({
        id: 'partner-id',
        username: 'mypartner',
      });

      mockTaskService.getAllTasks.mockResolvedValue([task]);

      const { getByText } = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(getByText('Shared Task')).toBeTruthy();
      });

      // Long press to show options
      fireEvent.longPress(getByText('Shared Task'));

      await waitFor(() => {
        expect(getByText('Assign to Partner')).toBeTruthy();
      });

      fireEvent.press(getByText('Assign to Partner'));

      // Select partner
      await waitFor(() => {
        expect(getByText('mypartner')).toBeTruthy();
      });

      // Mock assignment
      const assignedTask = { ...task, assignedTo: partner.id };
      mockTaskService.saveTask.mockResolvedValue(assignedTask);

      fireEvent.press(getByText('mypartner'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          expect.stringContaining('assigned'),
          expect.any(Array),
        );
      });
    });
  });

  describe('Task Persistence', () => {
    it('should persist tasks across app restarts', async () => {
      const tasks = [
        createTestTask({ title: 'Persistent Task 1', userId: user.id }),
        createTestTask({ title: 'Persistent Task 2', userId: user.id }),
      ];

      // First session - create tasks
      mockTaskService.getAllTasks.mockResolvedValue([]);
      const firstSession = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(firstSession.getByText('Create Task')).toBeTruthy();
      });

      // Simulate adding tasks
      for (const task of tasks) {
        mockTaskService.saveTask.mockResolvedValue(task);
      }

      mockTaskService.getAllTasks.mockResolvedValue(tasks);

      // Cleanup first session
      firstSession.unmount();

      // Second session - verify tasks persist
      const secondSession = await renderAppWithAuth({ user });

      await waitFor(() => {
        expect(secondSession.getByText('Persistent Task 1')).toBeTruthy();
        expect(secondSession.getByText('Persistent Task 2')).toBeTruthy();
      });
    });
  });
});
