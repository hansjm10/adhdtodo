// ABOUTME: Tests for BiometricAuthService handling biometric authentication
// including Face ID, Touch ID, and PIN fallback functionality

import * as LocalAuthentication from 'expo-local-authentication';

// Import the actual class for testing
const BiometricAuthServiceModule = jest.requireActual('../BiometricAuthService');
const { BiometricAuthService } = BiometricAuthServiceModule;

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

// Create mock functions
const mockSaveSecure = jest.fn();
const mockGetSecure = jest.fn();
const mockDeleteSecure = jest.fn();

jest.mock('../SecureStorageService', () => ({
  default: {
    saveSecure: mockSaveSecure,
    getSecure: mockGetSecure,
    deleteSecure: mockDeleteSecure,
  },
}));

// Mock BaseService to avoid complex inheritance issues in tests
jest.mock('../BaseService', () => ({
  BaseService: class {
    constructor(serviceName) {
      this.serviceName = serviceName;
      this.logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    }

    async wrapAsync(_operation, fn, _context) {
      try {
        const data = await fn();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: { message: error.message } };
      }
    }

    logError(_operation, _error) {
      // Mock implementation
    }
  },
}));

describe('BiometricAuthService', () => {
  let biometricAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a new instance for each test with mocked dependencies
    const mockSecureStorageService = {
      saveSecure: mockSaveSecure,
      getSecure: mockGetSecure,
      deleteSecure: mockDeleteSecure,
    };
    biometricAuthService = new BiometricAuthService(mockSecureStorageService);
  });

  describe('checkBiometricSupport', () => {
    it('should return complete biometric support information', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

      const support = await biometricAuthService.checkBiometricSupport();

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

      const support = await biometricAuthService.checkBiometricSupport();

      expect(support.biometricType).toBe('fingerprint');
    });

    it('should return iris as biometric type when supported', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.IRIS,
      ]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

      const support = await biometricAuthService.checkBiometricSupport();

      expect(support.biometricType).toBe('iris');
    });

    it('should return none when no biometric types are supported', async () => {
      LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
      LocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([]);
      LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

      const support = await biometricAuthService.checkBiometricSupport();

      expect(support.biometricType).toBe('none');
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate with default prompt', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
      });
      mockSaveSecure.mockResolvedValue();

      const result = await biometricAuthService.authenticate();

      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate to access your ADHD Todo data',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      expect(result).toEqual({ success: true });
      expect(mockSaveSecure).toHaveBeenCalledWith('LAST_AUTH_SUCCESS', expect.any(String));
    });

    it('should use custom prompt message when provided', async () => {
      LocalAuthentication.authenticateAsync.mockResolvedValue({
        success: true,
      });

      await biometricAuthService.authenticate('Access medication data');

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

      const result = await biometricAuthService.authenticate();

      expect(result).toEqual({
        success: false,
        error: 'user_cancel',
        warning: 'User cancelled authentication',
      });
      expect(mockSaveSecure).not.toHaveBeenCalled();
    });

    it('should handle authentication exceptions', async () => {
      LocalAuthentication.authenticateAsync.mockRejectedValue(new Error('Hardware error'));

      const result = await biometricAuthService.authenticate();

      expect(result).toEqual({
        success: false,
        error: 'Hardware error',
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
      mockSaveSecure.mockResolvedValue();

      await biometricAuthService.setupAppSecurity(mockSettings);

      expect(mockSaveSecure).toHaveBeenCalledWith('SECURITY_SETTINGS', mockSettings);
    });

    it('should enable launch authentication when required', async () => {
      mockSaveSecure.mockResolvedValue();

      await biometricAuthService.setupAppSecurity({
        ...mockSettings,
        requireAuthOnLaunch: true,
      });

      expect(mockSaveSecure).toHaveBeenCalledWith('LAUNCH_AUTH_ENABLED', true);
    });

    it('should enable sensitive data protection when required', async () => {
      mockSaveSecure.mockResolvedValue();

      await biometricAuthService.setupAppSecurity({
        ...mockSettings,
        sensitiveDataAuth: true,
      });

      expect(mockSaveSecure).toHaveBeenCalledWith('SENSITIVE_DATA_AUTH_ENABLED', true);
    });

    it('should not enable features when disabled in settings', async () => {
      mockSaveSecure.mockResolvedValue();

      await biometricAuthService.setupAppSecurity({
        ...mockSettings,
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
      });

      expect(mockSaveSecure).toHaveBeenCalledTimes(1);
      expect(mockSaveSecure).toHaveBeenCalledWith('SECURITY_SETTINGS', expect.any(Object));
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
      mockGetSecure.mockResolvedValue(mockSettings);

      const settings = await biometricAuthService.getSecuritySettings();

      expect(settings).toEqual(mockSettings);
      expect(mockGetSecure).toHaveBeenCalledWith('SECURITY_SETTINGS');
    });

    it('should return default settings when none saved', async () => {
      mockGetSecure.mockResolvedValue(null);

      const settings = await biometricAuthService.getSecuritySettings();

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
      mockGetSecure.mockResolvedValue(2);
      mockSaveSecure.mockResolvedValue();

      const count = await biometricAuthService.recordFailedAttempt();

      expect(count).toBe(3);
      expect(mockSaveSecure).toHaveBeenCalledWith('FAILED_AUTH_ATTEMPTS', 3);
    });

    it('should start counter at 1 for first failure', async () => {
      mockGetSecure.mockResolvedValue(null);
      mockSaveSecure.mockResolvedValue();

      const count = await biometricAuthService.recordFailedAttempt();

      expect(count).toBe(1);
      expect(mockSaveSecure).toHaveBeenCalledWith('FAILED_AUTH_ATTEMPTS', 1);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should delete failed attempt counter', async () => {
      mockDeleteSecure.mockResolvedValue();

      await biometricAuthService.resetFailedAttempts();

      expect(mockDeleteSecure).toHaveBeenCalledWith('FAILED_AUTH_ATTEMPTS');
    });
  });

  describe('checkIfLocked', () => {
    it('should return true when max attempts exceeded', async () => {
      mockGetSecure
        .mockResolvedValueOnce(5) // failed attempts
        .mockResolvedValueOnce({ maxFailedAttempts: 3 }); // settings

      const isLocked = await biometricAuthService.checkIfLocked();

      expect(isLocked).toBe(true);
    });

    it('should return false when under max attempts', async () => {
      mockGetSecure
        .mockResolvedValueOnce(2) // failed attempts
        .mockResolvedValueOnce({ maxFailedAttempts: 5 }); // settings

      const isLocked = await biometricAuthService.checkIfLocked();

      expect(isLocked).toBe(false);
    });

    it('should return false when no failed attempts', async () => {
      mockGetSecure
        .mockResolvedValueOnce(null) // no failed attempts
        .mockResolvedValueOnce({ maxFailedAttempts: 3 }); // settings

      const isLocked = await biometricAuthService.checkIfLocked();

      expect(isLocked).toBe(false);
    });
  });
});
