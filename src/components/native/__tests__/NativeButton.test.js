// ABOUTME: Tests for NativeButton component
// Verifies platform-specific button behaviors and haptic feedback

import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import NativeButton from '../NativeButton';

// Mock haptics
jest.mock('expo-haptics');

describe('NativeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with label', () => {
      const { getByText } = render(<NativeButton label="Test Button" onPress={() => {}} />);

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('renders with different variants', () => {
      const variants = ['primary', 'secondary', 'danger', 'ghost'];

      variants.forEach((variant) => {
        const { getByTestId } = render(
          <NativeButton
            label="Test"
            onPress={() => {}}
            variant={variant}
            testID={`button-${variant}`}
          />,
        );

        expect(getByTestId(`button-${variant}`)).toBeTruthy();
      });
    });

    it('renders with different sizes', () => {
      const sizes = ['small', 'medium', 'large'];

      sizes.forEach((size) => {
        const { getByTestId } = render(
          <NativeButton label="Test" onPress={() => {}} size={size} testID={`button-${size}`} />,
        );

        expect(getByTestId(`button-${size}`)).toBeTruthy();
      });
    });

    it('renders loading state', () => {
      const { getByTestId, queryByText } = render(
        <NativeButton label="Test" onPress={() => {}} loading={true} testID="loading-button" />,
      );

      expect(getByTestId('loading-button')).toBeTruthy();
      expect(queryByText('Test')).toBeNull();
    });

    it('renders disabled state', () => {
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={() => {}} disabled={true} testID="disabled-button" />,
      );

      const button = getByTestId('disabled-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={onPress} testID="test-button" />,
      );

      fireEvent.press(getByTestId('test-button'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={onPress} disabled={true} testID="test-button" />,
      );

      fireEvent.press(getByTestId('test-button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={onPress} loading={true} testID="test-button" />,
      );

      fireEvent.press(getByTestId('test-button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('triggers platform-specific haptic feedback on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={() => {}} testID="test-button" />,
      );

      fireEvent.press(getByTestId('test-button'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('triggers platform-specific haptic feedback on Android', () => {
      Platform.OS = 'android';
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={() => {}} testID="test-button" />,
      );

      fireEvent.press(getByTestId('test-button'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('animations', () => {
    it('responds to press in events', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={onPress} testID="test-button" />,
      );

      const button = getByTestId('test-button');

      // Trigger press in - should not call onPress
      fireEvent(button, 'pressIn');

      await waitFor(() => {
        expect(onPress).not.toHaveBeenCalled();
      });
    });

    it('responds to press out events', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeButton label="Test" onPress={onPress} testID="test-button" />,
      );

      const button = getByTestId('test-button');

      // Trigger press in and out - should not call onPress without full press
      fireEvent(button, 'pressIn');
      fireEvent(button, 'pressOut');

      await waitFor(() => {
        expect(onPress).not.toHaveBeenCalled();
      });
    });
  });

  describe('full width', () => {
    it('renders full width when specified', () => {
      const { getByTestId, getByText } = render(
        <NativeButton
          label="Test"
          onPress={() => {}}
          fullWidth={true}
          testID="full-width-button"
        />,
      );

      // In our mocked environment, we just verify the component renders
      expect(getByTestId('full-width-button')).toBeTruthy();
      expect(getByText('Test')).toBeTruthy();
    });
  });
});
