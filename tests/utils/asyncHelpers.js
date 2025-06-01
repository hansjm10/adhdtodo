// ABOUTME: Async testing helpers for handling promises and timers
// Provides utilities for testing asynchronous operations and state updates

import { act, waitFor } from '@testing-library/react-native';

/**
 * Wait for all async updates to complete
 * Useful after triggering state changes that cause re-renders
 * @returns {Promise<void>}
 */
export const waitForAsyncUpdates = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

/**
 * Create a mock function that returns a promise
 * @param {*} resolveValue - Value to resolve with
 * @param {number} delay - Delay in milliseconds before resolving
 * @returns {jest.Mock} Mock function that returns a promise
 */
export const mockAsyncCall = (resolveValue, delay = 0) => {
  return jest
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(resolveValue), delay)),
    );
};

/**
 * Create a mock function that rejects with an error
 * @param {Error|string} error - Error to reject with
 * @param {number} delay - Delay in milliseconds before rejecting
 * @returns {jest.Mock} Mock function that returns a rejected promise
 */
export const mockAsyncError = (error, delay = 0) => {
  const errorObj = error instanceof Error ? error : new Error(error);
  return jest
    .fn()
    .mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(errorObj), delay)),
    );
};

/**
 * Wait for a specific condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {Object} options - Timeout and interval options
 * @returns {Promise<void>}
 */
export const waitForCondition = async (condition, options = {}) => {
  const { timeout = 5000, interval = 50 } = options;

  await waitFor(
    async () => {
      const result = await condition();
      expect(result).toBe(true);
    },
    { timeout, interval },
  );
};

/**
 * Create a deferred promise for controlling async flow in tests
 * @returns {Object} Object with promise, resolve, and reject functions
 */
export const createDeferredPromise = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

/**
 * Mock AsyncStorage with initial data
 * @param {Object} initialData - Initial storage data
 * @returns {Object} Mocked AsyncStorage
 */
export const mockAsyncStorage = (initialData = {}) => {
  const store = { ...initialData };

  return {
    getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    multiGet: jest.fn((keys) => Promise.resolve(keys.map((key) => [key, store[key] || null]))),
    multiSet: jest.fn((keyValuePairs) => {
      keyValuePairs.forEach(([key, value]) => {
        store[key] = value;
      });
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys) => {
      keys.forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    // Helper method for tests
    __getStore: () => ({ ...store }),
  };
};

/**
 * Advance timers and wait for async updates
 * @param {number} ms - Milliseconds to advance
 * @returns {Promise<void>}
 */
export const advanceTimersAndWait = async (ms) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

/**
 * Run all timers and wait for async updates
 * @returns {Promise<void>}
 */
export const runAllTimersAndWait = async () => {
  await act(async () => {
    jest.runAllTimers();
  });
};

/**
 * Mock a series of async calls with different results
 * @param {Array} results - Array of values to resolve with in sequence
 * @param {number} delay - Delay for each call
 * @returns {jest.Mock} Mock function
 */
export const mockAsyncSequence = (results, delay = 0) => {
  let callCount = 0;

  return jest.fn().mockImplementation(() => {
    const result = results[callCount % results.length];
    callCount++;

    return new Promise((resolve) => setTimeout(() => resolve(result), delay));
  });
};

/**
 * Wait for all promises in an array to settle
 * @param {Array<Promise>} promises - Array of promises
 * @returns {Promise<Array>} Array of { status, value/reason } objects
 */
export const waitForAllSettled = async (promises) => {
  return Promise.allSettled(promises);
};

/**
 * Create a timeout promise for race conditions
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message on timeout
 * @returns {Promise} Promise that rejects after timeout
 */
export const createTimeout = (ms, message = 'Timeout') => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
};

/**
 * Mock fetch API with predefined responses
 * @param {Object} responses - Map of URL patterns to responses
 * @returns {jest.Mock} Mock fetch function
 */
export const mockFetch = (responses = {}) => {
  return jest.fn((url) => {
    const matchingUrl = Object.keys(responses).find((pattern) => url.includes(pattern));

    if (matchingUrl) {
      const response = responses[matchingUrl];
      return Promise.resolve({
        ok: response.ok !== false,
        status: response.status || 200,
        json: () => Promise.resolve(response.data),
        text: () => Promise.resolve(JSON.stringify(response.data)),
      });
    }

    return Promise.reject(new Error(`No mock for URL: ${url}`));
  });
};

/**
 * Retry an async operation until it succeeds
 * @param {Function} operation - Async operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of successful operation
 */
export const retryAsync = async (operation, options = {}) => {
  const { maxAttempts = 3, delay = 100, backoff = 2 } = options;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(backoff, attempt - 1)));
      }
    }
  }

  throw lastError;
};
