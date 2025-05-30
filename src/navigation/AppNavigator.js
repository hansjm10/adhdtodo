// ABOUTME: Main navigation structure for the ADHD Todo app
// Defines tab navigation with Tasks, Focus, and Rewards screens

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import TaskListScreen from '../screens/TaskListScreen';
import EditTaskScreen from '../screens/EditTaskScreen';

const FocusScreen = () => (
  <View testID="focus-screen" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Focus Screen</Text>
  </View>
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
          component={FocusScreen}
          options={{
            tabBarTestID: 'tab-focus',
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
