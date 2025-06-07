// ABOUTME: Native-feeling pull-to-refresh with platform-specific indicators
// Provides iOS-style bounce and Android material refresh animations

import React, { useRef, useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  Platform,
  Animated,
  View,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { FlashListProps } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { getPlatformTheme } from '../../styles/nativeTheme';

interface NativePullToRefreshProps<T> {
  children?: React.ReactNode;
  onRefresh: () => Promise<void>;
  onError?: (error: Error) => void;
  data?: T[];
  renderItem?: FlashListProps<T>['renderItem'];
  keyExtractor?: FlashListProps<T>['keyExtractor'];
  ListEmptyComponent?: FlashListProps<T>['ListEmptyComponent'];
  ListHeaderComponent?: FlashListProps<T>['ListHeaderComponent'];
  contentContainerStyle?: FlashListProps<T>['contentContainerStyle'];
  estimatedItemSize?: number;
  useFlashList?: boolean;
}

export function NativePullToRefresh<T>({
  children,
  onRefresh,
  onError,
  data,
  renderItem,
  keyExtractor,
  ListEmptyComponent,
  ListHeaderComponent,
  contentContainerStyle,
  estimatedItemSize = 100,
  useFlashList = false,
}: NativePullToRefreshProps<T>) {
  const [refreshing, setRefreshing] = React.useState(false);
  const pullDistance = useRef(new Animated.Value(0)).current;
  const theme = getPlatformTheme('dark', false);

  const handleRefresh = useCallback(async () => {
    // Haptic feedback on refresh trigger
    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setRefreshing(true);

    try {
      await onRefresh();
    } catch (error) {
      // Report error to parent component if handler provided
      if (onError && error instanceof Error) {
        onError(error);
      } else if (onError) {
        onError(new Error('Unknown error during refresh'));
      }

      // Log error in development
      if (global.__DEV__) {
        console.error('Pull to refresh error:', error);
      }

      // Haptic feedback for error
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, onError]);

  // Platform-specific refresh control
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        void handleRefresh();
      }}
      tintColor={theme.primary}
      colors={[theme.primary, theme.primaryLight]}
      progressBackgroundColor={theme.surface.raised}
      progressViewOffset={Platform.OS === 'android' ? 20 : 0}
      title={Platform.OS === 'ios' ? 'Pull to refresh' : undefined}
      titleColor={theme.text.secondary}
    />
  );

  // Custom iOS-style loading indicator
  const iosLoadingIndicator = Platform.OS === 'ios' && refreshing && (
    <Animated.View
      className="absolute top-20 left-0 right-0 items-center"
      style={{
        opacity: pullDistance.interpolate({
          inputRange: [0, 100],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        }),
        transform: [
          {
            translateY: pullDistance.interpolate({
              inputRange: [0, 100],
              outputRange: [-50, 0],
              extrapolate: 'clamp',
            }),
          },
        ],
      }}
    >
      <View className="bg-surface-raised rounded-full p-3 shadow-lg">
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    </Animated.View>
  );

  // If using FlashList
  if (useFlashList && data && renderItem) {
    return (
      <View className="flex-1">
        <FlashList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          ListHeaderComponent={ListHeaderComponent}
          contentContainerStyle={contentContainerStyle}
          estimatedItemSize={estimatedItemSize}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={Platform.OS !== 'ios'}
          overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
        />
        {iosLoadingIndicator}
      </View>
    );
  }

  // Regular ScrollView
  return (
    <View className="flex-1">
      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={Platform.OS !== 'ios'}
        overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
        scrollEventThrottle={16}
        onScroll={
          Platform.OS === 'ios'
            ? Animated.event([{ nativeEvent: { contentOffset: { y: pullDistance } } }], {
                useNativeDriver: false,
              })
            : undefined
        }
      >
        {children}
      </ScrollView>
      {iosLoadingIndicator}
    </View>
  );
}

export default NativePullToRefresh;
