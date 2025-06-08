// ABOUTME: Service for handling biometric authentication including Face ID,
// Touch ID, fingerprint, and iris recognition with secure fallback options

import * as LocalAuthentication from 'expo-local-authentication';
import { BaseService } from './BaseService';
import type { ISecureStorageService } from './SecureStorageService';
import SecureStorageService from './SecureStorageService';
import type { BiometricAuthResult } from '../types/auth.types';

// Re-exported for backward compatibility - types now live in auth.types.ts
export { BiometricAuthResult };

export interface BiometricSupport {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: number[];
  biometricType: BiometricType;
}

export type BiometricType = 'faceId' | 'fingerprint' | 'iris' | 'none';

export interface SecuritySettings {
  requireAuthOnLaunch: boolean;
  sensitiveDataAuth: boolean;
  autoLockTimeout: number;
  maxFailedAttempts: number;
}

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  requireAuthOnLaunch: false,
  sensitiveDataAuth: false,
  autoLockTimeout: 600000, // 10 minutes
  maxFailedAttempts: 5,
};

export interface IBiometricAuthService {
  checkBiometricSupport(): Promise<BiometricSupport>;
  authenticate(reason?: string): Promise<BiometricAuthResult>;
  setupAppSecurity(settings: SecuritySettings): Promise<void>;
  getSecuritySettings(): Promise<SecuritySettings>;
  recordFailedAttempt(): Promise<number>;
  resetFailedAttempts(): Promise<void>;
  checkIfLocked(): Promise<boolean>;
}

class BiometricAuthService extends BaseService implements IBiometricAuthService {
  private secureStorageService: ISecureStorageService;

  constructor(secureStorageService: ISecureStorageService = SecureStorageService) {
    super('BiometricAuthService');
    this.secureStorageService = secureStorageService;
  }
  /**
   * Check device biometric capabilities and enrollment status
   */
  async checkBiometricSupport(): Promise<BiometricSupport> {
    const result = await this.wrapAsync('checkBiometricSupport', async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
        biometricType: this.getBiometricType(supportedTypes),
      };
    });

    if (result.success && result.data) {
      return result.data;
    }

    // Return safe defaults on error
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricType: 'none',
    };
  }

  /**
   * Authenticate user with biometric prompt
   */
  async authenticate(reason?: string): Promise<BiometricAuthResult> {
    const result = await this.wrapAsync(
      'authenticate',
      async () => {
        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: reason ?? 'Authenticate to access your ADHD Todo data',
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use PIN',
          disableDeviceFallback: false,
        });

        if (authResult.success) {
          await this.recordSuccessfulAuth();
          await this.resetFailedAttempts();
          return { success: true };
        }

        return {
          success: false,
          error: authResult.error,
          warning: authResult.warning,
        };
      },
      { reason },
    );

    if (result.success && result.data) {
      return result.data;
    }

    return {
      success: false,
      error: result.error?.message ?? 'Authentication failed',
    };
  }

  /**
   * Configure app-wide security settings
   */
  async setupAppSecurity(settings: SecuritySettings): Promise<void> {
    const result = await this.wrapAsync(
      'setupAppSecurity',
      async () => {
        await this.secureStorageService.saveSecure('SECURITY_SETTINGS', settings);

        if (settings.requireAuthOnLaunch) {
          await this.enableLaunchAuthentication();
        }

        if (settings.sensitiveDataAuth) {
          await this.enableSensitiveDataProtection();
        }
      },
      { settings },
    );

    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to setup app security');
    }
  }

  /**
   * Get current security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    const result = await this.wrapAsync('getSecuritySettings', async () => {
      const settings =
        await this.secureStorageService.getSecure<SecuritySettings>('SECURITY_SETTINGS');
      return settings ?? DEFAULT_SECURITY_SETTINGS;
    });

    if (result.success && result.data) {
      return result.data;
    }

    return DEFAULT_SECURITY_SETTINGS;
  }

  /**
   * Record a failed authentication attempt
   */
  async recordFailedAttempt(): Promise<number> {
    const result = await this.wrapAsync('recordFailedAttempt', async () => {
      const attempts =
        (await this.secureStorageService.getSecure<number>('FAILED_AUTH_ATTEMPTS')) ?? 0;
      const newCount = attempts + 1;
      await this.secureStorageService.saveSecure('FAILED_AUTH_ATTEMPTS', newCount);
      return newCount;
    });

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    // Return 1 as safe default on error
    return 1;
  }

  /**
   * Reset failed authentication attempts counter
   */
  async resetFailedAttempts(): Promise<void> {
    const result = await this.wrapAsync('resetFailedAttempts', async () => {
      await this.secureStorageService.deleteSecure('FAILED_AUTH_ATTEMPTS');
    });

    if (!result.success) {
      // Log error but don't throw - this is a non-critical operation
      this.logError('resetFailedAttempts', result.error);
    }
  }

  /**
   * Check if authentication is locked due to too many failed attempts
   */
  async checkIfLocked(): Promise<boolean> {
    const result = await this.wrapAsync('checkIfLocked', async () => {
      const attempts =
        (await this.secureStorageService.getSecure<number>('FAILED_AUTH_ATTEMPTS')) ?? 0;
      const settings = await this.getSecuritySettings();
      return attempts >= settings.maxFailedAttempts;
    });

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    // Return false as safe default on error
    return false;
  }

  /**
   * Determine the type of biometric authentication available
   */
  private getBiometricType(types: number[]): BiometricType {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'faceId';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  }

  /**
   * Record successful authentication timestamp
   */
  private async recordSuccessfulAuth(): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.secureStorageService.saveSecure('LAST_AUTH_SUCCESS', timestamp);
  }

  /**
   * Enable authentication requirement on app launch
   */
  private async enableLaunchAuthentication(): Promise<void> {
    await this.secureStorageService.saveSecure('LAUNCH_AUTH_ENABLED', true);
  }

  /**
   * Enable authentication for sensitive data access
   */
  private async enableSensitiveDataProtection(): Promise<void> {
    await this.secureStorageService.saveSecure('SENSITIVE_DATA_AUTH_ENABLED', true);
  }
}

export { BiometricAuthService };
export default new BiometricAuthService();
