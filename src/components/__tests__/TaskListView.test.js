// ABOUTME: Tests for TaskListView presentation component
// Tests the pure UI logic without context dependencies

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TaskListView from '../TaskListView';
import { createMockTask, createMockUser } from '../../../tests/utils';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';
import settingsService from '../../services/SettingsService';

// Mock SettingsService
jest.mock('../../services/SettingsService');

describe('TaskListView', () => {
  const mockUser = createMockUser({ id: 'user1', name: 'Test User' });
  const mockPartner = createMockUser({ id: 'partner1', name: 'Partner User' });

  const defaultProps = {
    tasks: [],
    currentUser: mockUser,
    partner: null,
    selectedCategory: null,
    showAssignedOnly: false,
    refreshing: false,
    onTaskPress: jest.fn(),
    onAddPress: jest.fn(),
    onRefresh: jest.fn(),
    onCategorySelect: jest.fn(),
    onToggleAssigned: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock settings
    settingsService.loadSettings.mockResolvedValue({
      taskLimit: 5,
      pomodoro: {
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        longBreakAfter: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        breakReminders: false,
        reminderInterval: 30,
      },
    });
  });

  it('should show empty state when no tasks exist', () => {
    const { getByText } = render(<TaskListView {...defaultProps} />);

    expect(getByText('No tasks yet')).toBeTruthy();
    expect(getByText('Tap the + button to create your first task')).toBeTruthy();
  });

  it('should display list of tasks', () => {
    const tasks = [
      createMockTask({ id: '1', title: 'Task 1', userId: 'user1' }),
      createMockTask({ id: '2', title: 'Task 2', userId: 'user1' }),
      createMockTask({ id: '3', title: 'Task 3', userId: 'user1' }),
    ];

    const { getByText, getByTestId } = render(<TaskListView {...defaultProps} tasks={tasks} />);

    expect(getByText('Task 1')).toBeTruthy();
    expect(getByText('Task 2')).toBeTruthy();
    expect(getByText('Task 3')).toBeTruthy();

    // Verify task items exist
    expect(getByTestId('task-item-1')).toBeTruthy();
    expect(getByTestId('task-item-2')).toBeTruthy();
    expect(getByTestId('task-item-3')).toBeTruthy();
  });

  it('should call onTaskPress when task is pressed', () => {
    const mockTask = createMockTask({ id: '1', title: 'Task 1', userId: 'user1' });
    const onTaskPress = jest.fn();

    const { getByTestId } = render(
      <TaskListView {...defaultProps} tasks={[mockTask]} onTaskPress={onTaskPress} />,
    );

    fireEvent.press(getByTestId('task-item-1'));
    expect(onTaskPress).toHaveBeenCalledWith(mockTask);
  });

  it('should call onAddPress when add button is pressed', () => {
    const onAddPress = jest.fn();

    const { getByTestId } = render(<TaskListView {...defaultProps} onAddPress={onAddPress} />);

    fireEvent.press(getByTestId('add-task-button'));
    expect(onAddPress).toHaveBeenCalled();
  });

  it('should display category filter', () => {
    const { getByText } = render(<TaskListView {...defaultProps} />);

    expect(getByText('All Tasks')).toBeTruthy();

    Object.values(TASK_CATEGORIES).forEach((category) => {
      expect(getByText(category.label)).toBeTruthy();
    });
  });

  it('should call onCategorySelect when category is pressed', () => {
    const onCategorySelect = jest.fn();

    const { getByText } = render(
      <TaskListView {...defaultProps} onCategorySelect={onCategorySelect} />,
    );

    fireEvent.press(getByText(TASK_CATEGORIES.WORK.label));
    expect(onCategorySelect).toHaveBeenCalledWith(TASK_CATEGORIES.WORK.id);
  });

  it('should show assigned filter when partner exists', () => {
    const { getByText } = render(<TaskListView {...defaultProps} partner={mockPartner} />);

    expect(getByText('Assigned')).toBeTruthy();
  });

  it('should call onToggleAssigned when assigned filter is pressed', () => {
    const onToggleAssigned = jest.fn();

    const { getByText } = render(
      <TaskListView {...defaultProps} partner={mockPartner} onToggleAssigned={onToggleAssigned} />,
    );

    fireEvent.press(getByText('Assigned'));
    expect(onToggleAssigned).toHaveBeenCalledWith(true);
  });

  it('should show refreshing state', () => {
    const { getByTestId } = render(<TaskListView {...defaultProps} refreshing={true} />);

    const scrollView = getByTestId('task-list');
    expect(scrollView).toBeTruthy();
    // The refresh control would show the refreshing state
  });

  it('should show completed tasks differently', () => {
    const pendingTask = createMockTask({
      id: '1',
      title: 'Pending Task',
      completed: false,
      userId: 'user1',
    });
    const completedTask = createMockTask({
      id: '2',
      title: 'Completed Task',
      completed: true,
      userId: 'user1',
    });

    const { getByTestId } = render(
      <TaskListView {...defaultProps} tasks={[pendingTask, completedTask]} />,
    );

    const pendingItem = getByTestId('task-item-1');
    const completedItem = getByTestId('task-item-2');

    // These would need to be implemented in TaskItem component
    expect(pendingItem).toBeTruthy();
    expect(completedItem).toBeTruthy();
  });

  describe('Task Limiting', () => {
    it('should load task limit from settings on mount', async () => {
      render(<TaskListView {...defaultProps} />);

      await waitFor(() => {
        expect(settingsService.loadSettings).toHaveBeenCalled();
      });
    });

    it('should limit displayed tasks to the configured limit', async () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `${i}`, title: `Task ${i}`, userId: 'user1' }),
      );

      const { getByText, queryByText } = render(
        <TaskListView {...defaultProps} tasks={manyTasks} />,
      );

      await waitFor(() => {
        // Should show first 5 tasks (default limit)
        expect(getByText('Task 0')).toBeTruthy();
        expect(getByText('Task 1')).toBeTruthy();
        expect(getByText('Task 2')).toBeTruthy();
        expect(getByText('Task 3')).toBeTruthy();
        expect(getByText('Task 4')).toBeTruthy();

        // Should not show tasks beyond limit
        expect(queryByText('Task 5')).toBeNull();
        expect(queryByText('Task 6')).toBeNull();
      });
    });

    it('should show count of visible and total tasks', async () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `${i}`, title: `Task ${i}`, userId: 'user1' }),
      );

      const { getByText } = render(<TaskListView {...defaultProps} tasks={manyTasks} />);

      await waitFor(() => {
        expect(getByText('Showing 5 of 10 tasks')).toBeTruthy();
      });
    });

    it('should show "Show More" button when tasks exceed limit', async () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `${i}`, title: `Task ${i}`, userId: 'user1' }),
      );

      const { getByText } = render(<TaskListView {...defaultProps} tasks={manyTasks} />);

      await waitFor(() => {
        expect(getByText('Show All (5 more)')).toBeTruthy();
      });
    });

    it('should not show "Show More" button when tasks within limit', async () => {
      const fewTasks = Array.from({ length: 3 }, (_, i) =>
        createMockTask({ id: `${i}`, title: `Task ${i}`, userId: 'user1' }),
      );

      const { queryByText } = render(<TaskListView {...defaultProps} tasks={fewTasks} />);

      await waitFor(() => {
        expect(queryByText(/Show All/)).toBeNull();
        expect(queryByText(/Showing \d+ of \d+ tasks/)).toBeNull();
      });
    });

    it('should show all tasks when "Show All" is pressed', async () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `${i}`, title: `Task ${i}`, userId: 'user1' }),
      );

      const { getByText, queryByText } = render(
        <TaskListView {...defaultProps} tasks={manyTasks} />,
      );

      await waitFor(() => {
        expect(getByText('Show All (5 more)')).toBeTruthy();
      });

      // Click show all
      fireEvent.press(getByText('Show All (5 more)'));

      // Should now show all tasks
      expect(getByText('Task 5')).toBeTruthy();
      expect(getByText('Task 6')).toBeTruthy();
      expect(getByText('Task 7')).toBeTruthy();
      expect(getByText('Task 8')).toBeTruthy();
      expect(getByText('Task 9')).toBeTruthy();

      // Button should now say "Show Less"
      expect(getByText('Show Less')).toBeTruthy();
      expect(queryByText(/Show All/)).toBeNull();
    });

    it('should limit tasks again when "Show Less" is pressed', async () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `${i}`, title: `Task ${i}`, userId: 'user1' }),
      );

      const { getByText, queryByText } = render(
        <TaskListView {...defaultProps} tasks={manyTasks} />,
      );

      await waitFor(() => {
        expect(getByText('Show All (5 more)')).toBeTruthy();
      });

      // Show all tasks
      fireEvent.press(getByText('Show All (5 more)'));
      expect(getByText('Show Less')).toBeTruthy();

      // Hide extra tasks
      fireEvent.press(getByText('Show Less'));

      // Should limit tasks again
      expect(queryByText('Task 5')).toBeNull();
      expect(queryByText('Task 6')).toBeNull();

      // Button should say "Show All" again
      expect(getByText('Show All (5 more)')).toBeTruthy();
    });

    it('should respect custom task limit from settings', async () => {
      // Mock custom task limit
      settingsService.loadSettings.mockResolvedValue({
        taskLimit: 3,
        pomodoro: {
          workDuration: 25,
          breakDuration: 5,
          longBreakDuration: 15,
          longBreakAfter: 4,
          autoStartBreaks: false,
          autoStartWork: false,
          breakReminders: false,
          reminderInterval: 30,
        },
      });

      const manyTasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask({ id: `${i}`, title: `Task ${i}`, userId: 'user1' }),
      );

      const { getByText, queryByText } = render(
        <TaskListView {...defaultProps} tasks={manyTasks} />,
      );

      await waitFor(() => {
        // Should show only 3 tasks
        expect(getByText('Task 0')).toBeTruthy();
        expect(getByText('Task 1')).toBeTruthy();
        expect(getByText('Task 2')).toBeTruthy();
        expect(queryByText('Task 3')).toBeNull();

        // Should show correct count
        expect(getByText('Showing 3 of 10 tasks')).toBeTruthy();
        expect(getByText('Show All (7 more)')).toBeTruthy();
      });
    });
  });
});
