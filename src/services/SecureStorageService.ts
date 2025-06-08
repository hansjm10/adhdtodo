// ABOUTME: Provides encrypted storage using expo-secure-store to replace AsyncStorage
// for sensitive data like user profiles, tokens, and tasks

import * as SecureStore from 'expo-secure-store';
import { BaseService } from './BaseService';

export interface ISecureStorageService {
  setItem(key: string, value: unknown): Promise<void>;
  getItem<T = unknown>(key: string): Promise<T | null>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
  multiGet<T = unknown>(keys: string[]): Promise<Array<[string, T | null]>>;
  multiSet(kvPairs: Array<[string, unknown]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  mergeItem(key: string, value: Record<string, unknown>): Promise<void>;
  saveSecure(key: string, value: unknown): Promise<void>;
  getSecure<T = unknown>(key: string): Promise<T | null>;
  deleteSecure(key: string): Promise<void>;
}

class SecureStorageService extends BaseService implements ISecureStorageService {
  // expo-secure-store has a 2KB size limit per item
  static readonly MAX_VALUE_SIZE = 2048;

  constructor() {
    super('SecureStorageService');
  }

  private validateKey(key: string): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Storage key must be a non-empty string');
    }
  }

  async setItem(key: string, value: unknown): Promise<void> {
    const result = await this.wrapAsync(
      'setItem',
      async () => {
        this.validateKey(key);
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        // Check size limit
        if (stringValue.length > SecureStorageService.MAX_VALUE_SIZE) {
          throw new Error(
            `Value size exceeds the maximum limit of ${SecureStorageService.MAX_VALUE_SIZE} bytes`,
          );
        }

        await SecureStore.setItemAsync(key, stringValue);
      },
      { key, valueSize: typeof value === 'string' ? value.length : JSON.stringify(value).length },
    );

    if (!result.success) {
      throw new Error(result.error!.message);
    }
  }

  async getItem<T = unknown>(key: string): Promise<T | null> {
    const result = await this.wrapAsync(
      'getItem',
      async () => {
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
      },
      { key },
    );

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    return result.data!;
  }

  async removeItem(key: string): Promise<void> {
    const result = await this.wrapAsync(
      'removeItem',
      async () => {
        this.validateKey(key);
        await SecureStore.deleteItemAsync(key);
      },
      { key },
    );

    if (!result.success) {
      throw new Error(result.error!.message);
    }
  }

  getAllKeys(): Promise<string[]> {
    // SecureStore does not support getting all keys
    // Return empty array for compatibility
    const result = this.wrapSync('getAllKeys', () => []);

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    return Promise.resolve(result.data!);
  }

  clear(): Promise<void> {
    // SecureStore does not support clearing all items
    const result = this.wrapSync('clear', () => {
      throw new Error('SecureStore does not support clearing all items');
    });

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    return Promise.resolve();
  }

  async multiGet<T = unknown>(keys: string[]): Promise<Array<[string, T | null]>> {
    const result = await this.wrapAsync(
      'multiGet',
      async () => {
        if (!Array.isArray(keys)) {
          throw new Error('Keys must be an array');
        }

        const promises = keys.map(async (key) => {
          try {
            const value = await this.getItem<T>(key);
            return [key, value] as [string, T | null];
          } catch (error) {
            this.logger.error('Failed to get item from secure storage', {
              code: 'SECURE_STORE_GET_001',
            });
            return [key, null] as [string, T | null];
          }
        });

        return Promise.all(promises);
      },
      { keysCount: keys.length },
    );

    if (!result.success) {
      throw new Error(result.error!.message);
    }

    return result.data!;
  }

  async multiSet(kvPairs: Array<[string, unknown]>): Promise<void> {
    const result = await this.wrapAsync(
      'multiSet',
      async () => {
        if (!Array.isArray(kvPairs)) {
          throw new Error('Key-value pairs must be an array');
        }

        const promises = kvPairs.map(async ([key, value]) => {
          try {
            await this.setItem(key, value);
            return { key, success: true };
          } catch (error) {
            this.logger.error('Failed to set item in secure storage', {
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
          this.logger.warn('Some items failed to save in secure storage', {
            code: 'SECURE_STORE_MULTI_SET_001',
          });
        }
      },
      { pairsCount: kvPairs.length },
    );

    if (!result.success) {
      throw new Error(result.error!.message);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    const result = await this.wrapAsync(
      'multiRemove',
      async () => {
        if (!Array.isArray(keys)) {
          throw new Error('Keys must be an array');
        }

        const promises = keys.map(async (key) => {
          try {
            await this.removeItem(key);
            return { key, success: true };
          } catch (error) {
            this.logger.error('Failed to remove item from secure storage', {
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
          this.logger.warn('Some items failed to remove from secure storage', {
            code: 'SECURE_STORE_MULTI_REMOVE_001',
          });
        }
      },
      { keysCount: keys.length },
    );

    if (!result.success) {
      throw new Error(result.error!.message);
    }
  }

  async mergeItem(key: string, value: Record<string, unknown>): Promise<void> {
    const result = await this.wrapAsync(
      'mergeItem',
      async () => {
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
      },
      { key },
    );

    if (!result.success) {
      throw new Error(result.error!.message);
    }
  }

  // Alias methods for security-specific operations
  async saveSecure(key: string, value: unknown): Promise<void> {
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
