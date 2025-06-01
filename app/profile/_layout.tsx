// ABOUTME: Profile stack layout for profile-related screens
// Provides navigation structure for profile and partnership features

import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="partnership/index" options={{ title: 'Partnership' }} />
      <Stack.Screen
        name="partnership/invite"
        options={{
          title: 'Invite Partner',
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="partnership/dashboard" options={{ title: 'Partner Dashboard' }} />
    </Stack>
  );
}
