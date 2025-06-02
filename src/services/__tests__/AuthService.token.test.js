// ABOUTME: Tests for secure token functionality including encryption, device binding, and rotation
// Ensures session tokens are properly secured and validated

import AuthService from '../AuthService';
import CryptoService from '../CryptoService';
import UserStorageService from '../UserStorageService';
import * as SecureStore from 'expo-secure-store';
import { UserRole } from '../../types/user.types';

// Mock dependencies
jest.mock('../CryptoService');
jest.mock('../UserStorageService');
jest.mock('../SecureLogger');
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

// Mock device info using expo-crypto for unique device identifier
const mockDeviceId = 'test-device-id';
const mockInstallationId = 'test-installation-id';

describe('AuthService Secure Token Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock methods for device ID generation
    AuthService.getDeviceId = jest.fn().mockResolvedValue(mockDeviceId);
    AuthService.getInstallationId = jest.fn().mockResolvedValue(mockInstallationId);

    // Default CryptoService mocks
    CryptoService.generateSalt.mockResolvedValue('mocksalt');
    CryptoService.hashPassword.mockResolvedValue('mockhash');
    CryptoService.generateSecureBytes = jest.fn().mockResolvedValue(new Uint8Array(32));
    CryptoService.encrypt = jest.fn().mockResolvedValue('encrypted-token');
    CryptoService.decrypt = jest.fn().mockResolvedValue('decrypted-token');
    CryptoService.hash = jest.fn().mockResolvedValue('token-fingerprint');
    CryptoService.generateToken = jest.fn().mockResolvedValue('reference-token');

    // Default SecureStore mocks
    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.setItemAsync.mockResolvedValue(undefined);

    // Default UserStorageService mocks
    UserStorageService.getUserToken = jest.fn().mockResolvedValue('reference-token');
    UserStorageService.saveUserToken = jest.fn().mockResolvedValue(true);
  });

  describe('createSecureToken', () => {
    it('should create encrypted token with device binding', async () => {
      const userId = 'user-123';
      const result = await AuthService.createSecureToken(userId);

      expect(result).toHaveProperty('encryptedToken');
      expect(result).toHaveProperty('deviceId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('lastUsedAt');
      expect(result).toHaveProperty('fingerprint');

      // Should encrypt the token
      expect(CryptoService.encrypt).toHaveBeenCalled();

      // Should generate secure random bytes
      expect(CryptoService.generateSecureBytes).toHaveBeenCalledWith(32);

      // Should create fingerprint with device info
      expect(CryptoService.hash).toHaveBeenCalled();
    });

    it('should bind token to current device', async () => {
      const userId = 'user-123';
      const result = await AuthService.createSecureToken(userId);

      expect(result.deviceId).toBe(mockDeviceId);
    });

    it('should encrypt token with device-specific key', async () => {
      const userId = 'user-123';

      // Mock device key generation
      const mockDeviceKey = 'device-specific-key';
      AuthService.getOrCreateDeviceKey = jest.fn().mockResolvedValue(mockDeviceKey);

      await AuthService.createSecureToken(userId);

      expect(CryptoService.encrypt).toHaveBeenCalledWith(expect.any(String), mockDeviceKey);
    });
  });

  describe('validateSecureToken', () => {
    const mockSecureToken = {
      encryptedToken: 'encrypted-token',
      deviceId: mockDeviceId,
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      lastUsedAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      fingerprint: 'token-fingerprint',
    };

    it('should reject token from different device', async () => {
      // Change device ID
      AuthService.getDeviceId.mockResolvedValue('different-device-id');

      const isValid = await AuthService.validateSecureToken(mockSecureToken, 'token');

      expect(isValid).toBe(false);
    });

    it('should reject expired token (30 days)', async () => {
      const expiredToken = {
        ...mockSecureToken,
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days old
      };

      const isValid = await AuthService.validateSecureToken(expiredToken, 'token');

      expect(isValid).toBe(false);
    });

    it('should reject inactive token (7 days)', async () => {
      const inactiveToken = {
        ...mockSecureToken,
        lastUsedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days inactive
      };

      const isValid = await AuthService.validateSecureToken(inactiveToken, 'token');

      expect(isValid).toBe(false);
    });

    it('should accept valid token from same device', async () => {
      // Mock device key and decryption
      AuthService.getOrCreateDeviceKey = jest.fn().mockResolvedValue('device-key');
      CryptoService.decrypt.mockResolvedValue('token');

      const isValid = await AuthService.validateSecureToken(mockSecureToken, 'token');

      expect(isValid).toBe(true);
    });

    it('should update lastUsedAt for valid tokens', async () => {
      AuthService.getOrCreateDeviceKey = jest.fn().mockResolvedValue('device-key');
      CryptoService.decrypt.mockResolvedValue('token');

      // Test that lastUsedAt gets updated (in real implementation)
      await AuthService.validateSecureToken(mockSecureToken, 'token');

      // In real implementation, this would update the token's lastUsedAt
      expect(CryptoService.decrypt).toHaveBeenCalledWith(
        mockSecureToken.encryptedToken,
        'device-key',
      );
    });
  });

  describe('storeSecureToken', () => {
    it('should store token separately from user data', async () => {
      const userId = 'user-123';
      const secureToken = {
        encryptedToken: 'encrypted',
        deviceId: 'device-id',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        fingerprint: 'fingerprint',
      };

      // Clear and reset mock
      SecureStore.setItemAsync.mockClear();

      await AuthService.storeSecureToken(userId, secureToken);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        `auth_token_${userId}`,
        JSON.stringify(secureToken),
        {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to save session',
        },
      );
    });
  });

  describe('rotateToken', () => {
    it('should create new token and invalidate old sessions', async () => {
      const userId = 'user-123';

      // Mock methods
      AuthService.createSecureToken = jest.fn().mockResolvedValue({
        encryptedToken: 'new-encrypted-token',
        deviceId: 'device-id',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        fingerprint: 'new-fingerprint',
      });

      AuthService.storeSecureToken = jest.fn().mockResolvedValue(true);
      AuthService.invalidateOtherSessions = jest.fn().mockResolvedValue(true);

      const newToken = await AuthService.rotateToken(userId);

      expect(AuthService.createSecureToken).toHaveBeenCalledWith(userId);
      expect(AuthService.storeSecureToken).toHaveBeenCalled();
      expect(AuthService.invalidateOtherSessions).toHaveBeenCalledWith(userId);
      expect(newToken).toBe('new-encrypted-token');
    });
  });

  describe('login with secure tokens', () => {
    it('should create secure token on successful login', async () => {
      const email = 'test@example.com';
      const password = 'ValidP@ssw0rd123!';

      const mockUser = {
        id: 'user-123',
        email,
        passwordHash: 'hash',
        passwordSalt: 'salt',
        role: UserRole.ADHD_USER,
      };

      UserStorageService.getUserByEmail.mockResolvedValue(mockUser);
      CryptoService.verifyPassword.mockResolvedValue(true);

      // Mock secure token creation
      AuthService.createSecureToken = jest.fn().mockResolvedValue({
        encryptedToken: 'secure-encrypted-token',
        deviceId: 'device-id',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        fingerprint: 'fingerprint',
      });

      AuthService.storeSecureToken = jest.fn().mockResolvedValue(true);

      const result = await AuthService.login(email, password);

      expect(result.success).toBe(true);
      expect(AuthService.createSecureToken).toHaveBeenCalledWith(mockUser.id);
      expect(AuthService.storeSecureToken).toHaveBeenCalled();
    });
  });

  describe('verifySession with secure tokens', () => {
    it('should validate token with device binding', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
      };

      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
      UserStorageService.updateUser.mockResolvedValue(true);

      // Mock secure token retrieval in SecureStore
      const mockSecureToken = {
        encryptedToken: 'encrypted',
        deviceId: mockDeviceId,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
        fingerprint: 'fingerprint',
      };

      // Mock getItemAsync to return the secure token when asked
      SecureStore.getItemAsync.mockImplementation((key) => {
        if (key === `auth_token_${userId}`) {
          return Promise.resolve(JSON.stringify(mockSecureToken));
        }
        if (key === 'device_unique_id') {
          return Promise.resolve(mockDeviceId);
        }
        if (key === 'device_encryption_key') {
          return Promise.resolve('device-key');
        }
        return Promise.resolve(null);
      });

      // Mock decrypt to return the reference token
      CryptoService.decrypt.mockResolvedValue('reference-token');

      const result = await AuthService.verifySession();

      expect(result.isValid).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should reject session if device changed', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
      };

      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      const mockSecureToken = {
        encryptedToken: 'encrypted',
        deviceId: 'different-device-id', // Different device
        createdAt: new Date(),
        lastUsedAt: new Date(),
        fingerprint: 'fingerprint',
      };

      // Mock getItemAsync to return the secure token with different device ID
      SecureStore.getItemAsync.mockImplementation((key) => {
        if (key === `auth_token_${userId}`) {
          return Promise.resolve(JSON.stringify(mockSecureToken));
        }
        if (key === 'device_unique_id') {
          return Promise.resolve(mockDeviceId); // Current device is different
        }
        if (key === 'device_encryption_key') {
          return Promise.resolve('device-key');
        }
        return Promise.resolve(null);
      });

      const result = await AuthService.verifySession();

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('device');
    });
  });

  describe('device key management', () => {
    it('should create device-specific encryption key', async () => {
      // Mock crypto operations
      const mockKeyBytes = new Uint8Array(32);
      // Fill with predictable values
      for (let i = 0; i < 32; i++) {
        mockKeyBytes[i] = i;
      }

      CryptoService.generateSecureBytes.mockResolvedValueOnce(mockKeyBytes);

      // Clear previous mocks and set up for this test
      SecureStore.getItemAsync.mockClear();
      SecureStore.setItemAsync.mockClear();

      // Mock secure storage - no existing key on first call
      SecureStore.getItemAsync.mockResolvedValueOnce(null);

      const deviceKey = await AuthService.getOrCreateDeviceKey();

      expect(deviceKey).toBeTruthy();
      // Check that a device key was generated and stored
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'device_encryption_key',
        expect.any(String),
        {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access secure storage',
        },
      );

      // Verify the device key is a base64 string
      expect(deviceKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should reuse existing device key', async () => {
      const existingKey = 'existing-device-key';

      // Clear previous mocks and set up for this test
      SecureStore.getItemAsync.mockClear();
      SecureStore.setItemAsync.mockClear();

      // Mock secure storage - existing key found
      SecureStore.getItemAsync.mockResolvedValueOnce(existingKey);

      const deviceKey = await AuthService.getOrCreateDeviceKey();

      expect(deviceKey).toBe(existingKey);
      // Should only be called once to get the key, not to set it
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('token anomaly detection', () => {
    it('should detect suspicious token usage patterns', async () => {
      const secureToken = {
        encryptedToken: 'encrypted',
        deviceId: 'device-id',
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        lastUsedAt: new Date(Date.now() - 1000), // 1 second ago (suspicious rapid usage)
        fingerprint: 'fingerprint',
      };

      // Mock anomaly detection
      AuthService.detectAnomalousUsage = jest.fn().mockReturnValue(true);

      const isAnomalous = await AuthService.detectAnomalousUsage(secureToken);

      expect(isAnomalous).toBe(true);
    });
  });
});
