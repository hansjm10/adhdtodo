// ABOUTME: Test suite for SecureStorageService that provides encrypted storage functionality
// to replace insecure AsyncStorage usage for sensitive data

import * as SecureStore from 'expo-secure-store';
import SecureStorageService from '../SecureStorageService';

// Mock expo-secure-store
jest.mock('expo-secure-store');

describe('SecureStorageService', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Reset mock implementations to default
    SecureStore.setItemAsync.mockImplementation(() => Promise.resolve());
    SecureStore.getItemAsync.mockImplementation(() => Promise.resolve(null));
    SecureStore.deleteItemAsync.mockImplementation(() => Promise.resolve());

    // Mock console methods to avoid test output noise
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('setItem', () => {
    it('should store encrypted value for a given key', async () => {
      const key = 'test-key';
      const value = { data: 'sensitive information' };

      await SecureStorageService.setItem(key, value);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, JSON.stringify(value));
    });

    it('should handle string values', async () => {
      const key = 'test-key';
      const value = 'plain string value';

      await SecureStorageService.setItem(key, value);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
    });

    it('should throw error when storage fails', async () => {
      const error = new Error('Storage failed');
      SecureStore.setItemAsync.mockRejectedValue(error);

      await expect(SecureStorageService.setItem('key', 'value')).rejects.toThrow('Storage failed');
    });

    it('should throw error for invalid key', async () => {
      await expect(SecureStorageService.setItem('', 'value')).rejects.toThrow(
        'Storage key must be a non-empty string',
      );
      await expect(SecureStorageService.setItem(null, 'value')).rejects.toThrow(
        'Storage key must be a non-empty string',
      );
      await expect(SecureStorageService.setItem(123, 'value')).rejects.toThrow(
        'Storage key must be a non-empty string',
      );
    });

    it('should throw error when value size exceeds limit', async () => {
      const largeValue = 'x'.repeat(3000);
      await expect(SecureStorageService.setItem('key', largeValue)).rejects.toThrow(
        'Value size exceeds the maximum limit of 2048 bytes',
      );
    });
  });

  describe('getItem', () => {
    it('should retrieve and parse JSON value', async () => {
      const value = { data: 'sensitive information' };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(value));

      const result = await SecureStorageService.getItem('test-key');

      expect(result).toEqual(value);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('test-key');
    });

    it('should return string values as-is', async () => {
      const value = 'plain string value';
      SecureStore.getItemAsync.mockResolvedValue(value);

      const result = await SecureStorageService.getItem('test-key');

      expect(result).toBe(value);
    });

    it('should return null when key does not exist', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);

      const result = await SecureStorageService.getItem('non-existent');

      expect(result).toBeNull();
    });

    it('should return string when JSON parsing fails', async () => {
      const invalidJson = 'not a valid json';
      SecureStore.getItemAsync.mockResolvedValue(invalidJson);

      const result = await SecureStorageService.getItem('test-key');

      expect(result).toBe(invalidJson);
    });

    it('should throw error for invalid key', async () => {
      await expect(SecureStorageService.getItem('')).rejects.toThrow(
        'Storage key must be a non-empty string',
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item from secure storage', async () => {
      await SecureStorageService.removeItem('test-key');

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test-key');
    });

    it('should handle removal errors', async () => {
      const error = new Error('Removal failed');
      SecureStore.deleteItemAsync.mockRejectedValue(error);

      await expect(SecureStorageService.removeItem('key')).rejects.toThrow('Removal failed');
    });

    it('should throw error for invalid key', async () => {
      await expect(SecureStorageService.removeItem('')).rejects.toThrow(
        'Storage key must be a non-empty string',
      );
    });
  });

  describe('getAllKeys', () => {
    it('should return empty array (SecureStore does not support getAllKeys)', async () => {
      const keys = await SecureStorageService.getAllKeys();
      expect(keys).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should throw error as SecureStore does not support clear', async () => {
      await expect(SecureStorageService.clear()).rejects.toThrow(
        'SecureStore does not support clearing all items',
      );
    });
  });

  describe('multiGet', () => {
    it('should retrieve multiple items', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce(JSON.stringify({ id: 1 }))
        .mockResolvedValueOnce('string value')
        .mockResolvedValueOnce(null);

      const result = await SecureStorageService.multiGet(['key1', 'key2', 'key3']);

      expect(result).toEqual([
        ['key1', { id: 1 }],
        ['key2', 'string value'],
        ['key3', null],
      ]);
    });

    it('should handle errors gracefully and return null for failed items', async () => {
      SecureStore.getItemAsync
        .mockResolvedValueOnce(JSON.stringify({ id: 1 }))
        .mockRejectedValueOnce(new Error('Failed to get'))
        .mockResolvedValueOnce('value3');

      const result = await SecureStorageService.multiGet(['key1', 'key2', 'key3']);

      expect(result).toEqual([
        ['key1', { id: 1 }],
        ['key2', null],
        ['key3', 'value3'],
      ]);
    });

    it('should throw error for non-array input', async () => {
      await expect(SecureStorageService.multiGet('not-an-array')).rejects.toThrow(
        'Keys must be an array',
      );
    });
  });

  describe('multiSet', () => {
    it('should set multiple items', async () => {
      const kvPairs = [
        ['key1', { id: 1 }],
        ['key2', 'string value'],
      ];

      await SecureStorageService.multiSet(kvPairs);

      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key1', JSON.stringify({ id: 1 }));
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key2', 'string value');
    });

    it('should handle partial failures', async () => {
      const kvPairs = [
        ['key1', { id: 1 }],
        ['key2', 'x'.repeat(3000)], // Too large
        ['key3', 'value3'],
      ];

      await SecureStorageService.multiSet(kvPairs);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should throw error for non-array input', async () => {
      await expect(SecureStorageService.multiSet('not-an-array')).rejects.toThrow(
        'Key-value pairs must be an array',
      );
    });
  });

  describe('multiRemove', () => {
    it('should remove multiple items', async () => {
      const keys = ['key1', 'key2', 'key3'];

      await SecureStorageService.multiRemove(keys);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key2');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key3');
    });

    it('should handle partial failures', async () => {
      SecureStore.deleteItemAsync
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce();

      await SecureStorageService.multiRemove(['key1', 'key2', 'key3']);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should throw error for non-array input', async () => {
      await expect(SecureStorageService.multiRemove('not-an-array')).rejects.toThrow(
        'Keys must be an array',
      );
    });
  });

  describe('mergeItem', () => {
    it('should merge objects stored at a key', async () => {
      const existing = { name: 'John', age: 30 };
      const toMerge = { age: 31, city: 'New York' };

      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(existing));

      await SecureStorageService.mergeItem('user', toMerge);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user',
        JSON.stringify({ name: 'John', age: 31, city: 'New York' }),
      );
    });

    it('should create new item if key does not exist', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      const value = { name: 'John' };

      await SecureStorageService.mergeItem('user', value);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user', JSON.stringify(value));
    });

    it('should overwrite non-object values', async () => {
      SecureStore.getItemAsync.mockResolvedValue('string value');
      const newValue = { name: 'John' };

      await SecureStorageService.mergeItem('user', newValue);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('user', JSON.stringify(newValue));
    });

    it('should throw error for invalid value types', async () => {
      await expect(SecureStorageService.mergeItem('key', 'string')).rejects.toThrow(
        'Value must be a non-null object for merging',
      );
      await expect(SecureStorageService.mergeItem('key', null)).rejects.toThrow(
        'Value must be a non-null object for merging',
      );
      await expect(SecureStorageService.mergeItem('key', [1, 2, 3])).rejects.toThrow(
        'Value must be a non-null object for merging',
      );
    });

    it('should throw error for invalid key', async () => {
      await expect(SecureStorageService.mergeItem('', { name: 'John' })).rejects.toThrow(
        'Storage key must be a non-empty string',
      );
    });
  });

  describe('AsyncStorage compatibility', () => {
    it('should provide AsyncStorage-compatible API', () => {
      expect(SecureStorageService.setItem).toBeDefined();
      expect(SecureStorageService.getItem).toBeDefined();
      expect(SecureStorageService.removeItem).toBeDefined();
      expect(SecureStorageService.getAllKeys).toBeDefined();
      expect(SecureStorageService.clear).toBeDefined();
      expect(SecureStorageService.multiGet).toBeDefined();
      expect(SecureStorageService.multiSet).toBeDefined();
      expect(SecureStorageService.multiRemove).toBeDefined();
      expect(SecureStorageService.mergeItem).toBeDefined();
    });
  });
});
