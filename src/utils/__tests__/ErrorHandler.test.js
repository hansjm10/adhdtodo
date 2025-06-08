// ABOUTME: Unit tests for ErrorHandler utility
// Tests centralized error handling and logging functions

import { Alert } from 'react-native';
import ErrorHandler, { handleError, logError } from '../ErrorHandler';
import SecureLogger from '../../services/SecureLogger';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../services/SecureLogger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.__DEV__ = true;
    console.error = jest.fn();
  });

  afterEach(() => {
    delete global.__DEV__;
  });

  describe('handleError', () => {
    it('should handle Error instances', () => {
      const error = new Error('Test error message');
      error.name = 'TestError';
      const result = handleError(error, 'TestContext');

      expect(result).toEqual({
        code: 'TESTCONTEXT_TestError',
        message: 'Test error message',
        details: {
          stack: error.stack,
          context: 'TestContext',
        },
      });

      expect(console.error).toHaveBeenCalledWith('[TestContext] Error:', error);
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      const result = handleError(error, 'TestContext');

      expect(result).toEqual({
        code: 'TESTCONTEXT_STRING_ERROR',
        message: 'String error message',
        details: undefined,
      });
    });

    it('should handle custom error objects', () => {
      const error = {
        code: 'CUSTOM_ERROR',
        message: 'Custom error message',
        details: { field: 'value' },
      };
      const result = handleError(error, 'TestContext');

      expect(result).toEqual({
        code: 'TESTCONTEXT_CUSTOM_ERROR',
        message: 'Custom error message',
        details: { field: 'value' },
      });
    });

    it('should handle null/undefined errors', () => {
      const result = handleError(null, 'TestContext');

      expect(result).toEqual({
        code: 'TESTCONTEXT_UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: undefined,
      });
    });

    it('should not include stack trace in production', () => {
      global.__DEV__ = false;
      const error = new Error('Test error');
      const result = handleError(error);

      expect(result.details).toBeUndefined();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      logError('TestOperation', error);

      expect(console.error).toHaveBeenCalledWith('[TestOperation] Error:', error);
      expect(SecureLogger.error).toHaveBeenCalledWith('TestOperation: Test error', {
        code: 'TESTOPERATION_ERROR',
      });
    });

    it('should handle non-Error objects', () => {
      const error = { custom: 'error' };
      logError('TestOperation', error);

      expect(console.error).toHaveBeenCalledWith('[TestOperation] Error:', error);
      expect(SecureLogger.error).toHaveBeenCalledWith('TestOperation: [object Object]', {
        code: 'TESTOPERATION_ERROR',
      });
    });

    it('should only use SecureLogger in production', () => {
      global.__DEV__ = false;
      const error = new Error('Test error');
      logError('TestOperation', error);

      expect(console.error).not.toHaveBeenCalled();
      expect(SecureLogger.error).toHaveBeenCalled();
    });

    it('should rate limit error logging per context', () => {
      const error = new Error('Test error');
      const context = 'RateLimitTest';
      console.warn = jest.fn();
      const initialCallCount = SecureLogger.error.mock.calls.length;

      // Log 10 errors (should all go through)
      for (let i = 0; i < 10; i++) {
        logError(context, error);
      }

      expect(SecureLogger.error).toHaveBeenCalledTimes(initialCallCount + 10);

      // 11th error should be rate limited
      logError(context, error);
      expect(SecureLogger.error).toHaveBeenCalledTimes(initialCallCount + 10); // Still same count

      // Should show rate limit warning
      expect(console.warn).toHaveBeenCalledWith(
        '[RateLimitTest] Error logging rate limited (max 10 per minute)',
      );
    });

    it('should reset rate limit after time window', () => {
      const error = new Error('Test error');
      const context = 'TimeWindowTest';

      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      try {
        const initialCallCount = SecureLogger.error.mock.calls.length;

        // Fill rate limit
        for (let i = 0; i < 10; i++) {
          logError(context, error);
        }
        expect(SecureLogger.error).toHaveBeenCalledTimes(initialCallCount + 10);

        // Try to log one more (should be rate limited)
        logError(context, error);
        expect(SecureLogger.error).toHaveBeenCalledTimes(initialCallCount + 10);

        // Advance time by more than 1 minute
        mockTime += 61000;

        // Should allow logging again
        logError(context, error);
        expect(SecureLogger.error).toHaveBeenCalledTimes(initialCallCount + 11);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should rate limit different contexts independently', () => {
      const error = new Error('Test error');
      const initialCallCount = SecureLogger.error.mock.calls.length;

      // Fill rate limit for context1
      for (let i = 0; i < 10; i++) {
        logError('Context1', error);
      }

      // Should still allow logging for context2
      logError('Context2', error);

      expect(SecureLogger.error).toHaveBeenCalledTimes(initialCallCount + 11);
    });
  });

  describe('showError', () => {
    it('should show alert with error message', () => {
      ErrorHandler.showError('Test error message');

      expect(Alert.alert).toHaveBeenCalledWith('Oops!', 'Test error message', [{ text: 'OK' }]);
    });

    it('should show retry button when retry function provided', () => {
      const retryFn = jest.fn();
      ErrorHandler.showError('Test error message', retryFn);

      expect(Alert.alert).toHaveBeenCalledWith('Oops!', 'Test error message', [
        { text: 'Retry', onPress: retryFn },
        { text: 'OK' },
      ]);
    });
  });

  describe('handleStorageError', () => {
    it('should handle storage errors with appropriate messages', () => {
      const error = new Error('Storage error');
      const retryFn = jest.fn();

      ErrorHandler.handleStorageError(error, 'save', retryFn);

      expect(console.error).toHaveBeenCalledWith('Storage error during save:', error);
      expect(Alert.alert).toHaveBeenCalledWith('Oops!', 'Failed to save. Please try again.', [
        { text: 'Retry', onPress: retryFn },
        { text: 'OK' },
      ]);
    });

    it('should use operation-specific messages', () => {
      const operations = [
        { operation: 'save', message: 'Failed to save. Please try again.' },
        { operation: 'load', message: 'Failed to load data. Please try again.' },
        { operation: 'delete', message: 'Failed to delete. Please try again.' },
        { operation: 'update', message: 'Failed to update. Please try again.' },
      ];

      operations.forEach(({ operation, message }) => {
        ErrorHandler.handleStorageError(new Error('Test'), operation);
        expect(Alert.alert).toHaveBeenLastCalledWith('Oops!', message, [{ text: 'OK' }]);
      });
    });
  });

  describe('handleNetworkError', () => {
    it('should handle network errors', () => {
      const error = new Error('Network error');
      const retryFn = jest.fn();

      ErrorHandler.handleNetworkError(error, retryFn);

      expect(console.error).toHaveBeenCalledWith('Network error:', error);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Oops!',
        'Connection error. Please check your internet and try again.',
        [{ text: 'Retry', onPress: retryFn }, { text: 'OK' }],
      );
    });
  });

  describe('handleValidationError', () => {
    it('should show validation error message', () => {
      ErrorHandler.handleValidationError('Invalid email format');

      expect(Alert.alert).toHaveBeenCalledWith('Oops!', 'Invalid email format', [{ text: 'OK' }]);
    });
  });

  describe('handleCriticalError', () => {
    it('should handle critical errors', () => {
      const error = new Error('Critical error');

      ErrorHandler.handleCriticalError(error);

      expect(console.error).toHaveBeenCalledWith('Critical error:', error);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Oops!',
        'A critical error occurred. Please restart the app.',
        [{ text: 'OK' }],
      );
    });
  });
});
