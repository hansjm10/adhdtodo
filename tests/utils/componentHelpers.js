// ABOUTME: Component testing helpers for common testing scenarios
// Provides utilities for testing loading states, errors, and component behavior

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from './testUtils';

/**
 * Test component loading state
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 * @param {Object} options - Render options
 * @returns {Promise<Object>} Render result
 */
export const testLoadingState = async (Component, props = {}, options = {}) => {
  const result = render(<Component {...props} isLoading={true} />, options);

  const { queryByTestId, queryByText, UNSAFE_queryAllByType } = result;

  // Check for common loading indicators
  const loadingIndicator =
    queryByTestId('loading-indicator') ||
    queryByText(/loading/i) ||
    UNSAFE_queryAllByType('ActivityIndicator')[0];

  if (!loadingIndicator) {
    throw new Error('No loading indicator found in component');
  }

  expect(loadingIndicator).toBeTruthy();

  return result;
};

/**
 * Test component error state
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 * @param {Error|string} error - Error to display
 * @param {Object} options - Render options
 * @returns {Promise<Object>} Render result
 */
export const testErrorState = async (Component, props = {}, error = 'Test error', options = {}) => {
  const errorObj = error instanceof Error ? error : new Error(error);

  const result = render(<Component {...props} error={errorObj} />, options);

  const { queryByText, queryByTestId } = result;

  // Check for error message
  const errorMessage =
    queryByText(/error/i) || queryByText(errorObj.message) || queryByTestId('error-message');

  if (!errorMessage) {
    throw new Error('No error message found in component');
  }

  expect(errorMessage).toBeTruthy();

  return result;
};

/**
 * Test component empty state
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 * @param {Object} options - Render options
 * @returns {Promise<Object>} Render result
 */
export const testEmptyState = async (
  Component,
  props = {},
  dataPropName = 'data',
  options = {},
) => {
  // Create props with empty array for the specified data prop
  const emptyProps = { ...props, [dataPropName]: [] };
  const result = render(<Component {...emptyProps} />, options);

  const { queryByText, queryByTestId } = result;

  // Check for common empty state messages
  const emptyMessage =
    queryByText(/no items/i) ||
    queryByText(/no data/i) ||
    queryByText(/empty/i) ||
    queryByTestId('empty-state');

  if (!emptyMessage) {
    throw new Error('No empty state message found in component');
  }

  expect(emptyMessage).toBeTruthy();

  return result;
};

/**
 * Test component snapshot
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 * @param {string} snapshotName - Name for the snapshot
 * @param {Object} options - Render options
 * @returns {Object} Render result
 */
export const testSnapshot = (
  Component,
  props = {},
  snapshotName = 'Component Snapshot',
  options = {},
) => {
  const result = render(<Component {...props} />, options);

  const tree = result.toJSON();
  expect(tree).toMatchSnapshot(snapshotName);

  return result;
};

/**
 * Test form validation
 * @param {Object} formElements - Form input elements
 * @param {Array} validationRules - Array of validation test cases
 * @returns {Promise<void>}
 */
export const testFormValidation = async (formElements, validationRules) => {
  const { fireEvent } = require('@testing-library/react-native');

  for (const rule of validationRules) {
    const { input, value, expectedError, field } = rule;

    // Update input value
    fireEvent.changeText(input, value);

    // Wait for validation
    await waitFor(() => {
      if (expectedError) {
        const errorElement = formElements.getByText(expectedError);
        expect(errorElement).toBeTruthy();
      } else {
        const errorElements = formElements.queryAllByText(new RegExp(`${field}.*error`, 'i'));
        expect(errorElements.length).toBe(0);
      }
    });
  }
};

/**
 * Test list rendering with various data sets
 * @param {React.Component} Component - List component to test
 * @param {Array} testDataSets - Array of test data configurations
 * @param {Object} options - Render options
 * @returns {Promise<void>}
 */
export const testListRendering = async (Component, testDataSets, options = {}) => {
  for (const dataSet of testDataSets) {
    const { data, expectedCount } = dataSet;

    const { getAllByTestId, rerender } = renderWithProviders(<Component data={data} />, options);

    if (expectedCount > 0) {
      await waitFor(() => {
        const items = getAllByTestId(/list-item|item-\d+/);
        expect(items).toHaveLength(expectedCount);
      });
    }

    // Clean up for next iteration
    rerender(<Component data={[]} />);
  }
};

/**
 * Test component accessibility
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass to component
 * @param {Object} expectedLabels - Expected accessibility labels
 * @returns {Object} Render result
 */
export const testAccessibility = (Component, props = {}, expectedLabels = {}) => {
  const result = renderWithProviders(<Component {...props} />);

  const { getByLabelText, getByRole, queryByTestId } = result;

  // Test accessibility labels
  Object.entries(expectedLabels).forEach(([key, label]) => {
    const element = getByLabelText(label) || getByRole(key) || queryByTestId(`accessible-${key}`);
    expect(element).toBeTruthy();
  });

  return result;
};

/**
 * Test component state transitions
 * @param {React.Component} Component - Component to test
 * @param {Array} transitions - Array of state transitions to test
 * @param {Object} options - Render options
 * @returns {Promise<void>}
 */
export const testStateTransitions = async (Component, transitions, options = {}) => {
  const { rerender, ...queries } = renderWithProviders(
    <Component {...transitions[0].props} />,
    options,
  );

  for (let i = 0; i < transitions.length; i++) {
    const { props, validate } = transitions[i];

    if (i > 0) {
      rerender(<Component {...props} />);
    }

    await waitFor(() => {
      validate(queries);
    });
  }
};

/**
 * Test modal visibility
 * @param {Object} screen - Render result
 * @param {Object} modalConfig - Modal configuration
 * @returns {Promise<void>}
 */
export const testModalVisibility = async (screen, modalConfig) => {
  const { triggerElement, modalTestId, expectVisible } = modalConfig;
  const { fireEvent, queryByTestId } = screen;

  if (triggerElement) {
    fireEvent.press(triggerElement);
  }

  await waitFor(() => {
    const modal = queryByTestId(modalTestId);
    if (expectVisible) {
      expect(modal).toBeTruthy();
    } else {
      expect(modal).toBeFalsy();
    }
  });
};

/**
 * Test keyboard interaction
 * @param {Object} input - Input element
 * @param {Object} expectations - Expected behavior
 * @returns {Promise<void>}
 */
export const testKeyboardInteraction = async (input, expectations) => {
  const { fireEvent } = require('@testing-library/react-native');
  const { onSubmit, onDismiss } = expectations;

  // Test submit editing
  if (onSubmit) {
    fireEvent(input, 'submitEditing');
    expect(onSubmit).toHaveBeenCalled();
  }

  // Test blur (keyboard dismiss)
  if (onDismiss) {
    fireEvent(input, 'blur');
    expect(onDismiss).toHaveBeenCalled();
  }
};

/**
 * Get all text content from a component tree
 * @param {Object} screenOrRoot - Render result or root element
 * @returns {Array<string>} Array of text content
 */
export const getAllTextContent = (screenOrRoot) => {
  // If this is a render result with query methods
  if (screenOrRoot.UNSAFE_queryAllByType) {
    const textElements = screenOrRoot.UNSAFE_queryAllByType('Text');
    return textElements
      .map((el) => el.props.children)
      .filter(Boolean)
      .flat();
  }

  // If this is a root element directly
  if (screenOrRoot.findAll) {
    try {
      const textElements = screenOrRoot.findAll((el) => el.type === 'Text');
      return textElements
        .map((el) => el.props.children)
        .filter(Boolean)
        .flat();
    } catch (error) {
      // Fallback if findAll doesn't work
      return [];
    }
  }

  // If screen has root property, traverse it
  if (screenOrRoot.root && screenOrRoot.root.findAll) {
    try {
      const textElements = screenOrRoot.root.findAll((el) => el.type === 'Text');
      return textElements
        .map((el) => el.props.children)
        .filter(Boolean)
        .flat();
    } catch (error) {
      // Fallback if findAll doesn't work
      return [];
    }
  }

  return [];
};

/**
 * Test component performance by measuring render time
 * @param {React.Component} Component - Component to test
 * @param {Object} props - Props to pass
 * @param {number} maxRenderTime - Maximum acceptable render time in ms
 * @returns {Object} Performance metrics
 */
export const testComponentPerformance = (Component, props = {}, maxRenderTime = 16) => {
  const startTime = performance.now();

  const result = render(<Component {...props} />);

  const endTime = performance.now();
  const renderTime = endTime - startTime;

  expect(renderTime).toBeLessThan(maxRenderTime);

  return {
    renderTime,
    passed: renderTime < maxRenderTime,
    result,
  };
};

// Export renderWithProviders for components that need it
export { renderWithProviders } from './testUtils';
