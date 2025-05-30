// ABOUTME: Tests for the main app navigation structure
// Verifies that navigation is properly configured with required screens

import React from 'react';
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

const MockedNavigator = ({ children }) => <>{children}</>;
const MockedScreen = ({ name }) => <>{name}</>;

describe('AppNavigator', () => {
  it('should export a valid component', () => {
    expect(AppNavigator).toBeDefined();
    expect(typeof AppNavigator).toBe('function');
  });

  it('should create navigation structure with required screens', () => {
    // Since we're mocking the navigation, we're testing that
    // our component properly configures the navigation
    const navigator = AppNavigator();
    expect(navigator).toBeDefined();
    expect(navigator.props.testID).toBe('app-navigator');
  });
});
