// ABOUTME: iOS-style swipe-back gesture handler with rubber band effect
// Provides native-feeling navigation gestures for stack navigation

import type { ReactNode } from 'react';
import React, { useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { View, Animated, Dimensions, Platform, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

interface SwipeBackGestureProps {
  children: ReactNode;
  enabled?: boolean;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

export const SwipeBackGesture: React.FC<SwipeBackGestureProps> = ({
  children,
  enabled = true,
  onSwipeStart,
  onSwipeEnd,
}) => {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureRef = useRef({ isActive: false, startX: 0 });

  // Only enable on iOS by default
  const isEnabled = enabled && Platform.OS === 'ios' && router.canGoBack();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes from the left edge
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const isFromLeftEdge = evt.nativeEvent.pageX < 50;
        return isEnabled && isHorizontalSwipe && isFromLeftEdge && gestureState.dx > 0;
      },
      onPanResponderGrant: (evt) => {
        gestureRef.current.isActive = true;
        gestureRef.current.startX = evt.nativeEvent.pageX;
        onSwipeStart?.();

        // Light haptic feedback on gesture start
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Calculate progress with rubber band effect
        let progress = gestureState.dx;

        // Apply rubber band effect when swiping beyond screen width
        if (progress > SCREEN_WIDTH * 0.5) {
          const overflow = progress - SCREEN_WIDTH * 0.5;
          progress = SCREEN_WIDTH * 0.5 + overflow * 0.1;
        }

        // Clamp negative values
        progress = Math.max(0, progress);

        translateX.setValue(progress);
      },
      onPanResponderRelease: (_, gestureState) => {
        gestureRef.current.isActive = false;

        const velocity = gestureState.vx;
        const distance = gestureState.dx;

        // Determine if we should complete the swipe
        const shouldGoBack =
          distance > SWIPE_THRESHOLD || (velocity > SWIPE_VELOCITY_THRESHOLD && distance > 50);

        if (shouldGoBack) {
          // Complete the swipe
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          Animated.spring(translateX, {
            toValue: SCREEN_WIDTH,
            useNativeDriver: true,
            friction: 7,
            tension: 35,
          }).start(() => {
            router.back();
            // Reset after navigation
            translateX.setValue(0);
          });
        } else {
          // Snap back with spring animation
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
            tension: 65,
          }).start();
        }

        onSwipeEnd?.();
      },
    }),
  ).current;

  // Shadow and opacity interpolations for iOS effect
  const shadowOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.3, 0],
    extrapolate: 'clamp',
  });

  const overlayOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.3, 0],
    extrapolate: 'clamp',
  });

  const scale = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.95, 1],
    extrapolate: 'clamp',
  });

  if (!isEnabled) {
    return children as React.ReactElement;
  }

  const containerStyle: Animated.AnimatedProps<ViewStyle> = {
    flex: 1,
    transform: [{ translateX }],
    // iOS-style shadow
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? shadowOpacity : 0,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 16 : 0,
  };

  return (
    <View className="flex-1 bg-black">
      {/* Background view that scales down during swipe */}
      <Animated.View
        className="absolute inset-0 bg-black"
        style={{
          transform: [{ scale }],
        }}
      >
        {/* Dark overlay */}
        <Animated.View
          className="absolute inset-0 bg-black"
          style={{
            opacity: overlayOpacity,
          }}
        />
      </Animated.View>

      {/* Main content */}
      <Animated.View style={containerStyle} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

export default SwipeBackGesture;
