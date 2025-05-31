// ABOUTME: Tests for CryptoService password hashing and token generation

import CryptoService from '../CryptoService';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  pbkdf2Async: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

const mockCrypto = require('expo-crypto');

describe('CryptoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSalt', () => {
    it('should generate a 32-character hex salt', async () => {
      const mockBytes = new Uint8Array(16).fill(255);
      mockCrypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      const salt = await CryptoService.generateSalt();

      expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(16);
      expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(salt).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password with salt', async () => {
      const password = 'testPassword123!';
      const salt = '1234567890abcdef1234567890abcdef';
      const mockHash = new Uint8Array(32).fill(170); // 0xAA
      mockCrypto.pbkdf2Async.mockResolvedValue(mockHash);

      const hash = await CryptoService.hashPassword(password, salt);

      expect(mockCrypto.pbkdf2Async).toHaveBeenCalledWith(
        'SHA-256',
        expect.any(Uint8Array),
        expect.any(Uint8Array),
        100000,
        32,
      );
      expect(hash).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should throw error for empty password', async () => {
      await expect(CryptoService.hashPassword('', 'salt')).rejects.toThrow(
        'Password must be a non-empty string',
      );
    });

    it('should throw error for empty salt', async () => {
      await expect(CryptoService.hashPassword('password', '')).rejects.toThrow(
        'Salt must be a non-empty string',
      );
    });

    it('should produce different hashes for different passwords', async () => {
      const salt = '1234567890abcdef1234567890abcdef';

      // Mock different outputs for different inputs
      let callCount = 0;
      mockCrypto.pbkdf2Async.mockImplementation(() => {
        callCount++;
        return Promise.resolve(new Uint8Array(32).fill(callCount));
      });

      const hash1 = await CryptoService.hashPassword('password1', salt);
      const hash2 = await CryptoService.hashPassword('password2', salt);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for same password with different salts', async () => {
      const password = 'testPassword';

      // Mock different outputs for different salts
      let callCount = 0;
      mockCrypto.pbkdf2Async.mockImplementation(() => {
        callCount++;
        return Promise.resolve(new Uint8Array(32).fill(callCount));
      });

      const hash1 = await CryptoService.hashPassword(password, 'salt1');
      const hash2 = await CryptoService.hashPassword(password, 'salt2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correctPassword';
      const salt = '1234567890abcdef1234567890abcdef';
      const mockHash = new Uint8Array(32).fill(255);

      // Return same hash for same password/salt combination
      mockCrypto.pbkdf2Async.mockResolvedValue(mockHash);

      const hash = await CryptoService.hashPassword(password, salt);
      const isValid = await CryptoService.verifyPassword(password, hash, salt);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const salt = '1234567890abcdef1234567890abcdef';

      // Mock different hashes for different passwords
      let callCount = 0;
      mockCrypto.pbkdf2Async.mockImplementation(() => {
        callCount++;
        return Promise.resolve(new Uint8Array(32).fill(callCount));
      });

      const hash = await CryptoService.hashPassword('correctPassword', salt);
      const isValid = await CryptoService.verifyPassword('wrongPassword', hash, salt);

      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a token of default length', async () => {
      const mockBytes = new Uint8Array(32).fill(255);
      mockCrypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      const token = await CryptoService.generateToken();

      expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate a token of custom length', async () => {
      const customLength = 16;
      const mockBytes = new Uint8Array(customLength).fill(255);
      mockCrypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      const token = await CryptoService.generateToken(customLength);

      expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(customLength);
      expect(token).toHaveLength(customLength * 2);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate a session token with timestamp', async () => {
      const mockBytes = new Uint8Array(32).fill(255);
      mockCrypto.getRandomBytesAsync.mockResolvedValue(mockBytes);

      const beforeTime = Date.now();
      const token = await CryptoService.generateSessionToken();
      const afterTime = Date.now();

      expect(token).toMatch(/^[0-9a-f]{64}\.\d+$/);

      const [tokenPart, timestampStr] = token.split('.');
      const timestamp = parseInt(timestampStr, 10);

      expect(tokenPart).toHaveLength(64);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('parseSessionToken', () => {
    it('should parse valid session token', () => {
      const token = 'abcd1234'.repeat(8) + '.1234567890';
      const parsed = CryptoService.parseSessionToken(token);

      expect(parsed).toEqual({
        token: 'abcd1234'.repeat(8),
        timestamp: 1234567890,
        isValid: true,
      });
    });

    it('should return null for invalid token format', () => {
      expect(CryptoService.parseSessionToken('invalid')).toBeNull();
      expect(CryptoService.parseSessionToken('no.timestamp.here')).toBeNull();
      expect(CryptoService.parseSessionToken('token.notanumber')).toBeNull();
      expect(CryptoService.parseSessionToken('')).toBeNull();
      expect(CryptoService.parseSessionToken(null)).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const now = Date.now();
      const token = `abcd1234.${now}`;

      expect(CryptoService.isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      const token = `abcd1234.${oldTimestamp}`;

      expect(CryptoService.isTokenExpired(token)).toBe(true);
    });

    it('should respect custom max age', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const token = `abcd1234.${oneHourAgo}`;

      // Should not be expired with 2 hour max age
      expect(CryptoService.isTokenExpired(token, 2 * 60 * 60 * 1000)).toBe(false);

      // Should be expired with 30 minute max age
      expect(CryptoService.isTokenExpired(token, 30 * 60 * 1000)).toBe(true);
    });

    it('should return true for invalid token', () => {
      expect(CryptoService.isTokenExpired('invalid')).toBe(true);
      expect(CryptoService.isTokenExpired(null)).toBe(true);
      expect(CryptoService.isTokenExpired('')).toBe(true);
    });
  });

  describe('hashData', () => {
    it('should hash data using SHA256', async () => {
      const data = 'sensitive data';
      const mockHash = 'abcd1234567890';
      mockCrypto.digestStringAsync.mockResolvedValue(mockHash);

      const hash = await CryptoService.hashData(data);

      expect(mockCrypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', data, {
        encoding: 'hex',
      });
      expect(hash).toBe(mockHash);
    });

    it('should throw error for empty data', async () => {
      await expect(CryptoService.hashData('')).rejects.toThrow('Data must be a non-empty string');
    });
  });

  describe('bytesToHex and hexToBytes', () => {
    it('should convert bytes to hex and back', () => {
      const bytes = new Uint8Array([0, 15, 16, 255, 128, 64]);
      const hex = CryptoService.bytesToHex(bytes);

      expect(hex).toBe('000f10ff8040');

      const convertedBack = CryptoService.hexToBytes(hex);
      expect(Array.from(convertedBack)).toEqual(Array.from(bytes));
    });
  });
});
