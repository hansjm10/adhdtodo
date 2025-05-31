// ABOUTME: Service for handling authentication including login, signup, and session management
// Provides secure password-based authentication with session tokens

import CryptoService from './CryptoService';
import UserStorageService from './UserStorageService';
import { createUser, validateUser, updateUser } from '../utils/UserModel';

class AuthService {
  // Password validation rules
  static PASSWORD_MIN_LENGTH = 8;
  static PASSWORD_REQUIRE_UPPERCASE = true;
  static PASSWORD_REQUIRE_LOWERCASE = true;
  static PASSWORD_REQUIRE_NUMBER = true;
  static PASSWORD_REQUIRE_SPECIAL = true;

  // Validate password strength
  validatePassword(password) {
    const errors = [];

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
  async signUp(email, password, name, role) {
    try {
      // Validate email format
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email address');
      }

      // Check if user already exists
      const existingUser = await UserStorageService.getUserByEmail(email);
      if (existingUser) {
        throw new Error('An account already exists with this email');
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Generate salt and hash password
      const salt = await CryptoService.generateSalt();
      const passwordHash = await CryptoService.hashPassword(password, salt);

      // Generate session token
      const sessionToken = await CryptoService.generateSessionToken();

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
      await UserStorageService.saveUser(newUser);
      await UserStorageService.setCurrentUser(newUser);
      await UserStorageService.saveUserToken(sessionToken);

      return {
        success: true,
        user: this.sanitizeUser(newUser),
        token: sessionToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Login an existing user
  async login(email, password) {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Find user by email
      const user = await UserStorageService.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify user has password credentials
      if (!user.passwordHash || !user.passwordSalt) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await CryptoService.verifyPassword(
        password,
        user.passwordHash,
        user.passwordSalt,
      );

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate new session token
      const sessionToken = await CryptoService.generateSessionToken();

      // Update user with new session
      const updatedUser = updateUser(user, {
        sessionToken,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      });

      // Save updated user and set as current
      await UserStorageService.updateUser(updatedUser);
      await UserStorageService.setCurrentUser(updatedUser);
      await UserStorageService.saveUserToken(sessionToken);

      return {
        success: true,
        user: this.sanitizeUser(updatedUser),
        token: sessionToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify current session
  async verifySession() {
    try {
      const token = await UserStorageService.getUserToken();
      if (!token) {
        return { isValid: false, reason: 'No session token' };
      }

      // Check if token is expired
      if (CryptoService.isTokenExpired(token)) {
        await this.logout();
        return { isValid: false, reason: 'Session expired' };
      }

      const currentUser = await UserStorageService.getCurrentUser();
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
      await UserStorageService.updateUser(updatedUser);

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
  async logout() {
    try {
      const currentUser = await UserStorageService.getCurrentUser();

      if (currentUser) {
        // Clear session token from user
        const updatedUser = updateUser(currentUser, {
          sessionToken: null,
        });
        await UserStorageService.updateUser(updatedUser);
      }

      // Clear stored session
      await UserStorageService.logout();

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  // Change password for current user
  async changePassword(currentPassword, newPassword) {
    try {
      const currentUser = await UserStorageService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      // Verify current password
      const isPasswordValid = await CryptoService.verifyPassword(
        currentPassword,
        currentUser.passwordHash,
        currentUser.passwordSalt,
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
      const salt = await CryptoService.generateSalt();
      const passwordHash = await CryptoService.hashPassword(newPassword, salt);

      // Generate new session token
      const sessionToken = await CryptoService.generateSessionToken();

      // Update user
      const updatedUser = updateUser(currentUser, {
        passwordHash,
        passwordSalt: salt,
        sessionToken,
        updatedAt: new Date(),
      });

      await UserStorageService.updateUser(updatedUser);
      await UserStorageService.setCurrentUser(updatedUser);
      await UserStorageService.saveUserToken(sessionToken);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Reset password (for forgot password flow - simplified version)
  async resetPassword(email, newPassword) {
    try {
      const user = await UserStorageService.getUserByEmail(email);
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
      const salt = await CryptoService.generateSalt();
      const passwordHash = await CryptoService.hashPassword(newPassword, salt);

      // Update user (clear session token to force re-login)
      const updatedUser = updateUser(user, {
        passwordHash,
        passwordSalt: salt,
        sessionToken: null,
        updatedAt: new Date(),
      });

      await UserStorageService.updateUser(updatedUser);

      return {
        success: true,
        message: 'Password has been reset. Please login with your new password.',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Remove sensitive fields from user object
  sanitizeUser(user) {
    // eslint-disable-next-line no-unused-vars
    const { passwordHash, passwordSalt, sessionToken, ...sanitized } = user;
    return sanitized;
  }
}

export default new AuthService();
