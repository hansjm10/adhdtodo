// ABOUTME: Tests for MicroInteractions components
// Verifies animations, haptic feedback, and platform-specific behaviors

import React from 'react';
import { Platform, Text, View, Animated } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import {
  RippleEffect,
  SuccessCheckmark,
  AttentionPulse,
  SkeletonPulse,
  useTouchBounce,
} from '../MicroInteractions';

// Mock haptics
jest.mock('expo-haptics');

describe('MicroInteractions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RippleEffect', () => {
    it('renders on Android only', () => {
      Platform.OS = 'android';
      const { toJSON } = render(<RippleEffect />);

      // On Android, it should render something
      expect(toJSON()).toBeTruthy();
    });

    it('does not render on iOS', () => {
      Platform.OS = 'ios';
      const { toJSON } = render(<RippleEffect />);

      // On iOS, it should render null
      expect(toJSON()).toBeNull();
    });

    it('renders with custom props on Android', () => {
      Platform.OS = 'android';
      const customColor = 'rgba(255, 0, 0, 0.5)';
      const customSize = 200;
      const { toJSON } = render(<RippleEffect color={customColor} size={customSize} />);

      // Verify it renders
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('SuccessCheckmark', () => {
    it('renders checkmark', () => {
      const { getByText } = render(<SuccessCheckmark />);
      expect(getByText('✓')).toBeTruthy();
    });

    it('triggers success haptic feedback', () => {
      render(<SuccessCheckmark />);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });

    it('calls onComplete callback', async () => {
      const onComplete = jest.fn();
      render(<SuccessCheckmark onComplete={onComplete} />);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('renders with custom size', () => {
      const customSize = 80;
      const { getByText } = render(<SuccessCheckmark size={customSize} />);

      expect(getByText('✓')).toBeTruthy();
    });

    it('renders with custom color', () => {
      const customColor = '#ff0000';
      const { getByText } = render(<SuccessCheckmark color={customColor} />);

      expect(getByText('✓')).toBeTruthy();
    });
  });

  describe('AttentionPulse', () => {
    it('renders children', () => {
      const { getByText } = render(
        <AttentionPulse>
          <Text>Pulsing Content</Text>
        </AttentionPulse>,
      );

      expect(getByText('Pulsing Content')).toBeTruthy();
    });

    it('renders when disabled', () => {
      const { getByTestId } = render(
        <AttentionPulse enabled={false}>
          <View testID="disabled-pulse" />
        </AttentionPulse>,
      );

      expect(getByTestId('disabled-pulse')).toBeTruthy();
    });

    it('renders on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId } = render(
        <AttentionPulse>
          <View testID="ios-pulse" />
        </AttentionPulse>,
      );

      expect(getByTestId('ios-pulse')).toBeTruthy();
    });

    it('renders on Android', () => {
      Platform.OS = 'android';
      const { getByTestId } = render(
        <AttentionPulse>
          <View testID="android-pulse" />
        </AttentionPulse>,
      );

      expect(getByTestId('android-pulse')).toBeTruthy();
    });

    it('renders with custom color', () => {
      Platform.OS = 'ios';
      const customColor = '#ff0000';
      const { getByTestId } = render(
        <AttentionPulse color={customColor}>
          <View testID="color-pulse" />
        </AttentionPulse>,
      );

      expect(getByTestId('color-pulse')).toBeTruthy();
    });
  });

  describe('SkeletonPulse', () => {
    it('renders with default props', () => {
      const { toJSON } = render(<SkeletonPulse />);

      expect(toJSON()).toBeTruthy();
    });

    it('renders with custom dimensions', () => {
      const customWidth = 200;
      const customHeight = 40;
      const customRadius = 8;

      const { toJSON } = render(
        <SkeletonPulse width={customWidth} height={customHeight} borderRadius={customRadius} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('renders animated skeleton', () => {
      const { toJSON } = render(<SkeletonPulse />);

      // Just verify it renders
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('useTouchBounce', () => {
    const TestComponent = ({ scale = 0.98, duration = 100 }) => {
      const { scaleAnim, onPressIn, onPressOut } = useTouchBounce(scale, duration);

      return (
        <Animated.View
          testID="bounce-view"
          style={{ transform: [{ scale: scaleAnim }] }}
          onTouchStart={onPressIn}
          onTouchEnd={onPressOut}
        >
          <Text>Bounce Me</Text>
        </Animated.View>
      );
    };

    it('returns animation values and handlers', () => {
      const { getByTestId } = render(<TestComponent />);
      const bounceView = getByTestId('bounce-view');

      expect(bounceView).toBeTruthy();
      expect(bounceView.props.style.transform).toBeDefined();
    });

    it('handles press in', () => {
      const { getByTestId } = render(<TestComponent scale={0.9} />);
      const bounceView = getByTestId('bounce-view');

      // Trigger press in
      bounceView.props.onTouchStart();

      // Just verify it handles the event
      expect(bounceView).toBeTruthy();
    });

    it('handles press out', () => {
      const { getByTestId } = render(<TestComponent />);
      const bounceView = getByTestId('bounce-view');

      // Trigger press in then out
      bounceView.props.onTouchStart();
      bounceView.props.onTouchEnd();

      // Just verify it handles the events
      expect(bounceView).toBeTruthy();
    });
  });
});
