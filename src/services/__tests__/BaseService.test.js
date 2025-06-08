// ABOUTME: Unit tests for BaseService abstract class
// Tests centralized error handling functionality

import { BaseService } from '../BaseService';
import SecureLogger from '../SecureLogger';

// Mock SecureLogger
jest.mock('../SecureLogger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Concrete implementation for testing
class TestService extends BaseService {
  constructor() {
    super('TestService');
  }

  // Expose protected methods for testing
  testHandleError(error, operation, context) {
    return this.handleError(error, operation, context);
  }

  testLogError(operation, error, context) {
    return this.logError(operation, error, context);
  }

  async testWrapAsync(operation, fn, context) {
    return this.wrapAsync(operation, fn, context);
  }

  testWrapSync(operation, fn, context) {
    return this.wrapSync(operation, fn, context);
  }
}

describe('BaseService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    global.__DEV__ = true;
    console.error = jest.fn();

    service = new TestService();
  });

  afterEach(() => {
    delete global.__DEV__;
  });

  describe('handleError', () => {
    it('should handle Error instances correctly', () => {
      const error = new Error('Test error message');
      const result = service.testHandleError(error, 'testOperation', { userId: '123' });

      expect(result).toEqual({
        code: 'TESTSERVICE_TESTOPERATION_ERROR',
        message: 'Test error message',
        details: {
          operation: 'testOperation',
          userId: '123',
        },
      });

      expect(console.error).toHaveBeenCalledWith('[TestService] testOperation failed:', error);
      expect(console.error).toHaveBeenCalledWith('Context:', { userId: '123' });
    });

    it('should handle string errors', () => {
      const error = 'String error';
      const result = service.testHandleError(error, 'testOperation');

      expect(result).toEqual({
        code: 'TESTSERVICE_TESTOPERATION_ERROR',
        message: 'Unknown error occurred', // BaseService treats non-Error objects as unknown
        details: {
          operation: 'testOperation',
        },
      });
    });

    it('should handle unknown error types', () => {
      const error = { custom: 'error' };
      const result = service.testHandleError(error, 'testOperation');

      expect(result).toEqual({
        code: 'TESTSERVICE_TESTOPERATION_ERROR',
        message: 'Unknown error occurred',
        details: {
          operation: 'testOperation',
        },
      });
    });

    it('should not include details in production', () => {
      global.__DEV__ = false;
      const error = new Error('Test error');
      const result = service.testHandleError(error, 'testOperation', { userId: '123' });

      expect(result.details).toBeUndefined();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should return safe error messages in production', () => {
      global.__DEV__ = false;
      const error = new Error('Sensitive database connection error');
      const result = service.testHandleError(error, 'login');

      expect(result.message).toBe('Login failed. Please check your credentials and try again.');
    });
  });

  describe('logError', () => {
    it('should log errors in development', () => {
      const error = new Error('Test error');
      service.testLogError('testOperation', error, { userId: '123' });

      expect(console.error).toHaveBeenCalledWith('[TestService] testOperation failed:', error);
      expect(console.error).toHaveBeenCalledWith('Context:', { userId: '123' });

      expect(SecureLogger.error).toHaveBeenCalledWith('testOperation failed: Test error', {
        code: 'TESTSERVICE_TESTOPERATION_001',
        context: JSON.stringify({ userId: '123' }),
      });
    });

    it('should use SecureLogger in production', () => {
      global.__DEV__ = false;
      const error = new Error('Test error');
      service.testLogError('testOperation', error);

      expect(console.error).not.toHaveBeenCalled();
      expect(SecureLogger.error).toHaveBeenCalled();
    });
  });

  describe('wrapAsync', () => {
    it('should return successful result for successful operation', async () => {
      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });
      const result = await service.testWrapAsync('testOperation', mockFn);

      expect(result).toEqual({
        success: true,
        data: { data: 'success' },
      });
      expect(mockFn).toHaveBeenCalled();
    });

    it('should handle errors in async operations', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const result = await service.testWrapAsync('testOperation', mockFn, { userId: '123' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('TESTSERVICE_TESTOPERATION_ERROR');
      expect(result.error.message).toBe('Async error');
      expect(result.error.details).toBeDefined();
      expect(result.error.details.operation).toBe('testOperation');
      expect(result.error.details.userId).toBe('123');
      // Call stack should be included in dev mode
      expect(result.error.details.callStack).toBeDefined();
      expect(typeof result.error.details.callStack).toBe('string');
    });
  });

  describe('wrapSync', () => {
    it('should return successful result for successful operation', () => {
      const mockFn = jest.fn().mockReturnValue({ data: 'success' });
      const result = service.testWrapSync('testOperation', mockFn);

      expect(result).toEqual({
        success: true,
        data: { data: 'success' },
      });
      expect(mockFn).toHaveBeenCalled();
    });

    it('should handle errors in sync operations', () => {
      const error = new Error('Sync error');
      const mockFn = jest.fn(() => {
        throw error;
      });
      const result = service.testWrapSync('testOperation', mockFn, { userId: '123' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('TESTSERVICE_TESTOPERATION_ERROR');
      expect(result.error.message).toBe('Sync error');
      expect(result.error.details).toBeDefined();
      expect(result.error.details.operation).toBe('testOperation');
      expect(result.error.details.userId).toBe('123');
      // Call stack should be included in dev mode
      expect(result.error.details.callStack).toBeDefined();
      expect(typeof result.error.details.callStack).toBe('string');
    });
  });

  describe('safe error messages', () => {
    beforeEach(() => {
      global.__DEV__ = false;
    });

    const testCases = [
      {
        operation: 'login',
        expected: 'Login failed. Please check your credentials and try again.',
      },
      { operation: 'signup', expected: 'Sign up failed. Please try again.' },
      { operation: 'save', expected: 'Failed to save. Please try again.' },
      { operation: 'load', expected: 'Failed to load data. Please try again.' },
      { operation: 'delete', expected: 'Failed to delete. Please try again.' },
      { operation: 'update', expected: 'Failed to update. Please try again.' },
      { operation: 'sync', expected: 'Sync failed. Please check your connection.' },
      { operation: 'auth', expected: 'Authentication failed. Please try again.' },
      { operation: 'unknown', expected: 'Operation failed. Please try again.' },
    ];

    testCases.forEach(({ operation, expected }) => {
      it(`should return safe message for ${operation} operation`, () => {
        const error = new Error('Sensitive error details');
        const result = service.testHandleError(error, operation);
        expect(result.message).toBe(expected);
      });
    });
  });
});
