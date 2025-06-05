// ABOUTME: Tests for UserContext that manages user, partner, and partnership data
// Ensures centralized user state management without prop drilling

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { UserProvider, useUser } from '../UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../../services/AuthService';
import UserStorageService from '../../services/UserStorageService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock AuthService
jest.mock('../../services/AuthService', () => ({
  __esModule: true,
  default: {
    verifySession: jest.fn(),
    logout: jest.fn(),
  },
}));

// Mock UserStorageService
jest.mock('../../services/UserStorageService', () => {
  const { createUserStorageServiceMock } = require('../../../tests/utils/standardMocks');
  return {
    __esModule: true,
    default: createUserStorageServiceMock(),
  };
});

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AuthService.verifySession.mockResolvedValue({ isValid: false });
    AuthService.logout.mockResolvedValue({ success: true });
    // UserStorageService methods are already mocked by createUserStorageServiceMock
  });

  afterEach(() => {
    cleanup();
  });

  const TestComponent = () => {
    const { user, partner, partnership, loading, error } = useUser();

    return (
      <View>
        <Text testID="loading">{loading.toString()}</Text>
        <Text testID="error">{error || 'no-error'}</Text>
        <Text testID="user">{user ? user.name : 'no-user'}</Text>
        <Text testID="partner">{partner ? partner.name : 'no-partner'}</Text>
        <Text testID="partnership">{partnership ? partnership.id : 'no-partnership'}</Text>
      </View>
    );
  };

  it('should provide initial state with loading true', () => {
    const { getByTestId } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    expect(getByTestId('loading').props.children).toBe('true');
    expect(getByTestId('error').props.children).toBe('no-error');
    expect(getByTestId('user').props.children).toBe('no-user');
    expect(getByTestId('partner').props.children).toBe('no-partner');
    expect(getByTestId('partnership').props.children).toBe('no-partnership');
  });

  it('should load user data on mount', async () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    AuthService.verifySession.mockResolvedValueOnce({
      isValid: true,
      user: mockUser,
    });

    const { getByTestId } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('user').props.children).toBe('Test User');
    });

    expect(AuthService.verifySession).toHaveBeenCalled();
  });

  it('should load partner and partnership data when user has partnerId', async () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      partnerId: 'partner1',
    };
    const mockPartner = { id: 'partner1', name: 'Test Partner' };
    const mockPartnership = { id: 'partnership1', userId: '1', partnerId: 'partner1' };

    AuthService.verifySession.mockResolvedValueOnce({
      isValid: true,
      user: mockUser,
    });

    AsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify(mockPartnership))
      .mockResolvedValueOnce(JSON.stringify(mockPartner));

    const { getByTestId } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('user').props.children).toBe('Test User');
      expect(getByTestId('partner').props.children).toBe('Test Partner');
      expect(getByTestId('partnership').props.children).toBe('partnership1');
    });
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to load user data';
    AuthService.verifySession.mockRejectedValueOnce(new Error(errorMessage));

    const { getByTestId } = render(
      <UserProvider>
        <TestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('error').props.children).toBe(errorMessage);
    });
  });

  it('should provide methods to update user data', async () => {
    const UpdateTestComponent = () => {
      const { user, setUser, loading } = useUser();

      React.useEffect(() => {
        if (!loading && !user) {
          setUser({ id: '2', name: 'Updated User', email: 'updated@example.com' });
        }
      }, [loading, user, setUser]);

      return <Text testID="user">{user ? user.name : 'no-user'}</Text>;
    };

    const { getByTestId } = render(
      <UserProvider>
        <UpdateTestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('Updated User');
    });

    expect(UserStorageService.setCurrentUser).toHaveBeenCalledWith({
      id: '2',
      name: 'Updated User',
      email: 'updated@example.com',
    });
  });

  it('should refresh all data when refreshUserData is called', async () => {
    const RefreshTestComponent = () => {
      const { user, refreshUserData, loading } = useUser();
      const [hasRefreshed, setHasRefreshed] = React.useState(false);

      React.useEffect(() => {
        if (!loading && !hasRefreshed) {
          setHasRefreshed(true);
          refreshUserData();
        }
      }, [loading, hasRefreshed, refreshUserData]);

      return <Text testID="user">{user ? user.name : 'no-user'}</Text>;
    };

    const mockUser = { id: '1', name: 'Refreshed User', email: 'test@example.com' };
    AuthService.verifySession.mockResolvedValue({ isValid: true, user: mockUser });

    const { getByTestId } = render(
      <UserProvider>
        <RefreshTestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('Refreshed User');
      expect(AuthService.verifySession).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('should clear user data when logout is called', async () => {
    const LogoutTestComponent = () => {
      const { user, logout, loading } = useUser();

      React.useEffect(() => {
        if (!loading && user) {
          logout();
        }
      }, [loading, user, logout]);

      return <Text testID="user">{user ? user.name : 'no-user'}</Text>;
    };

    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    AuthService.verifySession.mockResolvedValueOnce({ isValid: true, user: mockUser });

    const { getByTestId } = render(
      <UserProvider>
        <LogoutTestComponent />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('no-user');
    });

    expect(AuthService.logout).toHaveBeenCalled();
  });

  it('should throw error when useUser is used outside provider', () => {
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
