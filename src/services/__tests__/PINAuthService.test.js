// ABOUTME: Tests for PINAuthService handling PIN-based authentication
// including secure PIN storage, verification, and attempt tracking

import PINAuthService from '../PINAuthService';
import SecureStorageService from '../SecureStorageService';
import CryptoService from '../CryptoService';

// Mock dependencies
jest.mock('../SecureStorageService');
jest.mock('../CryptoService');

describe('PINAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupPIN', () => {
    it('should hash and save PIN securely', async () => {
      const pin = '1234';
      const hashedPIN = 'hashed_1234';
      CryptoService.hashPIN.mockResolvedValue(hashedPIN);
      SecureStorageService.saveSecure.mockResolvedValue();

      const result = await PINAuthService.setupPIN(pin);

      expect(result.success).toBe(true);
      expect(CryptoService.hashPIN).toHaveBeenCalledWith(pin);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('USER_PIN', hashedPIN);
    });

    it('should validate PIN format before saving', async () => {
      const result = await PINAuthService.setupPIN('123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('PIN must be at least 4 digits');
      expect(CryptoService.hashPIN).not.toHaveBeenCalled();
      expect(SecureStorageService.saveSecure).not.toHaveBeenCalled();
    });

    it('should reject non-numeric PINs', async () => {
      const result = await PINAuthService.setupPIN('abcd');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('PIN must contain only numbers');
      expect(CryptoService.hashPIN).not.toHaveBeenCalled();
      expect(SecureStorageService.saveSecure).not.toHaveBeenCalled();
    });

    it('should reject PINs longer than 8 digits', async () => {
      const result = await PINAuthService.setupPIN('123456789');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('PIN must not exceed 8 digits');
      expect(CryptoService.hashPIN).not.toHaveBeenCalled();
      expect(SecureStorageService.saveSecure).not.toHaveBeenCalled();
    });
  });

  describe('verifyPIN', () => {
    it('should verify correct PIN', async () => {
      const pin = '1234';
      const storedHash = 'hashed_1234';
      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(true);

      const result = await PINAuthService.verifyPIN(pin);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(SecureStorageService.getSecure).toHaveBeenCalledWith('USER_PIN');
      expect(CryptoService.verifyPIN).toHaveBeenCalledWith(pin, storedHash);
    });

    it('should reject incorrect PIN', async () => {
      const pin = '5678';
      const storedHash = 'hashed_1234';
      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(false);

      const result = await PINAuthService.verifyPIN(pin);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should return false when no PIN is set', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);

      const result = await PINAuthService.verifyPIN('1234');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(CryptoService.verifyPIN).not.toHaveBeenCalled();
    });
  });

  describe('isPINEnabled', () => {
    it('should return true when PIN is set', async () => {
      SecureStorageService.getSecure.mockResolvedValue('hashed_pin');

      const result = await PINAuthService.isPINEnabled();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false when PIN is not set', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);

      const result = await PINAuthService.isPINEnabled();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('enablePINFallback', () => {
    it('should enable PIN fallback option', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      const result = await PINAuthService.enablePINFallback();

      expect(result.success).toBe(true);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('PIN_FALLBACK_ENABLED', true);
    });
  });

  describe('disablePINFallback', () => {
    it('should disable PIN fallback option', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      const result = await PINAuthService.disablePINFallback();

      expect(result.success).toBe(true);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('PIN_FALLBACK_ENABLED', false);
    });
  });

  describe('isPINFallbackEnabled', () => {
    it('should return true when PIN fallback is enabled', async () => {
      SecureStorageService.getSecure.mockResolvedValue(true);

      const result = await PINAuthService.isPINFallbackEnabled();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false when PIN fallback is disabled', async () => {
      SecureStorageService.getSecure.mockResolvedValue(false);

      const result = await PINAuthService.isPINFallbackEnabled();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should return false when PIN fallback setting is not set', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);

      const result = await PINAuthService.isPINFallbackEnabled();

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('changePIN', () => {
    it('should allow PIN change with correct current PIN', async () => {
      const currentPIN = '1234';
      const newPIN = '5678';
      const storedHash = 'hashed_1234';
      const newHash = 'hashed_5678';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(true);
      CryptoService.hashPIN.mockResolvedValue(newHash);
      SecureStorageService.saveSecure.mockResolvedValue();

      const result = await PINAuthService.changePIN(currentPIN, newPIN);

      expect(result.success).toBe(true);
      expect(CryptoService.verifyPIN).toHaveBeenCalledWith(currentPIN, storedHash);
      expect(CryptoService.hashPIN).toHaveBeenCalledWith(newPIN);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('USER_PIN', newHash);
    });

    it('should reject PIN change with incorrect current PIN', async () => {
      const currentPIN = '1234';
      const newPIN = '5678';
      const storedHash = 'hashed_1234';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(false);

      const result = await PINAuthService.changePIN(currentPIN, newPIN);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Current PIN is incorrect');
      expect(CryptoService.hashPIN).not.toHaveBeenCalled();
    });

    it('should validate new PIN format', async () => {
      const currentPIN = '1234';
      const newPIN = '123'; // Too short
      const storedHash = 'hashed_1234';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(true);

      const result = await PINAuthService.changePIN(currentPIN, newPIN);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('PIN must be at least 4 digits');
    });
  });

  describe('removePIN', () => {
    it('should remove PIN when provided correct PIN', async () => {
      const pin = '1234';
      const storedHash = 'hashed_1234';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(true);
      SecureStorageService.deleteSecure.mockResolvedValue();

      const result = await PINAuthService.removePIN(pin);

      expect(result.success).toBe(true);
      expect(CryptoService.verifyPIN).toHaveBeenCalledWith(pin, storedHash);
      expect(SecureStorageService.deleteSecure).toHaveBeenCalledWith('USER_PIN');
      expect(SecureStorageService.deleteSecure).toHaveBeenCalledWith('PIN_FALLBACK_ENABLED');
    });

    it('should reject removal with incorrect PIN', async () => {
      const pin = '5678';
      const storedHash = 'hashed_1234';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(false);

      const result = await PINAuthService.removePIN(pin);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('PIN is incorrect');
      expect(SecureStorageService.deleteSecure).not.toHaveBeenCalled();
    });
  });

  describe('recordFailedPINAttempt', () => {
    it('should increment failed PIN attempt counter', async () => {
      SecureStorageService.getSecure.mockResolvedValue(2);
      SecureStorageService.saveSecure.mockResolvedValue();

      const result = await PINAuthService.recordFailedPINAttempt();

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('FAILED_PIN_ATTEMPTS', 3);
    });

    it('should start counter at 1 for first failure', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);
      SecureStorageService.saveSecure.mockResolvedValue();

      const result = await PINAuthService.recordFailedPINAttempt();

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('FAILED_PIN_ATTEMPTS', 1);
    });
  });

  describe('resetFailedPINAttempts', () => {
    it('should delete failed PIN attempt counter', async () => {
      SecureStorageService.deleteSecure.mockResolvedValue();

      const result = await PINAuthService.resetFailedPINAttempts();

      expect(result.success).toBe(true);
      expect(SecureStorageService.deleteSecure).toHaveBeenCalledWith('FAILED_PIN_ATTEMPTS');
    });
  });
});
