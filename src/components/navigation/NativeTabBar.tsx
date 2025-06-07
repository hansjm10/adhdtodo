// ABOUTME: Custom native-feeling tab bar with platform-specific animations
// Provides iOS-style smooth transitions and Android Material Design 3 navigation

import React, { useRef, useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text, Animated, Platform, Dimensions, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';

interface TabItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  path: string;
}

interface NativeTabBarProps {
  tabs: TabItem[];
  onTabPress: (tab: TabItem) => void;
  badge?: { [key: string]: number };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 4; // Assuming 4 tabs

export const NativeTabBar: React.FC<NativeTabBarProps> = ({ tabs, onTabPress, badge = {} }) => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Animation values
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const tabScales = useRef(tabs.map(() => new Animated.Value(1))).current;
  const tabOpacities = useRef(tabs.map(() => new Animated.Value(0.6))).current;
  const badgeScales = useRef(tabs.map(() => new Animated.Value(0))).current;

  // Find active tab index
  const activeIndex = tabs.findIndex((tab) => pathname.includes(tab.path));

  useEffect(() => {
    // Animate indicator position
    Animated.spring(indicatorPosition, {
      toValue: activeIndex * TAB_WIDTH,
      useNativeDriver: true,
      friction: 7,
      tension: 50,
    }).start();

    // Animate tab scales and opacities
    tabs.forEach((_, index) => {
      const isActive = index === activeIndex;

      Animated.parallel([
        Animated.spring(tabScales[index], {
          toValue: isActive ? 1.1 : 1,
          useNativeDriver: true,
          friction: 5,
        }),
        Animated.timing(tabOpacities[index], {
          toValue: isActive ? 1 : 0.6,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [activeIndex]);

  // Animate badge appearance
  useEffect(() => {
    tabs.forEach((tab, index) => {
      const hasBadge = badge[tab.name] && badge[tab.name] > 0;

      Animated.spring(badgeScales[index], {
        toValue: hasBadge ? 1 : 0,
        useNativeDriver: true,
        friction: 5,
      }).start();
    });
  }, [badge]);

  const handleTabPress = (tab: TabItem, index: number) => {
    // Haptic feedback
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce animation
    Animated.sequence([
      Animated.timing(tabScales[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(tabScales[index], {
        toValue: activeIndex === index ? 1.1 : 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    onTabPress(tab);
  };

  const containerStyle: ViewStyle = Platform.select({
    ios: {
      backgroundColor: 'rgba(19, 19, 22, 0.95)',
      borderTopWidth: 0,
      paddingBottom: insets.bottom,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 20,
    },
    android: {
      backgroundColor: '#131316',
      borderTopWidth: 1,
      borderTopColor: '#27272A',
      paddingBottom: insets.bottom + 8,
      elevation: 8,
    },
    default: {
      backgroundColor: '#131316',
      borderTopWidth: 1,
      borderTopColor: '#27272A',
      paddingBottom: insets.bottom,
    },
  });

  return (
    <View style={containerStyle}>
      {/* iOS-style selection indicator */}
      {Platform.OS === 'ios' && (
        <Animated.View
          className="absolute h-1 bg-primary-500 rounded-full top-0"
          style={{
            width: TAB_WIDTH * 0.5,
            left: TAB_WIDTH * 0.25,
            transform: [{ translateX: indicatorPosition }],
          }}
        />
      )}

      <View className="flex-row">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const IconComponent = isActive ? tab.activeIcon : tab.icon;
          const badgeCount = badge[tab.name] || 0;

          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                handleTabPress(tab, index);
              }}
              className="flex-1 items-center py-2"
              android_ripple={{
                color: 'rgba(168, 85, 247, 0.2)',
                borderless: true,
              }}
            >
              <Animated.View
                className="items-center"
                style={{
                  transform: [{ scale: tabScales[index] }],
                }}
              >
                <View className="relative">
                  <Animated.View style={{ opacity: tabOpacities[index] }}>
                    <Ionicons
                      name={IconComponent}
                      size={24}
                      color={isActive ? '#a855f7' : '#71717A'}
                    />
                  </Animated.View>

                  {/* Badge */}
                  {badgeCount > 0 && (
                    <Animated.View
                      className="absolute -top-1 -right-1 bg-danger-500 rounded-full min-w-[18px] h-[18px] items-center justify-center"
                      style={{
                        transform: [{ scale: badgeScales[index] }],
                      }}
                    >
                      <Text className="text-white text-xs font-bold px-1">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Text>
                    </Animated.View>
                  )}
                </View>

                <Animated.Text
                  className={`text-xs mt-1 ${isActive ? 'text-primary-500 font-medium' : 'text-text-tertiary'}`}
                  style={{ opacity: tabOpacities[index] }}
                >
                  {tab.label}
                </Animated.Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      {/* Android Material Design 3 active indicator */}
      {Platform.OS === 'android' && (
        <Animated.View
          className="absolute bottom-0 h-12 rounded-full bg-primary-500 opacity-10 left-2"
          style={{
            width: TAB_WIDTH - 16,
            transform: [{ translateX: indicatorPosition }],
          }}
        />
      )}
    </View>
  );
};

export default NativeTabBar;
