// ABOUTME: Extended tests for navigation helpers
// Tests complex navigation scenarios and edge cases

import React, { useEffect } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import {
  createNavigationMock,
  createRouteMock,
  createUseFocusEffectMock,
  createUseIsFocusedMock,
  expectNavigationCalledWith,
  expectNavigationCalledTimes,
  resetNavigationMocks,
  MockNavigationContainer,
  simulateNavigationEvent,
} from '../navigationHelpers';
import { renderWithProviders } from '../testUtils';
import { useNavigation, useRoute, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';

// Mock the navigation hooks
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn(),
  };
});

describe('Navigation Helpers - Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNavigationMocks();
  });

  describe('Complex Navigation Scenarios', () => {
    it('should handle nested navigation with params', () => {
      const navigation = createNavigationMock();
      const TestComponent = () => {
        const handlePress = () => {
          navigation.navigate('Profile', {
            screen: 'Settings',
            params: { userId: '123', tab: 'privacy' },
          });
        };

        return (
          <TouchableOpacity onPress={handlePress} testID="navigate-button">
            <Text>Navigate</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = renderWithProviders(<TestComponent />);
      fireEvent.press(getByTestId('navigate-button'));

      expectNavigationCalledWith(navigation, 'navigate', 'Profile', {
        screen: 'Settings',
        params: { userId: '123', tab: 'privacy' },
      });
    });

    it('should handle navigation state reset', () => {
      const navigation = createNavigationMock();
      const TestComponent = () => {
        const handleReset = () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }, { name: 'Profile', params: { userId: '123' } }],
          });
        };

        return (
          <TouchableOpacity onPress={handleReset} testID="reset-button">
            <Text>Reset</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = renderWithProviders(<TestComponent />);
      fireEvent.press(getByTestId('reset-button'));

      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Home' }, { name: 'Profile', params: { userId: '123' } }],
      });
    });

    it('should track multiple navigation actions', () => {
      const navigation = createNavigationMock();
      const TestComponent = () => {
        const performActions = () => {
          navigation.navigate('Screen1');
          navigation.push('Screen2');
          navigation.goBack();
          navigation.setParams({ updated: true });
        };

        return (
          <TouchableOpacity onPress={performActions} testID="multi-action">
            <Text>Multiple Actions</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = renderWithProviders(<TestComponent />);
      fireEvent.press(getByTestId('multi-action'));

      expectNavigationCalledTimes(navigation, 'navigate', 1);
      expectNavigationCalledTimes(navigation, 'push', 1);
      expectNavigationCalledTimes(navigation, 'goBack', 1);
      expectNavigationCalledTimes(navigation, 'setParams', 1);
    });
  });

  describe('Hook Mocking Integration', () => {
    it('should integrate useNavigation mock with components', () => {
      const mockNavigation = createNavigationMock();
      useNavigation.mockReturnValue(mockNavigation);

      const ComponentWithHook = () => {
        const navigation = useNavigation();

        return (
          <TouchableOpacity onPress={() => navigation.navigate('Details')} testID="nav-button">
            <Text>Use Navigation</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = renderWithProviders(<ComponentWithHook />);
      fireEvent.press(getByTestId('nav-button'));

      expectNavigationCalledWith(mockNavigation, 'navigate', 'Details');
    });

    it('should integrate useRoute mock with dynamic params', () => {
      const mockRoute = createRouteMock('UserProfile', { userId: '123', tab: 'posts' });
      useRoute.mockReturnValue(mockRoute);

      const ComponentWithRoute = () => {
        const route = useRoute();

        return (
          <View>
            <Text testID="route-name">{route.name}</Text>
            <Text testID="user-id">{route.params?.userId}</Text>
            <Text testID="tab">{route.params?.tab}</Text>
          </View>
        );
      };

      const { getByTestId } = renderWithProviders(<ComponentWithRoute />);

      expect(getByTestId('route-name').props.children).toBe('UserProfile');
      expect(getByTestId('user-id').props.children).toBe('123');
      expect(getByTestId('tab').props.children).toBe('posts');
    });

    it('should handle useFocusEffect with cleanup', () => {
      const mockUseFocusEffect = createUseFocusEffectMock();
      useFocusEffect.mockImplementation(mockUseFocusEffect);

      const effectFn = jest.fn();
      const cleanupFn = jest.fn();

      const ComponentWithFocusEffect = () => {
        useFocusEffect(() => {
          effectFn();
          return cleanupFn;
        });

        return <Text>Focus Effect Component</Text>;
      };

      renderWithProviders(<ComponentWithFocusEffect />);

      // Simulate focus
      mockUseFocusEffect.mock.calls[0][0]();
      expect(effectFn).toHaveBeenCalledTimes(1);

      // Simulate cleanup (blur)
      const cleanup = effectFn.mock.results[0].value;
      if (cleanup) cleanup();
      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });

    it('should handle useIsFocused state changes', () => {
      const mockUseIsFocused = createUseIsFocusedMock(true);
      useIsFocused.mockReturnValue(mockUseIsFocused());

      const ComponentWithFocus = () => {
        const isFocused = useIsFocused();

        return (
          <View>
            <Text testID="focus-status">{isFocused ? 'Focused' : 'Not Focused'}</Text>
          </View>
        );
      };

      const { getByTestId, rerender } = renderWithProviders(<ComponentWithFocus />);

      expect(getByTestId('focus-status').props.children).toBe('Focused');

      // Change focus state
      useIsFocused.mockReturnValue(false);
      rerender(<ComponentWithFocus />);

      expect(getByTestId('focus-status').props.children).toBe('Not Focused');
    });
  });

  describe('MockNavigationContainer', () => {
    it('should render children with navigation context', () => {
      const TestComponent = () => {
        const navigation = useNavigation();
        return (
          <Text testID="has-navigation">{navigation ? 'Has Navigation' : 'No Navigation'}</Text>
        );
      };

      const { getByTestId } = renderWithProviders(
        <MockNavigationContainer>
          <TestComponent />
        </MockNavigationContainer>,
      );

      expect(getByTestId('has-navigation').props.children).toBe('Has Navigation');
    });

    it('should support custom initial state', () => {
      const customState = {
        type: 'stack',
        key: 'stack-key',
        routeNames: ['Home', 'Profile', 'Settings'],
        routes: [
          { key: 'home-key', name: 'Home' },
          { key: 'profile-key', name: 'Profile', params: { userId: '123' } },
        ],
        index: 1,
        stale: false,
      };

      const TestComponent = () => {
        const navigation = useNavigation();
        const state = navigation?.getState();

        return (
          <View>
            <Text testID="current-route">{state?.routes[state.index]?.name || 'Unknown'}</Text>
            <Text testID="route-count">{state?.routes.length || 0}</Text>
          </View>
        );
      };

      const mockNavigation = createNavigationMock();
      mockNavigation.getState.mockReturnValue(customState);
      useNavigation.mockReturnValue(mockNavigation);

      const { getByTestId } = renderWithProviders(
        <MockNavigationContainer initialState={customState}>
          <TestComponent />
        </MockNavigationContainer>,
      );

      expect(getByTestId('current-route').props.children).toBe('Profile');
      expect(getByTestId('route-count').props.children).toBe(2);
    });
  });

  describe('simulateNavigationEvent', () => {
    it('should simulate navigation lifecycle events', () => {
      const navigation = createNavigationMock();
      const focusListener = jest.fn();
      const blurListener = jest.fn();
      const stateListener = jest.fn();

      // Setup listeners
      navigation.addListener.mockImplementation((event) => {
        if (event === 'focus') return { remove: () => {} };
        if (event === 'blur') return { remove: () => {} };
        if (event === 'state') return { remove: () => {} };
      });

      const TestComponent = () => {
        useEffect(() => {
          const unsubscribeFocus = navigation.addListener('focus', focusListener);
          const unsubscribeBlur = navigation.addListener('blur', blurListener);
          const unsubscribeState = navigation.addListener('state', stateListener);

          return () => {
            unsubscribeFocus.remove();
            unsubscribeBlur.remove();
            unsubscribeState.remove();
          };
        }, []);

        return <Text>Event Test</Text>;
      };

      renderWithProviders(<TestComponent />);

      // Simulate events
      simulateNavigationEvent(navigation, 'focus');
      simulateNavigationEvent(navigation, 'blur');
      simulateNavigationEvent(navigation, 'state', { type: 'tab' });

      // Find and call the listeners
      const calls = navigation.addListener.mock.calls;
      const focusCall = calls.find((call) => call[0] === 'focus');
      const blurCall = calls.find((call) => call[0] === 'blur');
      const stateCall = calls.find((call) => call[0] === 'state');

      if (focusCall) focusCall[1]();
      if (blurCall) blurCall[1]();
      if (stateCall) stateCall[1]({ type: 'tab' });

      expect(focusListener).toHaveBeenCalled();
      expect(blurListener).toHaveBeenCalled();
      expect(stateListener).toHaveBeenCalledWith({ type: 'tab' });
    });

    it('should handle navigation guards', () => {
      const navigation = createNavigationMock();
      const beforeRemoveListener = jest.fn((e) => {
        if (!confirm('Are you sure?')) {
          e.preventDefault();
        }
      });

      global.confirm = jest.fn(() => false);

      navigation.addListener.mockImplementation((event) => {
        if (event === 'beforeRemove') {
          return { remove: () => {} };
        }
      });

      const TestComponent = () => {
        useEffect(() => {
          const unsubscribe = navigation.addListener('beforeRemove', beforeRemoveListener);
          return unsubscribe.remove;
        }, []);

        return <Text>Guard Test</Text>;
      };

      renderWithProviders(<TestComponent />);

      // Simulate beforeRemove event
      const call = navigation.addListener.mock.calls.find((c) => c[0] === 'beforeRemove');
      if (call) {
        const event = {
          preventDefault: jest.fn(),
          data: { action: { type: 'GO_BACK' } },
        };
        call[1](event);

        expect(global.confirm).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing navigation method gracefully', () => {
      const navigation = createNavigationMock();
      delete navigation.customMethod;

      expect(() => {
        expectNavigationCalledWith(navigation, 'customMethod', 'Screen');
      }).toThrow();
    });

    it('should provide helpful error messages for assertion failures', () => {
      const navigation = createNavigationMock();
      navigation.navigate('ScreenA');

      expect(() => {
        expectNavigationCalledWith(navigation, 'navigate', 'ScreenB');
      }).toThrow(/Expected.*ScreenB.*but.*ScreenA/);
    });

    it('should reset all mocks properly', () => {
      const nav1 = createNavigationMock();
      const nav2 = createNavigationMock();

      nav1.navigate('Screen1');
      nav2.navigate('Screen2');

      resetNavigationMocks();

      expect(nav1.navigate).not.toHaveBeenCalled();
      expect(nav2.navigate).not.toHaveBeenCalled();
    });
  });
});
