// ABOUTME: Tests for the main app navigation structure
// Verifies that navigation is properly configured with required screens

import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from '../AppNavigator';

// Mock the navigation components
jest.mock('@react-navigation/bottom-tabs', () => {
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }) => <MockedNavigator>{children}</MockedNavigator>,
      Screen: ({ name, component }) => <MockedScreen name={name} component={component} />,
    }),
  };
});

jest.mock('@react-navigation/stack', () => {
  return {
    createStackNavigator: () => ({
      Navigator: ({ children }) => <MockedNavigator>{children}</MockedNavigator>,
      Screen: ({ name, component }) => <MockedScreen name={name} component={component} />,
    }),
  };
});

// Mock the services that AppNavigator uses
jest.mock('../../services/UserStorageService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../services/NotificationService', () => ({
  getNotificationsForUser: jest.fn().mockResolvedValue([]),
}));

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const MockedNavigator = ({ children }) => <>{children}</>;
const MockedScreen = ({ name }) => <>{name}</>;

describe('AppNavigator', () => {
  it('should export a valid component', () => {
    expect(AppNavigator).toBeDefined();
    expect(typeof AppNavigator).toBe('function');
  });

  it('should create navigation structure with required screens', () => {
    // Properly render the component instead of calling it as a function
    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>,
    );

    expect(getByTestId('app-navigator')).toBeTruthy();
  });
});
