// ABOUTME: Tests for HyperfocusView presentation component
// Verifies timer display and control functionality

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HyperfocusView from '../HyperfocusView';
import { createMockTask } from '../../../tests/utils';

describe('HyperfocusView', () => {
  const mockTask = createMockTask({
    id: '1',
    title: 'Test Task',
    timeEstimate: 30,
    userId: 'user1',
  });

  const defaultProps = {
    task: mockTask,
    timeLeft: 25 * 60, // 25 minutes in seconds
    isRunning: false,
    isBreak: false,
    sessionCount: 0,
    onStart: jest.fn(),
    onPause: jest.fn(),
    onReset: jest.fn(),
    onExit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display task title', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} />);

    expect(getByText('Test Task')).toBeTruthy();
    expect(getByText('Focus Time')).toBeTruthy();
  });

  it('should display initial timer as 25:00', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} />);

    expect(getByText('25:00')).toBeTruthy();
  });

  it('should format time correctly', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} timeLeft={90} />);

    expect(getByText('1:30')).toBeTruthy();
  });

  it('should pad seconds with zero', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} timeLeft={65} />);

    expect(getByText('1:05')).toBeTruthy();
  });

  it('should show Start button when not running', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} />);

    expect(getByText('Start')).toBeTruthy();
  });

  it('should show Pause button when running', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} isRunning={true} />);

    expect(getByText('Pause')).toBeTruthy();
  });

  it('should call onStart when Start button is pressed', () => {
    const onStart = jest.fn();
    const { getByText } = render(<HyperfocusView {...defaultProps} onStart={onStart} />);

    fireEvent.press(getByText('Start'));
    expect(onStart).toHaveBeenCalled();
  });

  it('should call onPause when Pause button is pressed', () => {
    const onPause = jest.fn();
    const { getByText } = render(
      <HyperfocusView {...defaultProps} isRunning={true} onPause={onPause} />,
    );

    fireEvent.press(getByText('Pause'));
    expect(onPause).toHaveBeenCalled();
  });

  it('should call onReset when Reset button is pressed', () => {
    const onReset = jest.fn();
    const { getByText } = render(<HyperfocusView {...defaultProps} onReset={onReset} />);

    fireEvent.press(getByText('Reset'));
    expect(onReset).toHaveBeenCalled();
  });

  it('should call onExit when Exit button is pressed', () => {
    const onExit = jest.fn();
    const { getByTestId } = render(<HyperfocusView {...defaultProps} onExit={onExit} />);

    fireEvent.press(getByTestId('exit-button'));
    expect(onExit).toHaveBeenCalled();
  });

  it('should show break mode UI', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} isBreak={true} />);

    expect(getByText('Break Time')).toBeTruthy();
    expect(getByText('🌟 Great job! Enjoy your break')).toBeTruthy();
  });

  it('should display session stats', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} sessionCount={3} />);

    expect(getByText('Sessions: 3')).toBeTruthy();
    expect(getByText('Total: 75 minutes')).toBeTruthy();
  });

  it('should show appropriate motivation text', () => {
    const { getByText, rerender } = render(<HyperfocusView {...defaultProps} />);

    // Not running
    expect(getByText('💪 Ready when you are')).toBeTruthy();

    // Running
    rerender(<HyperfocusView {...defaultProps} isRunning={true} />);
    expect(getByText('🎯 Stay focused, you got this!')).toBeTruthy();

    // Break
    rerender(<HyperfocusView {...defaultProps} isBreak={true} />);
    expect(getByText('🌟 Great job! Enjoy your break')).toBeTruthy();
  });

  it('should show error when task is null', () => {
    const { getByText } = render(<HyperfocusView {...defaultProps} task={null} />);

    expect(getByText('Task not found')).toBeTruthy();
  });

  it('should update timer display when timeLeft changes', () => {
    const { getByText, rerender } = render(<HyperfocusView {...defaultProps} />);

    expect(getByText('25:00')).toBeTruthy();

    rerender(<HyperfocusView {...defaultProps} timeLeft={1497} />); // 24:57
    expect(getByText('24:57')).toBeTruthy();

    rerender(<HyperfocusView {...defaultProps} timeLeft={1495} />); // 24:55
    expect(getByText('24:55')).toBeTruthy();
  });
});
