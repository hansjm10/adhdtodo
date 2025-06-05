// ABOUTME: Wrapper service that switches between local and Supabase auth based on feature flags
// Provides seamless migration path from local to cloud authentication

import type { IAuthService } from './AuthService';
import LocalAuthService from './AuthService';
import SupabaseAuthService from './SupabaseAuthService';
import FeatureFlags from './FeatureFlags';
import SecureLogger from './SecureLogger';
import type { User, UserRole, SecureToken } from '../types/user.types';

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

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

class AuthServiceWrapper implements IAuthService {
  private localService: IAuthService = LocalAuthService;
  private supabaseService: IAuthService = SupabaseAuthService;
  private currentService: IAuthService | null = null;

  private async getService(): Promise<IAuthService> {
    if (!this.currentService) {
      const useSupabase = await FeatureFlags.isSupabaseAuthEnabled();
      this.currentService = useSupabase ? this.supabaseService : this.localService;

      SecureLogger.info(`Using ${useSupabase ? 'Supabase' : 'Local'} auth service`, {
        code: 'AUTH_WRAPPER_001',
      });
    }
    return this.currentService;
  }

  validatePassword(password: string): PasswordValidationResult {
    // Password validation is synchronous and doesn't need service selection
    return this.localService.validatePassword(password);
  }

  async signUp(email: string, password: string, name: string, role: UserRole): Promise<AuthResult> {
    const service = await this.getService();
    const result = await service.signUp(email, password, name, role);

    // If using local auth but Supabase is available, create shadow account
    if (service === this.localService && (await this.shouldCreateShadowAccount())) {
      await this.createShadowSupabaseAccount(email, password, name, role);
    }

    return result;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const service = await this.getService();
    const result = await service.login(email, password);

    // If login succeeds with local but Supabase is available, attempt migration
    if (result.success && service === this.localService && (await this.shouldAttemptMigration())) {
      await this.attemptSupabaseMigration(email, password);
    }

    return result;
  }

  async verifySession(): Promise<SessionVerificationResult> {
    const service = await this.getService();
    return service.verifySession();
  }

  async logout(): Promise<{ success: boolean; error?: string }> {
    // Logout from both services if needed
    const service = await this.getService();
    const result = await service.logout();

    // Also logout from the other service if it has a session
    if (service === this.localService) {
      await this.supabaseService.logout().catch(() => {});
    } else {
      await this.localService.logout().catch(() => {});
    }

    return result;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    const service = await this.getService();
    return service.changePassword(currentPassword, newPassword);
  }

  async resetPassword(email: string, newPassword: string): Promise<PasswordResetResult> {
    const service = await this.getService();
    return service.resetPassword(email, newPassword);
  }

  sanitizeUser(user: User): Omit<User, 'passwordHash' | 'passwordSalt' | 'sessionToken'> {
    const service = this.currentService || this.localService;
    return service.sanitizeUser(user);
  }

  // Secure token methods
  async createSecureToken(userId: string): Promise<SecureToken> {
    const service = await this.getService();
    return service.createSecureToken(userId);
  }

  async validateSecureToken(secureToken: SecureToken, providedToken: string): Promise<boolean> {
    const service = await this.getService();
    return service.validateSecureToken(secureToken, providedToken);
  }

  async storeSecureToken(userId: string, secureToken: SecureToken): Promise<void> {
    const service = await this.getService();
    return service.storeSecureToken(userId, secureToken);
  }

  async getSecureToken(userId: string): Promise<SecureToken | null> {
    const service = await this.getService();
    return service.getSecureToken(userId);
  }

  async rotateToken(userId: string): Promise<string> {
    const service = await this.getService();
    return service.rotateToken(userId);
  }

  async getOrCreateDeviceKey(): Promise<string> {
    const service = await this.getService();
    return service.getOrCreateDeviceKey();
  }

  async getDeviceId(): Promise<string> {
    const service = await this.getService();
    return service.getDeviceId();
  }

  async getInstallationId(): Promise<string> {
    const service = await this.getService();
    return service.getInstallationId();
  }

  async invalidateOtherSessions(userId: string): Promise<void> {
    const service = await this.getService();
    return service.invalidateOtherSessions(userId);
  }

  detectAnomalousUsage(secureToken: SecureToken): boolean {
    const service = this.currentService || this.localService;
    return service.detectAnomalousUsage(secureToken);
  }

  // Migration helpers
  private async shouldCreateShadowAccount(): Promise<boolean> {
    // Migration is no longer supported - always return false
    return false;
  }

  private async shouldAttemptMigration(): Promise<boolean> {
    // Migration is no longer supported - always return false
    return false;
  }

  private async createShadowSupabaseAccount(
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ): Promise<void> {
    try {
      // Silently create account in Supabase for future migration
      await this.supabaseService.signUp(email, password, name, role);
      SecureLogger.info('Shadow Supabase account created', {
        code: 'AUTH_SHADOW_001',
      });
    } catch (error) {
      // Silent failure - don't affect user experience
      SecureLogger.error('Failed to create shadow account', {
        code: 'AUTH_SHADOW_002',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async attemptSupabaseMigration(email: string, password: string): Promise<void> {
    try {
      // Attempt to login to Supabase with same credentials
      const result = await this.supabaseService.login(email, password);

      if (result.success) {
        SecureLogger.info('User exists in Supabase, ready for migration', {
          code: 'AUTH_MIGRATE_001',
        });

        // Could set a flag here to prompt user about migration
        // or automatically switch to Supabase on next login
      }
    } catch (error) {
      // Silent failure - user continues with local auth
      SecureLogger.info('Supabase migration check failed', {
        code: 'AUTH_MIGRATE_002',
      });
    }
  }

  // Force refresh service selection (useful for testing)
  async refreshServiceSelection(): Promise<void> {
    this.currentService = null;
    await this.getService();
  }
}

export default new AuthServiceWrapper();
