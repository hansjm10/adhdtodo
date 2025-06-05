// ABOUTME: Service for handling PIN-based authentication as a secure fallback
// option when biometric authentication is unavailable or fails

import { SecureStorageService } from './SecureStorageService';
import { CryptoService } from './CryptoService';

export class PINAuthService {
  private static readonly MIN_PIN_LENGTH = 4;
  private static readonly MAX_PIN_LENGTH = 8;
  private static readonly PIN_REGEX = /^\d+$/;

  /**
   * Setup a new PIN for the user
   */
  static async setupPIN(pin: string): Promise<void> {
    this.validatePIN(pin);
    const hashedPIN = await CryptoService.hashPIN(pin);
    await SecureStorageService.saveSecure('USER_PIN', hashedPIN);
  }

  /**
   * Verify a PIN against the stored hash
   */
  static async verifyPIN(pin: string): Promise<boolean> {
    const storedHash = await SecureStorageService.getSecure<string>('USER_PIN');
    if (!storedHash) {
      return false;
    }
    return CryptoService.verifyPIN(pin, storedHash);
  }

  /**
   * Check if a PIN has been set up
   */
  static async isPINEnabled(): Promise<boolean> {
    const pin = await SecureStorageService.getSecure<string>('USER_PIN');
    return !!pin;
  }

  /**
   * Enable PIN as a fallback authentication method
   */
  static async enablePINFallback(): Promise<void> {
    await SecureStorageService.saveSecure('PIN_FALLBACK_ENABLED', true);
  }

  /**
   * Disable PIN as a fallback authentication method
   */
  static async disablePINFallback(): Promise<void> {
    await SecureStorageService.saveSecure('PIN_FALLBACK_ENABLED', false);
  }

  /**
   * Check if PIN fallback is enabled
   */
  static async isPINFallbackEnabled(): Promise<boolean> {
    const enabled = await SecureStorageService.getSecure<boolean>('PIN_FALLBACK_ENABLED');
    return enabled === true;
  }

  /**
   * Change the user's PIN
   */
  static async changePIN(currentPIN: string, newPIN: string): Promise<void> {
    const storedHash = await SecureStorageService.getSecure<string>('USER_PIN');
    if (!storedHash || !(await CryptoService.verifyPIN(currentPIN, storedHash))) {
      throw new Error('Current PIN is incorrect');
    }

    this.validatePIN(newPIN);
    const newHash = await CryptoService.hashPIN(newPIN);
    await SecureStorageService.saveSecure('USER_PIN', newHash);
  }

  /**
   * Remove the user's PIN
   */
  static async removePIN(pin: string): Promise<void> {
    const storedHash = await SecureStorageService.getSecure<string>('USER_PIN');
    if (!storedHash || !(await CryptoService.verifyPIN(pin, storedHash))) {
      throw new Error('PIN is incorrect');
    }

    await SecureStorageService.deleteSecure('USER_PIN');
    await SecureStorageService.deleteSecure('PIN_FALLBACK_ENABLED');
  }

  /**
   * Record a failed PIN attempt
   */
  static async recordFailedPINAttempt(): Promise<number> {
    const attempts = (await SecureStorageService.getSecure<number>('FAILED_PIN_ATTEMPTS')) ?? 0;
    const newCount = attempts + 1;
    await SecureStorageService.saveSecure('FAILED_PIN_ATTEMPTS', newCount);
    return newCount;
  }

  /**
   * Reset failed PIN attempts counter
   */
  static async resetFailedPINAttempts(): Promise<void> {
    await SecureStorageService.deleteSecure('FAILED_PIN_ATTEMPTS');
  }

  /**
   * Validate PIN format
   */
  private static validatePIN(pin: string): void {
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
