// ABOUTME: Tests for PINAuthService handling PIN-based authentication
// including secure PIN storage, verification, and attempt tracking

import { PINAuthService } from '../PINAuthService';
import { SecureStorageService } from '../SecureStorageService';
import { CryptoService } from '../CryptoService';

// Mock dependencies
jest.mock('../SecureStorageService', () => ({
  SecureStorageService: {
    saveSecure: jest.fn(),
    getSecure: jest.fn(),
    deleteSecure: jest.fn(),
  },
}));

jest.mock('../CryptoService', () => ({
  CryptoService: {
    hashPIN: jest.fn(),
    verifyPIN: jest.fn(),
  },
}));

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

      await PINAuthService.setupPIN(pin);

      expect(CryptoService.hashPIN).toHaveBeenCalledWith(pin);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('USER_PIN', hashedPIN);
    });

    it('should validate PIN format before saving', async () => {
      await expect(PINAuthService.setupPIN('123')).rejects.toThrow('PIN must be at least 4 digits');
      expect(CryptoService.hashPIN).not.toHaveBeenCalled();
      expect(SecureStorageService.saveSecure).not.toHaveBeenCalled();
    });

    it('should reject non-numeric PINs', async () => {
      await expect(PINAuthService.setupPIN('abcd')).rejects.toThrow(
        'PIN must contain only numbers',
      );
      expect(CryptoService.hashPIN).not.toHaveBeenCalled();
      expect(SecureStorageService.saveSecure).not.toHaveBeenCalled();
    });

    it('should reject PINs longer than 8 digits', async () => {
      await expect(PINAuthService.setupPIN('123456789')).rejects.toThrow(
        'PIN must not exceed 8 digits',
      );
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

      expect(SecureStorageService.getSecure).toHaveBeenCalledWith('USER_PIN');
      expect(CryptoService.verifyPIN).toHaveBeenCalledWith(pin, storedHash);
      expect(result).toBe(true);
    });

    it('should reject incorrect PIN', async () => {
      const pin = '1234';
      const storedHash = 'hashed_5678';
      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(false);

      const result = await PINAuthService.verifyPIN(pin);

      expect(result).toBe(false);
    });

    it('should return false when no PIN is set', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);

      const result = await PINAuthService.verifyPIN('1234');

      expect(result).toBe(false);
      expect(CryptoService.verifyPIN).not.toHaveBeenCalled();
    });
  });

  describe('isPINEnabled', () => {
    it('should return true when PIN is set', async () => {
      SecureStorageService.getSecure.mockResolvedValue('hashed_pin');

      const result = await PINAuthService.isPINEnabled();

      expect(result).toBe(true);
      expect(SecureStorageService.getSecure).toHaveBeenCalledWith('USER_PIN');
    });

    it('should return false when PIN is not set', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);

      const result = await PINAuthService.isPINEnabled();

      expect(result).toBe(false);
    });
  });

  describe('enablePINFallback', () => {
    it('should enable PIN fallback option', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      await PINAuthService.enablePINFallback();

      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('PIN_FALLBACK_ENABLED', true);
    });
  });

  describe('disablePINFallback', () => {
    it('should disable PIN fallback option', async () => {
      SecureStorageService.saveSecure.mockResolvedValue();

      await PINAuthService.disablePINFallback();

      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('PIN_FALLBACK_ENABLED', false);
    });
  });

  describe('isPINFallbackEnabled', () => {
    it('should return true when PIN fallback is enabled', async () => {
      SecureStorageService.getSecure.mockResolvedValue(true);

      const result = await PINAuthService.isPINFallbackEnabled();

      expect(result).toBe(true);
      expect(SecureStorageService.getSecure).toHaveBeenCalledWith('PIN_FALLBACK_ENABLED');
    });

    it('should return false when PIN fallback is disabled', async () => {
      SecureStorageService.getSecure.mockResolvedValue(false);

      const result = await PINAuthService.isPINFallbackEnabled();

      expect(result).toBe(false);
    });

    it('should return false when PIN fallback setting is not set', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);

      const result = await PINAuthService.isPINFallbackEnabled();

      expect(result).toBe(false);
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

      await PINAuthService.changePIN(currentPIN, newPIN);

      expect(CryptoService.verifyPIN).toHaveBeenCalledWith(currentPIN, storedHash);
      expect(CryptoService.hashPIN).toHaveBeenCalledWith(newPIN);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('USER_PIN', newHash);
    });

    it('should reject PIN change with incorrect current PIN', async () => {
      const currentPIN = '1234';
      const newPIN = '5678';
      const storedHash = 'hashed_9999';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(false);

      await expect(PINAuthService.changePIN(currentPIN, newPIN)).rejects.toThrow(
        'Current PIN is incorrect',
      );

      expect(CryptoService.hashPIN).not.toHaveBeenCalled();
      expect(SecureStorageService.saveSecure).not.toHaveBeenCalledWith(
        'USER_PIN',
        expect.anything(),
      );
    });

    it('should validate new PIN format', async () => {
      const currentPIN = '1234';
      const invalidNewPIN = 'abc';
      const storedHash = 'hashed_1234';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(true);

      await expect(PINAuthService.changePIN(currentPIN, invalidNewPIN)).rejects.toThrow(
        'PIN must contain only numbers',
      );
    });
  });

  describe('removePIN', () => {
    it('should remove PIN when provided correct PIN', async () => {
      const pin = '1234';
      const storedHash = 'hashed_1234';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(true);
      SecureStorageService.deleteSecure.mockResolvedValue();

      await PINAuthService.removePIN(pin);

      expect(CryptoService.verifyPIN).toHaveBeenCalledWith(pin, storedHash);
      expect(SecureStorageService.deleteSecure).toHaveBeenCalledWith('USER_PIN');
      expect(SecureStorageService.deleteSecure).toHaveBeenCalledWith('PIN_FALLBACK_ENABLED');
    });

    it('should reject removal with incorrect PIN', async () => {
      const pin = '1234';
      const storedHash = 'hashed_5678';

      SecureStorageService.getSecure.mockResolvedValue(storedHash);
      CryptoService.verifyPIN.mockResolvedValue(false);

      await expect(PINAuthService.removePIN(pin)).rejects.toThrow('PIN is incorrect');

      expect(SecureStorageService.deleteSecure).not.toHaveBeenCalled();
    });
  });

  describe('recordFailedPINAttempt', () => {
    it('should increment failed PIN attempt counter', async () => {
      SecureStorageService.getSecure.mockResolvedValue(2);
      SecureStorageService.saveSecure.mockResolvedValue();

      const count = await PINAuthService.recordFailedPINAttempt();

      expect(count).toBe(3);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('FAILED_PIN_ATTEMPTS', 3);
    });

    it('should start counter at 1 for first failure', async () => {
      SecureStorageService.getSecure.mockResolvedValue(null);
      SecureStorageService.saveSecure.mockResolvedValue();

      const count = await PINAuthService.recordFailedPINAttempt();

      expect(count).toBe(1);
      expect(SecureStorageService.saveSecure).toHaveBeenCalledWith('FAILED_PIN_ATTEMPTS', 1);
    });
  });

  describe('resetFailedPINAttempts', () => {
    it('should delete failed PIN attempt counter', async () => {
      SecureStorageService.deleteSecure.mockResolvedValue();

      await PINAuthService.resetFailedPINAttempts();

      expect(SecureStorageService.deleteSecure).toHaveBeenCalledWith('FAILED_PIN_ATTEMPTS');
    });
  });
});
