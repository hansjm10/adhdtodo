// ABOUTME: Tests for BiometricAuthService handling biometric authentication
// including Face ID, Touch ID, and PIN fallback functionality

import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricAuthService } from '../BiometricAuthService';
import { SecureStorageService } from '../SecureStorageService';

// Mock dependencies
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('../SecureStorageService', () => ({
  SecureStorageService: {
    saveSecure: jest.fn(),
    getSecure: jest.fn(),
    deleteSecure: jest.fn(),
  },
}));

describe('BiometricAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkBiometricSupport', () => {
    it('should return complete biometric support information', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

      const support = await BiometricAuthService.checkBiometricSupport();

      expect(support).toEqual({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION],
        biometricType: 'faceId',
      });
    });

    it('should return fingerprint as biometric type when supported', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

      const support = await BiometricAuthService.checkBiometricSupport();

      expect(support.biometricType).toBe('fingerprint');
    });

    it('should return iris as biometric type when supported', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

      const support = await BiometricAuthService.checkBiometricSupport();

      expect(support.biometricType).toBe('iris');
    });

    it('should return none when no biometric types are supported', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

      const support = await BiometricAuthService.checkBiometricSupport();

      expect(support.biometricType).toBe('none');
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate with default prompt', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
      });
      SecureStorageService.saveSecure.mockResolvedValue();

      const result = await BiometricAuthService.authenticate();

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to access your ADHD Todo data',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      expect(result).toEqual({ success: true });
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith(
        'LAST_AUTH_SUCCESS',
        expect.any(String),
      );
    });

    it('should use custom prompt message when provided', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
      });

      await BiometricAuthService.authenticate('Access medication data');

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          promptMessage: 'Access medication data',
        }),
      );
    });

    it('should handle authentication failure', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'user_cancel',
        warning: 'User cancelled authentication',
      });

      const result = await BiometricAuthService.authenticate();

      expect(result).toEqual({
        success: false,
        error: 'user_cancel',
        warning: 'User cancelled authentication',
      });
      expect(SecureStorageService.saveSecure).not.toHaveBeenCalled();
    });

    it('should handle authentication exceptions', async () => {
      LocalAuthentication.authenticateAsync.mockRejectedValue(new Error('Hardware error'));

      const result = await BiometricAuthService.authenticate();

      expect(result).toEqual({
        success: false,
        error: 'Authentication failed',
      });
    });
  });

  describe('setupAppSecurity', () => {
    const mockSettings = {
      requireAuthOnLaunch: true,
      sensitiveDataAuth: true,
      autoLockTimeout: 300000, // 5 minutes
      maxFailedAttempts: 3,
    };

    it('should save security settings', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      await BiometricAuthService.setupAppSecurity(mockSettings);

      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith(
        'SECURITY_SETTINGS',
        mockSettings,
      );
    });

    it('should enable launch authentication when required', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      await BiometricAuthService.setupAppSecurity({
        ...mockSettings,
        requireAuthOnLaunch: true,
      });

      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('LAUNCH_AUTH_ENABLED', true);
    });

    it('should enable sensitive data protection when required', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      await BiometricAuthService.setupAppSecurity({
        ...mockSettings,
        sensitiveDataAuth: true,
      });

      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith(
        'SENSITIVE_DATA_AUTH_ENABLED',
        true,
      );
    });

    it('should not enable features when disabled in settings', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      await BiometricAuthService.setupAppSecurity({
        ...mockSettings,
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
      });

      expect(SecureStorageService.saveSecure).toHaveBeenCalledTimes(1);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith(
        'SECURITY_SETTINGS',
        expect.any(Object),
      );
    });
  });

  describe('getSecuritySettings', () => {
    it('should return saved security settings', async () => {
      const mockSettings = {
        requireAuthOnLaunch: true,
        sensitiveDataAuth: true,
        autoLockTimeout: 300000,
        maxFailedAttempts: 3,
      };
      SecureStorageService.getSecure.mockResolvedValue(mockSettings);

      const settings = await BiometricAuthService.getSecuritySettings();

      expect(settings).toEqual(mockSettings);
      expect(SecureStorageService.getSecure).toHaveBeenCalledWith('SECURITY_SETTINGS');
    });

    it('should return default settings when none saved', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);

      const settings = await BiometricAuthService.getSecuritySettings();

      expect(settings).toEqual({
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000, // 10 minutes default
        maxFailedAttempts: 5,
      });
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment failed attempt counter', async () => {
      SecureStorageService.getSecure.mockResolvedValue(2);
      SecureStorageService.saveSecure.mockResolvedValue();

      const count = await BiometricAuthService.recordFailedAttempt();

      expect(count).toBe(3);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('FAILED_AUTH_ATTEMPTS', 3);
    });

    it('should start counter at 1 for first failure', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);
      SecureStorageService.saveSecure.mockResolvedValue();

      const count = await BiometricAuthService.recordFailedAttempt();

      expect(count).toBe(1);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('FAILED_AUTH_ATTEMPTS', 1);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should delete failed attempt counter', async () => {
      SecureStorageService.deleteSecure.mockResolvedValue();

      await BiometricAuthService.resetFailedAttempts();

      expect(SecureStorageService.deleteSecure).toHaveBeenCalledWith('FAILED_AUTH_ATTEMPTS');
    });
  });

  describe('checkIfLocked', () => {
    it('should return true when max attempts exceeded', async () => {
      SecureStorageService.getSecure
        .mockResolvedValueOnce(5) // failed attempts
        .mockResolvedValueOnce({ maxFailedAttempts: 3 }); // settings

      const isLocked = await BiometricAuthService.checkIfLocked();

      expect(isLocked).toBe(true);
    });

    it('should return false when under max attempts', async () => {
      SecureStorageService.getSecure
        .mockResolvedValueOnce(2) // failed attempts
        .mockResolvedValueOnce({ maxFailedAttempts: 5 }); // settings

      const isLocked = await BiometricAuthService.checkIfLocked();

      expect(isLocked).toBe(false);
    });

    it('should return false when no failed attempts', async () => {
      SecureStorageService.getSecure
        .mockResolvedValueOnce(null) // no failed attempts
        .mockResolvedValueOnce({ maxFailedAttempts: 3 }); // settings

      const isLocked = await BiometricAuthService.checkIfLocked();

      expect(isLocked).toBe(false);
    });
  });
});
