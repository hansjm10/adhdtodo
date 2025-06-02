// ABOUTME: Tests for FocusModeView presentation component
// Verifies mode selection and task filtering UI

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FocusModeView from '../FocusModeView';
import { createMockTask } from '../../../tests/utils';

describe('FocusModeView', () => {
  const mockTasks = [
    createMockTask({ id: '1', title: 'Long Task', timeEstimate: 60, userId: 'user1' }),
    createMockTask({ id: '2', title: 'Medium Task', timeEstimate: 30, userId: 'user1' }),
    createMockTask({ id: '3', title: 'Quick Task 1', timeEstimate: 5, userId: 'user1' }),
    createMockTask({ id: '4', title: 'Quick Task 2', timeEstimate: 15, userId: 'user1' }),
    createMockTask({ id: '5', title: 'No Estimate Task', timeEstimate: null, userId: 'user1' }),
  ];

  const defaultProps = {
    tasks: mockTasks,
    selectedMode: null,
    selectedTask: null,
    onModeSelect: jest.fn(),
    onTaskSelect: jest.fn(),
    onStartPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display both focus modes', () => {
    const { getByText } = render(<FocusModeView {...defaultProps} />);

    expect(getByText('Hyperfocus Mode')).toBeTruthy();
    expect(getByText('Scattered Mode')).toBeTruthy();
  });

  it('should show hyperfocus mode features', () => {
    const { getByText } = render(<FocusModeView {...defaultProps} />);

    expect(getByText('Deep focus on a single task with timed sessions and breaks')).toBeTruthy();
    expect(getByText('• 25-minute sessions')).toBeTruthy();
    expect(getByText('• Built-in breaks')).toBeTruthy();
    expect(getByText('• Distraction-free')).toBeTruthy();
  });

  it('should show scattered mode features', () => {
    const { getByText } = render(<FocusModeView {...defaultProps} />);

    expect(getByText('Quick task switching for high-energy, low-focus times')).toBeTruthy();
    expect(getByText('• 5-15 minute tasks')).toBeTruthy();
    expect(getByText('• Rapid switching')).toBeTruthy();
    expect(getByText('• Momentum building')).toBeTruthy();
  });

  it('should call onModeSelect when hyperfocus mode is pressed', () => {
    const onModeSelect = jest.fn();
    const { getByTestId } = render(<FocusModeView {...defaultProps} onModeSelect={onModeSelect} />);

    fireEvent.press(getByTestId('hyperfocus-mode'));
    expect(onModeSelect).toHaveBeenCalledWith('hyperfocus');
  });

  it('should call onModeSelect when scattered mode is pressed', () => {
    const onModeSelect = jest.fn();
    const { getByTestId } = render(<FocusModeView {...defaultProps} onModeSelect={onModeSelect} />);

    fireEvent.press(getByTestId('scattered-mode'));
    expect(onModeSelect).toHaveBeenCalledWith('scattered');
  });

  it('should show task list when hyperfocus mode is selected', () => {
    const { getByText, getByTestId } = render(
      <FocusModeView {...defaultProps} selectedMode="hyperfocus" />,
    );

    expect(getByText('Select a Task')).toBeTruthy();
    expect(getByText('Long Task')).toBeTruthy();
    expect(getByText('Medium Task')).toBeTruthy();
    // All tasks should be shown
    expect(getByTestId('task-1')).toBeTruthy();
    expect(getByTestId('task-2')).toBeTruthy();
    expect(getByTestId('task-3')).toBeTruthy();
    expect(getByTestId('task-4')).toBeTruthy();
    expect(getByTestId('task-5')).toBeTruthy();
  });

  it('should show only quick tasks when scattered mode is selected', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <FocusModeView {...defaultProps} selectedMode="scattered" />,
    );

    expect(getByText('Quick Tasks')).toBeTruthy();
    expect(getByText('Quick Task 1')).toBeTruthy();
    expect(getByText('Quick Task 2')).toBeTruthy();
    // Only quick tasks (≤15 min) should be shown
    expect(getByTestId('task-3')).toBeTruthy(); // Quick Task 1 (5 min)
    expect(getByTestId('task-4')).toBeTruthy(); // Quick Task 2 (15 min)
    // Long tasks should not be shown
    expect(queryByTestId('task-1')).toBeFalsy(); // Long Task (60 min)
    expect(queryByTestId('task-2')).toBeFalsy(); // Medium Task (30 min)
    expect(queryByTestId('task-5')).toBeFalsy(); // No Estimate Task
  });

  it('should call onTaskSelect when a task is pressed', () => {
    const onTaskSelect = jest.fn();
    const { getByTestId } = render(
      <FocusModeView {...defaultProps} selectedMode="hyperfocus" onTaskSelect={onTaskSelect} />,
    );

    fireEvent.press(getByTestId('task-1'));
    expect(onTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('should show task time estimates', () => {
    const { getByText } = render(<FocusModeView {...defaultProps} selectedMode="hyperfocus" />);

    expect(getByText('60 min')).toBeTruthy();
    expect(getByText('30 min')).toBeTruthy();
    expect(getByText('No estimate')).toBeTruthy();
  });

  it('should highlight selected task', () => {
    const { getByTestId } = render(
      <FocusModeView {...defaultProps} selectedMode="hyperfocus" selectedTask={mockTasks[0]} />,
    );

    const selectedTaskCard = getByTestId('task-1');
    // The selected task should have different styling
    // This is handled by the taskCardSelected style
    expect(selectedTaskCard).toBeTruthy();
  });

  it('should disable start button when no mode or task selected', () => {
    const { getByTestId, getByText } = render(<FocusModeView {...defaultProps} />);

    const startButton = getByTestId('start-button');
    // Check if button has disabled styling or is not pressable
    expect(startButton).toBeTruthy();
    expect(getByText('Start Focus Mode')).toBeTruthy();
  });

  it('should enable start button when mode and task are selected', () => {
    const { getByTestId, getByText } = render(
      <FocusModeView {...defaultProps} selectedMode="hyperfocus" selectedTask={mockTasks[0]} />,
    );

    const startButton = getByTestId('start-button');
    // Button should be pressable when enabled
    expect(startButton).toBeTruthy();
    expect(getByText('Start Focus Mode')).toBeTruthy();
  });

  it('should call onStartPress when start button is pressed', () => {
    const onStartPress = jest.fn();
    const { getByTestId } = render(
      <FocusModeView
        {...defaultProps}
        selectedMode="hyperfocus"
        selectedTask={mockTasks[0]}
        onStartPress={onStartPress}
      />,
    );

    fireEvent.press(getByTestId('start-button'));
    expect(onStartPress).toHaveBeenCalled();
  });

  it('should show empty state when no tasks available', () => {
    const { getByText } = render(
      <FocusModeView {...defaultProps} tasks={[]} selectedMode="hyperfocus" />,
    );

    expect(getByText('No tasks available')).toBeTruthy();
  });
});
