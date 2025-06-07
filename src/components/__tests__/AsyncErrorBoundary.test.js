// ABOUTME: Unit tests for AsyncErrorBoundary component
// Tests async error handling and retry functionality

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import AsyncErrorBoundary from '../AsyncErrorBoundary';
import { logError } from '../../utils/ErrorHandler';

// Mock ErrorHandler
jest.mock('../../utils/ErrorHandler', () => ({
  logError: jest.fn(),
}));

// Mock window for unhandledrejection event
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

describe('AsyncErrorBoundary', () => {
  let unhandledRejectionHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.__DEV__ = true;

    // Capture the unhandledrejection handler
    global.window.addEventListener.mockImplementation((event, handler) => {
      if (event === 'unhandledrejection') {
        unhandledRejectionHandler = handler;
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.__DEV__;
  });

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <AsyncErrorBoundary>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    expect(getByText('Test content')).toBeTruthy();
    expect(global.window.addEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );
  });

  it('should handle unhandled promise rejections', () => {
    const onError = jest.fn();
    const { getByText } = render(
      <AsyncErrorBoundary onError={onError}>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Simulate unhandled rejection
    const event = {
      reason: { message: 'Async error occurred' },
      preventDefault: jest.fn(),
    };

    act(() => {
      unhandledRejectionHandler(event);
    });

    expect(getByText('Connection Issue')).toBeTruthy();
    expect(getByText("Having trouble connecting. Let's give it another shot!")).toBeTruthy();
    expect(logError).toHaveBeenCalledWith('AsyncErrorBoundary', expect.any(Error));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should show retry button with remaining attempts', () => {
    const { getByText } = render(
      <AsyncErrorBoundary maxRetries={3}>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Trigger error
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    expect(getByText('Retry (3 left)')).toBeTruthy();
    expect(getByText('Start Fresh')).toBeTruthy();
  });

  it('should retry with delay when retry button is pressed', async () => {
    const { getByText, queryByText } = render(
      <AsyncErrorBoundary retryDelay={1000}>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Trigger error
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    // Press retry
    await act(async () => {
      fireEvent.press(getByText('Retry (3 left)'));
    });

    // Should show retrying state
    expect(getByText('Retrying...')).toBeTruthy();

    // Advance timers and wait for state updates
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Should be back to normal
    expect(queryByText('Connection Issue')).toBeNull();
    expect(getByText('Test content')).toBeTruthy();
  });

  it('should decrement retry count on each retry', async () => {
    const { getByText } = render(
      <AsyncErrorBoundary maxRetries={3} retryDelay={100}>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Trigger error
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    expect(getByText('Retry (3 left)')).toBeTruthy();

    // First retry
    await act(async () => {
      fireEvent.press(getByText('Retry (3 left)'));
      jest.advanceTimersByTime(100);
    });

    // Trigger error again immediately after retry
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    expect(getByText('Retry (2 left)')).toBeTruthy();

    // Second retry
    await act(async () => {
      fireEvent.press(getByText('Retry (2 left)'));
      jest.advanceTimersByTime(100);
    });

    // Trigger error again
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    expect(getByText('Retry (1 left)')).toBeTruthy();
  });

  it('should not show retry button after max retries', async () => {
    const { getByText, queryByText } = render(
      <AsyncErrorBoundary maxRetries={1} retryDelay={100}>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Trigger error
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    expect(getByText('Retry (1 left)')).toBeTruthy();

    // Use the only retry
    await act(async () => {
      fireEvent.press(getByText('Retry (1 left)'));
      jest.advanceTimersByTime(100);
    });

    // Trigger error again to exceed max retries
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    // Should still show retry button but with 0 left
    expect(queryByText(/Retry \(0 left\)/)).toBeNull();
    expect(getByText('Start Fresh')).toBeTruthy();
  });

  it('should reset everything when Start Fresh is pressed', () => {
    const { getByText, queryByText } = render(
      <AsyncErrorBoundary>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Trigger error
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Test error' },
        preventDefault: jest.fn(),
      });
    });

    // Press Start Fresh
    fireEvent.press(getByText('Start Fresh'));

    // Should be back to normal
    expect(queryByText('Connection Issue')).toBeNull();
    expect(getByText('Test content')).toBeTruthy();
  });

  it('should show debug info in development', () => {
    const { getByText } = render(
      <AsyncErrorBoundary>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Trigger error
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Debug error message' },
        preventDefault: jest.fn(),
      });
    });

    expect(getByText('Debug: Debug error message')).toBeTruthy();
  });

  it('should not show debug info in production', () => {
    global.__DEV__ = false;

    const { queryByText } = render(
      <AsyncErrorBoundary>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Trigger error
    act(() => {
      unhandledRejectionHandler({
        reason: { message: 'Debug error message' },
        preventDefault: jest.fn(),
      });
    });

    expect(queryByText(/Debug:/)).toBeNull();
  });

  it('should cleanup event listener on unmount', () => {
    const { unmount } = render(
      <AsyncErrorBoundary>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    unmount();

    expect(global.window.removeEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      unhandledRejectionHandler,
    );
  });

  it('should handle rejection events without reason', () => {
    const { getByText } = render(
      <AsyncErrorBoundary>
        <Text>Test content</Text>
      </AsyncErrorBoundary>,
    );

    // Simulate rejection without reason
    act(() => {
      unhandledRejectionHandler({
        preventDefault: jest.fn(),
      });
    });

    expect(getByText('Connection Issue')).toBeTruthy();
    expect(logError).toHaveBeenCalledWith(
      'AsyncErrorBoundary',
      new Error('Unhandled promise rejection'),
    );
  });
});
