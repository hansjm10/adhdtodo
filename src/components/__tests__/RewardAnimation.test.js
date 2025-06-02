// ABOUTME: Tests for RewardAnimation component
// Verifies celebration animations work correctly

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Animated, Dimensions, View } from 'react-native';
import RewardAnimation from '../RewardAnimation';

// Mock Dimensions
Dimensions.get = jest.fn(() => ({ width: 375, height: 667 }));

describe('RewardAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not render when visible is false', () => {
    const { toJSON } = render(<RewardAnimation visible={false} />);

    // Component should return null
    expect(toJSON()).toBeNull();
  });

  it('should render container when visible is true', () => {
    const { UNSAFE_getByType } = render(<RewardAnimation visible={true} type="confetti" />);

    // Should render the container view
    const container = UNSAFE_getByType(View);
    expect(container).toBeTruthy();
    expect(container.props.pointerEvents).toBe('none');
  });

  it('should start animations when visible becomes true', async () => {
    const parallelMock = jest.spyOn(Animated, 'parallel');
    const springMock = jest.spyOn(Animated, 'spring');
    const timingMock = jest.spyOn(Animated, 'timing');

    const { rerender } = render(<RewardAnimation visible={false} />);

    // Make visible
    rerender(<RewardAnimation visible={true} />);

    await waitFor(() => {
      // Animations should be triggered
      expect(parallelMock).toHaveBeenCalled();
      expect(springMock).toHaveBeenCalled();
      expect(timingMock).toHaveBeenCalled();
    });

    parallelMock.mockRestore();
    springMock.mockRestore();
    timingMock.mockRestore();
  });

  it('should call onComplete callback when animation finishes', async () => {
    const mockOnComplete = jest.fn();

    // Mock animation.start to immediately call callback
    const startMock = jest.fn((callback) => {
      if (callback) callback();
    });
    jest.spyOn(Animated, 'parallel').mockReturnValue({ start: startMock });

    render(<RewardAnimation visible={true} onComplete={mockOnComplete} />);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should create animations for emoji type', () => {
    const parallelMock = jest.spyOn(Animated, 'parallel');

    render(<RewardAnimation visible={true} type="emoji" />);

    // Should create parallel animations
    expect(parallelMock).toHaveBeenCalled();

    parallelMock.mockRestore();
  });

  it('should create animations for confetti type', () => {
    const parallelMock = jest.spyOn(Animated, 'parallel');

    render(<RewardAnimation visible={true} type="confetti" />);

    // Should create parallel animations for confetti
    expect(parallelMock).toHaveBeenCalled();

    parallelMock.mockRestore();
  });

  it('should respect different animation types', () => {
    const { rerender } = render(<RewardAnimation visible={true} type="confetti" />);

    // Should not throw when changing types
    expect(() => {
      rerender(<RewardAnimation visible={true} type="emoji" />);
    }).not.toThrow();

    expect(() => {
      rerender(<RewardAnimation visible={true} type="stars" />);
    }).not.toThrow();
  });
});
