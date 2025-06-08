// ABOUTME: Service for handling authentication including login, signup, and session management
// Provides secure password-based authentication with session tokens

import { BaseService } from './BaseService';
import type { ICryptoService } from './CryptoService';
import CryptoService from './CryptoService';
import type { IUserStorageService } from './UserStorageService';
import UserStorageService from './UserStorageService';
import SecureLogger from './SecureLogger';
import type { IRateLimiter } from './RateLimiter';
import RateLimiter from './RateLimiter';
import ValidationService from './ValidationService';
import { createUser, validateUser, updateUser } from '../utils/UserModel';
import type { User, UserRole, SecureToken } from '../types/user.types';
import type {
  AuthResult,
  AuthUser,
  PasswordValidationResult,
  SessionVerificationResult,
  PasswordResetResult,
} from '../types/auth.types';
import * as SecureStore from 'expo-secure-store';

export interface IAuthService {
  validatePassword(password: string): PasswordValidationResult;
  signUp(email: string, password: string, name: string, role: UserRole): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  verifySession(): Promise<SessionVerificationResult>;
  logout(): Promise<{ success: boolean; error?: string }>;
  changePassword(currentPassword: string, newPassword: string): Promise<AuthResult>;
  resetPassword(email: string, newPassword: string): Promise<PasswordResetResult>;
  sanitizeUser(user: User): AuthUser;
  // Secure token methods
  createSecureToken(userId: string): Promise<SecureToken>;
  validateSecureToken(secureToken: SecureToken, providedToken: string): Promise<boolean>;
  storeSecureToken(userId: string, secureToken: SecureToken): Promise<void>;
  getSecureToken(userId: string): Promise<SecureToken | null>;
  rotateToken(userId: string): Promise<string>;
  getOrCreateDeviceKey(): Promise<string>;
  getDeviceId(): Promise<string>;
  getInstallationId(): Promise<string>;
  invalidateOtherSessions(userId: string): Promise<void>;
  detectAnomalousUsage(secureToken: SecureToken): boolean;
}

class AuthService extends BaseService implements IAuthService {
  // Password validation rules
  static readonly PASSWORD_MIN_LENGTH = 8;
  static readonly PASSWORD_REQUIRE_UPPERCASE = true;
  static readonly PASSWORD_REQUIRE_LOWERCASE = true;
  static readonly PASSWORD_REQUIRE_NUMBER = true;
  static readonly PASSWORD_REQUIRE_SPECIAL = true;

  private cryptoService: ICryptoService;
  private userStorageService: IUserStorageService;
  private rateLimiter: IRateLimiter;

  constructor(
    cryptoService: ICryptoService = CryptoService,
    userStorageService: IUserStorageService = UserStorageService,
    rateLimiter: IRateLimiter = RateLimiter,
  ) {
    super('AuthService');
    this.cryptoService = cryptoService;
    this.userStorageService = userStorageService;
    this.rateLimiter = rateLimiter;
  }

  // Validate password strength
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      return {
        isValid: false,
        errors: ['Password is required'],
      };
    }

    if (password.length < AuthService.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${AuthService.PASSWORD_MIN_LENGTH} characters long`);
    }

    if (AuthService.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (AuthService.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (AuthService.PASSWORD_REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (AuthService.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Sign up a new user
  async signUp(email: string, password: string, name: string, role: UserRole): Promise<AuthResult> {
    const result = await this.wrapAsync(
      'signUp',
      async () => {
        // Validate email format
        if (!ValidationService.validateEmail(email)) {
          throw new Error('Invalid email address');
        }

        // Check if user already exists
        const existingUser = await this.userStorageService.getUserByEmail(email);
        if (existingUser) {
          throw new Error('An account already exists with this email');
        }

        // Validate password
        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.errors.join('. '));
        }

        // Generate salt and hash password
        const salt = await this.cryptoService.generateSalt();
        const passwordHash = await this.cryptoService.hashPassword(password, salt);

        // Create new user without session token
        const newUser = createUser({
          email: email.toLowerCase(),
          name,
          role,
          passwordHash,
          passwordSalt: salt,
          sessionToken: null, // Don't store plain token in user
          lastLoginAt: new Date(),
        });

        // Validate user data
        const validation = validateUser(newUser);
        if (!validation.isValid) {
          throw new Error(validation.errors.join('. '));
        }

        // Save user first
        await this.userStorageService.saveUser(newUser);
        await this.userStorageService.setCurrentUser(newUser);

        // Create secure token for the new user
        const secureToken = await this.createSecureToken(newUser.id);
        await this.storeSecureToken(newUser.id, secureToken);

        // Generate reference token for API
        const referenceToken = await this.cryptoService.generateToken(32);
        await this.userStorageService.saveUserToken(referenceToken);

        return {
          user: this.sanitizeUser(newUser),
          token: referenceToken, // Return reference token for API
        };
      },
      { email: email.toLowerCase(), role },
    );

    if (result.success && result.data) {
      return {
        success: true,
        user: result.data.user,
        token: result.data.token,
      };
    }

    return {
      success: false,
      error: result.error?.message ?? 'Unknown error occurred',
    };
  }

  // Login an existing user
  async login(email: string, password: string): Promise<AuthResult> {
    const result = await this.wrapAsync(
      'login',
      async () => {
        // Validate inputs
        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        // Check rate limiting
        if (!this.rateLimiter.canAttemptLogin(email)) {
          const lockoutEnd = this.rateLimiter.getLockoutEndTime(email);
          const minutesRemaining = lockoutEnd ? Math.ceil((lockoutEnd - Date.now()) / 60000) : 15;
          throw new Error(
            `Too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
          );
        }

        // Find user by email
        const user = await this.userStorageService.getUserByEmail(email);
        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Verify user has password credentials
        if (!user.passwordHash || !user.passwordSalt) {
          throw new Error('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await this.cryptoService.verifyPassword(
          password,
          user.passwordHash,
          user.passwordSalt,
        );

        if (!isPasswordValid) {
          this.rateLimiter.recordLoginAttempt(email, false);
          throw new Error('Invalid email or password');
        }

        // Create secure token instead of plain token
        const secureToken = await this.createSecureToken(user.id);

        // Store secure token separately
        await this.storeSecureToken(user.id, secureToken);

        // Update user with timestamp only (no plain token)
        const updatedUser = updateUser(user, {
          sessionToken: null, // Don't store plain token in user object
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
        });

        // Save updated user and set as current
        await this.userStorageService.updateUser(updatedUser);
        await this.userStorageService.setCurrentUser(updatedUser);

        // Store a reference token for backward compatibility
        const referenceToken = await this.cryptoService.generateToken(32);
        await this.userStorageService.saveUserToken(referenceToken);

        // Record successful login
        this.rateLimiter.recordLoginAttempt(email, true);

        return {
          user: this.sanitizeUser(updatedUser),
          token: referenceToken, // Return reference token for API calls
        };
      },
      { email: email.toLowerCase() },
    );

    if (result.success && result.data) {
      return {
        success: true,
        user: result.data.user,
        token: result.data.token,
      };
    }

    return {
      success: false,
      error: result.error?.message ?? 'Unknown error occurred',
    };
  }

  // Verify current session
  async verifySession(): Promise<SessionVerificationResult> {
    const result = await this.wrapAsync('verifySession', async () => {
      const referenceToken = await this.userStorageService.getUserToken();
      if (!referenceToken) {
        return { isValid: false, reason: 'No session token' };
      }

      const currentUser = await this.userStorageService.getCurrentUser();
      if (!currentUser) {
        return { isValid: false, reason: 'No user session' };
      }

      // Get secure token
      const secureToken = await this.getSecureToken(currentUser.id);
      if (!secureToken) {
        await this.logout();
        return { isValid: false, reason: 'No secure token found' };
      }

      // Validate secure token with device binding
      const isValid = await this.validateSecureToken(secureToken, referenceToken);

      if (!isValid) {
        await this.logout();
        const currentDeviceId = await this.getDeviceId();
        if (secureToken.deviceId !== currentDeviceId) {
          return { isValid: false, reason: 'Token used from different device' };
        }
        return { isValid: false, reason: 'Invalid or expired token' };
      }

      // Check for anomalous usage
      if (this.detectAnomalousUsage(secureToken)) {
        SecureLogger.warn('Anomalous token usage detected', {
          code: 'AUTH_ANOMALY_002',
        });
      }

      // Update last active time
      const updatedUser = updateUser(currentUser, {
        lastActiveAt: new Date(),
      });
      await this.userStorageService.updateUser(updatedUser);

      // Update token last used time
      secureToken.lastUsedAt = new Date();
      await this.storeSecureToken(currentUser.id, secureToken);

      return {
        isValid: true,
        user: this.sanitizeUser(updatedUser),
      };
    });

    if (result.success && result.data) {
      return result.data;
    }

    if (result.error) {
      this.logError('verifySession', result.error);
    }
    return { isValid: false, reason: 'Verification error' };
  }

  // Logout current user
  async logout(): Promise<{ success: boolean; error?: string }> {
    const result = await this.wrapAsync('logout', async () => {
      const currentUser = await this.userStorageService.getCurrentUser();

      if (currentUser) {
        // Clear session token from user
        const updatedUser = updateUser(currentUser, {
          sessionToken: null,
        });
        await this.userStorageService.updateUser(updatedUser);
      }

      // Clear stored session
      await this.userStorageService.logout();

      return true;
    });

    if (result.success) {
      return { success: true };
    }
    return {
      success: false,
      error: result.error?.message ?? 'Unknown error occurred',
    };
  }

  // Change password for current user
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    const result = await this.wrapAsync(
      'changePassword',
      async () => {
        const currentUser = await this.userStorageService.getCurrentUser();
        if (!currentUser) {
          throw new Error('No user logged in');
        }

        // Verify current password
        const isPasswordValid = await this.cryptoService.verifyPassword(
          currentPassword,
          currentUser.passwordHash!,
          currentUser.passwordSalt!,
        );

        if (!isPasswordValid) {
          throw new Error('Current password is incorrect');
        }

        // Validate new password
        const passwordValidation = this.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.errors.join('. '));
        }

        // Generate new salt and hash
        const salt = await this.cryptoService.generateSalt();
        const passwordHash = await this.cryptoService.hashPassword(newPassword, salt);

        // Generate new session token
        const sessionToken = await this.cryptoService.generateSessionToken();

        // Update user
        const updatedUser = updateUser(currentUser, {
          passwordHash,
          passwordSalt: salt,
          sessionToken,
          updatedAt: new Date(),
        });

        await this.userStorageService.updateUser(updatedUser);
        await this.userStorageService.setCurrentUser(updatedUser);
        await this.userStorageService.saveUserToken(sessionToken);

        return true;
      },
      { userId: (await this.userStorageService.getCurrentUser())?.id },
    );

    if (result.success) {
      return { success: true };
    }
    return {
      success: false,
      error: result.error?.message ?? 'Unknown error occurred',
    };
  }

  // Reset password (for forgot password flow - simplified version)
  async resetPassword(email: string, newPassword: string): Promise<PasswordResetResult> {
    const result = await this.wrapAsync(
      'resetPassword',
      async () => {
        const user = await this.userStorageService.getUserByEmail(email);
        if (!user) {
          // Don't reveal if user exists
          return { message: 'If an account exists, the password has been reset' };
        }

        // Validate new password
        const passwordValidation = this.validatePassword(newPassword);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.errors.join('. '));
        }

        // Generate new salt and hash
        const salt = await this.cryptoService.generateSalt();
        const passwordHash = await this.cryptoService.hashPassword(newPassword, salt);

        // Update user (clear session token to force re-login)
        const updatedUser = updateUser(user, {
          passwordHash,
          passwordSalt: salt,
          sessionToken: null,
          updatedAt: new Date(),
        });

        await this.userStorageService.updateUser(updatedUser);

        return { message: 'If an account exists, the password has been reset' };
      },
      { email: email.toLowerCase() },
    );

    if (result.success && result.data) {
      return {
        success: true,
        message: result.data.message,
      };
    }
    return {
      success: false,
      error: result.error?.message ?? 'Unknown error occurred',
    };
  }

  // Remove sensitive fields from user object
  sanitizeUser(user: User): Omit<User, 'passwordHash' | 'passwordSalt' | 'sessionToken'> {
    const {
      passwordHash: _passwordHash,
      passwordSalt: _passwordSalt,
      sessionToken: _sessionToken,
      ...sanitized
    } = user;
    return sanitized;
  }

  // Secure Token Methods

  // Create a secure token with device binding and encryption
  async createSecureToken(_userId: string): Promise<SecureToken> {
    // Generate cryptographically secure token
    const rawToken = await this.cryptoService.generateSecureBytes(32);
    // Convert Uint8Array to base64 manually
    const tokenString = this.uint8ArrayToBase64(rawToken);

    // Get device-specific information
    const deviceId = await this.getDeviceId();
    const installationId = await this.getInstallationId();

    // Create token fingerprint (hash of token + device info)
    const fingerprint = await this.cryptoService.hash(
      `${tokenString}:${deviceId}:${installationId}`,
    );

    // Encrypt token with device-specific key
    const deviceKey = await this.getOrCreateDeviceKey();
    const encryptedToken = await this.cryptoService.encrypt(tokenString, deviceKey);

    return {
      encryptedToken,
      deviceId,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      fingerprint,
    };
  }

  // Validate a secure token with device binding checks
  async validateSecureToken(secureToken: SecureToken, providedToken: string): Promise<boolean> {
    const result = await this.wrapAsync('validateSecureToken', async () => {
      // Check device binding
      const currentDeviceId = await this.getDeviceId();
      if (secureToken.deviceId !== currentDeviceId) {
        SecureLogger.warn('Token used from different device', {
          code: 'AUTH_TOKEN_001',
        });
        return false;
      }

      // Check token age
      const tokenAge = Date.now() - secureToken.createdAt.getTime();
      const MAX_TOKEN_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (tokenAge > MAX_TOKEN_AGE) {
        return false;
      }

      // Check token inactivity
      const inactiveTime = Date.now() - secureToken.lastUsedAt.getTime();
      const MAX_INACTIVE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (inactiveTime > MAX_INACTIVE_TIME) {
        return false;
      }

      // Decrypt and verify token
      const deviceKey = await this.getOrCreateDeviceKey();
      const decryptedToken = await this.cryptoService.decrypt(
        secureToken.encryptedToken,
        deviceKey,
      );

      return decryptedToken === providedToken;
    });

    if (result.success && result.data !== undefined) {
      return result.data;
    }
    return false;
  }

  // Store token separately from user data
  async storeSecureToken(userId: string, secureToken: SecureToken): Promise<void> {
    const tokenKey = `auth_token_${userId}`;

    // Use SecureStore directly for token storage with authentication
    await SecureStore.setItemAsync(tokenKey, JSON.stringify(secureToken), {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to save session',
    });
  }

  // Retrieve secure token
  async getSecureToken(userId: string): Promise<SecureToken | null> {
    const result = await this.wrapAsync('getSecureToken', async () => {
      const tokenKey = `auth_token_${userId}`;
      const tokenData = await SecureStore.getItemAsync(tokenKey, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access session',
      });

      if (!tokenData) {
        return null;
      }

      const token = JSON.parse(tokenData) as SecureToken;

      // Convert date strings back to Date objects
      token.createdAt = new Date(token.createdAt);
      token.lastUsedAt = new Date(token.lastUsedAt);

      return token;
    });

    if (result.success && result.data !== undefined) {
      return result.data;
    }
    return null;
  }

  // Rotate token and invalidate old sessions
  async rotateToken(userId: string): Promise<string> {
    const newToken = await this.createSecureToken(userId);
    await this.storeSecureToken(userId, newToken);

    // Fire and forget - we don't need to wait for this
    // Start the invalidation process but don't wait for it
    const startInvalidation = async () => {
      try {
        await this.invalidateOtherSessions(userId);
      } catch (err: unknown) {
        this.logError('invalidateOtherSessions', err);
      }
    };

    // Execute without waiting
    void startInvalidation();

    return newToken.encryptedToken;
  }

  // Get or create device-specific encryption key
  async getOrCreateDeviceKey(): Promise<string> {
    const deviceKeyName = 'device_encryption_key';

    const result = await this.wrapAsync('getOrCreateDeviceKey', async () => {
      // Try to get existing device key
      const existingKey = await SecureStore.getItemAsync(deviceKeyName, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access secure storage',
      });

      if (existingKey) {
        return existingKey;
      }

      // Generate new device key
      const keyBytes = await this.cryptoService.generateSecureBytes(32);
      const deviceKey = this.uint8ArrayToBase64(keyBytes);

      // Store device key
      await SecureStore.setItemAsync(deviceKeyName, deviceKey, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access secure storage',
      });

      return deviceKey;
    });

    if (result.success && result.data) {
      return result.data;
    }
    throw new Error('Failed to manage device encryption key');
  }

  // Get unique device identifier
  async getDeviceId(): Promise<string> {
    // In a real implementation, this would use expo-device or similar
    // For now, we'll use a hash of crypto-generated data stored securely
    const deviceIdKey = 'device_unique_id';

    const result = await this.wrapAsync('getDeviceId', async () => {
      let deviceId = await SecureStore.getItemAsync(deviceIdKey);

      if (!deviceId) {
        // Generate new device ID
        const randomBytes = await this.cryptoService.generateSecureBytes(16);
        deviceId = this.uint8ArrayToHex(randomBytes);
        await SecureStore.setItemAsync(deviceIdKey, deviceId);
      }

      return deviceId || 'unknown-device';
    });

    if (result.success && result.data) {
      return result.data;
    }
    return 'unknown-device';
  }

  // Get installation ID
  async getInstallationId(): Promise<string> {
    // Similar to device ID but specific to this app installation
    const installIdKey = 'app_installation_id';

    const result = await this.wrapAsync('getInstallationId', async () => {
      let installationId = await SecureStore.getItemAsync(installIdKey);

      if (!installationId) {
        const randomBytes = await this.cryptoService.generateSecureBytes(16);
        installationId = this.uint8ArrayToHex(randomBytes);
        await SecureStore.setItemAsync(installIdKey, installationId);
      }

      return installationId || 'unknown-installation';
    });

    if (result.success && result.data) {
      return result.data;
    }
    return 'unknown-installation';
  }

  // Invalidate other sessions (placeholder for future implementation)
  // eslint-disable-next-line @typescript-eslint/require-await
  async invalidateOtherSessions(_userId: string): Promise<void> {
    // In a real implementation, this would notify a backend service
    // to invalidate tokens from other devices
    SecureLogger.info('Token rotation initiated', {
      code: 'AUTH_TOKEN_ROTATE_001',
    });
  }

  // Detect anomalous token usage patterns
  detectAnomalousUsage(secureToken: SecureToken): boolean {
    const now = Date.now();
    const timeSinceLastUse = now - secureToken.lastUsedAt.getTime();

    // Flag as anomalous if token is being used too rapidly (less than 1 second)
    if (timeSinceLastUse < 1000) {
      SecureLogger.warn('Suspicious rapid token usage detected', {
        code: 'AUTH_ANOMALY_001',
      });
      return true;
    }

    // Additional anomaly detection logic can be added here
    // - Geographic location changes
    // - Usage pattern analysis
    // - Time-based patterns

    return false;
  }

  // Helper method to convert Uint8Array to base64
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    // Process 3 bytes at a time
    while (i < bytes.length) {
      const a = bytes[i++];
      const b = i < bytes.length ? bytes[i++] : 0;
      const c = i < bytes.length ? bytes[i++] : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < bytes.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < bytes.length ? chars.charAt(bitmap & 63) : '=';
    }

    return result;
  }

  // Helper method to convert Uint8Array to hex string
  private uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

export { AuthService };
export default new AuthService();
