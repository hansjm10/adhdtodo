// ABOUTME: Tests for tab layout error handling and notification loading
// Verifies error handling when notification loading fails

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import TabLayout from '../_layout';
import UserStorageService from '../../../src/services/UserStorageService';
import NotificationService from '../../../src/services/NotificationService';

// Mock dependencies
jest.mock('expo-router', () => ({
  Tabs: ({ children }) => children,
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => 'Ionicons',
}));

jest.mock('../../../src/services/UserStorageService');
jest.mock('../../../src/services/NotificationService');

// Track NotificationBadge props
let notificationBadgeProps = { count: 0 };
jest.mock('../../../src/components/NotificationBadge', () => {
  return (props) => {
    notificationBadgeProps = props;
    return null;
  };
});

// Mock console.warn
const originalWarn = console.warn;
const mockConsoleWarn = jest.fn();

describe('TabLayout Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;
    notificationBadgeProps = { count: 0 }; // Reset props
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  it('should handle error when loading notification count fails', async () => {
    const mockError = new Error('Failed to load user');
    UserStorageService.getCurrentUser.mockRejectedValue(mockError);

    render(<TabLayout />);

    await waitFor(() => {
      expect(UserStorageService.getCurrentUser).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalledWith('Failed to load notification count:', mockError);
      // Should default to 0 on error
      expect(notificationBadgeProps.count).toBe(0);
    });
  });

  it('should set unread count to 0 when error occurs', async () => {
    const mockError = new Error('Network error');
    UserStorageService.getCurrentUser.mockResolvedValue({ id: 'user123', name: 'Test User' });
    NotificationService.getNotificationsForUser.mockRejectedValue(mockError);

    render(<TabLayout />);

    await waitFor(() => {
      expect(NotificationService.getNotificationsForUser).toHaveBeenCalledWith('user123');
      expect(mockConsoleWarn).toHaveBeenCalledWith('Failed to load notification count:', mockError);
      // The notification badge should show 0
      expect(notificationBadgeProps.count).toBe(0);
    });
  });

  it('should load notification count successfully', async () => {
    const mockUser = { id: 'user123', name: 'Test User' };
    const mockNotifications = [
      { id: '1', read: false },
      { id: '2', read: true },
      { id: '3', read: false },
    ];

    UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
    NotificationService.getNotificationsForUser.mockResolvedValue(mockNotifications);

    render(<TabLayout />);

    await waitFor(() => {
      expect(UserStorageService.getCurrentUser).toHaveBeenCalled();
      expect(NotificationService.getNotificationsForUser).toHaveBeenCalledWith('user123');
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      // Should show 2 unread notifications
      expect(notificationBadgeProps.count).toBe(2);
    });
  });

  it('should handle when user is not logged in', async () => {
    UserStorageService.getCurrentUser.mockResolvedValue(null);

    render(<TabLayout />);

    await waitFor(() => {
      expect(UserStorageService.getCurrentUser).toHaveBeenCalled();
      expect(NotificationService.getNotificationsForUser).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      // Should default to 0
      expect(notificationBadgeProps.count).toBe(0);
    });
  });
});
