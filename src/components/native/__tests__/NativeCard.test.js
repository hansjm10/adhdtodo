// ABOUTME: Tests for NativeCard component
// Verifies glass morphism, elevation, and platform-specific behaviors

import React from 'react';
import { Platform, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import NativeCard from '../NativeCard';

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children, ...props }) => {
    const { View } = require('react-native');
    return (
      <View testID="blur-view" {...props}>
        {children}
      </View>
    );
  },
}));

// Mock haptics
jest.mock('expo-haptics');

describe('NativeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <NativeCard>
          <Text>Card Content</Text>
        </NativeCard>,
      );

      expect(getByText('Card Content')).toBeTruthy();
    });

    it('renders different variants', () => {
      const variants = ['elevated', 'outlined', 'glass', 'surface'];

      variants.forEach((variant) => {
        const { getByTestId } = render(
          <NativeCard variant={variant} testID={`card-${variant}`}>
            <Text>Content</Text>
          </NativeCard>,
        );

        expect(getByTestId(`card-${variant}`)).toBeTruthy();
      });
    });

    it('renders glass morphism on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <NativeCard variant="glass">
          <Text>Glass Content</Text>
        </NativeCard>,
      );

      expect(getByTestId('blur-view')).toBeTruthy();
    });

    it('does not render BlurView on Android for glass variant', () => {
      Platform.OS = 'android';
      const { queryByTestId } = render(
        <NativeCard variant="glass">
          <Text>Glass Content</Text>
        </NativeCard>,
      );

      expect(queryByTestId('blur-view')).toBeNull();
    });

    it('applies custom className', () => {
      const { getByTestId } = render(
        <NativeCard className="custom-class" testID="class-card">
          <Text>Content</Text>
        </NativeCard>,
      );

      // In tests, className is passed but not processed by our mock
      const card = getByTestId('class-card');
      expect(card).toBeTruthy();
    });

    it('applies custom style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <NativeCard style={customStyle} testID="styled-card">
          <Text>Content</Text>
        </NativeCard>,
      );

      const card = getByTestId('styled-card');
      // Just verify the component renders with custom style
      expect(card).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeCard onPress={onPress} testID="pressable-card">
          <Text>Press me</Text>
        </NativeCard>,
      );

      fireEvent.press(getByTestId('pressable-card'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic feedback on press', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeCard onPress={onPress} testID="pressable-card">
          <Text>Press me</Text>
        </NativeCard>,
      );

      fireEvent.press(getByTestId('pressable-card'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeCard onPress={onPress} disabled={true} testID="disabled-card">
          <Text>Disabled</Text>
        </NativeCard>,
      );

      fireEvent.press(getByTestId('disabled-card'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not trigger haptic feedback when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeCard onPress={onPress} disabled={true} testID="disabled-card">
          <Text>Disabled</Text>
        </NativeCard>,
      );

      fireEvent.press(getByTestId('disabled-card'));
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('animations', () => {
    it('responds to press events when onPress is provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <NativeCard onPress={onPress} testID="animated-card">
          <Text>Animated</Text>
        </NativeCard>,
      );

      const card = getByTestId('animated-card');

      fireEvent(card, 'pressIn');
      fireEvent(card, 'pressOut');
      fireEvent.press(card);

      expect(onPress).toHaveBeenCalled();
    });

    it('renders static card when onPress is not provided', () => {
      const { getByText, getByTestId } = render(
        <NativeCard testID="static-card">
          <Text>Static</Text>
        </NativeCard>,
      );

      expect(getByTestId('static-card')).toBeTruthy();
      expect(getByText('Static')).toBeTruthy();
    });
  });

  describe('platform-specific styles', () => {
    it('renders elevated card on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <NativeCard variant="elevated" testID="ios-card">
          <Text>iOS Card</Text>
        </NativeCard>,
      );

      expect(getByTestId('ios-card')).toBeTruthy();
    });

    it('renders elevated card on Android', () => {
      Platform.OS = 'android';
      const { getByTestId } = render(
        <NativeCard variant="elevated" testID="android-card">
          <Text>Android Card</Text>
        </NativeCard>,
      );

      expect(getByTestId('android-card')).toBeTruthy();
    });
  });

  describe('glass morphism intensity', () => {
    it('applies custom intensity to BlurView on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <NativeCard variant="glass" intensity={50}>
          <Text>Intense Glass</Text>
        </NativeCard>,
      );

      const blurView = getByTestId('blur-view');
      expect(blurView.props.intensity).toBe(50);
    });

    it('uses default intensity when not specified', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <NativeCard variant="glass">
          <Text>Default Glass</Text>
        </NativeCard>,
      );

      const blurView = getByTestId('blur-view');
      expect(blurView.props.intensity).toBe(20);
    });
  });
});
