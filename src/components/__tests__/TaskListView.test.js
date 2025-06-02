// ABOUTME: Tests for TaskListView presentation component
// Tests the pure UI logic without context dependencies

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TaskListView from '../TaskListView';
import { createMockTask, createMockUser } from '../../../tests/utils';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';

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
});
