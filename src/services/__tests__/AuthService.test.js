// ABOUTME: Tests for AuthService authentication functionality

import AuthService from '../AuthService';
import CryptoService from '../CryptoService';
import UserStorageService from '../UserStorageService';
import { createUser, updateUser } from '../../utils/UserModel';
import { USER_ROLE } from '../../constants/UserConstants';

// Mock dependencies
jest.mock('../CryptoService');
jest.mock('../UserStorageService');
jest.mock('../../utils/UserModel', () => ({
  ...jest.requireActual('../../utils/UserModel'),
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    CryptoService.generateSalt.mockResolvedValue('mocksalt');
    CryptoService.hashPassword.mockResolvedValue('mockhash');
    CryptoService.generateSessionToken.mockResolvedValue('mocktoken.1234567890');
    CryptoService.verifyPassword.mockResolvedValue(true);
    CryptoService.isTokenExpired.mockReturnValue(false);
    CryptoService.parseSessionToken.mockReturnValue({
      token: 'mocktoken',
      timestamp: 1234567890,
      isValid: true,
    });

    UserStorageService.getUserByEmail.mockResolvedValue(null);
    UserStorageService.saveUser.mockResolvedValue(true);
    UserStorageService.updateUser.mockResolvedValue(true);
    UserStorageService.setCurrentUser.mockResolvedValue(true);
    UserStorageService.saveUserToken.mockResolvedValue(true);
    UserStorageService.getCurrentUser.mockResolvedValue(null);
    UserStorageService.getUserToken.mockResolvedValue(null);
    UserStorageService.logout.mockResolvedValue(true);

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
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = AuthService.validatePassword('Test123!@#');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short passwords', () => {
      const result = AuthService.validatePassword('Test1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letter', () => {
      const result = AuthService.validatePassword('test123!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = AuthService.validatePassword('TEST123!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = AuthService.validatePassword('TestTest!@#');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = AuthService.validatePassword('TestTest123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject empty password', () => {
      const result = AuthService.validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const result = await AuthService.signUp(
        'test@example.com',
        'Test123!@#',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocktoken.1234567890');

      expect(CryptoService.generateSalt).toHaveBeenCalled();
      expect(CryptoService.hashPassword).toHaveBeenCalledWith('Test123!@#', 'mocksalt');
      expect(UserStorageService.saveUser).toHaveBeenCalled();
      expect(UserStorageService.setCurrentUser).toHaveBeenCalled();
      expect(UserStorageService.saveUserToken).toHaveBeenCalledWith('mocktoken.1234567890');
    });

    it('should reject invalid email', async () => {
      const result = await AuthService.signUp(
        'invalid-email',
        'Test123!@#',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should reject existing user', async () => {
      UserStorageService.getUserByEmail.mockResolvedValue({ id: 'existing_user' });

      const result = await AuthService.signUp(
        'existing@example.com',
        'Test123!@#',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account already exists with this email');
    });

    it('should reject weak password', async () => {
      const result = await AuthService.signUp(
        'test@example.com',
        'weak',
        'Test User',
        USER_ROLE.ADHD_USER,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least');
    });

    it('should sanitize user data in response', async () => {
      const result = await AuthService.signUp(
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
      UserStorageService.getUserByEmail.mockResolvedValue(mockUser);
    });

    it('should successfully login with correct credentials', async () => {
      const result = await AuthService.login('test@example.com', 'Test123!@#');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('mocktoken.1234567890');

      expect(CryptoService.verifyPassword).toHaveBeenCalledWith(
        'Test123!@#',
        'existinghash',
        'existingsalt',
      );
      expect(UserStorageService.updateUser).toHaveBeenCalled();
      expect(UserStorageService.setCurrentUser).toHaveBeenCalled();
      expect(UserStorageService.saveUserToken).toHaveBeenCalledWith('mocktoken.1234567890');
    });

    it('should reject missing credentials', async () => {
      const result = await AuthService.login('', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should reject non-existent user', async () => {
      UserStorageService.getUserByEmail.mockResolvedValue(null);

      const result = await AuthService.login('nonexistent@example.com', 'Test123!@#');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should reject incorrect password', async () => {
      CryptoService.verifyPassword.mockResolvedValue(false);

      const result = await AuthService.login('test@example.com', 'WrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should handle users without password (migration needed)', async () => {
      UserStorageService.getUserByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
        passwordSalt: null,
      });

      const result = await AuthService.login('test@example.com', 'Test123!@#');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('verifySession', () => {
    it('should verify valid session', async () => {
      const mockUser = {
        id: 'user_123',
        sessionToken: 'mocktoken.1234567890',
      };

      UserStorageService.getUserToken.mockResolvedValue('mocktoken.1234567890');
      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      const result = await AuthService.verifySession();

      expect(result.isValid).toBe(true);
      expect(result.user).toBeDefined();
      expect(UserStorageService.updateUser).toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      UserStorageService.getUserToken.mockResolvedValue(null);

      const result = await AuthService.verifySession();

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No session token');
    });

    it('should reject expired token', async () => {
      UserStorageService.getUserToken.mockResolvedValue('expiredtoken');
      CryptoService.isTokenExpired.mockReturnValue(true);

      const result = await AuthService.verifySession();

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session expired');
      expect(UserStorageService.logout).toHaveBeenCalled();
    });

    it('should reject mismatched token', async () => {
      UserStorageService.getUserToken.mockResolvedValue('token1');
      UserStorageService.getCurrentUser.mockResolvedValue({
        id: 'user_123',
        sessionToken: 'token2',
      });

      const result = await AuthService.verifySession();

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid session');
      expect(UserStorageService.logout).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const mockUser = {
        id: 'user_123',
        sessionToken: 'mocktoken',
      };

      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);

      const result = await AuthService.logout();

      expect(result.success).toBe(true);
      expect(updateUser).toHaveBeenCalledWith(mockUser, { sessionToken: null });
      expect(UserStorageService.updateUser).toHaveBeenCalled();
      expect(UserStorageService.logout).toHaveBeenCalled();
    });

    it('should handle logout when no user', async () => {
      UserStorageService.getCurrentUser.mockResolvedValue(null);

      const result = await AuthService.logout();

      expect(result.success).toBe(true);
      expect(UserStorageService.logout).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 'user_123',
      passwordHash: 'oldhash',
      passwordSalt: 'oldsalt',
    };

    beforeEach(() => {
      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
    });

    it('should successfully change password', async () => {
      const result = await AuthService.changePassword('OldPass123!', 'NewPass456!');

      expect(result.success).toBe(true);
      expect(CryptoService.verifyPassword).toHaveBeenCalledWith(
        'OldPass123!',
        'oldhash',
        'oldsalt',
      );
      expect(CryptoService.generateSalt).toHaveBeenCalled();
      expect(CryptoService.hashPassword).toHaveBeenCalledWith('NewPass456!', 'mocksalt');
      expect(UserStorageService.updateUser).toHaveBeenCalled();
    });

    it('should reject incorrect current password', async () => {
      CryptoService.verifyPassword.mockResolvedValue(false);

      const result = await AuthService.changePassword('WrongPass123!', 'NewPass456!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      const result = await AuthService.changePassword('OldPass123!', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least');
    });

    it('should reject when no user logged in', async () => {
      UserStorageService.getCurrentUser.mockResolvedValue(null);

      const result = await AuthService.changePassword('OldPass123!', 'NewPass456!');

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

      UserStorageService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await AuthService.resetPassword('test@example.com', 'NewPass123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password has been reset');
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
      UserStorageService.getUserByEmail.mockResolvedValue(null);

      const result = await AuthService.resetPassword('nonexistent@example.com', 'NewPass123!');

      expect(result.success).toBe(true);
      expect(result.message).toBe('If an account exists, the password has been reset');
      expect(UserStorageService.updateUser).not.toHaveBeenCalled();
    });

    it('should reject weak password', async () => {
      const result = await AuthService.resetPassword('test@example.com', 'weak');

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

      const sanitized = AuthService.sanitizeUser(user);

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
