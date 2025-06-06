// ABOUTME: Root layout for Expo Router app with providers and authentication
// Sets up the navigation structure and wraps the app with necessary contexts

import '../global.css';
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

  // Navigation guard and debounce refs
  const isNavigatingRef = React.useRef(false);
  const navigationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Protect routes based on authentication
  useEffect(() => {
    // Guard against navigation during loading or before router is ready
    const routerWithReady = router as { isReady?: boolean };
    if (userLoading || !routerWithReady.isReady) return undefined;

    const inAuthGroup = segments[0] === '(auth)';

    // Add navigation guard to prevent concurrent navigations
    if (isNavigatingRef.current) return undefined;

    // Clear any pending navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Debounce navigation decisions
    navigationTimeoutRef.current = setTimeout(() => {
      const navigate = (path: string): void => {
        if (isNavigatingRef.current) return;

        isNavigatingRef.current = true;
        try {
          router.replace(path);
          // Reset navigation flag after a small delay to prevent rapid navigation
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 300);
        } catch (error) {
          isNavigatingRef.current = false;
          if (global.__DEV__) {
            console.error('Navigation error:', error);
          }
        }
      };

      if (!user && !inAuthGroup) {
        navigate('/(auth)/sign-in');
      } else if (user && inAuthGroup) {
        navigate('/(tabs)');
      }
    }, 100); // Small debounce to prevent rapid redirects

    return (): void => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, [user, segments, userLoading, router]);

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
