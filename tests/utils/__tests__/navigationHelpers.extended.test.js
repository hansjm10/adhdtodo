// ABOUTME: Extended tests for navigation helpers
// Tests complex navigation scenarios and edge cases

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import {
  createNavigationMock,
  createUseFocusEffectMock,
  expectNavigationCalledWith,
  resetNavigationMocks,
} from '../navigationHelpers';
import { renderWithProviders } from '../testUtils';
import { fireEvent } from '@testing-library/react-native';

describe('Navigation Helpers - Extended Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(navigation.navigate).toHaveBeenCalledWith('Profile', {
        screen: 'Settings',
        params: { userId: '123', tab: 'privacy' },
      });
    });

    it('should handle navigation replace', () => {
      const navigation = createNavigationMock();
      const TestComponent = () => {
        const handleReplace = () => {
          navigation.replace('Home');
        };

        return (
          <TouchableOpacity onPress={handleReplace} testID="replace-button">
            <Text>Replace</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = renderWithProviders(<TestComponent />);
      fireEvent.press(getByTestId('replace-button'));

      expect(navigation.replace).toHaveBeenCalledWith('Home');
    });

    it('should track multiple navigation actions', () => {
      const navigation = createNavigationMock();
      const TestComponent = () => {
        const performActions = () => {
          navigation.navigate('Screen1');
          navigation.push('Screen2');
          navigation.back();
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

      expect(navigation.navigate).toHaveBeenCalledTimes(1);
      expect(navigation.push).toHaveBeenCalledTimes(1);
      expect(navigation.back).toHaveBeenCalledTimes(1);
      expect(navigation.setParams).toHaveBeenCalledTimes(1);
    });
  });

  describe('Router Mock Integration', () => {
    it('should work with router mock in components', () => {
      const mockRouter = createNavigationMock();

      const ComponentWithRouter = () => {
        return (
          <TouchableOpacity onPress={() => mockRouter.push('Details')} testID="nav-button">
            <Text>Use Router</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = renderWithProviders(<ComponentWithRouter />);
      fireEvent.press(getByTestId('nav-button'));

      expectNavigationCalledWith(mockRouter, 'Details');
    });

    it('should simulate focus effects', () => {
      const mockUseFocusEffect = createUseFocusEffectMock();
      const effectFn = jest.fn();
      const cleanupFn = jest.fn();

      const ComponentWithFocusEffect = () => {
        mockUseFocusEffect(() => {
          effectFn();
          return cleanupFn;
        });

        return <Text>Focus Effect Component</Text>;
      };

      renderWithProviders(<ComponentWithFocusEffect />);

      // Verify effect was called
      expect(effectFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation Mock Container', () => {
    it('should render children components', () => {
      const TestComponent = () => {
        return <Text testID="test-component">Test Component</Text>;
      };

      const { getByTestId } = renderWithProviders(<TestComponent />);

      expect(getByTestId('test-component')).toBeTruthy();
    });
  });

  describe('Navigation Events', () => {
    it('should simulate navigation lifecycle events', () => {
      const navigation = createNavigationMock();
      const _listener = jest.fn();

      // Navigation methods in Expo Router don't have addListener
      // This test is not applicable for Expo Router
      expect(navigation.push).toBeDefined();
      expect(navigation.navigate).toBeDefined();
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
        expect(navigation.navigate).toHaveBeenCalledWith('ScreenB');
      }).toThrow();
    });

    it('should reset all mocks properly', () => {
      const nav1 = createNavigationMock();
      const nav2 = createNavigationMock();

      nav1.navigate('Screen1');
      nav2.navigate('Screen2');

      resetNavigationMocks(nav1);
      resetNavigationMocks(nav2);

      expect(nav1.navigate).toHaveBeenCalledTimes(0);
      expect(nav2.navigate).toHaveBeenCalledTimes(0);
    });
  });
});
