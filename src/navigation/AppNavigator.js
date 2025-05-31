// ABOUTME: Main navigation structure for the ADHD Todo app with authentication
// Defines tab navigation with Tasks, Focus, Partnership, and Rewards screens

import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import TaskListScreen from '../screens/TaskListScreen';
import EditTaskScreen from '../screens/EditTaskScreen';
import FocusModeScreen from '../screens/FocusModeScreen';
import HyperfocusScreen from '../screens/HyperfocusScreen';
import ScatteredScreen from '../screens/ScatteredScreen';
import AuthScreen from '../screens/AuthScreen';
import PartnershipScreen from '../screens/PartnershipScreen';
import PartnerInviteScreen from '../screens/PartnerInviteScreen';
import TaskAssignmentScreen from '../screens/TaskAssignmentScreen';
import UserStorageService from '../services/UserStorageService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();

// Placeholder for PartnerDashboard (to be created)
const PartnerDashboardScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Partner Dashboard - Coming Soon</Text>
  </View>
);

// Placeholder for Rewards screen
const RewardsScreen = () => (
  <View testID="rewards-screen" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Rewards Screen</Text>
  </View>
);

// Tasks Stack Navigator
const TasksStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="TasksList" component={TaskListScreen} options={{ title: 'Tasks' }} />
    <Stack.Screen
      name="CreateTask"
      component={CreateTaskScreen}
      options={{ title: 'Create Task' }}
    />
    <Stack.Screen name="EditTask" component={EditTaskScreen} options={{ title: 'Edit Task' }} />
  </Stack.Navigator>
);

// Focus Stack Navigator
const FocusStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="FocusMode" component={FocusModeScreen} options={{ title: 'Focus Modes' }} />
    <Stack.Screen
      name="Hyperfocus"
      component={HyperfocusScreen}
      options={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
    <Stack.Screen
      name="Scattered"
      component={ScatteredScreen}
      options={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
  </Stack.Navigator>
);

// Partnership Stack Navigator
const PartnershipStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Partnership"
      component={PartnershipScreen}
      options={{ title: 'Partnership' }}
    />
    <Stack.Screen
      name="PartnerInvite"
      component={PartnerInviteScreen}
      options={{
        title: 'Enter Invite Code',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name="TaskAssignment"
      component={TaskAssignmentScreen}
      options={{
        title: 'Assign Task',
        headerShown: false,
        presentation: 'modal',
      }}
    />
    <Stack.Screen
      name="PartnerDashboard"
      component={PartnerDashboardScreen}
      options={{ title: 'Partner Dashboard' }}
    />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Tasks') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Focus') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Partner') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Rewards') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3498DB',
        tabBarInactiveTintColor: '#7F8C8D',
      })}
    >
      <Tab.Screen
        name="Tasks"
        component={TasksStack}
        options={{
          tabBarTestID: 'tab-tasks',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusStack}
        options={{
          tabBarTestID: 'tab-focus',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Partner"
        component={PartnershipStack}
        options={{
          tabBarTestID: 'tab-partner',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{
          tabBarTestID: 'tab-rewards',
        }}
      />
    </Tab.Navigator>
  );
};

// Loading Screen
const LoadingScreen = () => (
  <View
    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}
  >
    <ActivityIndicator size="large" color="#3498DB" />
  </View>
);

// Root Navigator with Authentication Flow
const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await UserStorageService.getCurrentUser();
      setIsAuthenticated(!!currentUser);
    } catch (error) {
      // Error checking auth status - default to not authenticated
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View testID="app-navigator" style={{ flex: 1 }}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
      </RootStack.Navigator>
    </View>
  );
};

export default AppNavigator;
