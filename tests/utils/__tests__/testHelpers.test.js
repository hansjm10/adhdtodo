// ABOUTME: Tests for our test helper functions to ensure they work correctly
// Meta-testing: tests that test our testing utilities

import React from 'react';
import { Text, View, Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  testLoadingState,
  testErrorState,
  testEmptyState,
  testSnapshot,
  getAllTextContent,
} from '../componentHelpers';

describe('Test Helper Functions', () => {
  describe('testLoadingState', () => {
    const LoadingComponent = ({ isLoading }) => (
      <View>
        {isLoading ? <Text testID="loading-indicator">Loading...</Text> : <Text>Loaded</Text>}
      </View>
    );

    it('should verify loading state correctly', async () => {
      await expect(testLoadingState(LoadingComponent)).resolves.toBeDefined();
    });

    it('should pass custom props', async () => {
      const CustomComponent = ({ isLoading, customProp }) => (
        <View>{isLoading && <Text>{customProp}</Text>}</View>
      );

      await expect(
        testLoadingState(CustomComponent, { customProp: 'Custom Value' }),
      ).resolves.toBeDefined();
    });

    it('should throw when no loading indicator found', async () => {
      const NoLoadingComponent = () => <Text>No loading state</Text>;

      await expect(testLoadingState(NoLoadingComponent)).rejects.toThrow();
    });
  });

  describe('testErrorState', () => {
    const ErrorComponent = ({ error }) => (
      <View>
        {error ? <Text testID="error-message">{error.message}</Text> : <Text>No error</Text>}
      </View>
    );

    it('should verify error state with Error object', async () => {
      await expect(testErrorState(ErrorComponent)).resolves.toBeDefined();
    });

    it('should verify error state with string', async () => {
      await expect(testErrorState(ErrorComponent, {}, 'Custom error')).resolves.toBeDefined();
    });

    it('should throw when no error message found', async () => {
      const NoErrorComponent = () => <Text>No error state</Text>;

      await expect(testErrorState(NoErrorComponent)).rejects.toThrow();
    });
  });

  describe('testEmptyState', () => {
    const ListComponent = ({ data = [] }) => (
      <View>
        {data.length === 0 ? (
          <Text testID="empty-state">No items</Text>
        ) : (
          data.map((item, index) => <Text key={index}>{item}</Text>)
        )}
      </View>
    );

    it('should verify empty state correctly', async () => {
      await expect(testEmptyState(ListComponent)).resolves.toBeDefined();
    });

    it('should work with different prop names', async () => {
      const CustomListComponent = ({ items = [] }) => (
        <View>{items.length === 0 ? <Text>Empty list</Text> : null}</View>
      );

      await expect(testEmptyState(CustomListComponent, {}, 'items')).resolves.toBeDefined();
    });

    it('should throw when no empty state found', async () => {
      const NoEmptyComponent = () => <Text>Always has content</Text>;

      await expect(testEmptyState(NoEmptyComponent)).rejects.toThrow();
    });
  });

  describe('testSnapshot', () => {
    const SnapshotComponent = ({ title }) => (
      <View>
        <Text>{title}</Text>
      </View>
    );

    it('should create snapshot correctly', () => {
      expect(() => testSnapshot(SnapshotComponent, { title: 'Test' })).not.toThrow();
    });

    it('should handle custom snapshot name', () => {
      expect(() =>
        testSnapshot(SnapshotComponent, { title: 'Test' }, 'Custom Snapshot'),
      ).not.toThrow();
    });
  });

  describe('getAllTextContent', () => {
    it('should extract text from simple component', () => {
      const { root } = render(<Text>Simple text</Text>);
      const texts = getAllTextContent(root);
      expect(texts).toEqual(['Simple text']);
    });

    it('should extract text from nested components', () => {
      const { root } = render(
        <View>
          <Text>First</Text>
          <View>
            <Text>Second</Text>
            <Text>Third</Text>
          </View>
        </View>,
      );
      const texts = getAllTextContent(root);
      expect(texts).toEqual(['First', 'Second', 'Third']);
    });

    it('should handle arrays of children', () => {
      const { root } = render(
        <View>
          {['Item 1', 'Item 2', 'Item 3'].map((item) => (
            <Text key={item}>{item}</Text>
          ))}
        </View>,
      );
      const texts = getAllTextContent(root);
      expect(texts).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should handle empty components', () => {
      const { root } = render(<View />);
      const texts = getAllTextContent(root);
      expect(texts).toEqual([]);
    });

    it('should ignore non-text content', () => {
      const { root } = render(
        <View>
          <Text>Text content</Text>
          <Button title="Button" onPress={() => {}} />
          {null}
          {undefined}
          {false}
        </View>,
      );
      const texts = getAllTextContent(root);
      expect(texts.filter((t) => t === 'Text content')).toHaveLength(1);
    });
  });

  describe('Helper integration tests', () => {
    it('should work together in a test scenario', async () => {
      const MultiStateComponent = ({ isLoading, error, data = [] }) => (
        <View>
          {isLoading && <Text testID="loading-indicator">Loading...</Text>}
          {error && <Text testID="error-message">{error.message}</Text>}
          {!isLoading && !error && data.length === 0 && <Text testID="empty-state">No data</Text>}
          {!isLoading && !error && data.length > 0 && (
            <View>
              {data.map((item, index) => (
                <Text key={index}>{item}</Text>
              ))}
            </View>
          )}
        </View>
      );

      // Test loading state
      await testLoadingState(MultiStateComponent);

      // Test error state
      await testErrorState(MultiStateComponent, { isLoading: false });

      // Test empty state
      await testEmptyState(MultiStateComponent, { isLoading: false });

      // Test snapshot
      testSnapshot(MultiStateComponent, {
        isLoading: false,
        data: ['Item 1', 'Item 2'],
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined props gracefully', async () => {
      const Component = ({ value = 'default' }) => <Text>{value}</Text>;

      const result = render(<Component value={undefined} />);
      expect(result.getByText('default')).toBeTruthy();
    });

    it('should handle async rendering', async () => {
      const AsyncComponent = () => {
        const [loaded, setLoaded] = React.useState(false);

        React.useEffect(() => {
          setTimeout(() => setLoaded(true), 100);
        }, []);

        return <Text>{loaded ? 'Loaded' : 'Loading'}</Text>;
      };

      const { getByText } = render(<AsyncComponent />);

      expect(getByText('Loading')).toBeTruthy();

      await waitFor(() => {
        expect(getByText('Loaded')).toBeTruthy();
      });
    });
  });
});
