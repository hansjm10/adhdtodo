// ABOUTME: Integration test setup for rendering app with navigation and contexts
// Provides utilities for testing complete user flows across screens

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from '../../src/navigation/AppNavigator';
import { AppProvider } from '../../src/contexts/AppProvider';
import UserStorageService from '../../src/services/UserStorageService';
import TaskStorageService from '../../src/services/TaskStorageService';
import AuthService from '../../src/services/AuthService';
import NotificationService from '../../src/services/NotificationService';
import SecureStorageService from '../../src/services/SecureStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom render function for integration tests
export const renderApp = (initialRouteName = null) => {
  const wrapper = ({ children }) => (
    <AppProvider>
      <NavigationContainer>{children}</NavigationContainer>
    </AppProvider>
  );

  return render(<AppNavigator />, { wrapper });
};

// Utility function to render app with authenticated user
export const renderAppWithAuth = async (userData = {}) => {
  const defaultUser = {
    id: 'test-user-id',
    username: 'testuser',
    passwordHash: 'hashed-password',
    createdAt: new Date().toISOString(),
    ...userData,
  };

  // Set up authenticated session
  await UserStorageService.saveUser(defaultUser);
  await SecureStorageService.setItem('currentUserId', defaultUser.id);
  await SecureStorageService.setItem('sessionToken', 'test-session-token');

  const renderResult = renderApp();

  // Wait for navigation to settle
  await waitFor(() => {
    expect(renderResult.queryByTestId('app-navigator')).toBeTruthy();
  });

  return { ...renderResult, user: defaultUser };
};

// Clear all storage between tests
export const clearAllStorage = async () => {
  try {
    await AsyncStorage.clear();
    // SecureStorageService doesn't support clear(), so we manually clear known keys
    const secureKeys = ['currentUserId', 'sessionToken', 'userToken'];
    for (const key of secureKeys) {
      try {
        await SecureStorageService.removeItem(key);
      } catch (e) {
        // Ignore errors for non-existent keys
      }
    }
    // Clear any in-memory caches
    jest.clearAllMocks();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: `user-${Date.now()}-${Math.random()}`,
  email: 'testuser@example.com',
  name: 'Test User',
  role: 'adhd_user',
  passwordHash: 'hashed-password',
  passwordSalt: 'salt',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createTestTask = (overrides = {}) => ({
  id: `task-${Date.now()}-${Math.random()}`,
  title: 'Test Task',
  description: 'Test task description',
  category: 'Work',
  priority: 'medium',
  timeEstimate: 30,
  isCompleted: false,
  userId: 'test-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createTestNotification = (overrides = {}) => ({
  id: `notification-${Date.now()}-${Math.random()}`,
  type: 'task_reminder',
  title: 'Test Notification',
  message: 'Test notification message',
  userId: 'test-user-id',
  taskId: null,
  read: false,
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createTestPartnership = (overrides = {}) => ({
  id: `partnership-${Date.now()}-${Math.random()}`,
  userId1: 'test-user-id',
  userId2: 'partner-user-id',
  status: 'active',
  createdAt: new Date().toISOString(),
  inviteCode: 'TEST123',
  ...overrides,
});

// Wait for navigation utilities
export const waitForScreen = async (testId, options = {}) => {
  return waitFor(
    () => {
      const element = screen.queryByTestId(testId);
      expect(element).toBeTruthy();
      return element;
    },
    { timeout: 5000, ...options },
  );
};

// Mock service responses for consistent testing
export const mockAuthService = {
  login: jest.fn(),
  signUp: jest.fn(),
  logout: jest.fn(),
  verifySession: jest.fn(),
  resetPassword: jest.fn(),
};

export const mockTaskService = {
  getAllTasks: jest.fn(),
  saveTask: jest.fn(),
  deleteTask: jest.fn(),
  toggleTaskCompletion: jest.fn(),
};

export const mockNotificationService = {
  getNotificationsForUser: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  scheduleNotification: jest.fn(),
};

// Helper to set up common mocks
export const setupMocks = () => {
  // Mock successful auth by default
  mockAuthService.verifySession.mockResolvedValue({ isValid: true });
  mockAuthService.login.mockResolvedValue({ success: true, user: createTestUser() });
  mockAuthService.signUp.mockResolvedValue({ success: true, user: createTestUser() });
  mockAuthService.logout.mockResolvedValue({ success: true });

  // Mock empty task list by default
  mockTaskService.getAllTasks.mockResolvedValue([]);

  // Mock empty notifications by default
  mockNotificationService.getNotificationsForUser.mockResolvedValue([]);

  // Apply mocks
  jest.spyOn(AuthService, 'verifySession').mockImplementation(mockAuthService.verifySession);
  jest.spyOn(AuthService, 'login').mockImplementation(mockAuthService.login);
  jest.spyOn(AuthService, 'signUp').mockImplementation(mockAuthService.signUp);
  jest.spyOn(AuthService, 'logout').mockImplementation(mockAuthService.logout);
  jest.spyOn(TaskStorageService, 'getAllTasks').mockImplementation(mockTaskService.getAllTasks);
  jest
    .spyOn(NotificationService, 'getNotificationsForUser')
    .mockImplementation(mockNotificationService.getNotificationsForUser);
};

// Clean up after each test
export const cleanupIntegrationTest = async () => {
  await clearAllStorage();
  jest.clearAllMocks();
  jest.restoreAllMocks();
};
