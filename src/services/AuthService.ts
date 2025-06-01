// ABOUTME: Service for handling authentication including login, signup, and session management
// Provides secure password-based authentication with session tokens

import CryptoService, { ICryptoService } from './CryptoService';
import UserStorageService, { IUserStorageService } from './UserStorageService';
import { createUser, validateUser, updateUser } from '../utils/UserModel';
import { User, UserRole } from '../types/user.types';

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

interface AuthResult {
  success: boolean;
  user?: Omit<User, 'passwordHash' | 'passwordSalt' | 'sessionToken'>;
  token?: string;
  error?: string;
}

interface SessionVerificationResult {
  isValid: boolean;
  reason?: string;
  user?: Omit<User, 'passwordHash' | 'passwordSalt' | 'sessionToken'>;
}

interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface IAuthService {
  validatePassword(password: string): PasswordValidationResult;
  signUp(email: string, password: string, name: string, role: UserRole): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  verifySession(): Promise<SessionVerificationResult>;
  logout(): Promise<{ success: boolean; error?: string }>;
  changePassword(currentPassword: string, newPassword: string): Promise<AuthResult>;
  resetPassword(email: string, newPassword: string): Promise<PasswordResetResult>;
  sanitizeUser(user: User): Omit<User, 'passwordHash' | 'passwordSalt' | 'sessionToken'>;
}

class AuthService implements IAuthService {
  // Password validation rules
  static readonly PASSWORD_MIN_LENGTH = 8;
  static readonly PASSWORD_REQUIRE_UPPERCASE = true;
  static readonly PASSWORD_REQUIRE_LOWERCASE = true;
  static readonly PASSWORD_REQUIRE_NUMBER = true;
  static readonly PASSWORD_REQUIRE_SPECIAL = true;

  private cryptoService: ICryptoService;
  private userStorageService: IUserStorageService;

  constructor(
    cryptoService: ICryptoService = CryptoService,
    userStorageService: IUserStorageService = UserStorageService,
  ) {
    this.cryptoService = cryptoService;
    this.userStorageService = userStorageService;
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
    try {
      // Validate email format
      if (!email || !email.includes('@')) {
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

      // Generate session token
      const sessionToken = await this.cryptoService.generateSessionToken();

      // Create new user
      const newUser = createUser({
        email: email.toLowerCase(),
        name,
        role,
        passwordHash,
        passwordSalt: salt,
        sessionToken,
        lastLoginAt: new Date(),
      });

      // Validate user data
      const validation = validateUser(newUser);
      if (!validation.isValid) {
        throw new Error(validation.errors.join('. '));
      }

      // Save user and token
      await this.userStorageService.saveUser(newUser);
      await this.userStorageService.setCurrentUser(newUser);
      await this.userStorageService.saveUserToken(sessionToken);

      return {
        success: true,
        user: this.sanitizeUser(newUser),
        token: sessionToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Login an existing user
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
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
        throw new Error('Invalid email or password');
      }

      // Generate new session token
      const sessionToken = await this.cryptoService.generateSessionToken();

      // Update user with new session
      const updatedUser = updateUser(user, {
        sessionToken,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      });

      // Save updated user and set as current
      await this.userStorageService.updateUser(updatedUser);
      await this.userStorageService.setCurrentUser(updatedUser);
      await this.userStorageService.saveUserToken(sessionToken);

      return {
        success: true,
        user: this.sanitizeUser(updatedUser),
        token: sessionToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Verify current session
  async verifySession(): Promise<SessionVerificationResult> {
    try {
      const token = await this.userStorageService.getUserToken();
      if (!token) {
        return { isValid: false, reason: 'No session token' };
      }

      // Check if token is expired
      if (this.cryptoService.isTokenExpired(token)) {
        await this.logout();
        return { isValid: false, reason: 'Session expired' };
      }

      const currentUser = await this.userStorageService.getCurrentUser();
      if (!currentUser) {
        return { isValid: false, reason: 'No user session' };
      }

      // Verify token matches user's session token
      if (currentUser.sessionToken !== token) {
        await this.logout();
        return { isValid: false, reason: 'Invalid session' };
      }

      // Update last active time
      const updatedUser = updateUser(currentUser, {
        lastActiveAt: new Date(),
      });
      await this.userStorageService.updateUser(updatedUser);

      return {
        isValid: true,
        user: this.sanitizeUser(updatedUser),
      };
    } catch (error) {
      console.error('Session verification error:', error);
      return { isValid: false, reason: 'Verification error' };
    }
  }

  // Logout current user
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
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

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Change password for current user
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
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

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Reset password (for forgot password flow - simplified version)
  async resetPassword(email: string, newPassword: string): Promise<PasswordResetResult> {
    try {
      const user = await this.userStorageService.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return { success: true, message: 'If an account exists, the password has been reset' };
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

      return {
        success: true,
        message: 'Password has been reset. Please login with your new password.',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
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
}

export default new AuthService();
