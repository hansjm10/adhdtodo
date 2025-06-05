// ABOUTME: Tests for NotificationContext that manages notification state
// Ensures centralized notification management without prop drilling

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { NotificationProvider, useNotifications } from '../NotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../../services/NotificationService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// SupabaseService is already mocked globally in tests/setup.js

// Mock NotificationService
jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  default: {
    getNotificationsForUser: jest.fn(),
    markAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
  },
}));

describe('NotificationContext', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: 'Partner assigned you a task',
      userId: 'user1',
      read: false,
      createdAt: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      type: 'task_completed',
      title: 'Task Completed',
      message: 'Partner completed a task',
      userId: 'user1',
      read: true,
      createdAt: '2023-01-02T00:00:00Z',
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Task Reminder',
      message: 'Task is due soon',
      userId: 'user1',
      read: false,
      createdAt: '2023-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockNotifications));
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);

    // Set up NotificationService mocks
    NotificationService.getNotificationsForUser.mockResolvedValue(mockNotifications);
    NotificationService.markAsRead.mockResolvedValue(true);
    NotificationService.deleteNotification.mockResolvedValue(true);
    NotificationService.clearAllNotifications.mockResolvedValue(true);
  });

  afterEach(async () => {
    await cleanup();
  });

  const TestComponent = () => {
    const { notifications, unreadCount, loading, error } = useNotifications();

    return (
      <View>
        <Text testID="loading">{loading.toString()}</Text>
        <Text testID="error">{error || 'no-error'}</Text>
        <Text testID="count">{notifications.length}</Text>
        <Text testID="unread">{unreadCount}</Text>
        {notifications.map((notif, index) => (
          <Text key={notif.id} testID={`notif-${index}`}>
            {notif.title}
          </Text>
        ))}
      </View>
    );
  };

  it('should provide initial state with loading true', () => {
    const { getByTestId } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    expect(getByTestId('loading').props.children).toBe('true');
    expect(getByTestId('error').props.children).toBe('no-error');
    expect(getByTestId('count').props.children).toBe(0);
    expect(getByTestId('unread').props.children).toBe(0);
  });

  it('should load notifications on mount', async () => {
    const { getByTestId } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('count').props.children).toBe(3);
      expect(getByTestId('unread').props.children).toBe(2);
      expect(getByTestId('notif-0').props.children).toBe('New Task Assigned');
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('notifications');
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to load notifications';
    AsyncStorage.getItem.mockRejectedValueOnce(new Error(errorMessage));

    // Suppress expected console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByTestId } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('error').props.children).toBe(errorMessage);
    });

    consoleSpy.mockRestore();
  });

  it('should add a new notification', async () => {
    const AddTestComponent = () => {
      const { notifications, addNotification, loading } = useNotifications();
      const [hasAdded, setHasAdded] = React.useState(false);

      React.useEffect(() => {
        if (!loading && !hasAdded) {
          setHasAdded(true);
          addNotification({
            type: 'task_update',
            title: 'Task Updated',
            message: 'A task was updated',
            userId: 'user1',
          });
        }
      }, [loading, hasAdded, addNotification]);

      return <Text testID="notif-count">{notifications.length}</Text>;
    };

    const { getByTestId } = render(
      <NotificationProvider>
        <AddTestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('notif-count').props.children).toBe(4);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'notifications',
      expect.stringContaining('Task Updated'),
    );
  });

  it('should mark notification as read', async () => {
    const MarkReadTestComponent = () => {
      const { notifications, unreadCount, markAsRead, loading } = useNotifications();
      const [hasMarked, setHasMarked] = React.useState(false);

      React.useEffect(() => {
        if (!loading && notifications.length > 0 && !hasMarked) {
          setHasMarked(true);
          markAsRead('1');
        }
      }, [loading, notifications.length, hasMarked, markAsRead]);

      return <Text testID="unread-count">{unreadCount}</Text>;
    };

    const { getByTestId } = render(
      <NotificationProvider>
        <MarkReadTestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('unread-count').props.children).toBe(1);
    });
  });

  it('should mark all notifications as read', async () => {
    const MarkAllReadTestComponent = () => {
      const { unreadCount, markAllAsRead, loading } = useNotifications();
      const [hasMarked, setHasMarked] = React.useState(false);

      React.useEffect(() => {
        if (!loading && !hasMarked) {
          setHasMarked(true);
          markAllAsRead();
        }
      }, [loading, hasMarked, markAllAsRead]);

      return <Text testID="unread-count">{unreadCount}</Text>;
    };

    const { getByTestId } = render(
      <NotificationProvider>
        <MarkAllReadTestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('unread-count').props.children).toBe(0);
    });
  });

  it('should delete a notification', async () => {
    const DeleteTestComponent = () => {
      const { notifications, deleteNotification, loading } = useNotifications();
      const [hasDeleted, setHasDeleted] = React.useState(false);

      React.useEffect(() => {
        if (!loading && notifications.length > 0 && !hasDeleted) {
          setHasDeleted(true);
          deleteNotification('1');
        }
      }, [loading, notifications.length, hasDeleted, deleteNotification]);

      return <Text testID="notif-count">{notifications.length}</Text>;
    };

    const { getByTestId } = render(
      <NotificationProvider>
        <DeleteTestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('notif-count').props.children).toBe(2);
    });
  });

  it('should clear all notifications', async () => {
    const ClearTestComponent = () => {
      const { notifications, clearAllNotifications, loading } = useNotifications();

      return (
        <View>
          <Text testID="loading">{loading.toString()}</Text>
          <Text testID="notif-count">{notifications.length}</Text>
          <Text testID="clear-button" onPress={() => clearAllNotifications()}>
            Clear
          </Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <NotificationProvider>
        <ClearTestComponent />
      </NotificationProvider>,
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
    });

    // Verify initial notifications are loaded
    expect(getByTestId('notif-count').props.children).toBe(3);

    // Clear notifications
    const clearButton = getByTestId('clear-button');

    // Use waitFor to handle the async state updates
    await waitFor(async () => {
      clearButton.props.onPress();
      expect(getByTestId('notif-count').props.children).toBe(0);
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('notifications');
  });

  it('should filter notifications by type', async () => {
    const FilterTestComponent = () => {
      const { getNotificationsByType, loading } = useNotifications();
      const taskNotifications = loading ? [] : getNotificationsByType('task_assigned');

      return (
        <View>
          <Text testID="filtered-count">{taskNotifications.length}</Text>
          {taskNotifications.map((notif, index) => (
            <Text key={notif.id} testID={`filtered-${index}`}>
              {notif.type}
            </Text>
          ))}
        </View>
      );
    };

    const { getByTestId } = render(
      <NotificationProvider>
        <FilterTestComponent />
      </NotificationProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('filtered-count').props.children).toBe(1);
      expect(getByTestId('filtered-0').props.children).toBe('task_assigned');
    });
  });

  it('should throw error when useNotifications is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const ComponentWithoutProvider = () => {
      useNotifications();
      return null;
    };

    expect(() => render(<ComponentWithoutProvider />)).toThrow(
      'useNotifications must be used within a NotificationProvider',
    );

    consoleSpy.mockRestore();
  });
});
