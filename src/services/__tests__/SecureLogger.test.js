// ABOUTME: Tests for SecureLogger service ensuring sensitive data is not exposed in logs

import SecureLogger from '../SecureLogger';

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;
const originalConsoleLog = console.log;

describe('SecureLogger', () => {
  let mockConsoleError;
  let mockConsoleWarn;
  let mockConsoleInfo;
  let mockConsoleLog;

  beforeEach(() => {
    // Mock console methods
    mockConsoleError = jest.fn();
    mockConsoleWarn = jest.fn();
    mockConsoleInfo = jest.fn();
    mockConsoleLog = jest.fn();

    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;
    console.info = mockConsoleInfo;
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.log = originalConsoleLog;
    jest.clearAllMocks();
  });

  describe('Sensitive Data Sanitization', () => {
    it('should sanitize email addresses', () => {
      SecureLogger.error('Failed to authenticate user@example.com');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[EMAIL]');
      expect(loggedMessage).not.toContain('user@example.com');
    });

    it('should sanitize passwords', () => {
      SecureLogger.error('Login failed with password: secretPassword123');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('secretPassword123');
    });

    it('should sanitize tokens', () => {
      SecureLogger.error('Invalid token: abc123def456ghi789');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('abc123def456ghi789');
    });

    it('should sanitize session IDs', () => {
      SecureLogger.error('Session expired: session_12345abcdef');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('session_12345abcdef');
    });

    it('should sanitize user IDs that look like UUIDs', () => {
      SecureLogger.error('User not found: user: 123e4567-e89b-12d3-a456-426614174000');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[USER_ID]');
      expect(loggedMessage).not.toContain('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should sanitize API keys', () => {
      SecureLogger.error('API key invalid: key: abcdefghijklmnopqrstuvwxyz123456');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
    });
  });

  describe('Error Logging', () => {
    it('should log errors with code metadata', () => {
      SecureLogger.error('Operation failed', { code: 'AUTH_001' });

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls[0][0]).toContain('[ERROR]');
      expect(mockConsoleError.mock.calls[0][1]).toContain('AUTH_001');
    });

    it('should log errors without metadata', () => {
      SecureLogger.error('Generic error');

      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] Generic error', '');
    });
  });

  describe('Other Log Levels', () => {
    it('should support warn logging', () => {
      SecureLogger.warn('Warning message');

      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleWarn.mock.calls[0][0]).toContain('[WARN]');
    });

    it('should support info logging', () => {
      SecureLogger.info('Info message');

      expect(mockConsoleInfo).toHaveBeenCalled();
      expect(mockConsoleInfo.mock.calls[0][0]).toContain('[INFO]');
    });

    it('should support debug logging', () => {
      SecureLogger.debug('Debug message');

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleLog.mock.calls[0][0]).toContain('[DEBUG]');
    });
  });

  describe('Development vs Production', () => {
    it('should log detailed messages in development', () => {
      // __DEV__ is true in test environment
      SecureLogger.error('Detailed error message', { code: 'TEST_001' });

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleError.mock.calls[0][0]).toContain('Detailed error message');
    });

    // Note: Testing production behavior would require mocking __DEV__
  });

  describe('Complex Sanitization Cases', () => {
    it('should sanitize multiple sensitive items in one message', () => {
      SecureLogger.error(
        'User user@test.com failed login with password: pass123 and token: tok456',
      );

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[EMAIL]');
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('user@test.com');
      expect(loggedMessage).not.toContain('pass123');
      expect(loggedMessage).not.toContain('tok456');
    });

    it('should handle JSON-like password fields', () => {
      SecureLogger.error('Request failed: {"password":"secretValue","user":"test"}');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[REDACTED]');
      expect(loggedMessage).not.toContain('secretValue');
    });
  });
});
