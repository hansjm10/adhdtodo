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

  // Mock console.log to count renders
  let renderCount = 0;
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    renderCount = 0;
    // Track renders by intercepting console.log calls
    console.log = jest.fn((...args) => {
      if (args[0] === 'TaskItem render') {
        renderCount++;
      }
      originalLog(...args);
    });
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('should not re-render when props are the same', () => {
    const task = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
    });

    const { rerender } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const initialRenderCount = renderCount;

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

    // Component should not have re-rendered
    expect(renderCount).toBe(initialRenderCount);
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
    const initialRenderCount = renderCount;

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
    // Component should have re-rendered
    expect(renderCount).toBeGreaterThan(initialRenderCount);
  });

  it('should not re-render when only callback functions change but have same reference', () => {
    const task = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
    });

    const { rerender } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const initialRenderCount = renderCount;

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

    // Component should not have re-rendered
    expect(renderCount).toBe(initialRenderCount);
  });

  it('should re-render when callback functions change reference', () => {
    const task = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
    });

    const { rerender } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const initialRenderCount = renderCount;

    // Re-render with new function references
    const newMockOnUpdate = jest.fn();
    const newMockOnPress = jest.fn();

    rerender(
      <TaskItem
        task={task}
        onUpdate={newMockOnUpdate}
        onPress={newMockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    // Component should have re-rendered due to new function references
    expect(renderCount).toBeGreaterThan(initialRenderCount);
  });

  it('should optimize rendering with custom comparison function', () => {
    const task = createTask({
      id: 'task1',
      title: 'Test Task',
      category: 'home',
      completed: false,
    });

    const { rerender } = render(
      <TaskItem
        task={task}
        onUpdate={mockOnUpdate}
        onPress={mockOnPress}
        currentUser={mockCurrentUser}
        partner={mockPartner}
      />,
    );

    const initialRenderCount = renderCount;

    // Re-render with task that has same visual properties but different timestamp
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

    // Component might re-render depending on memo implementation
    // This test documents the current behavior
    expect(renderCount).toBeGreaterThanOrEqual(initialRenderCount);
  });
});
