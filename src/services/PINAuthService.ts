// ABOUTME: Service for handling PIN-based authentication as a secure fallback
// option when biometric authentication is unavailable or fails

import { BaseService } from './BaseService';
import SecureStorageService from './SecureStorageService';
import CryptoService from './CryptoService';
import type { Result } from '../types/common.types';

export interface PINResult {
  success: boolean;
  error?: string;
}

export class PINAuthService extends BaseService {
  private readonly MIN_PIN_LENGTH = 4;
  private readonly MAX_PIN_LENGTH = 8;
  private readonly PIN_REGEX = /^\d+$/;

  constructor() {
    super('PINAuth');
  }

  /**
   * Setup a new PIN for the user
   */
  async setupPIN(pin: string): Promise<Result<void>> {
    return this.wrapAsync('setupPIN', async () => {
      this.validatePIN(pin);
      const hashedPIN = await CryptoService.hashPIN(pin);
      await SecureStorageService.saveSecure('USER_PIN', hashedPIN);
    });
  }

  /**
   * Verify a PIN against the stored hash
   */
  async verifyPIN(pin: string): Promise<Result<boolean>> {
    return this.wrapAsync('verifyPIN', async () => {
      const storedHash = await SecureStorageService.getSecure<string>('USER_PIN');
      if (!storedHash) {
        return false;
      }
      return CryptoService.verifyPIN(pin, storedHash);
    });
  }

  /**
   * Check if a PIN has been set up
   */
  async isPINEnabled(): Promise<Result<boolean>> {
    return this.wrapAsync('isPINEnabled', async () => {
      const pin = await SecureStorageService.getSecure<string>('USER_PIN');
      return !!pin;
    });
  }

  /**
   * Enable PIN as a fallback authentication method
   */
  async enablePINFallback(): Promise<Result<void>> {
    return this.wrapAsync('enablePINFallback', async () => {
      await SecureStorageService.saveSecure('PIN_FALLBACK_ENABLED', true);
    });
  }

  /**
   * Disable PIN as a fallback authentication method
   */
  async disablePINFallback(): Promise<Result<void>> {
    return this.wrapAsync('disablePINFallback', async () => {
      await SecureStorageService.saveSecure('PIN_FALLBACK_ENABLED', false);
    });
  }

  /**
   * Check if PIN fallback is enabled
   */
  async isPINFallbackEnabled(): Promise<Result<boolean>> {
    return this.wrapAsync('isPINFallbackEnabled', async () => {
      const enabled = await SecureStorageService.getSecure<boolean>('PIN_FALLBACK_ENABLED');
      return enabled === true;
    });
  }

  /**
   * Change the user's PIN
   */
  async changePIN(currentPIN: string, newPIN: string): Promise<Result<void>> {
    return this.wrapAsync(
      'changePIN',
      async () => {
        const storedHash = await SecureStorageService.getSecure<string>('USER_PIN');
        if (!storedHash || !(await CryptoService.verifyPIN(currentPIN, storedHash))) {
          throw new Error('Current PIN is incorrect');
        }

        this.validatePIN(newPIN);
        const newHash = await CryptoService.hashPIN(newPIN);
        await SecureStorageService.saveSecure('USER_PIN', newHash);
      },
      { hasNewPIN: true },
    );
  }

  /**
   * Remove the user's PIN
   */
  async removePIN(pin: string): Promise<Result<void>> {
    return this.wrapAsync('removePIN', async () => {
      const storedHash = await SecureStorageService.getSecure<string>('USER_PIN');
      if (!storedHash || !(await CryptoService.verifyPIN(pin, storedHash))) {
        throw new Error('PIN is incorrect');
      }

      await SecureStorageService.deleteSecure('USER_PIN');
      await SecureStorageService.deleteSecure('PIN_FALLBACK_ENABLED');
    });
  }

  /**
   * Record a failed PIN attempt
   */
  async recordFailedPINAttempt(): Promise<Result<number>> {
    return this.wrapAsync('recordFailedPINAttempt', async () => {
      const attempts = (await SecureStorageService.getSecure<number>('FAILED_PIN_ATTEMPTS')) ?? 0;
      const newCount = attempts + 1;
      await SecureStorageService.saveSecure('FAILED_PIN_ATTEMPTS', newCount);
      return newCount;
    });
  }

  /**
   * Reset failed PIN attempts counter
   */
  async resetFailedPINAttempts(): Promise<Result<void>> {
    return this.wrapAsync('resetFailedPINAttempts', async () => {
      await SecureStorageService.deleteSecure('FAILED_PIN_ATTEMPTS');
    });
  }

  /**
   * Validate PIN format
   */
  private validatePIN(pin: string): void {
    if (!this.PIN_REGEX.test(pin)) {
      throw new Error('PIN must contain only numbers');
    }
    if (pin.length < this.MIN_PIN_LENGTH) {
      throw new Error(`PIN must be at least ${this.MIN_PIN_LENGTH} digits`);
    }
    if (pin.length > this.MAX_PIN_LENGTH) {
      throw new Error(`PIN must not exceed ${this.MAX_PIN_LENGTH} digits`);
    }
  }
}

// Export singleton instance
export default new PINAuthService();
