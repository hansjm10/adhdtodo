// ABOUTME: Tests for async testing helpers
// Verifies that async utilities handle promises and timers correctly

import { act } from '@testing-library/react-native';
import {
  waitForAsyncUpdates,
  mockAsyncCall,
  mockAsyncError,
  waitForCondition,
  createDeferredPromise,
  mockAsyncStorage,
  advanceTimersAndWait,
  runAllTimersAndWait,
  mockAsyncSequence,
  waitForAllSettled,
  createTimeout,
  mockFetch,
  retryAsync,
} from '../asyncHelpers';

// Enable fake timers for some tests
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Async Helpers', () => {
  describe('waitForAsyncUpdates', () => {
    it('should wait for next tick', async () => {
      let value = 'initial';

      Promise.resolve().then(() => {
        value = 'updated';
      });

      expect(value).toBe('initial');

      await waitForAsyncUpdates();

      expect(value).toBe('updated');
    });
  });

  describe('mockAsyncCall', () => {
    it('should return a promise that resolves with value', async () => {
      const mockFn = mockAsyncCall('test-value');

      expect(mockFn).toHaveBeenCalledTimes(0);

      const result = await mockFn();

      expect(result).toBe('test-value');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should delay resolution when delay is specified', async () => {
      jest.useFakeTimers();
      const mockFn = mockAsyncCall('delayed', 100);

      const promise = mockFn();
      let resolved = false;

      promise.then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      jest.advanceTimersByTime(99);
      await Promise.resolve(); // Flush promise queue
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await Promise.resolve();
      expect(resolved).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('mockAsyncError', () => {
    it('should return a promise that rejects with error', async () => {
      const mockFn = mockAsyncError('Test error');

      await expect(mockFn()).rejects.toThrow('Test error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle Error objects', async () => {
      const error = new Error('Custom error');
      const mockFn = mockAsyncError(error);

      await expect(mockFn()).rejects.toBe(error);
    });
  });

  describe('waitForCondition', () => {
    it('should wait until condition is true', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      await waitForCondition(condition);

      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should timeout if condition never becomes true', async () => {
      const condition = () => false;

      await expect(waitForCondition(condition, { timeout: 100, interval: 10 })).rejects.toThrow();
    });
  });

  describe('createDeferredPromise', () => {
    it('should create controllable promise', async () => {
      const deferred = createDeferredPromise();

      let resolved = false;
      deferred.promise.then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      deferred.resolve('value');
      await deferred.promise;

      expect(resolved).toBe(true);
    });

    it('should handle rejection', async () => {
      const deferred = createDeferredPromise();

      deferred.reject(new Error('Test error'));

      await expect(deferred.promise).rejects.toThrow('Test error');
    });
  });

  describe('mockAsyncStorage', () => {
    it('should mock AsyncStorage operations', async () => {
      const storage = mockAsyncStorage({ existingKey: 'existingValue' });

      // Test getItem
      expect(await storage.getItem('existingKey')).toBe('existingValue');
      expect(await storage.getItem('nonExistent')).toBe(null);

      // Test setItem
      await storage.setItem('newKey', 'newValue');
      expect(await storage.getItem('newKey')).toBe('newValue');

      // Test removeItem
      await storage.removeItem('newKey');
      expect(await storage.getItem('newKey')).toBe(null);

      // Test getAllKeys
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      const keys = await storage.getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');

      // Test clear
      await storage.clear();
      expect(await storage.getAllKeys()).toHaveLength(0);
    });

    it('should handle multi operations', async () => {
      const storage = mockAsyncStorage();

      // Test multiSet
      await storage.multiSet([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      expect(await storage.getItem('key1')).toBe('value1');
      expect(await storage.getItem('key2')).toBe('value2');

      // Test multiGet
      const results = await storage.multiGet(['key1', 'key2', 'key3']);
      expect(results).toEqual([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', null],
      ]);

      // Test multiRemove
      await storage.multiRemove(['key1', 'key2']);
      expect(await storage.getItem('key1')).toBe(null);
      expect(await storage.getItem('key2')).toBe(null);
    });
  });

  describe('Timer helpers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should advance timers and wait', async () => {
      let value = 0;
      setTimeout(() => {
        value = 1;
      }, 100);

      await advanceTimersAndWait(100);

      expect(value).toBe(1);
    });

    it('should run all timers and wait', async () => {
      let value = 0;
      setTimeout(() => {
        value = 1;
      }, 100);
      setTimeout(() => {
        value = 2;
      }, 200);

      await runAllTimersAndWait();

      expect(value).toBe(2);
    });
  });

  describe('mockAsyncSequence', () => {
    it('should return different values in sequence', async () => {
      const mockFn = mockAsyncSequence(['first', 'second', 'third']);

      expect(await mockFn()).toBe('first');
      expect(await mockFn()).toBe('second');
      expect(await mockFn()).toBe('third');
      expect(await mockFn()).toBe('first'); // Cycles back
    });
  });

  describe('waitForAllSettled', () => {
    it('should wait for all promises to settle', async () => {
      const promises = [
        Promise.resolve('success'),
        Promise.reject(new Error('failure')),
        Promise.resolve('another success'),
      ];

      const results = await waitForAllSettled(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({ status: 'fulfilled', value: 'success' });
      expect(results[1]).toMatchObject({ status: 'rejected' });
      expect(results[2]).toMatchObject({ status: 'fulfilled', value: 'another success' });
    });
  });

  describe('createTimeout', () => {
    it('should create a timeout promise', async () => {
      jest.useFakeTimers();

      const timeout = createTimeout(100, 'Timed out');

      const promise = Promise.race([
        timeout,
        new Promise((resolve) => setTimeout(() => resolve('success'), 200)),
      ]);

      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Timed out');

      jest.useRealTimers();
    });
  });

  describe('mockFetch', () => {
    it('should mock fetch requests', async () => {
      const fetch = mockFetch({
        '/api/users': { data: { users: [] } },
        '/api/tasks': { data: { tasks: ['task1'] }, status: 201 },
      });

      const response1 = await fetch('/api/users');
      expect(response1.ok).toBe(true);
      expect(response1.status).toBe(200);
      expect(await response1.json()).toEqual({ users: [] });

      const response2 = await fetch('/api/tasks');
      expect(response2.status).toBe(201);
      expect(await response2.json()).toEqual({ tasks: ['task1'] });

      await expect(fetch('/api/unknown')).rejects.toThrow('No mock for URL');
    });
  });

  describe('retryAsync', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const result = await retryAsync(operation, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Always fails');
      });

      await expect(retryAsync(operation, { maxAttempts: 2, delay: 0 })).rejects.toThrow(
        'Always fails',
      );

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
