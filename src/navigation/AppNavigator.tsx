// ABOUTME: Main navigation structure for the ADHD Todo app with authentication
// Defines tab navigation with Tasks, Focus, Partnership, and Rewards screens

import React, { useEffect, useState, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
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
import PartnerDashboardScreen from '../screens/PartnerDashboardScreen';
import NotificationListScreen from '../screens/NotificationListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserStorageService from '../services/UserStorageService';
import NotificationService from '../services/NotificationService';
import NotificationBadge from '../components/NotificationBadge';
import NotificationContainer from '../components/NotificationContainer';
import { useUser } from '../contexts/UserContext';
import { Task } from '../types/task.types';
import { User } from '../types/user.types';

// Define navigation param lists
export type TaskStackParamList = {
  TasksList: undefined;
  CreateTask: { category?: string };
  EditTask: { task: Task };
};

export type FocusStackParamList = {
  FocusMode: undefined;
  Hyperfocus: { taskId: string };
  Scattered: undefined;
};

export type PartnershipStackParamList = {
  Partnership: undefined;
  PartnerInvite: undefined;
  TaskAssignment: { taskId: string };
  PartnerDashboard: undefined;
};

export type MainTabParamList = {
  Tasks: NavigationProp<TaskStackParamList>;
  Focus: NavigationProp<FocusStackParamList>;
  Partner: NavigationProp<PartnershipStackParamList>;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: NavigationProp<MainTabParamList>;
  Auth: undefined;
  NotificationList: undefined;
};

// Create navigators with proper types
const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<TaskStackParamList>();
const FocusStackNav = createStackNavigator<FocusStackParamList>();
const PartnershipStackNav = createStackNavigator<PartnershipStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

// Props types
type TasksStackProps = {
  navigation: NavigationProp<RootStackParamList>;
};

// Tasks Stack Navigator with notification support
const TasksStack = ({ navigation }: TasksStackProps) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [, setCurrentUser] = useState<User | null>(null);

  const loadUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const user = await UserStorageService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const notifications = await NotificationService.getNotificationsForUser(user.id);
        const unread = notifications.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      // Error loading notification count
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    // Set up interval to check for new notifications
    const interval = setInterval(loadUnreadCount, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TasksList"
        component={TaskListScreen}
        options={{
          title: 'Tasks',
          headerRight: () => (
            <NotificationBadge
              count={unreadCount}
              onPress={() => navigation.navigate('NotificationList')}
            />
          ),
        }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: 'Create Task' }}
      />
      <Stack.Screen name="EditTask" component={EditTaskScreen} options={{ title: 'Edit Task' }} />
    </Stack.Navigator>
  );
};

// Focus Stack Navigator
const FocusStack = () => (
  <FocusStackNav.Navigator>
    <FocusStackNav.Screen
      name="FocusMode"
      component={FocusModeScreen}
      options={{ title: 'Focus Modes' }}
    />
    <FocusStackNav.Screen
      name="Hyperfocus"
      component={HyperfocusScreen}
      options={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
    <FocusStackNav.Screen
      name="Scattered"
      component={ScatteredScreen}
      options={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
  </FocusStackNav.Navigator>
);

// Partnership Stack Navigator
const PartnershipStack = () => (
  <PartnershipStackNav.Navigator>
    <PartnershipStackNav.Screen
      name="Partnership"
      component={PartnershipScreen}
      options={{ title: 'Partnership' }}
    />
    <PartnershipStackNav.Screen
      name="PartnerInvite"
      component={PartnerInviteScreen}
      options={{
        title: 'Enter Invite Code',
        headerShown: false,
      }}
    />
    <PartnershipStackNav.Screen
      name="TaskAssignment"
      component={TaskAssignmentScreen}
      options={{
        title: 'Assign Task',
        headerShown: false,
        presentation: 'modal',
      }}
    />
    <PartnershipStackNav.Screen
      name="PartnerDashboard"
      component={PartnerDashboardScreen}
      options={{ title: 'Partner Dashboard' }}
    />
  </PartnershipStackNav.Navigator>
);

// Type for tab bar icon
type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Tasks') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Focus') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Partner') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'alert-circle-outline';
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
          tabBarButtonTestID: 'tab-tasks',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusStack}
        options={{
          tabBarButtonTestID: 'tab-focus',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Partner"
        component={PartnershipStack}
        options={{
          tabBarButtonTestID: 'tab-partner',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarButtonTestID: 'tab-profile',
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
  const { user, loading } = useUser();
  const isAuthenticated = !!user;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View testID="app-navigator" style={{ flex: 1 }}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="NotificationList"
              component={NotificationListScreen}
              options={{
                headerShown: true,
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
      </RootStack.Navigator>
      {isAuthenticated && <NotificationContainer />}
    </View>
  );
};

export default AppNavigator;
