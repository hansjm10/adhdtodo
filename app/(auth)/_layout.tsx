// ABOUTME: Auth group layout for authentication screens
// Provides a stack navigator for auth-related screens

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="sign-in"
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
