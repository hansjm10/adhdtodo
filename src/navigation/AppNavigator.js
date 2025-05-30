// ABOUTME: Main navigation structure for the ADHD Todo app
// Defines tab navigation with Tasks, Focus, and Rewards screens

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import TaskListScreen from '../screens/TaskListScreen';
import EditTaskScreen from '../screens/EditTaskScreen';
import FocusModeScreen from '../screens/FocusModeScreen';
import HyperfocusScreen from '../screens/HyperfocusScreen';
import ScatteredScreen from '../screens/ScatteredScreen';

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

const RewardsScreen = () => (
  <View testID="rewards-screen" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Rewards Screen</Text>
  </View>
);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

const AppNavigator = () => {
  return (
    <View testID="app-navigator" style={{ flex: 1 }}>
      <Tab.Navigator>
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
          name="Rewards"
          component={RewardsScreen}
          options={{
            tabBarTestID: 'tab-rewards',
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default AppNavigator;
