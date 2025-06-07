// ABOUTME: Tests for ScatteredModeView presentation component
// Verifies rapid task switching UI and completion tracking

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ScatteredModeView from '../ScatteredModeView';
import { testDataFactories } from '../../../tests/utils';

describe('ScatteredModeView', () => {
  const mockTask = testDataFactories.task({
    id: '1',
    title: 'Quick Task 1',
    description: 'A quick task description',
    timeEstimate: 5,
    category: 'personal',
    userId: 'user1',
  });

  const defaultProps = {
    currentTask: mockTask,
    taskIndex: 0,
    totalTasks: 3,
    completedCount: 0,
    totalXP: 0,
    onCompleteTask: jest.fn(),
    onSkipTask: jest.fn(),
    onExit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display current task details', () => {
    const { getByText } = render(<ScatteredModeView {...defaultProps} />);

    expect(getByText('Quick Task 1')).toBeTruthy();
    expect(getByText('A quick task description')).toBeTruthy();
    expect(getByText('5 minutes')).toBeTruthy();
  });

  it('should show progress counter', () => {
    const { getByText } = render(<ScatteredModeView {...defaultProps} />);

    expect(getByText('1 of 3')).toBeTruthy();
  });

  it('should display completion stats', () => {
    const { getByText } = render(
      <ScatteredModeView {...defaultProps} completedCount={2} totalXP={20} />,
    );

    expect(getByText('Completed: 2')).toBeTruthy();
    expect(getByText('XP: 20')).toBeTruthy();
  });

  it('should call onCompleteTask when complete button is pressed', () => {
    const onCompleteTask = jest.fn();
    const { getByTestId } = render(
      <ScatteredModeView {...defaultProps} onCompleteTask={onCompleteTask} />,
    );

    fireEvent.press(getByTestId('complete-button'));
    expect(onCompleteTask).toHaveBeenCalled();
  });

  it('should call onSkipTask when skip button is pressed', () => {
    const onSkipTask = jest.fn();
    const { getByTestId } = render(<ScatteredModeView {...defaultProps} onSkipTask={onSkipTask} />);

    fireEvent.press(getByTestId('skip-button'));
    expect(onSkipTask).toHaveBeenCalled();
  });

  it('should call onExit when exit button is pressed', () => {
    const onExit = jest.fn();
    const { getByTestId } = render(<ScatteredModeView {...defaultProps} onExit={onExit} />);

    fireEvent.press(getByTestId('exit-button'));
    expect(onExit).toHaveBeenCalled();
  });

  it('should show empty state when no current task', () => {
    const { getByText } = render(<ScatteredModeView {...defaultProps} currentTask={null} />);

    expect(getByText('No quick tasks available')).toBeTruthy();
  });

  it('should display motivational message', () => {
    const { getByText } = render(<ScatteredModeView {...defaultProps} />);

    expect(getByText('Keep the momentum going! 🚀')).toBeTruthy();
    expect(getByText('Quick wins build confidence and energy')).toBeTruthy();
  });

  it('should show category badge when task has category', () => {
    const { getByText } = render(<ScatteredModeView {...defaultProps} />);

    // The task has 'personal' category
    expect(getByText(/Personal/)).toBeTruthy();
  });

  it('should show XP preview', () => {
    const { getByText } = render(<ScatteredModeView {...defaultProps} />);

    // Default XP is 10 in the component
    expect(getByText('+10 XP')).toBeTruthy();
  });

  it('should update progress when task index changes', () => {
    const { getByText, rerender } = render(<ScatteredModeView {...defaultProps} />);

    expect(getByText('1 of 3')).toBeTruthy();

    rerender(<ScatteredModeView {...defaultProps} taskIndex={1} />);
    expect(getByText('2 of 3')).toBeTruthy();

    rerender(<ScatteredModeView {...defaultProps} taskIndex={2} />);
    expect(getByText('3 of 3')).toBeTruthy();
  });

  it('should handle tasks without time estimates', () => {
    const taskWithoutEstimate = { ...mockTask, timeEstimate: undefined };
    const { getByText } = render(
      <ScatteredModeView {...defaultProps} currentTask={taskWithoutEstimate} />,
    );

    expect(getByText('0 minutes')).toBeTruthy();
  });
});
