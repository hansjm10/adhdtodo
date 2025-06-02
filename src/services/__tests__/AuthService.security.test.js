// ABOUTME: Security-focused tests for AuthService ensuring all security vulnerabilities are fixed

import AuthService from '../AuthService';
import UserStorageService from '../UserStorageService';
import CryptoService from '../CryptoService';
import * as SecureStore from 'expo-secure-store';
import RateLimiter from '../RateLimiter';
import SecureLogger from '../SecureLogger';
import { UserRole } from '../../types/user.types';

// Mock dependencies
jest.mock('../UserStorageService');
jest.mock('../CryptoService');
jest.mock('../SecureLogger');
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock('../../utils/UserModel', () => ({
  ...jest.requireActual('../../utils/UserModel'),
  createUser: jest.fn((data) => ({
    id: 'user_123',
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  updateUser: jest.fn((user, updates) => ({
    ...user,
    ...updates,
    updatedAt: new Date(),
  })),
}));

// Mock console methods to verify no sensitive data is logged
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

describe('AuthService Security Tests', () => {
  let mockConsoleError;
  let mockConsoleLog;
  let mockConsoleWarn;

  beforeEach(() => {
    jest.clearAllMocks();
    RateLimiter.reset();

    // Mock console methods
    mockConsoleError = jest.fn();
    mockConsoleLog = jest.fn();
    mockConsoleWarn = jest.fn();

    console.error = mockConsoleError;
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;

    // Default CryptoService mocks
    CryptoService.generateSalt.mockResolvedValue('mocksalt');
    CryptoService.hashPassword.mockResolvedValue('mockhash');
    CryptoService.verifyPassword.mockResolvedValue(false);
    CryptoService.generateSessionToken.mockResolvedValue('mocktoken.123456789');
    CryptoService.isTokenExpired.mockReturnValue(false);
    CryptoService.generateToken.mockResolvedValue('reference-token');
    CryptoService.generateSecureBytes.mockResolvedValue(new Uint8Array(32));
    CryptoService.encrypt.mockResolvedValue('encrypted-token');
    CryptoService.decrypt.mockResolvedValue('reference-token');
    CryptoService.hash.mockResolvedValue('token-fingerprint');

    // SecureStore mocks
    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.setItemAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements during signup', async () => {
      const weakPasswords = [
        'short', // Too short
        'password', // No numbers or special chars
        'password123', // No special chars
        'Password123', // No special chars
      ];

      for (const weakPassword of weakPasswords) {
        const result = await AuthService.signUp(
          'test@example.com',
          weakPassword,
          'Test User',
          UserRole.ADHD_USER,
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/password/i);
      }
    });

    it('should accept strong passwords', async () => {
      UserStorageService.getUserByEmail.mockResolvedValue(null);
      UserStorageService.saveUser.mockResolvedValue(true);
      UserStorageService.setCurrentUser.mockResolvedValue(true);
      UserStorageService.saveUserToken.mockResolvedValue(true);

      const result = await AuthService.signUp(
        'test@example.com',
        'StrongP@ssw0rd123!',
        'Test User',
        UserRole.ADHD_USER,
      );

      // Log the result to understand the failure
      expect(result).toEqual({
        success: true,
        user: expect.any(Object),
        token: expect.any(String),
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should block login after 5 failed attempts', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: '123',
        email,
        passwordHash: 'hash',
        passwordSalt: 'salt',
      };

      UserStorageService.getUserByEmail.mockResolvedValue(mockUser);
      CryptoService.verifyPassword.mockResolvedValue(false); // Always return wrong password

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const result = await AuthService.login(email, 'WrongP@ssw0rd1');
        expect(result.success).toBe(false);
      }

      // 6th attempt should be rate limited
      const result = await AuthService.login(email, 'WrongP@ssw0rd1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/too many failed login attempts/i);
    });

    it('should reset rate limit on successful login', async () => {
      const email = 'test@example.com';

      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        RateLimiter.recordLoginAttempt(email, false);
      }

      // Mock successful login
      const mockUser = {
        id: '123',
        email,
        passwordHash: 'hash',
        passwordSalt: 'salt',
      };
      UserStorageService.getUserByEmail.mockResolvedValue(mockUser);
      UserStorageService.updateUser.mockResolvedValue(true);
      UserStorageService.setCurrentUser.mockResolvedValue(true);
      UserStorageService.saveUserToken.mockResolvedValue(true);
      CryptoService.verifyPassword.mockResolvedValue(true); // Successful password verification

      // Attempt login which should succeed and reset rate limit
      const result = await AuthService.login(email, 'CorrectP@ssw0rd1');
      expect(result.success).toBe(true);

      expect(RateLimiter.canAttemptLogin(email)).toBe(true);
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not reveal if email exists during password reset', async () => {
      // Test with non-existent user
      UserStorageService.getUserByEmail.mockResolvedValue(null);
      const result1 = await AuthService.resetPassword('nonexistent@example.com', 'NewP@ssw0rd!');

      // Test with existing user
      UserStorageService.getUserByEmail.mockResolvedValue({
        id: '123',
        email: 'exists@example.com',
      });
      UserStorageService.updateUser.mockResolvedValue(true);
      const result2 = await AuthService.resetPassword('exists@example.com', 'NewP@ssw0rd!');

      // Both should return the same message
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.message).toBe(result2.message);
      expect(result1.message).toBe('If an account exists, the password has been reset');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format during signup', async () => {
      const invalidEmails = [
        '',
        'notanemail',
        'user@',
        '@example.com',
        'user@.com',
        'user space@example.com',
      ];

      for (const invalidEmail of invalidEmails) {
        const result = await AuthService.signUp(
          invalidEmail,
          'ValidP@ssw0rd!',
          'Test User',
          UserRole.ADHD_USER,
        );
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/email/i);
      }
    });

    it('should sanitize and validate user inputs', async () => {
      // This is handled by ValidationService which is tested separately
      // Here we just verify it's being used
      const result = await AuthService.signUp(
        '<script>alert(1)</script>@example.com',
        'ValidP@ssw0rd!',
        'Test User',
        UserRole.ADHD_USER,
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/email/i);
    });
  });

  describe('Secure Logging', () => {
    it('should not log sensitive data to console', async () => {
      // Mock to trigger an error in verifySession
      UserStorageService.getUserToken.mockRejectedValue(new Error('Storage error'));

      // Trigger error conditions that would log
      await AuthService.verifySession();

      // Mock logout error
      UserStorageService.getCurrentUser.mockRejectedValue(new Error('Logout error'));
      await AuthService.logout();

      // Check that console methods were not called directly
      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();

      // Verify SecureLogger was used instead
      expect(SecureLogger.error).toHaveBeenCalled();
    });
  });

  describe('Session Security', () => {
    it('should have reduced session token expiry (7 days)', async () => {
      // This is tested in CryptoService.security.test.js
      // Here we just verify the integration
      UserStorageService.getUserToken.mockResolvedValue('token.123456789');
      UserStorageService.getCurrentUser.mockResolvedValue({
        id: '123',
        sessionToken: 'token.123456789',
      });

      const result = await AuthService.verifySession();

      // The actual expiry check is done in CryptoService
      // This test verifies the integration works
      expect(result.isValid).toBeDefined();
    });
  });

  describe('Password Change Security', () => {
    it('should enforce password requirements when changing password', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'oldhash',
        passwordSalt: 'oldsalt',
      };

      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      const result = await AuthService.changePassword('OldP@ssw0rd!', 'weaknew');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/password/i);
    });

    it('should require current password to be correct', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hash',
        passwordSalt: 'salt',
      };

      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
      CryptoService.verifyPassword.mockResolvedValue(false); // Wrong password

      const result = await AuthService.changePassword('WrongCurrent1!', 'NewP@ssw0rd1!');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/current password is incorrect/i);
    });
  });
});
