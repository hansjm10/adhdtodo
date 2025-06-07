// ABOUTME: Tests for NativePullToRefresh component
// Verifies platform-specific refresh behaviors and haptic feedback

import React from 'react';
import { Platform, Text, RefreshControl } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import NativePullToRefresh from '../NativePullToRefresh';

// Mock haptics
jest.mock('expo-haptics');

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, refreshControl, ...props }) => {
    const { FlatList } = require('react-native');
    return (
      <FlatList data={data} renderItem={renderItem} refreshControl={refreshControl} {...props} />
    );
  },
}));

describe('NativePullToRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering with children', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <NativePullToRefresh onRefresh={async () => {}}>
          <Text>Child Content</Text>
        </NativePullToRefresh>,
      );

      expect(getByText('Child Content')).toBeTruthy();
    });

    it('renders ScrollView when children are provided', () => {
      const { UNSAFE_getByType } = render(
        <NativePullToRefresh onRefresh={async () => {}}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const { ScrollView } = require('react-native');
      expect(UNSAFE_getByType(ScrollView)).toBeTruthy();
    });
  });

  describe('rendering with FlashList', () => {
    const mockData = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const renderItem = ({ item }) => <Text>{item.title}</Text>;
    const keyExtractor = (item) => item.id;

    it('renders FlashList when useFlashList is true', () => {
      const { getByText } = render(
        <NativePullToRefresh
          onRefresh={async () => {}}
          data={mockData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          useFlashList={true}
        />,
      );

      expect(getByText('Item 1')).toBeTruthy();
      expect(getByText('Item 2')).toBeTruthy();
    });

    it('passes correct props to FlashList', () => {
      const ListEmptyComponent = () => <Text>Empty</Text>;
      const ListHeaderComponent = () => <Text>Header</Text>;

      const { getByText } = render(
        <NativePullToRefresh
          onRefresh={async () => {}}
          data={[]}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          ListHeaderComponent={ListHeaderComponent}
          estimatedItemSize={50}
          useFlashList={true}
        />,
      );

      expect(getByText('Empty')).toBeTruthy();
      expect(getByText('Header')).toBeTruthy();
    });
  });

  describe('refresh behavior', () => {
    it('calls onRefresh when pulled', async () => {
      const onRefresh = jest.fn().mockResolvedValue(undefined);
      const { UNSAFE_getByProps } = render(
        <NativePullToRefresh onRefresh={onRefresh}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByProps({ refreshing: false });
      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('shows refreshing state', async () => {
      let resolveRefresh;
      const onRefresh = jest.fn(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

      const { UNSAFE_getByProps } = render(
        <NativePullToRefresh onRefresh={onRefresh}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByProps({ refreshing: false });
      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        const refreshingControl = UNSAFE_getByProps({ refreshing: true });
        expect(refreshingControl).toBeTruthy();
      });

      resolveRefresh();

      await waitFor(() => {
        const notRefreshingControl = UNSAFE_getByProps({ refreshing: false });
        expect(notRefreshingControl).toBeTruthy();
      });
    });

    it('triggers iOS haptic feedback on refresh', async () => {
      Platform.OS = 'ios';
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { UNSAFE_getByProps } = render(
        <NativePullToRefresh onRefresh={onRefresh}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByProps({ refreshing: false });
      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      });
    });

    it('triggers Android haptic feedback on refresh', async () => {
      Platform.OS = 'android';
      const onRefresh = jest.fn().mockResolvedValue(undefined);

      const { UNSAFE_getByProps } = render(
        <NativePullToRefresh onRefresh={onRefresh}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByProps({ refreshing: false });
      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success,
        );
      });
    });
  });

  describe('platform-specific styling', () => {
    it('applies correct colors to RefreshControl', () => {
      const { UNSAFE_getByType } = render(
        <NativePullToRefresh onRefresh={async () => {}}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByType(RefreshControl);
      expect(refreshControl.props.tintColor).toBeDefined();
      expect(refreshControl.props.colors).toBeDefined();
      expect(refreshControl.props.progressBackgroundColor).toBeDefined();
    });

    it('sets iOS-specific title', () => {
      Platform.OS = 'ios';
      const { UNSAFE_getByType } = render(
        <NativePullToRefresh onRefresh={async () => {}}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByType(RefreshControl);
      expect(refreshControl.props.title).toBe('Pull to refresh');
    });

    it('does not set title on Android', () => {
      Platform.OS = 'android';
      const { UNSAFE_getByType } = render(
        <NativePullToRefresh onRefresh={async () => {}}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByType(RefreshControl);
      expect(refreshControl.props.title).toBeUndefined();
    });

    it('sets Android progress offset', () => {
      Platform.OS = 'android';
      const { UNSAFE_getByType } = render(
        <NativePullToRefresh onRefresh={async () => {}}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByType(RefreshControl);
      expect(refreshControl.props.progressViewOffset).toBe(20);
    });
  });

  describe('error handling', () => {
    it('calls onError when refresh fails', async () => {
      const error = new Error('Refresh failed');
      const onRefresh = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();

      const { UNSAFE_getByProps } = render(
        <NativePullToRefresh onRefresh={onRefresh} onError={onError}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByProps({ refreshing: false });
      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });

      // Wait for error to be handled
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });

      // Should trigger error haptic feedback
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error,
      );

      // Should return to not refreshing state even after error
      await waitFor(() => {
        const notRefreshingControl = UNSAFE_getByProps({ refreshing: false });
        expect(notRefreshingControl).toBeTruthy();
      });
    });

    it('completes refresh even without onError callback', async () => {
      const error = new Error('Refresh failed');
      const onRefresh = jest.fn().mockRejectedValue(error);
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { UNSAFE_getByProps } = render(
        <NativePullToRefresh onRefresh={onRefresh}>
          <Text>Content</Text>
        </NativePullToRefresh>,
      );

      const refreshControl = UNSAFE_getByProps({ refreshing: false });
      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled();
      });

      // Wait for error to be handled
      await waitFor(() => {
        // Should log error in dev mode
        expect(consoleError).toHaveBeenCalledWith('Pull to refresh error:', error);
      });

      // Should still return to not refreshing state
      await waitFor(() => {
        const notRefreshingControl = UNSAFE_getByProps({ refreshing: false });
        expect(notRefreshingControl).toBeTruthy();
      });

      consoleError.mockRestore();
    });
  });
});
