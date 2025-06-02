// ABOUTME: Tests for TaskItem component
// Verifies task display and completion functionality

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';
import TaskItem from '../TaskItem';
import TaskStorageService from '../../services/TaskStorageService';
import { createTask, completeTask } from '../../utils/TaskModel';
import { TASK_CATEGORIES } from '../../constants/TaskConstants';

// Mock dependencies
jest.mock('../../services/TaskStorageService');
jest.mock('../RewardAnimation', () => 'RewardAnimation');

describe('TaskItem', () => {
  const mockTask = createTask({
    title: 'Test Task',
    description: 'Test Description',
    category: TASK_CATEGORIES.HOME.id,
    timeEstimate: 30,
  });

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    TaskStorageService.updateTask.mockResolvedValue(true);
  });

  it('should render task information correctly', () => {
    const { getByText, getByTestId } = render(<TaskItem task={mockTask} onUpdate={mockOnUpdate} />);

    expect(getByText('Test Task')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
    expect(getByText(/30 min/)).toBeTruthy();
    expect(getByTestId('task-checkbox')).toBeTruthy();
  });

  it('should show completed state', () => {
    const completedTask = { ...mockTask, completed: true };

    const { getByTestId } = render(<TaskItem task={completedTask} onUpdate={mockOnUpdate} />);

    const checkbox = getByTestId('task-checkbox');
    expect(checkbox).toHaveStyle({ backgroundColor: '#4ECDC4' });
  });

  it('should toggle task completion when checkbox pressed', async () => {
    const { getByTestId } = render(<TaskItem task={mockTask} onUpdate={mockOnUpdate} />);

    const checkbox = getByTestId('task-checkbox');
    fireEvent.press(checkbox);

    await waitFor(() => {
      expect(TaskStorageService.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: true,
          xpEarned: 15, // Base 10 + 5 for category
        }),
      );
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should uncomplete task when completed checkbox pressed', async () => {
    const completedTask = completeTask(mockTask);

    const { getByTestId } = render(<TaskItem task={completedTask} onUpdate={mockOnUpdate} />);

    const checkbox = getByTestId('task-checkbox');
    fireEvent.press(checkbox);

    await waitFor(() => {
      expect(TaskStorageService.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          completed: false,
          xpEarned: 0,
        }),
      );
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should show XP earned for completed tasks', () => {
    const completedTask = completeTask(mockTask, 20);

    const { getByText } = render(<TaskItem task={completedTask} onUpdate={mockOnUpdate} />);

    expect(getByText('✨ +20 XP')).toBeTruthy();
  });

  it('should navigate to edit screen when task pressed', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <TaskItem task={mockTask} onUpdate={mockOnUpdate} onPress={mockOnPress} />,
    );

    fireEvent.press(getByTestId('task-content'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should animate checkbox when task is completed', async () => {
    const { rerender } = render(<TaskItem task={mockTask} onUpdate={mockOnUpdate} />);

    // Spy on Animated.spring
    const springMock = jest.spyOn(Animated, 'spring');

    // Complete the task
    const completedTask = { ...mockTask, completed: true };
    rerender(<TaskItem task={completedTask} onUpdate={mockOnUpdate} />);

    // Check that checkbox animation was called
    expect(springMock).toHaveBeenCalled();
    expect(springMock).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 1,
        friction: 4,
        tension: 40,
      }),
    );

    springMock.mockRestore();
  });

  it('should trigger celebration animation on task completion', async () => {
    const { getByTestId, UNSAFE_queryByType } = render(
      <TaskItem task={mockTask} onUpdate={mockOnUpdate} />,
    );

    const checkbox = getByTestId('task-checkbox');

    // Press checkbox to complete task
    fireEvent.press(checkbox);

    await waitFor(() => {
      // Check that RewardAnimation component is rendered
      expect(UNSAFE_queryByType('RewardAnimation')).toBeTruthy();
    });
  });

  it('should show task scale animation on completion', async () => {
    const { getByTestId } = render(<TaskItem task={mockTask} onUpdate={mockOnUpdate} />);

    // Spy on animation methods
    const sequenceMock = jest.spyOn(Animated, 'sequence');
    const timingMock = jest.spyOn(Animated, 'timing');

    const checkbox = getByTestId('task-checkbox');
    fireEvent.press(checkbox);

    await waitFor(() => {
      // Check that scale animation was triggered
      expect(sequenceMock).toHaveBeenCalled();
      expect(timingMock).toHaveBeenCalledWith(
        expect.any(Animated.Value),
        expect.objectContaining({
          toValue: 1.05,
        }),
      );
    });

    sequenceMock.mockRestore();
    timingMock.mockRestore();
  });
});
