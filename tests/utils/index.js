// ABOUTME: Central export file for all test utilities
// Provides a single import point for all testing helpers and utilities

// Core test utilities
export { renderWithProviders, waitForLoadingToFinish, getByTestIdSafe } from './testUtils';

// Re-export React Native Testing Library
export * from '@testing-library/react-native';

// Mock factories
export {
  createMockUser,
  createMockTask,
  createMockNotification,
  createMockPartnerUser,
  createMockCompletedTask,
  createMockAssignedTask,
  createMockEncouragementNotification,
  createMockNotificationData,
} from './mockFactories';

// Navigation helpers (Expo Router focused)
export {
  createRouterMock,
  createSearchParamsMock,
  createUseRouterMock,
  createUseLocalSearchParamsMock,
  createUseSearchParamsMock,
  createUseFocusEffectMock,
  createUsePathnameMock,
  createUseSegmentsMock,
  expectRouterPushCalledWith,
  expectRouterReplaceCalledWith,
  expectRouterCalledTimes,
  resetRouterMocks,
  simulateFocusEffect,
  // Backwards compatibility aliases
  createNavigationMock,
  expectNavigationCalledWith,
  expectNavigationCalledTimes,
  resetNavigationMocks,
} from './navigationHelpers';

// Async helpers
export {
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
} from './asyncHelpers';

// Component helpers
export {
  testLoadingState,
  testErrorState,
  testEmptyState,
  testSnapshot,
  testFormValidation,
  testListRendering,
  testAccessibility,
  testStateTransitions,
  testModalVisibility,
  testKeyboardInteraction,
  getAllTextContent,
  testComponentPerformance,
} from './componentHelpers';

// Standard mocks
export * from './standardMocks';
