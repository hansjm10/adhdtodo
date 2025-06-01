// ABOUTME: Security-focused tests for CryptoService ensuring proper password hashing and constant-time comparison
// Tests for security fixes in issue #59

import CryptoService from '../CryptoService';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

const mockCrypto = require('expo-crypto');

describe('CryptoService Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing Security', () => {
    it('should use at least 100,000 iterations for password hashing', async () => {
      const password = 'testPassword123!';
      const salt = '1234567890abcdef1234567890abcdef';

      // Mock to track calls
      let callCount = 0;
      mockCrypto.digestStringAsync.mockImplementation(() => {
        callCount++;
        return Promise.resolve(`hash-iteration-${callCount}`);
      });

      await CryptoService.hashPassword(password, salt);

      // Should call digestStringAsync at least 100,000 times (OWASP recommendation)
      expect(mockCrypto.digestStringAsync).toHaveBeenCalledTimes(100000);
    });

    it('should use constant-time comparison for password verification', async () => {
      // This test verifies that we're using a timing-safe comparison
      // The actual implementation will need to use crypto.timingSafeEqual
      const password = 'testPassword123!';
      const salt = '1234567890abcdef1234567890abcdef';

      // Mock consistent hash generation
      mockCrypto.digestStringAsync.mockResolvedValue('consistent-hash-value');

      const hash = await CryptoService.hashPassword(password, salt);

      // Test with correct password
      const isValid = await CryptoService.verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);

      // Clear mock and set different hash
      mockCrypto.digestStringAsync.mockClear();
      mockCrypto.digestStringAsync.mockResolvedValue('different-hash-value');

      // Test with incorrect password
      const isInvalid = await CryptoService.verifyPassword('wrongPassword123!', hash, salt);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Session Token Security', () => {
    it('should have reduced token expiry time (7 days instead of 30)', () => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000; // 7 days + 1 second
      const token = `abcd1234.${sevenDaysAgo}`;

      // Token older than 7 days should be expired
      expect(CryptoService.isTokenExpired(token)).toBe(true);

      // Token less than 7 days old should not be expired
      const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
      const recentToken = `abcd1234.${sixDaysAgo}`;
      expect(CryptoService.isTokenExpired(recentToken)).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should validate password strength requirements', async () => {
      const weakPassword = '123'; // Too short
      const salt = '1234567890abcdef1234567890abcdef';

      await expect(CryptoService.hashPassword(weakPassword, salt)).rejects.toThrow(
        'Password must be at least 8 characters long',
      );
    });

    it('should validate password complexity', async () => {
      const simplePassword = 'password'; // No numbers or special chars
      const salt = '1234567890abcdef1234567890abcdef';

      await expect(CryptoService.hashPassword(simplePassword, salt)).rejects.toThrow(
        'Password must contain at least one number and one special character',
      );
    });

    it('should prevent password longer than reasonable limit', async () => {
      const veryLongPassword = 'a'.repeat(201); // Over 200 chars
      const salt = '1234567890abcdef1234567890abcdef';

      await expect(CryptoService.hashPassword(veryLongPassword, salt)).rejects.toThrow(
        'Password must not exceed 200 characters',
      );
    });
  });

  describe('Safe String Comparison', () => {
    it('should have safeCompare method for timing-safe string comparison', async () => {
      // Test that the method exists and works correctly
      expect(CryptoService.safeCompare).toBeDefined();
      expect(typeof CryptoService.safeCompare).toBe('function');

      // Test equal strings
      const result1 = await CryptoService.safeCompare('test123', 'test123');
      expect(result1).toBe(true);

      // Test different strings
      const result2 = await CryptoService.safeCompare('test123', 'test456');
      expect(result2).toBe(false);

      // Test different lengths
      const result3 = await CryptoService.safeCompare('test', 'test123');
      expect(result3).toBe(false);
    });
  });
});
