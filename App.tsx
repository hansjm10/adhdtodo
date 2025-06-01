import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AppProvider } from './src/contexts';

export default function App() {
  return (
    <React.StrictMode>
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </React.StrictMode>
  );
}
