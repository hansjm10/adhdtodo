// ABOUTME: Unit tests for ErrorBoundary component
// Tests error catching and recovery UI functionality

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorBoundary from '../ErrorBoundary';
import { logError } from '../../utils/ErrorHandler';

// Mock ErrorHandler
jest.mock('../../utils/ErrorHandler', () => ({
  logError: jest.fn(),
}));

// Component that throws an error
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

// Component that throws in useEffect
const ThrowErrorInEffect = () => {
  React.useEffect(() => {
    throw new Error('Effect error');
  }, []);
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  let originalConsoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    global.__DEV__ = true;
    // Suppress console.error during tests
    originalConsoleError = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    delete global.__DEV__;
  });

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Test content</Text>
      </ErrorBoundary>,
    );

    expect(getByText('Test content')).toBeTruthy();
  });

  it('should catch errors and display fallback UI', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(getByText('No error')).toBeTruthy();

    // Trigger error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(getByText("Don't worry, it happens! Let's try again.")).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
    expect(logError).toHaveBeenCalledWith('ErrorBoundary', expect.any(Error));
  });

  it('should show custom fallback when provided', () => {
    const customFallback = <Text>Custom error UI</Text>;

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(getByText('Custom error UI')).toBeTruthy();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );
  });

  it('should reset error state when Try Again is pressed', () => {
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <Text>Recovered content</Text>;
    };

    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    // Change state so component won't throw on next render
    shouldThrow = false;

    // Press Try Again
    fireEvent.press(getByText('Try Again'));

    // Component should recover
    expect(queryByText('Oops! Something went wrong')).toBeNull();
    expect(getByText('Recovered content')).toBeTruthy();
  });

  it('should show error details in development when showDetails is true', () => {
    const { getByText } = render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(getByText('Error Details:')).toBeTruthy();
    expect(getByText(/Error: Test error/)).toBeTruthy();
  });

  it('should not show error details in production', () => {
    global.__DEV__ = false;

    const { queryByText } = render(
      <ErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(queryByText('Error Details:')).toBeNull();
  });

  it('should handle errors thrown in useEffect', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowErrorInEffect />
      </ErrorBoundary>,
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(logError).toHaveBeenCalled();
  });

  it('should handle multiple error scenarios', () => {
    // Test 1: Component can go from working to error state
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(getByText('No error')).toBeTruthy();

    // Trigger error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    // Test 2: Try Again button resets the error state
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <Text>Recovered</Text>;
    };

    const { getByText: getByText2 } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    expect(getByText2('Oops! Something went wrong')).toBeTruthy();

    // Fix the error condition
    shouldThrow = false;

    // Press Try Again
    fireEvent.press(getByText2('Try Again'));

    // Should recover
    expect(getByText2('Recovered')).toBeTruthy();
  });
});
