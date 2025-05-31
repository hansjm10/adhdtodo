// ABOUTME: Tests for AppProvider that combines all app contexts
// Ensures all contexts are accessible through single provider

import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppProvider } from '../AppProvider';
import { useUser } from '../UserContext';
import { useTasks } from '../TaskContext';
import { useNotifications } from '../NotificationContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock services
jest.mock('../../services/TaskStorageService', () => ({
  getAllTasks: jest.fn().mockResolvedValue([]),
}));

describe('AppProvider', () => {
  afterEach(() => {
    cleanup();
  });

  const TestComponent = () => {
    const { user, loading: userLoading } = useUser();
    const { tasks, loading: tasksLoading } = useTasks();
    const { notifications, loading: notificationsLoading } = useNotifications();

    return (
      <>
        <Text testID="user-loading">{userLoading.toString()}</Text>
        <Text testID="tasks-loading">{tasksLoading.toString()}</Text>
        <Text testID="notifications-loading">{notificationsLoading.toString()}</Text>
        <Text testID="user-data">{user ? 'has-user' : 'no-user'}</Text>
        <Text testID="tasks-count">{tasks.length}</Text>
        <Text testID="notifications-count">{notifications.length}</Text>
      </>
    );
  };

  it('should provide all contexts to children', () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    // All contexts should be accessible
    expect(getByTestId('user-loading')).toBeTruthy();
    expect(getByTestId('tasks-loading')).toBeTruthy();
    expect(getByTestId('notifications-loading')).toBeTruthy();
  });

  it('should handle multiple consumers', () => {
    const Consumer1 = () => {
      const { tasks } = useTasks();
      return <Text testID="consumer1">{tasks.length}</Text>;
    };

    const Consumer2 = () => {
      const { unreadCount } = useNotifications();
      return <Text testID="consumer2">{unreadCount}</Text>;
    };

    const { getByTestId } = render(
      <AppProvider>
        <Consumer1 />
        <Consumer2 />
      </AppProvider>,
    );

    expect(getByTestId('consumer1')).toBeTruthy();
    expect(getByTestId('consumer2')).toBeTruthy();
  });

  it('should handle nested components', () => {
    const Parent = ({ children }) => {
      const { user } = useUser();
      return (
        <>
          <Text testID="parent">{user ? 'parent-has-user' : 'parent-no-user'}</Text>
          {children}
        </>
      );
    };

    const Child = () => {
      const { tasks } = useTasks();
      return <Text testID="child">{tasks.length}</Text>;
    };

    const { getByTestId } = render(
      <AppProvider>
        <Parent>
          <Child />
        </Parent>
      </AppProvider>,
    );

    expect(getByTestId('parent')).toBeTruthy();
    expect(getByTestId('child')).toBeTruthy();
  });

  it('should throw error when contexts are used outside AppProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const ComponentWithoutProvider = () => {
      useUser();
      return null;
    };

    expect(() => render(<ComponentWithoutProvider />)).toThrow(
      'useUser must be used within a UserProvider',
    );

    consoleSpy.mockRestore();
  });
});
