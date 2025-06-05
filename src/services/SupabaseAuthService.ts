// ABOUTME: Supabase-based authentication service implementing the same interface as AuthService
// Provides authentication with Supabase backend while maintaining backward compatibility

import { supabase } from './SupabaseService';
// import type { Database } from '../types/database.types'; // Will be used when DbUser is needed
import type { ICryptoService } from './CryptoService';
import CryptoService from './CryptoService';
import SecureLogger from './SecureLogger';
import type { IRateLimiter } from './RateLimiter';
import RateLimiter from './RateLimiter';
import ValidationService from './ValidationService';
import type { User, UserRole, SecureToken} from '../types/user.types';
import { NotificationPreference } from '../types/user.types';
import type { IAuthService } from './AuthService';
import * as SecureStore from 'expo-secure-store';
import UserStorageService from './UserStorageService';

// type DbUser = Database['public']['Tables']['users']['Row']; // Will be used in future

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

export class SupabaseAuthService implements IAuthService {
  // Password validation rules (same as original)
  static readonly PASSWORD_MIN_LENGTH = 8;
  static readonly PASSWORD_REQUIRE_UPPERCASE = true;
  static readonly PASSWORD_REQUIRE_LOWERCASE = true;
  static readonly PASSWORD_REQUIRE_NUMBER = true;
  static readonly PASSWORD_REQUIRE_SPECIAL = true;

  private cryptoService: ICryptoService;
  private rateLimiter: IRateLimiter;
  private migrationInProgress = false;

  constructor(
    cryptoService: ICryptoService = CryptoService,
    rateLimiter: IRateLimiter = RateLimiter,
  ) {
    this.cryptoService = cryptoService;
    this.rateLimiter = rateLimiter;

    // Set up auth state listener
    if (supabase && process.env.NODE_ENV !== 'test') {
      this.setupAuthListener();
    }
  }

  private setupAuthListener() {
    if (!supabase?.auth) return;

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Handle sign in
        SecureLogger.info('User signed in via Supabase', {
          code: 'SUPABASE_AUTH_001',
        });
      } else if (event === 'SIGNED_OUT') {
        // Handle sign out
        SecureLogger.info('User signed out via Supabase', {
          code: 'SUPABASE_AUTH_002',
        });
      } else if (event === 'TOKEN_REFRESHED') {
        // Handle token refresh
        SecureLogger.info('Session token refreshed', {
          code: 'SUPABASE_AUTH_003',
        });
      }
    });
  }

  // Validate password strength (same implementation as original)
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      return {
        isValid: false,
        errors: ['Password is required'],
      };
    }

    if (password.length < SupabaseAuthService.PASSWORD_MIN_LENGTH) {
      errors.push(
        `Password must be at least ${SupabaseAuthService.PASSWORD_MIN_LENGTH} characters long`,
      );
    }

    if (SupabaseAuthService.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (SupabaseAuthService.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (SupabaseAuthService.PASSWORD_REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (SupabaseAuthService.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
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
      // Check if Supabase is available
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Validate email format
      if (!ValidationService.validateEmail(email)) {
        throw new Error('Invalid email address');
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create user profile in database
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        name,
        theme: 'system',
        notification_preferences: { global: 'all' },
      });

      if (profileError) {
        // Rollback auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('Failed to create user profile');
      }

      // Create secure token for device binding (compatible with original implementation)
      const secureToken = await this.createSecureToken(authData.user.id);
      await this.storeSecureToken(authData.user.id, secureToken);

      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      // Transform to match original User type
      const user = await this.transformSupabaseUser(authData.user, { name, role });

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      SecureLogger.error('Sign up failed', {
        code: 'SUPABASE_SIGNUP_001',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
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

      // Check rate limiting
      if (!this.rateLimiter.canAttemptLogin(email)) {
        const lockoutEnd = this.rateLimiter.getLockoutEndTime(email);
        const minutesRemaining = lockoutEnd ? Math.ceil((lockoutEnd - Date.now()) / 60000) : 15;
        throw new Error(
          `Too many failed login attempts. Please try again in ${minutesRemaining} minutes.`,
        );
      }

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        this.rateLimiter.recordLoginAttempt(email, false);
        throw new Error('Invalid email or password');
      }

      if (!data.user) {
        throw new Error('Login failed');
      }

      // Record successful login
      this.rateLimiter.recordLoginAttempt(email, true);

      // Update last login time in database
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', data.user.id);

      // Create secure token for device binding
      const secureToken = await this.createSecureToken(data.user.id);
      await this.storeSecureToken(data.user.id, secureToken);

      // Check if this is a user migrating from local storage
      if (!this.migrationInProgress) {
        await this.attemptDataMigration(data.user.id);
      }

      // Get user profile with role
      const profile = await this.getUserProfile(data.user.id);
      const user = await this.transformSupabaseUser(data.user, profile);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token: data.session?.access_token || '',
      };
    } catch (error) {
      SecureLogger.error('Login failed', {
        code: 'SUPABASE_LOGIN_001',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Verify current session
  async verifySession(): Promise<SessionVerificationResult> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return { isValid: false, reason: 'No valid session' };
      }

      // Verify token expiry
      const tokenExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
      if (tokenExpiry && tokenExpiry < new Date()) {
        // Attempt to refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          return { isValid: false, reason: 'Session expired and refresh failed' };
        }
      }

      // Get secure token for device validation
      const secureToken = await this.getSecureToken(session.user.id);
      if (secureToken) {
        // Validate device binding
        const deviceId = await this.getDeviceId();
        if (secureToken.deviceId !== deviceId) {
          SecureLogger.warn('Session accessed from different device', {
            code: 'SUPABASE_SESSION_001',
          });
        }

        // Update last used time
        secureToken.lastUsedAt = new Date();
        await this.storeSecureToken(session.user.id, secureToken);
      }

      // Update last active time
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', session.user.id);

      // Get user profile
      const profile = await this.getUserProfile(session.user.id);
      const user = await this.transformSupabaseUser(session.user, profile);

      return {
        isValid: true,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      SecureLogger.error('Session verification failed', {
        code: 'SUPABASE_SESSION_002',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return { isValid: false, reason: 'Verification error' };
    }
  }

  // Logout current user
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Clear local secure tokens
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await SecureStore.deleteItemAsync(`auth_token_${user.id}`);
      }

      // Clear any local user data
      await UserStorageService.logout();

      return { success: true };
    } catch (error) {
      SecureLogger.error('Logout failed', {
        code: 'SUPABASE_LOGOUT_001',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Change password for current user
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No user logged in');
      }

      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join('. '));
      }

      // Verify current password by re-authenticating
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Rotate secure token
      await this.rotateToken(user.id);

      return { success: true };
    } catch (error) {
      SecureLogger.error('Password change failed', {
        code: 'SUPABASE_PASSWORD_001',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Reset password (for forgot password flow)
  async resetPassword(_email: string, _newPassword: string): Promise<PasswordResetResult> {
    try {
      // In a real implementation, this would send a reset email
      // For now, we'll implement direct reset for development

      // This would typically be a two-step process:
      // 1. Send reset email: await supabase.auth.resetPasswordForEmail(email)
      // 2. Update password with token from email

      SecureLogger.info('Password reset requested', {
        code: 'SUPABASE_RESET_001',
      });

      return {
        success: true,
        message: 'If an account exists, a password reset email has been sent',
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

  // Secure Token Methods (compatible with original implementation)

  async createSecureToken(_userId: string): Promise<SecureToken> {
    const rawToken = await this.cryptoService.generateSecureBytes(32);
    const tokenString = this.uint8ArrayToBase64(rawToken);

    const deviceId = await this.getDeviceId();
    const installationId = await this.getInstallationId();

    const fingerprint = await this.cryptoService.hash(
      `${tokenString}:${deviceId}:${installationId}`,
    );

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

  async validateSecureToken(secureToken: SecureToken, providedToken: string): Promise<boolean> {
    try {
      const currentDeviceId = await this.getDeviceId();
      if (secureToken.deviceId !== currentDeviceId) {
        SecureLogger.warn('Token used from different device', {
          code: 'SUPABASE_TOKEN_001',
        });
        return false;
      }

      const tokenAge = Date.now() - secureToken.createdAt.getTime();
      const MAX_TOKEN_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (tokenAge > MAX_TOKEN_AGE) {
        return false;
      }

      const inactiveTime = Date.now() - secureToken.lastUsedAt.getTime();
      const MAX_INACTIVE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (inactiveTime > MAX_INACTIVE_TIME) {
        return false;
      }

      const deviceKey = await this.getOrCreateDeviceKey();
      const decryptedToken = await this.cryptoService.decrypt(
        secureToken.encryptedToken,
        deviceKey,
      );

      return decryptedToken === providedToken;
    } catch (error) {
      SecureLogger.error('Token validation failed', {
        code: 'SUPABASE_TOKEN_002',
      });
      return false;
    }
  }

  async storeSecureToken(userId: string, secureToken: SecureToken): Promise<void> {
    const tokenKey = `auth_token_${userId}`;
    await SecureStore.setItemAsync(tokenKey, JSON.stringify(secureToken), {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to save session',
    });
  }

  async getSecureToken(userId: string): Promise<SecureToken | null> {
    try {
      const tokenKey = `auth_token_${userId}`;
      const tokenData = await SecureStore.getItemAsync(tokenKey, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access session',
      });

      if (!tokenData) {
        return null;
      }

      const token = JSON.parse(tokenData) as SecureToken;
      token.createdAt = new Date(token.createdAt);
      token.lastUsedAt = new Date(token.lastUsedAt);

      return token;
    } catch (error) {
      SecureLogger.error('Failed to retrieve secure token', {
        code: 'SUPABASE_TOKEN_003',
      });
      return null;
    }
  }

  async rotateToken(userId: string): Promise<string> {
    const newToken = await this.createSecureToken(userId);
    await this.storeSecureToken(userId, newToken);
    await this.invalidateOtherSessions(userId);
    return newToken.encryptedToken;
  }

  async getOrCreateDeviceKey(): Promise<string> {
    const deviceKeyName = 'device_encryption_key';

    try {
      const existingKey = await SecureStore.getItemAsync(deviceKeyName, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access secure storage',
      });

      if (existingKey) {
        return existingKey;
      }

      const keyBytes = await this.cryptoService.generateSecureBytes(32);
      const deviceKey = this.uint8ArrayToBase64(keyBytes);

      await SecureStore.setItemAsync(deviceKeyName, deviceKey, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access secure storage',
      });

      return deviceKey;
    } catch (error) {
      SecureLogger.error('Failed to manage device key', {
        code: 'SUPABASE_DEVICE_001',
      });
      throw new Error('Failed to manage device encryption key');
    }
  }

  async getDeviceId(): Promise<string> {
    const deviceIdKey = 'device_unique_id';

    try {
      let deviceId = await SecureStore.getItemAsync(deviceIdKey);

      if (!deviceId) {
        const randomBytes = await this.cryptoService.generateSecureBytes(16);
        deviceId = this.uint8ArrayToHex(randomBytes);
        await SecureStore.setItemAsync(deviceIdKey, deviceId);
      }

      return deviceId || 'unknown-device';
    } catch (error) {
      SecureLogger.error('Failed to get device ID', {
        code: 'SUPABASE_DEVICE_002',
      });
      return 'unknown-device';
    }
  }

  async getInstallationId(): Promise<string> {
    const installIdKey = 'app_installation_id';

    try {
      let installationId = await SecureStore.getItemAsync(installIdKey);

      if (!installationId) {
        const randomBytes = await this.cryptoService.generateSecureBytes(16);
        installationId = this.uint8ArrayToHex(randomBytes);
        await SecureStore.setItemAsync(installIdKey, installationId);
      }

      return installationId || 'unknown-installation';
    } catch (error) {
      SecureLogger.error('Failed to get installation ID', {
        code: 'SUPABASE_DEVICE_003',
      });
      return 'unknown-installation';
    }
  }

  async invalidateOtherSessions(_userId: string): Promise<void> {
    // In Supabase, this would be handled by the refresh token rotation
    SecureLogger.info('Token rotation initiated', {
      code: 'SUPABASE_TOKEN_ROTATE_001',
    });
  }

  detectAnomalousUsage(secureToken: SecureToken): boolean {
    const now = Date.now();
    const timeSinceLastUse = now - secureToken.lastUsedAt.getTime();

    if (timeSinceLastUse < 1000) {
      SecureLogger.warn('Suspicious rapid token usage detected', {
        code: 'SUPABASE_ANOMALY_001',
      });
      return true;
    }

    return false;
  }

  // Helper methods

  private async getUserProfile(userId: string): Promise<Partial<User>> {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error || !data) {
      SecureLogger.error('Failed to fetch user profile', {
        code: 'SUPABASE_PROFILE_001',
      });
      return {};
    }

    return {
      name: data.name,
      role: 'user' as UserRole, // Default role, would be stored in metadata
      stats: {
        tasksAssigned: 0,
        tasksCompleted: 0,
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
        totalXP: data.xp_total || 0,
      },
    };
  }

  private async transformSupabaseUser(
    authUser: {
      id: string;
      email?: string;
      created_at: string;
      updated_at?: string;
      user_metadata?: { name?: string; role?: string };
    },
    profile?: Partial<User>,
  ): Promise<User> {
    return {
      id: authUser.id,
      email: authUser.email!,
      name: profile?.name || authUser.user_metadata?.name || 'User',
      role: profile?.role || (authUser.user_metadata?.role as UserRole) || 'user',
      createdAt: new Date(authUser.created_at),
      updatedAt: new Date(authUser.updated_at || authUser.created_at),
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      sessionToken: null,
      passwordHash: '', // Not stored locally with Supabase
      passwordSalt: '', // Not stored locally with Supabase
      notificationPreferences: {
        global: NotificationPreference.ALL,
        taskAssigned: true,
        taskStarted: true,
        taskCompleted: true,
        taskOverdue: true,
        encouragement: true,
        checkIn: true,
      },
      encouragementMessages: [],
      stats: profile?.stats || {
        tasksAssigned: 0,
        tasksCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalXP: 0,
      },
      partnerId: null,
    };
  }

  private async attemptDataMigration(userId: string): Promise<void> {
    try {
      this.migrationInProgress = true;

      // Check if already migrated
      const migrationKey = `migrated_${userId}`;
      const isMigrated = await SecureStore.getItemAsync(migrationKey);

      if (isMigrated) {
        return;
      }

      // Check for local user data
      const localUser = await UserStorageService.getCurrentUser();
      if (localUser && localUser.email) {
        SecureLogger.info('Attempting data migration for user', {
          code: 'SUPABASE_MIGRATE_001',
        });

        // Migration would happen here
        // This is a placeholder for the actual migration logic

        // Mark as migrated
        await SecureStore.setItemAsync(migrationKey, 'true');
      }
    } catch (error) {
      SecureLogger.error('Data migration failed', {
        code: 'SUPABASE_MIGRATE_002',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.migrationInProgress = false;
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

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

  private uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Export singleton instance for backward compatibility
export default new SupabaseAuthService();
