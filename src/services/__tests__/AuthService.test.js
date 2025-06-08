// ABOUTME: Tests for AuthService authentication functionality

import { AuthService } from '../AuthService';
// Service imports for type definitions only
import * as SecureStore from 'expo-secure-store';
import { createUser, updateUser } from '../../utils/UserModel';
import { USER_ROLE } from '../../constants/UserConstants';

// Mock dependencies
jest.mock('../CryptoService');
jest.mock('../UserStorageService');
jest.mock('../RateLimiter');
jest.mock('../../utils/UserModel', () => ({
  ...jest.requireActual('../../utils/UserModel'),
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe('AuthService', () => {
  let authService;
  let mockCryptoService;
  let mockUserStorageService;
  let mockRateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock service instances
    mockCryptoService = {
      generateSalt: jest.fn().mockResolvedValue('mocksalt'),
      hashPassword: jest.fn().mockResolvedValue('mockhash'),
      generateSessionToken: jest.fn().mockResolvedValue('mocktoken.1234567890'),
      verifyPassword: jest.fn().mockResolvedValue(true),
      isTokenExpired: jest.fn().mockReturnValue(false),
      parseSessionToken: jest.fn().mockReturnValue({
        token: 'mocktoken',
        timestamp: 1234567890,
        isValid: true,
      }),
      generateToken: jest.fn().mockResolvedValue('reference-token'),
      generateSecureBytes: jest.fn().mockResolvedValue(new Uint8Array(32)),
      encrypt: jest.fn().mockResolvedValue('encrypted-token'),
      decrypt: jest.fn().mockResolvedValue('reference-token'),
      hash: jest.fn().mockResolvedValue('token-fingerprint'),
    };

    mockUserStorageService = {
      getUserByEmail: jest.fn().mockResolvedValue(null),
      saveUser: jest.fn().mockResolvedValue(true),
      updateUser: jest.fn().mockResolvedValue(true),
      setCurrentUser: jest.fn().mockResolvedValue(true),
      saveUserToken: jest.fn().mockResolvedValue(true),
      getCurrentUser: jest.fn().mockResolvedValue(null),
      getUserToken: jest.fn().mockResolvedValue(null),
      logout: jest.fn().mockResolvedValue(true),
    };

    mockRateLimiter = {
      canAttemptLogin: jest.fn().mockReturnValue(true),
      getLockoutEndTime: jest.fn().mockReturnValue(null),
      recordLoginAttempt: jest.fn(),
    };

    // SecureStore mocks
    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.setItemAsync.mockResolvedValue(undefined);

    createUser.mockImplementation((data) => ({
      id: 'user_123',
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash: data.passwordHash,
      passwordSalt: data.passwordSalt,
      sessionToken: data.sessionToken,
      lastLoginAt: data.lastLoginAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    updateUser.mockImplementation((user, updates) => ({
      ...user,
      ...updates,
      updatedAt: new Date(),
    }));

    // Create AuthService instance with mocked dependencies
    authService = new AuthService(mockCryptoService, mockUserStorageService, mockRateLimiter);
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = authService.validatePassword('Test123!@#');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const result = authService.validatePassword('Test1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letter', () => {
      const result = authService.validatePassword('test123!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = authService.validatePassword('TEST123!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = authService.validatePassword('TestTest!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = authService.validatePassword('TestTest123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject empty password', () => {
      const result = authService.validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const result = await authService.signUp(
        'test@example.com',
        'Test123!@#',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('reference-token');

      expect(mockCryptoService.generateSalt).toHaveBeenCalled();
      expect(mockCryptoService.hashPassword).toHaveBeenCalledWith('Test123!@#', 'mocksalt');
      expect(mockUserStorageService.saveUser).toHaveBeenCalled();
      expect(mockUserStorageService.setCurrentUser).toHaveBeenCalled();
      expect(mockUserStorageService.saveUserToken).toHaveBeenCalledWith('reference-token');
    });

    it('should reject invalid email', async () => {
      const result = await authService.signUp(
        'invalid-email',
        'Test123!@#',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should reject existing user', async () => {
      mockUserStorageService.getUserByEmail.mockResolvedValue({ id: 'existing_user' });

      const result = await authService.signUp(
        'existing@example.com',
        'Test123!@#',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account already exists with this email');
    });

    it('should reject weak password', async () => {
      const result = await authService.signUp(
        'test@example.com',
        'weak',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least');
    });

    it('should sanitize user data in response', async () => {
      const result = await authService.signUp(
        'test@example.com',
        'Test123!@#',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(true);
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.user.passwordSalt).toBeUndefined();
      expect(result.user.sessionToken).toBeUndefined();
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'existinghash',
      passwordSalt: 'existingsalt',
      sessionToken: 'oldtoken',
    };

    beforeEach(() => {
      mockUserStorageService.getUserByEmail.mockResolvedValue(mockUser);
    });

    it('should successfully login with correct credentials', async () => {
      const result = await authService.login('test@example.com', 'Test123!@#');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('reference-token');

      expect(mockCryptoService.verifyPassword).toHaveBeenCalledWith(
        'Test123!@#',
        'existinghash',
        'existingsalt',
      );
      expect(mockUserStorageService.updateUser).toHaveBeenCalled();
      expect(mockUserStorageService.setCurrentUser).toHaveBeenCalled();
      expect(mockUserStorageService.saveUserToken).toHaveBeenCalledWith('reference-token');
    });

    it('should reject missing credentials', async () => {
      const result = await authService.login('', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should reject non-existent user', async () => {
      mockUserStorageService.getUserByEmail.mockResolvedValue(null);

      const result = await authService.login('nonexistent@example.com', 'Test123!@#');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should reject incorrect password', async () => {
      mockCryptoService.verifyPassword.mockResolvedValue(false);

      const result = await authService.login('test@example.com', 'WrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should handle users without password (migration needed)', async () => {
      mockUserStorageService.getUserByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
        passwordSalt: null,
      });

      const result = await authService.login('test@example.com', 'Test123!@#');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('verifySession', () => {
    it('should verify valid session', async () => {
      const mockUser = {
        id: 'user_123',
        sessionToken: null, // No longer stored in user
      };

      mockUserStorageService.getUserToken.mockResolvedValue('reference-token');
      mockUserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      // Mock secure token retrieval
      const mockSecureToken = {
        encryptedToken: 'encrypted',
        deviceId: 'device-id',
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 10),
        fingerprint: 'fingerprint',
      };

      SecureStore.getItemAsync.mockImplementation((key) => {
        if (key === `auth_token_${mockUser.id}`) {
          return Promise.resolve(JSON.stringify(mockSecureToken));
        }
        if (key === 'device_unique_id') {
          return Promise.resolve('device-id');
        }
        if (key === 'device_encryption_key') {
          return Promise.resolve('device-key');
        }
        return Promise.resolve(null);
      });

      const result = await authService.verifySession();

      expect(result.isValid).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockUserStorageService.updateUser).toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      mockUserStorageService.getUserToken.mockResolvedValue(null);

      const result = await authService.verifySession();

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No session token');
    });

    it('should reject expired token', async () => {
      const mockUser = {
        id: 'user_123',
        sessionToken: null,
      };

      mockUserStorageService.getUserToken.mockResolvedValue('reference-token');
      mockUserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      // Mock expired secure token
      const expiredToken = {
        encryptedToken: 'encrypted',
        deviceId: 'device-id',
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days old
        lastUsedAt: new Date(),
        fingerprint: 'fingerprint',
      };

      SecureStore.getItemAsync.mockImplementation((key) => {
        if (key === `auth_token_${mockUser.id}`) {
          return Promise.resolve(JSON.stringify(expiredToken));
        }
        if (key === 'device_unique_id') {
          return Promise.resolve('device-id');
        }
        return Promise.resolve(null);
      });

      const result = await authService.verifySession();

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid or expired token');
      expect(mockUserStorageService.logout).toHaveBeenCalled();
    });

    it('should reject mismatched token', async () => {
      const mockUser = {
        id: 'user_123',
        sessionToken: null,
      };

      mockUserStorageService.getUserToken.mockResolvedValue('reference-token');
      mockUserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      // Mock secure token with different device
      const mismatchedToken = {
        encryptedToken: 'encrypted',
        deviceId: 'different-device-id', // Different device
        createdAt: new Date(),
        lastUsedAt: new Date(),
        fingerprint: 'fingerprint',
      };

      SecureStore.getItemAsync.mockImplementation((key) => {
        if (key === `auth_token_${mockUser.id}`) {
          return Promise.resolve(JSON.stringify(mismatchedToken));
        }
        if (key === 'device_unique_id') {
          return Promise.resolve('current-device-id'); // Current device is different
        }
        return Promise.resolve(null);
      });

      const result = await authService.verifySession();

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token used from different device');
      expect(mockUserStorageService.logout).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const mockUser = {
        id: 'user_123',
        sessionToken: 'mocktoken',
      };

      mockUserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      const result = await authService.logout();

      expect(result.success).toBe(true);
      expect(updateUser).toHaveBeenCalledWith(mockUser, { sessionToken: null });
      expect(mockUserStorageService.updateUser).toHaveBeenCalled();
      expect(mockUserStorageService.logout).toHaveBeenCalled();
    });

    it('should handle logout when no user', async () => {
      mockUserStorageService.getCurrentUser.mockResolvedValue(null);

      const result = await authService.logout();

      expect(result.success).toBe(true);
      expect(mockUserStorageService.logout).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 'user_123',
      passwordHash: 'oldhash',
      passwordSalt: 'oldsalt',
    };

    beforeEach(() => {
      mockUserStorageService.getCurrentUser.mockResolvedValue(mockUser);
    });

    it('should successfully change password', async () => {
      const result = await authService.changePassword('OldPass123!', 'NewPass456!');

      expect(result.success).toBe(true);
      expect(mockCryptoService.verifyPassword).toHaveBeenCalledWith(
        'OldPass123!',
        'oldhash',
        'oldsalt',
      );
      expect(mockCryptoService.generateSalt).toHaveBeenCalled();
      expect(mockCryptoService.hashPassword).toHaveBeenCalledWith('NewPass456!', 'mocksalt');
      expect(mockUserStorageService.updateUser).toHaveBeenCalled();
    });

    it('should reject incorrect current password', async () => {
      mockCryptoService.verifyPassword.mockResolvedValue(false);

      const result = await authService.changePassword('WrongPass123!', 'NewPass456!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      const result = await authService.changePassword('OldPass123!', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least');
    });

    it('should reject when no user logged in', async () => {
      mockUserStorageService.getCurrentUser.mockResolvedValue(null);

      const result = await authService.changePassword('OldPass123!', 'NewPass456!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No user logged in');
    });
  });

  describe('resetPassword', () => {
    it('should reset password for existing user', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
      };

      mockUserStorageService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.resetPassword('test@example.com', 'NewPass123!');

      expect(result.success).toBe(true);
      expect(result.message).toBe('If an account exists, the password has been reset');
      expect(updateUser).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          passwordHash: 'mockhash',
          passwordSalt: 'mocksalt',
          sessionToken: null,
        }),
      );
    });

    it('should not reveal if user exists', async () => {
      mockUserStorageService.getUserByEmail.mockResolvedValue(null);

      const result = await authService.resetPassword('nonexistent@example.com', 'NewPass123!');

      expect(result.success).toBe(true);
      expect(result.message).toBe('If an account exists, the password has been reset');
      expect(mockUserStorageService.updateUser).not.toHaveBeenCalled();
    });

    it('should reject weak password', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
      };

      mockUserStorageService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.resetPassword('test@example.com', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least');
    });
  });

  describe('sanitizeUser', () => {
    it('should remove sensitive fields', () => {
      const user = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'secret_hash',
        passwordSalt: 'secret_salt',
        sessionToken: 'secret_token',
        role: USER_ROLE.ADHD_USER,
      };

      const sanitized = authService.sanitizeUser(user);

      expect(sanitized.id).toBe('user_123');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.name).toBe('Test User');
      expect(sanitized.role).toBe(USER_ROLE.ADHD_USER);
      expect(sanitized.passwordHash).toBeUndefined();
      expect(sanitized.passwordSalt).toBeUndefined();
      expect(sanitized.sessionToken).toBeUndefined();
    });
  });
});
