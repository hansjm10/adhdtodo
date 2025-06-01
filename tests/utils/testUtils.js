// ABOUTME: Core test utilities for rendering components with providers
// Provides custom render functions and re-exports testing library utilities

import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProvider } from '../../src/contexts/AppProvider';

/**
 * Custom render function that wraps components with all necessary providers
 * @param {React.Component} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.initialState - Initial state for context providers
 * @param {Object} options.navigationState - Initial navigation state
 * @param {Object} options.renderOptions - Additional render options
 * @returns {Object} Render result with queries and utilities
 */
export const renderWithProviders = (
  ui,
  { initialState = {}, navigationState = null, ...renderOptions } = {},
) => {
  // Provide default navigation state if none specified
  const defaultNavigationState = {
    type: 'stack',
    key: 'stack-1',
    routeNames: ['TestScreen'],
    routes: [{ name: 'TestScreen', key: 'test-1' }],
    index: 0,
    stale: false,
  };

  const Wrapper = ({ children }) => (
    <AppProvider initialState={initialState}>
      <NavigationContainer initialState={navigationState || defaultNavigationState}>
        {children}
      </NavigationContainer>
    </AppProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Wait for all loading states to finish
 * @param {Object} screen - Render result from testing library
 * @returns {Promise<void>}
 */
export const waitForLoadingToFinish = async (screen) => {
  const { waitFor, queryByTestId, queryByText } = screen;

  await waitFor(() => {
    // Check for common loading indicators
    expect(queryByTestId('loading-indicator')).not.toBeTruthy();
    expect(queryByText(/loading/i)).not.toBeTruthy();

    // Check for ActivityIndicator
    const activityIndicators = screen.UNSAFE_queryAllByType('ActivityIndicator');
    expect(activityIndicators.length).toBe(0);
  });
};

/**
 * Get element by test ID with better error messages
 * @param {Object} screen - Render result
 * @param {string} testId - Test ID to find
 * @returns {Object} Element
 */
export const getByTestIdSafe = (screen, testId) => {
  try {
    return screen.getByTestId(testId);
  } catch (error) {
    const availableTestIds = screen.root
      .findAll((el) => el.props.testID)
      .map((el) => el.props.testID);

    throw new Error(
      `Unable to find element with testID: ${testId}\n` +
        `Available testIDs: ${availableTestIds.join(', ')}`,
    );
  }
};

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';
