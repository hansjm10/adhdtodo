// ABOUTME: TypeScript type definitions for React Navigation
// Defines navigation params and screen names for type-safe navigation

import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Task } from './task.types';

export type RootStackParamList = {
  // Main Tabs
  MainTabs: undefined;
  
  // Auth Stack
  Auth: undefined;
  
  // Task Stack
  TaskList: undefined;
  CreateTask: {
    category?: string;
  };
  EditTask: {
    task: Task;
  };
  TaskAssignment: {
    taskId: string;
  };
  
  // Focus Modes
  FocusMode: {
    taskId: string;
  };
  HyperfocusMode: {
    taskId: string;
  };
  ScatteredMode: undefined;
  
  // Partnership Stack
  Partnership: undefined;
  PartnerInvite: undefined;
  PartnerDashboard: undefined;
  
  // Profile Stack
  Profile: undefined;
  
  // Notifications
  NotificationList: undefined;
};

// Navigation prop types for each screen
export type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;
export type TaskListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TaskList'>;
export type CreateTaskScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateTask'>;
export type EditTaskScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditTask'>;
export type FocusModeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FocusMode'>;
export type HyperfocusModeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HyperfocusMode'>;
export type ScatteredModeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ScatteredMode'>;
export type PartnershipScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Partnership'>;
export type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

// Route prop types for each screen
export type AuthScreenRouteProp = RouteProp<RootStackParamList, 'Auth'>;
export type TaskListScreenRouteProp = RouteProp<RootStackParamList, 'TaskList'>;
export type CreateTaskScreenRouteProp = RouteProp<RootStackParamList, 'CreateTask'>;
export type EditTaskScreenRouteProp = RouteProp<RootStackParamList, 'EditTask'>;
export type FocusModeScreenRouteProp = RouteProp<RootStackParamList, 'FocusMode'>;
export type HyperfocusModeScreenRouteProp = RouteProp<RootStackParamList, 'HyperfocusMode'>;
export type ScatteredModeScreenRouteProp = RouteProp<RootStackParamList, 'ScatteredMode'>;
export type PartnershipScreenRouteProp = RouteProp<RootStackParamList, 'Partnership'>;
export type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

// Tab navigation types
export type MainTabParamList = {
  Tasks: undefined;
  Partnership: undefined;
  Profile: undefined;
};