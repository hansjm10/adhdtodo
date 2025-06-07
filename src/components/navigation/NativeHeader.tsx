// ABOUTME: Native-feeling header component with platform-specific navigation
// Provides iOS-style blur effects and Android elevation with proper transitions

import React, { useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text, TouchableOpacity, Animated, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

interface NativeHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  tintColor?: string;
  onBackPress?: () => void;
}

export const NativeHeader: React.FC<NativeHeaderProps> = ({
  title,
  showBack = true,
  rightElement,
  transparent = false,
  tintColor = '#FFFFFF',
  onBackPress,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleBackPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  // iOS blur header style
  const iosHeaderStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  };

  // Android elevated header style
  const androidHeaderStyle: ViewStyle = {
    backgroundColor: transparent ? 'transparent' : '#131316',
    elevation: transparent ? 0 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  };

  const headerContent = (
    <View
      className="px-4 pb-3"
      style={{
        paddingTop: insets.top,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View className="flex-row items-center justify-between h-11">
        {/* Left side - Back button */}
        <View className="flex-1 flex-row items-start">
          {showBack && router.canGoBack() && (
            <TouchableOpacity
              onPress={handleBackPress}
              className="p-2 -ml-2 rounded-full"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
                  size={Platform.OS === 'ios' ? 28 : 24}
                  color={tintColor}
                />
                {Platform.OS === 'ios' && (
                  <Text className="text-primary-500 text-base ml-1">Back</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Center - Title */}
        <View className="flex-3 items-center">
          <Animated.Text
            className="text-white text-lg font-semibold"
            style={{
              opacity: scrollY.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0.8],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, -2],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}
            numberOfLines={1}
          >
            {title}
          </Animated.Text>
        </View>

        {/* Right side - Custom element */}
        <View className="flex-1 flex-row justify-end items-center">{rightElement}</View>
      </View>
    </View>
  );

  if (Platform.OS === 'ios' && transparent) {
    return (
      <View style={iosHeaderStyle}>
        <BlurView intensity={80} tint="dark" className="flex-1">
          {headerContent}
        </BlurView>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        Platform.OS === 'ios' ? iosHeaderStyle : androidHeaderStyle,
        {
          opacity: scrollY.interpolate({
            inputRange: [-50, 0],
            outputRange: [0.8, 1],
            extrapolate: 'clamp',
          }),
        },
      ]}
    >
      {headerContent}
    </Animated.View>
  );
};

// Hook to control header from screens
export const useNativeHeader = () => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: false,
  });

  return {
    scrollY,
    onScroll,
    headerScrollProps: {
      onScroll,
      scrollEventThrottle: 16,
    },
  };
};

export default NativeHeader;
