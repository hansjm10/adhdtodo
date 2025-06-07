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
jest.mock('expo-router', () => ({
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
  Stack: {
    Screen: ({ children }) => children,
  },
  Tabs: {
    Screen: ({ children }) => children,
  },
}));

// Mock BiometricAuthService
jest.mock('../src/services/BiometricAuthService', () => ({
  BiometricAuthService: {
    getSecuritySettings: jest.fn().mockResolvedValue({
      requireAuthOnLaunch: false,
      autoLockTimeout: 0,
      requireAuthForSensitiveData: false,
    }),
    authenticate: jest.fn().mockResolvedValue({ success: true }),
    isSupported: jest.fn().mockResolvedValue(true),
  },
}));

// Mock UserStorageService
jest.mock('../src/services/UserStorageService', () => ({
  getUserData: jest.fn().mockResolvedValue(null),
  saveUserData: jest.fn().mockResolvedValue(undefined),
  clearUserData: jest.fn().mockResolvedValue(undefined),
}));

// Mock SupabaseService
jest.mock('../src/services/SupabaseService', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
        error: null,
      })),
      admin: {
        deleteUser: jest.fn(),
      },
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

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
