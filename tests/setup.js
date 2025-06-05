// ABOUTME: Jest setup file for configuring test environment
// Imports testing utilities and sets up mocks for React Native

import '@testing-library/jest-native/extend-expect';

// Mock SafeAreaProvider
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Mock react-native-screens
jest.mock('react-native-screens', () => {
  return {
    enableScreens: jest.fn(),
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Mock Vibration
jest.mock('react-native/Libraries/Vibration/Vibration', () => ({
  vibrate: jest.fn(),
  cancel: jest.fn(),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(),
  pbkdf2Async: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Expo Router
jest.mock('expo-router', () => {
  const Tabs = ({ children }) => children;
  Tabs.Screen = ({ children }) => children;

  const Stack = ({ children }) => children;
  Stack.Screen = ({ children }) => children;

  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      setParams: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
    useSearchParams: () => ({}),
    useSegments: () => [],
    usePathname: () => '/',
    useFocusEffect: jest.fn(),
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      setParams: jest.fn(),
    },
    Link: ({ children }) => children,
    Stack,
    Tabs,
  };
});

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { FlatList } = require('react-native');

  const MockFlashList = React.forwardRef((props, ref) => {
    // Filter out FlashList-specific props that FlatList doesn't support
    const {
      estimatedItemSize: _estimatedItemSize,
      drawDistance: _drawDistance,
      ...flatListProps
    } = props;

    // Only pass supported contentContainerStyle props
    if (flatListProps.contentContainerStyle) {
      const {
        padding,
        paddingHorizontal,
        paddingVertical,
        paddingTop,
        paddingBottom,
        paddingLeft,
        paddingRight,
        backgroundColor,
        ..._unsupportedStyles
      } = flatListProps.contentContainerStyle;

      // Only include the style object if there are supported properties
      const supportedStyles = {
        ...(padding !== undefined && { padding }),
        ...(paddingHorizontal !== undefined && { paddingHorizontal }),
        ...(paddingVertical !== undefined && { paddingVertical }),
        ...(paddingTop !== undefined && { paddingTop }),
        ...(paddingBottom !== undefined && { paddingBottom }),
        ...(paddingLeft !== undefined && { paddingLeft }),
        ...(paddingRight !== undefined && { paddingRight }),
        ...(backgroundColor !== undefined && { backgroundColor }),
      };

      flatListProps.contentContainerStyle =
        Object.keys(supportedStyles).length > 0 ? supportedStyles : undefined;
    }

    return React.createElement(FlatList, { ref, ...flatListProps });
  });

  MockFlashList.displayName = 'MockFlashList';

  return {
    FlashList: MockFlashList,
  };
});

// Mock Supabase globally to prevent auth errors
jest.mock('../src/services/SupabaseService', () => {
  const createMockQueryBuilder = () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    builder.then = (resolve) => resolve({ data: [], error: null });
    return builder;
  };

  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signIn: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signUp: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
      from: jest.fn(() => createMockQueryBuilder()),
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
        unsubscribe: jest.fn().mockReturnThis(),
        send: jest.fn().mockResolvedValue({ error: null }),
      })),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
});

// Global console overrides to reduce noise in tests
global.console = {
  ...console,
  // Suppress console.info in tests unless explicitly enabled
  info: process.env.JEST_VERBOSE === 'true' ? console.info : jest.fn(),
  // Suppress console.warn in tests unless explicitly enabled
  warn: process.env.JEST_VERBOSE === 'true' ? console.warn : jest.fn(),
  // Keep console.error for debugging but allow suppression
  error: process.env.JEST_VERBOSE === 'true' ? console.error : jest.fn(),
};
