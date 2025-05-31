// ABOUTME: Provides encrypted storage using expo-secure-store to replace AsyncStorage
// for sensitive data like user profiles, tokens, and tasks

import * as SecureStore from 'expo-secure-store';

class SecureStorageService {
  async setItem(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await SecureStore.setItemAsync(key, stringValue);
  }

  async getItem(key) {
    const value = await SecureStore.getItemAsync(key);
    if (value === null) {
      return null;
    }

    // Try to parse as JSON, if it fails return as string
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async removeItem(key) {
    await SecureStore.deleteItemAsync(key);
  }

  async getAllKeys() {
    // SecureStore does not support getting all keys
    // Return empty array for compatibility
    return [];
  }

  async clear() {
    // SecureStore does not support clearing all items
    throw new Error('SecureStore does not support clearing all items');
  }

  async multiGet(keys) {
    const results = [];
    for (const key of keys) {
      const value = await this.getItem(key);
      results.push([key, value]);
    }
    return results;
  }

  async multiSet(kvPairs) {
    for (const [key, value] of kvPairs) {
      await this.setItem(key, value);
    }
  }

  async multiRemove(keys) {
    for (const key of keys) {
      await this.removeItem(key);
    }
  }

  async mergeItem(key, value) {
    const existing = await this.getItem(key);

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
