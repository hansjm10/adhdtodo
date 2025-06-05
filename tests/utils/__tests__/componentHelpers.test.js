// ABOUTME: Tests for component testing helpers
// Verifies component testing utilities work correctly

import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import {
  testLoadingState,
  testErrorState,
  testEmptyState,
  testSnapshot,
  getAllTextContent,
} from '../componentHelpers';

// Mock Supabase to prevent errors in providers
jest.mock('../../../src/services/SupabaseService', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    }),
  },
}));

// Mock OfflineQueueManager to prevent initialization logs
jest.mock('../../../src/services/OfflineQueueManager', () => ({
  __esModule: true,
  default: class MockOfflineQueueManager {
    constructor() {
      this.operations = [];
    }
    initialize() {
      return Promise.resolve();
    }
    enqueue() {
      return Promise.resolve();
    }
    processQueue() {
      return Promise.resolve();
    }
    getQueueSize() {
      return 0;
    }
    clearQueue() {
      return Promise.resolve();
    }
  },
}));

// Mock components for testing
const LoadingComponent = ({ isLoading }) => (
  <View>
    {isLoading && <ActivityIndicator testID="loading-indicator" />}
    {!isLoading && <Text>Content loaded</Text>}
  </View>
);

const ErrorComponent = ({ error }) => (
  <View>
    {error && <Text testID="error-message">Error: {error.message}</Text>}
    {!error && <Text>No errors</Text>}
  </View>
);

const ListComponent = ({ data = [], items = [] }) => (
  <View>
    {data.length === 0 && items.length === 0 ? (
      <Text testID="empty-state">No items found</Text>
    ) : (
      <View>
        {data.map((item, index) => (
          <Text key={index}>{item}</Text>
        ))}
      </View>
    )}
  </View>
);

const MultiTextComponent = () => (
  <View>
    <Text>First text</Text>
    <Text>Second text</Text>
    <View>
      <Text>Nested text</Text>
    </View>
  </View>
);

describe('Component Helpers', () => {
  describe('testLoadingState', () => {
    it('should detect loading indicator', async () => {
      const result = await testLoadingState(LoadingComponent);

      expect(result.queryByTestId('loading-indicator')).toBeTruthy();
    });

    it('should accept custom props', async () => {
      const CustomLoadingComponent = ({ isLoading, customProp }) => (
        <View>{isLoading && <Text>Loading with {customProp}</Text>}</View>
      );

      const result = await testLoadingState(CustomLoadingComponent, { customProp: 'test value' });

      expect(result.queryByText(/Loading with test value/)).toBeTruthy();
    });
  });

  describe('testErrorState', () => {
    it('should detect error message', async () => {
      const result = await testErrorState(ErrorComponent);

      expect(result.queryByTestId('error-message')).toBeTruthy();
      expect(result.queryByText(/Error:/)).toBeTruthy();
    });

    it('should handle custom error objects', async () => {
      const customError = new Error('Custom error message');
      const result = await testErrorState(ErrorComponent, {}, customError);

      expect(result.queryByText(/Custom error message/)).toBeTruthy();
    });

    it('should handle string errors', async () => {
      const result = await testErrorState(ErrorComponent, {}, 'String error');

      expect(result.queryByText(/String error/)).toBeTruthy();
    });
  });

  describe('testEmptyState', () => {
    it('should detect empty state message', async () => {
      const result = await testEmptyState(ListComponent);

      expect(result.queryByTestId('empty-state')).toBeTruthy();
      expect(result.queryByText(/No items/i)).toBeTruthy();
    });

    it('should work with different empty indicators', async () => {
      const CustomEmptyComponent = ({ data }) => (
        <View>{data.length === 0 && <Text>Empty list</Text>}</View>
      );

      const result = await testEmptyState(CustomEmptyComponent);

      expect(result.queryByText(/empty/i)).toBeTruthy();
    });
  });

  describe('testSnapshot', () => {
    it('should render component correctly', () => {
      const SimpleComponent = () => <Text>Snapshot test</Text>;

      const result = testSnapshot(SimpleComponent);

      // Verify component renders with expected text
      expect(result.getByText('Snapshot test')).toBeTruthy();
    });

    it('should render with custom props', () => {
      const CustomComponent = ({ text }) => <Text>{text}</Text>;

      const result = testSnapshot(CustomComponent, { text: 'Custom snapshot' });

      // Verify component renders with custom text
      expect(result.getByText('Custom snapshot')).toBeTruthy();
    });
  });

  describe('getAllTextContent', () => {
    it('should extract all text content', () => {
      const screen = require('../testUtils').renderWithProviders(<MultiTextComponent />);

      const texts = getAllTextContent(screen);

      expect(texts).toContain('First text');
      expect(texts).toContain('Second text');
      expect(texts).toContain('Nested text');
      expect(texts).toHaveLength(3);
    });

    it('should filter out non-text content', () => {
      const ComponentWithMixed = () => (
        <View>
          <Text>Text content</Text>
          <Text>{null}</Text>
          <Text>{undefined}</Text>
          <Text>More text</Text>
        </View>
      );

      const screen = require('../testUtils').renderWithProviders(<ComponentWithMixed />);
      const texts = getAllTextContent(screen);

      expect(texts).toEqual(['Text content', 'More text']);
    });
  });
});
