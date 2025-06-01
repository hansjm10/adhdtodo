// ABOUTME: Provides encrypted storage using expo-secure-store to replace AsyncStorage
// for sensitive data like user profiles, tokens, and tasks

import * as SecureStore from 'expo-secure-store';

export interface ISecureStorageService {
  setItem(key: string, value: any): Promise<void>;
  getItem<T = any>(key: string): Promise<T | null>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
  multiGet(keys: string[]): Promise<Array<[string, any]>>;
  multiSet(kvPairs: Array<[string, any]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
  mergeItem(key: string, value: Record<string, any>): Promise<void>;
}

class SecureStorageService implements ISecureStorageService {
  // expo-secure-store has a 2KB size limit per item
  static readonly MAX_VALUE_SIZE = 2048;

  private validateKey(key: string): void {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Storage key must be a non-empty string');
    }
  }

  async setItem(key: string, value: any): Promise<void> {
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

  async getItem<T = any>(key: string): Promise<T | null> {
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

  async multiGet(keys: string[]): Promise<Array<[string, any]>> {
    if (!Array.isArray(keys)) {
      throw new Error('Keys must be an array');
    }

    const promises = keys.map(async (key) => {
      try {
        const value = await this.getItem(key);
        return [key, value] as [string, any];
      } catch (error) {
        console.error(`Error getting item for key ${key}:`, error);
        return [key, null] as [string, any];
      }
    });

    return Promise.all(promises);
  }

  async multiSet(kvPairs: Array<[string, any]>): Promise<void> {
    if (!Array.isArray(kvPairs)) {
      throw new Error('Key-value pairs must be an array');
    }

    const promises = kvPairs.map(async ([key, value]) => {
      try {
        await this.setItem(key, value);
        return { key, success: true };
      } catch (error: any) {
        console.error(`Error setting item for key ${key}:`, error);
        return { key, success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      console.warn('Some items failed to save:', failures);
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
      } catch (error: any) {
        console.error(`Error removing item for key ${key}:`, error);
        return { key, success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      console.warn('Some items failed to remove:', failures);
    }
  }

  async mergeItem(key: string, value: Record<string, any>): Promise<void> {
    this.validateKey(key);

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Value must be a non-null object for merging');
    }

    const existing = await this.getItem<Record<string, any>>(key);

    if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
      // If no existing value or it's not an object, just set the new value
      await this.setItem(key, value);
    } else {
      // Merge the objects
      const merged = { ...existing, ...value };
      await this.setItem(key, merged);
    }
  }
}

export default new SecureStorageService();