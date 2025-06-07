// ABOUTME: Mac-inspired 404 not found screen using NativeWind
// Clean error screen for unmatched routes

import { Link } from 'expo-router';
import { View } from 'react-native';
import { ThemedText, ThemedContainer } from '../src/components/themed';

export default function NotFoundScreen() {
  return (
    <ThemedContainer variant="screen" safeArea centered>
      <View className="items-center">
        <ThemedText variant="h1" color="primary" weight="bold" className="mb-2.5">
          404
        </ThemedText>
        <ThemedText variant="h3" color="secondary" className="mb-2">
          Page Not Found
        </ThemedText>
        <ThemedText variant="body" color="tertiary" align="center" className="mb-5">
          This screen doesn&apos;t exist.
        </ThemedText>
        <Link href="/" className="text-lg text-primary-500 underline">
          <ThemedText variant="body" color="primary" weight="semibold">
            Go to home screen
          </ThemedText>
        </Link>
      </View>
    </ThemedContainer>
  );
}
