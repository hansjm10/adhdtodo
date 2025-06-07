# Expo Router Test Migration Guide

This guide helps you migrate tests from React Navigation to Expo Router.

## Overview

The test infrastructure has been updated to remove React Navigation dependencies and use Expo Router instead. This migration simplifies test setup and aligns with the project's navigation system.

## Key Changes

### 1. Test Utilities Update

#### Before (React Navigation)

```javascript
import { NavigationContainer } from '@react-navigation/native';

export const renderWithProviders = (ui, { navigationState = null, ...options }) => {
  const Wrapper = ({ children }) => (
    <AppProvider>
      <NavigationContainer initialState={navigationState}>{children}</NavigationContainer>
    </AppProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};
```

#### After (Expo Router)

```javascript
export const renderWithProviders = (ui, { initialState = {}, ...renderOptions }) => {
  const Wrapper = ({ children }) => (
    <AppProvider initialState={initialState}>{children}</AppProvider>
  );
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
```

### 2. Navigation Hook Usage

#### Before (React Navigation)

```javascript
import { useNavigation } from '@react-navigation/native';

const TestComponent = () => {
  const navigation = useNavigation();
  return <Button onPress={() => navigation.navigate('Screen')} />;
};
```

#### After (Expo Router)

```javascript
import { useRouter } from 'expo-router';

const TestComponent = () => {
  const router = useRouter();
  return <Button onPress={() => router.push('/screen')} />;
};
```

### 3. Mocking Navigation

The global test setup already mocks expo-router, but you can override it locally:

```javascript
// In your test file
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: '123' }),
  useSearchParams: () => ({ query: 'test' }),
  useSegments: () => ['profile', 'settings'],
  usePathname: () => '/profile/settings',
  useFocusEffect: jest.fn(),
}));
```

### 4. Navigation Helpers

Use the navigation helpers from `tests/utils/navigationHelpers.js`:

```javascript
import {
  createRouterMock,
  createSearchParamsMock,
  expectRouterPushCalledWith,
  resetRouterMocks,
} from '../tests/utils';

describe('MyComponent', () => {
  it('should navigate correctly', () => {
    const router = createRouterMock();

    // Your test logic
    router.push('/profile');

    // Assertions
    expectRouterPushCalledWith(router, '/profile');
  });
});
```

## Common Migration Patterns

### 1. Navigation State Testing

#### Before

```javascript
const navigationState = {
  routes: [{ name: 'Home' }],
  index: 0,
};
renderWithProviders(<Component />, { navigationState });
```

#### After

```javascript
// Navigation state is managed by Expo Router
// Test behavior, not navigation state
renderWithProviders(<Component />);
```

### 2. Route Parameters

#### Before

```javascript
const route = { params: { id: '123' } };
navigation.navigate('Screen', { id: '123' });
```

#### After

```javascript
import { useLocalSearchParams } from 'expo-router';

// In component
const { id } = useLocalSearchParams();

// In navigation
router.push({ pathname: '/screen', params: { id: '123' } });
```

### 3. Navigation Methods

| React Navigation         | Expo Router                            |
| ------------------------ | -------------------------------------- |
| `navigation.navigate()`  | `router.push()`                        |
| `navigation.goBack()`    | `router.back()`                        |
| `navigation.replace()`   | `router.replace()`                     |
| `navigation.reset()`     | Not available - use `router.replace()` |
| `navigation.setParams()` | `router.setParams()`                   |

## Testing Best Practices

1. **Mock at the Module Level**: The global setup already mocks expo-router
2. **Test Behavior, Not Implementation**: Focus on what happens when navigation occurs
3. **Use Navigation Helpers**: Leverage the provided test utilities
4. **Avoid Navigation State**: Expo Router manages state internally

## Example Migration

### Before

```javascript
import { useNavigation } from '@react-navigation/native';
import { renderWithProviders } from '../tests/utils';

describe('ProfileScreen', () => {
  it('should navigate to settings', () => {
    const mockNavigate = jest.fn();
    useNavigation.mockReturnValue({ navigate: mockNavigate });

    const { getByText } = renderWithProviders(<ProfileScreen />);
    fireEvent.press(getByText('Settings'));

    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });
});
```

### After

```javascript
import { renderWithProviders, createRouterMock } from '../tests/utils';

describe('ProfileScreen', () => {
  it('should navigate to settings', () => {
    const router = createRouterMock();
    jest.mocked(useRouter).mockReturnValue(router);

    const { getByText } = renderWithProviders(<ProfileScreen />);
    fireEvent.press(getByText('Settings'));

    expect(router.push).toHaveBeenCalledWith('/settings');
  });
});
```

## Troubleshooting

### Issue: "Cannot find module '@react-navigation/native'"

**Solution**: Remove the import and use expo-router instead

### Issue: "navigation.reset is not a function"

**Solution**: Use `router.replace()` to navigate to a new screen without adding to the stack

### Issue: "NavigationContainer is not defined"

**Solution**: Remove NavigationContainer - it's not needed with Expo Router

## Additional Resources

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Testing Guide](./TESTING_GUIDE.md)
- [Navigation Helpers API](../utils/navigationHelpers.js)
