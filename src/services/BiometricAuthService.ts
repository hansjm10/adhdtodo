// ABOUTME: Service for handling biometric authentication including Face ID,
// Touch ID, fingerprint, and iris recognition with secure fallback options

import * as LocalAuthentication from 'expo-local-authentication';
import { SecureStorageService } from './SecureStorageService';

export interface BiometricSupport {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: number[];
  biometricType: BiometricType;
}

export type BiometricType = 'faceId' | 'fingerprint' | 'iris' | 'none';

export interface AuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

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

export class BiometricAuthService {
  /**
   * Check device biometric capabilities and enrollment status
   */
  static async checkBiometricSupport(): Promise<BiometricSupport> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
      biometricType: this.getBiometricType(supportedTypes),
    };
  }

  /**
   * Authenticate user with biometric prompt
   */
  static async authenticate(reason?: string): Promise<AuthResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to access your ADHD Todo data',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await this.recordSuccessfulAuth();
        await this.resetFailedAttempts();
        return { success: true };
      }

      return {
        success: false,
        error: result.error,
        warning: result.warning,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Configure app-wide security settings
   */
  static async setupAppSecurity(settings: SecuritySettings): Promise<void> {
    await SecureStorageService.saveSecure('SECURITY_SETTINGS', settings);

    if (settings.requireAuthOnLaunch) {
      await this.enableLaunchAuthentication();
    }

    if (settings.sensitiveDataAuth) {
      await this.enableSensitiveDataProtection();
    }
  }

  /**
   * Get current security settings
   */
  static async getSecuritySettings(): Promise<SecuritySettings> {
    const settings = await SecureStorageService.getSecure<SecuritySettings>('SECURITY_SETTINGS');
    return settings || DEFAULT_SECURITY_SETTINGS;
  }

  /**
   * Record a failed authentication attempt
   */
  static async recordFailedAttempt(): Promise<number> {
    const attempts = (await SecureStorageService.getSecure<number>('FAILED_AUTH_ATTEMPTS')) || 0;
    const newCount = attempts + 1;
    await SecureStorageService.saveSecure('FAILED_AUTH_ATTEMPTS', newCount);
    return newCount;
  }

  /**
   * Reset failed authentication attempts counter
   */
  static async resetFailedAttempts(): Promise<void> {
    await SecureStorageService.deleteSecure('FAILED_AUTH_ATTEMPTS');
  }

  /**
   * Check if authentication is locked due to too many failed attempts
   */
  static async checkIfLocked(): Promise<boolean> {
    const attempts = (await SecureStorageService.getSecure<number>('FAILED_AUTH_ATTEMPTS')) || 0;
    const settings = await this.getSecuritySettings();
    return attempts >= settings.maxFailedAttempts;
  }

  /**
   * Determine the type of biometric authentication available
   */
  private static getBiometricType(types: number[]): BiometricType {
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
  private static async recordSuccessfulAuth(): Promise<void> {
    const timestamp = new Date().toISOString();
    await SecureStorageService.saveSecure('LAST_AUTH_SUCCESS', timestamp);
  }

  /**
   * Enable authentication requirement on app launch
   */
  private static async enableLaunchAuthentication(): Promise<void> {
    await SecureStorageService.saveSecure('LAUNCH_AUTH_ENABLED', true);
  }

  /**
   * Enable authentication for sensitive data access
   */
  private static async enableSensitiveDataProtection(): Promise<void> {
    await SecureStorageService.saveSecure('SENSITIVE_DATA_AUTH_ENABLED', true);
  }
}
