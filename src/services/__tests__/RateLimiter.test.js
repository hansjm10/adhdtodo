// ABOUTME: Tests for RateLimiter service ensuring proper rate limiting for authentication

import RateLimiter from '../RateLimiter';

// Mock Date.now() for consistent testing
const mockNow = jest.spyOn(Date, 'now');

describe('RateLimiter', () => {
  beforeEach(() => {
    // Reset rate limiter state before each test
    RateLimiter.reset();
    // Set initial time
    mockNow.mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Login Attempts', () => {
    it('should allow initial login attempts', () => {
      const identifier = 'user@example.com';

      expect(RateLimiter.canAttemptLogin(identifier)).toBe(true);
      RateLimiter.recordLoginAttempt(identifier, false);

      expect(RateLimiter.canAttemptLogin(identifier)).toBe(true);
    });

    it('should block after 5 failed attempts', () => {
      const identifier = 'user@example.com';

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        expect(RateLimiter.canAttemptLogin(identifier)).toBe(true);
        RateLimiter.recordLoginAttempt(identifier, false);
      }

      // 6th attempt should be blocked
      expect(RateLimiter.canAttemptLogin(identifier)).toBe(false);
    });

    it('should reset attempts on successful login', () => {
      const identifier = 'user@example.com';

      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        RateLimiter.recordLoginAttempt(identifier, false);
      }

      // Successful login should reset
      RateLimiter.recordLoginAttempt(identifier, true);

      // Should allow more attempts
      expect(RateLimiter.canAttemptLogin(identifier)).toBe(true);
    });

    it('should release lockout after 15 minutes', () => {
      const identifier = 'user@example.com';

      // Lock the account
      for (let i = 0; i < 5; i++) {
        RateLimiter.recordLoginAttempt(identifier, false);
      }

      expect(RateLimiter.canAttemptLogin(identifier)).toBe(false);

      // Move time forward 14 minutes - still locked
      mockNow.mockReturnValue(1000000 + 14 * 60 * 1000);
      expect(RateLimiter.canAttemptLogin(identifier)).toBe(false);

      // Move time forward to 15 minutes - should be unlocked
      mockNow.mockReturnValue(1000000 + 15 * 60 * 1000 + 1);
      expect(RateLimiter.canAttemptLogin(identifier)).toBe(true);
    });

    it('should track attempts per identifier independently', () => {
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';

      // Lock user1
      for (let i = 0; i < 5; i++) {
        RateLimiter.recordLoginAttempt(user1, false);
      }

      expect(RateLimiter.canAttemptLogin(user1)).toBe(false);
      expect(RateLimiter.canAttemptLogin(user2)).toBe(true);
    });

    it('should provide remaining attempts count', () => {
      const identifier = 'user@example.com';

      expect(RateLimiter.getRemainingAttempts(identifier)).toBe(5);

      RateLimiter.recordLoginAttempt(identifier, false);
      expect(RateLimiter.getRemainingAttempts(identifier)).toBe(4);

      // Lock the account
      for (let i = 0; i < 4; i++) {
        RateLimiter.recordLoginAttempt(identifier, false);
      }

      expect(RateLimiter.getRemainingAttempts(identifier)).toBe(0);
    });

    it('should provide lockout end time when locked', () => {
      const identifier = 'user@example.com';

      expect(RateLimiter.getLockoutEndTime(identifier)).toBeNull();

      // Lock the account
      for (let i = 0; i < 5; i++) {
        RateLimiter.recordLoginAttempt(identifier, false);
      }

      const lockoutEnd = RateLimiter.getLockoutEndTime(identifier);
      expect(lockoutEnd).toBe(1000000 + 15 * 60 * 1000);
    });
  });

  describe('IP-based Rate Limiting', () => {
    it('should track attempts by IP address', () => {
      const ipAddress = '192.168.1.1';

      // Should allow up to 10 attempts from same IP in 5 minutes
      for (let i = 0; i < 10; i++) {
        expect(RateLimiter.canAttemptFromIP(ipAddress)).toBe(true);
        RateLimiter.recordIPAttempt(ipAddress);
      }

      // 11th attempt should be blocked
      expect(RateLimiter.canAttemptFromIP(ipAddress)).toBe(false);
    });

    it('should reset IP attempts after 5 minutes', () => {
      const ipAddress = '192.168.1.1';

      // Max out attempts
      for (let i = 0; i < 10; i++) {
        RateLimiter.recordIPAttempt(ipAddress);
      }

      expect(RateLimiter.canAttemptFromIP(ipAddress)).toBe(false);

      // Move time forward 5 minutes
      mockNow.mockReturnValue(1000000 + 5 * 60 * 1000 + 1);
      expect(RateLimiter.canAttemptFromIP(ipAddress)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old entries', () => {
      // Create some old entries
      RateLimiter.recordLoginAttempt('old@example.com', false);
      RateLimiter.recordIPAttempt('1.1.1.1');

      // Move time forward 1 hour
      mockNow.mockReturnValue(1000000 + 60 * 60 * 1000);

      // Create new entries
      RateLimiter.recordLoginAttempt('new@example.com', false);

      // Cleanup should remove old entries
      RateLimiter.cleanup();

      // Old entries should behave as if they never existed
      expect(RateLimiter.getRemainingAttempts('old@example.com')).toBe(5);
      expect(RateLimiter.canAttemptFromIP('1.1.1.1')).toBe(true);

      // New entries should still exist
      expect(RateLimiter.getRemainingAttempts('new@example.com')).toBe(4);
    });
  });

  describe('Reset Functionality', () => {
    it('should clear all rate limiting data on reset', () => {
      // Create some data
      RateLimiter.recordLoginAttempt('user@example.com', false);
      RateLimiter.recordIPAttempt('1.1.1.1');

      // Reset
      RateLimiter.reset();

      // Everything should be cleared
      expect(RateLimiter.getRemainingAttempts('user@example.com')).toBe(5);
      expect(RateLimiter.canAttemptFromIP('1.1.1.1')).toBe(true);
    });
  });
});
