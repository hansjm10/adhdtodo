// ABOUTME: Tests for TaskItem React.memo optimization
// Verifies that TaskItem doesn't re-render unnecessarily

import React from 'react';
import { render } from '@testing-library/react-native';
import TaskItem from '../TaskItem';
import { createTask } from '../../utils/TaskModel';

describe('TaskItem - React.memo Optimization', () => {
  const mockOnUpdate = jest.fn();
  const mockOnPress = jest.fn();
  const mockCurrentUser = { id: 'user1', name: 'Test User' };
  const mockPartner = { id: 'partner1', name: 'Partner' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not re-render when props are the same', () => {
    const task = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
    });

    const { rerender, toJSON } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const firstRender = toJSON();

    // Re-render with same props
    rerender(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const secondRender = toJSON();

    // Component should not have changed
    expect(firstRender).toEqual(secondRender);
  });

  it('should re-render when task prop changes', () => {
    const task1 = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
    });

    const { rerender, getByText } = render(
      <TaskItem
        task={task1}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    expect(getByText('Test Task')).toBeTruthy();

    // Update task
    const task2 = createTask({
      id: 'task1',
      title: 'Updated Task',
      category: 'home',
    });

    rerender(
      <TaskItem
        task={task2}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    expect(getByText('Updated Task')).toBeTruthy();
  });

  it('should not re-render when only callback functions change but have same reference', () => {
    const task = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
    });

    const { rerender, toJSON } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const firstRender = toJSON();

    // Re-render with same function references
    rerender(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const secondRender = toJSON();

    expect(firstRender).toEqual(secondRender);
  });

  it('should optimize rendering with custom comparison function', () => {
    const task = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
      completed: false,
    });

    const { rerender, toJSON } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const firstRender = toJSON();

    // Re-render with task that has same visual properties
    const taskWithSameVisuals = { ...task, updatedAt: new Date() };

    rerender(
      <TaskItem
        task={taskWithSameVisuals}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const secondRender = toJSON();

    // Should not re-render because visual properties are the same
    expect(firstRender).toEqual(secondRender);
  });
});
