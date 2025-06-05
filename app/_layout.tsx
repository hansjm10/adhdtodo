// ABOUTME: Root layout for Expo Router app with providers and authentication
// Sets up the navigation structure and wraps the app with necessary contexts

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AppProvider } from '../src/contexts/AppProvider';
import { useUser } from '../src/contexts/UserContext';
import { useAuth } from '../src/contexts/AuthContext';
import NotificationContainer from '../src/components/NotificationContainer';
import BiometricAuthScreen from '../src/components/BiometricAuthScreen';

// Loading Screen Component
const loadingScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});

const LoadingScreen = () => (
  <View style={loadingScreenStyles.container}>
    <ActivityIndicator size="large" color="#3498DB" />
  </View>
);

// Auth-aware layout component
function RootLayoutNav() {
  const { user, loading: userLoading } = useUser();
  const { isAuthenticated, isLocked, unlock } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Protect routes based on authentication
  useEffect(() => {
    if (userLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [user, segments, userLoading]);

  if (userLoading) {
    return <LoadingScreen />;
  }

  // Show biometric authentication screen if user is locked out
  if (user && (!isAuthenticated || isLocked)) {
    return (
      <BiometricAuthScreen
        onSuccess={() => {
          if (isLocked) {
            unlock().catch(() => {});
          }
        }}
        reason="Unlock to access your ADHD Todo data"
      />
    );
  }

  return (
    <View style={rootStyles.container}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="task/create"
          options={{
            title: 'Create Task',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{
            title: 'Edit Task',
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications/index"
          options={{
            title: 'Notifications',
            presentation: 'modal',
          }}
        />
      </Stack>
      {user && <NotificationContainer />}
    </View>
  );
}

const rootStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}
