// ABOUTME: Core test utilities for rendering components with providers
// Provides custom render functions and re-exports testing library utilities

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppProvider } from '../../src/contexts/AppProvider';

/**
 * Custom render function that wraps components with all necessary providers
 * @param {React.Component} ui - Component to render
 * @param {Object} options - Render options
 * @param {Object} options.initialState - Initial state for context providers
 * @param {Object} options.renderOptions - Additional render options
 * @returns {Object} Render result with queries and utilities
 */
export const renderWithProviders = (ui, { initialState = {}, ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <AppProvider initialState={initialState}>{children}</AppProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Wait for all loading states to finish
 * @param {Object} screen - Render result from testing library
 * @returns {Promise<void>}
 */
export const waitForLoadingToFinish = async (screen) => {
  const { queryByTestId, queryByText } = screen;

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
