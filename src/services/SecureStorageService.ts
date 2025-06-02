// ABOUTME: Provides encrypted storage using expo-secure-store to replace AsyncStorage
// for sensitive data like user profiles, tokens, and tasks

import * as SecureStore from 'expo-secure-store';
import SecureLogger from './SecureLogger';

export interface ISecureStorageService {
  setItem<T = unknown>(key: string, value: T): Promise<void>;
  getItem<T = unknown>(key: string): Promise<T | null>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
  multiGet<T = unknown>(keys: string[]): Promise<Array<[string, T | null]>>;
  multiSet<T = unknown>(kvPairs: Array<[string, T]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  mergeItem<T extends Record<string, unknown>>(key: string, value: T): Promise<void>;
  saveSecure<T = unknown>(key: string, value: T): Promise<void>;
  getSecure<T = unknown>(key: string): Promise<T | null>;
  deleteSecure(key: string): Promise<void>;
}

class SecureStorageService implements ISecureStorageService {
  // expo-secure-store has a 2KB size limit per item
  static readonly MAX_VALUE_SIZE = 2048;

  private validateKey(key: string): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Storage key must be a non-empty string');
    }
  }

  async setItem<T = unknown>(key: string, value: T): Promise<void> {
    this.validateKey(key);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Check size limit
    if (stringValue.length > SecureStorageService.MAX_VALUE_SIZE) {
      throw new Error(
        `Value size exceeds the maximum limit of ${SecureStorageService.MAX_VALUE_SIZE} bytes`,
      );
    }

    await SecureStore.setItemAsync(key, stringValue);
  }

  async getItem<T = unknown>(key: string): Promise<T | null> {
    this.validateKey(key);
    const value = await SecureStore.getItemAsync(key);
    if (value === null) {
      return null;
    }

    // Try to parse as JSON, if it fails return as string
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async removeItem(key: string): Promise<void> {
    this.validateKey(key);
    await SecureStore.deleteItemAsync(key);
  }

  async getAllKeys(): Promise<string[]> {
    // SecureStore does not support getting all keys
    // Return empty array for compatibility
    return [];
  }

  async clear(): Promise<void> {
    // SecureStore does not support clearing all items
    throw new Error('SecureStore does not support clearing all items');
  }

  async multiGet<T = unknown>(keys: string[]): Promise<Array<[string, T | null]>> {
    if (!Array.isArray(keys)) {
      throw new Error('Keys must be an array');
    }

    const promises = keys.map(async (key) => {
      try {
        const value = await this.getItem(key);
        return [key, value] as [string, T | null];
      } catch (error) {
        SecureLogger.error('Failed to get item from secure storage', {
          code: 'SECURE_STORE_GET_001',
        });
        return [key, null] as [string, T | null];
      }
    });

    return Promise.all(promises);
  }

  async multiSet<T = unknown>(kvPairs: Array<[string, T]>): Promise<void> {
    if (!Array.isArray(kvPairs)) {
      throw new Error('Key-value pairs must be an array');
    }

    const promises = kvPairs.map(async ([key, value]) => {
      try {
        await this.setItem(key, value);
        return { key, success: true };
      } catch (error) {
        SecureLogger.error('Failed to set item in secure storage', {
          code: 'SECURE_STORE_SET_001',
        });
        return {
          key,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const results = await Promise.all(promises);
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      SecureLogger.warn('Some items failed to save in secure storage', {
        code: 'SECURE_STORE_MULTI_SET_001',
      });
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    if (!Array.isArray(keys)) {
      throw new Error('Keys must be an array');
    }

    const promises = keys.map(async (key) => {
      try {
        await this.removeItem(key);
        return { key, success: true };
      } catch (error) {
        SecureLogger.error('Failed to remove item from secure storage', {
          code: 'SECURE_STORE_REMOVE_001',
        });
        return {
          key,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const results = await Promise.all(promises);
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      SecureLogger.warn('Some items failed to remove from secure storage', {
        code: 'SECURE_STORE_MULTI_REMOVE_001',
      });
    }
  }

  async mergeItem<T extends Record<string, unknown>>(key: string, value: T): Promise<void> {
    this.validateKey(key);

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Value must be a non-null object for merging');
    }

    const existing = await this.getItem<Record<string, unknown>>(key);

    if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
      // If no existing value or it's not an object, just set the new value
      await this.setItem(key, value);
    } else {
      // Merge the objects
      const merged = { ...existing, ...value };
      await this.setItem(key, merged);
    }
  }

  // Alias methods for security-specific operations
  async saveSecure<T = unknown>(key: string, value: T): Promise<void> {
    return this.setItem(key, value);
  }

  async getSecure<T = unknown>(key: string): Promise<T | null> {
    return this.getItem<T>(key);
  }

  async deleteSecure(key: string): Promise<void> {
    return this.removeItem(key);
  }
}

const secureStorageService = new SecureStorageService();
export { secureStorageService as SecureStorageService };
export default secureStorageService;
