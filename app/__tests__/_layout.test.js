// ABOUTME: Tests for root layout authentication routing and redirect loop prevention
// Verifies that authentication redirects don't create infinite loops

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import RootLayout from '../_layout';

// Create mocks
const mockReplace = jest.fn();
const mockPush = jest.fn();

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }) => children, { Screen: () => null }),
  useRouter: jest.fn(),
  useSegments: jest.fn(),
}));

// Mock contexts
jest.mock('../../src/contexts/AppProvider', () => ({
  AppProvider: ({ children }) => children,
}));

jest.mock('../../src/contexts/UserContext');
jest.mock('../../src/contexts/AuthContext');

// Mock components
jest.mock('../../src/components/NotificationContainer', () => {
  return function NotificationContainer() {
    return null;
  };
});

jest.mock('../../src/components/BiometricAuthScreen', () => {
  return function BiometricAuthScreen() {
    return null;
  };
});

// Import mocked modules
const { useRouter, useSegments } = require('expo-router');
const { useUser } = require('../../src/contexts/UserContext');
const { useAuth } = require('../../src/contexts/AuthContext');

describe('RootLayout Authentication Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    useRouter.mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      isReady: true,
    });
    useSegments.mockReturnValue([]);

    useUser.mockReturnValue({
      user: null,
      loading: false,
      setUser: jest.fn(),
    });

    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLocked: false,
      unlock: jest.fn(),
    });
  });

  describe('Redirect Loop Prevention', () => {
    it('should handle rapid user state changes without creating infinite loops', async () => {
      // Track render counts
      let renderCount = 0;
      let userState = null;

      // Mock replace to return a promise
      mockReplace.mockResolvedValue(undefined);

      useUser.mockImplementation(() => {
        renderCount++;
        // Simulate user state changing during renders
        if (renderCount === 2) {
          userState = { id: 'user123', email: 'test@example.com' };
        } else if (renderCount === 4) {
          userState = null;
        }
        return {
          user: userState,
          loading: false,
          setUser: jest.fn(),
        };
      });

      const { rerender } = render(<RootLayout />);

      // Force multiple rerenders to simulate rapid state changes
      for (let i = 0; i < 5; i++) {
        rerender(<RootLayout />);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });
      }

      // Wait for debounce timeout
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      // With the fix, navigation should be debounced and only called once or twice max
      expect(mockReplace.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('should not navigate when router is not ready', async () => {
      // Simulate router not being ready
      useRouter.mockReturnValue({
        replace: mockReplace,
        push: mockPush,
        isReady: false,
      });

      useUser.mockReturnValue({
        user: null,
        loading: false,
        setUser: jest.fn(),
      });

      render(<RootLayout />);

      // Wait to ensure no navigation occurs
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // With the fix, router.isReady check prevents navigation
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle concurrent navigation attempts', async () => {
      let resolveNavigation;
      const navigationPromise = new Promise((resolve) => {
        resolveNavigation = resolve;
      });

      // Mock replace to simulate async navigation
      mockReplace.mockImplementation(() => navigationPromise);

      useUser.mockReturnValue({
        user: null,
        loading: false,
        setUser: jest.fn(),
      });

      const { rerender } = render(<RootLayout />);

      // Wait for initial debounce
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      // Trigger multiple renders rapidly
      for (let i = 0; i < 5; i++) {
        rerender(<RootLayout />);
      }

      // Wait for debounce again
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      // With the fix, navigation guards prevent multiple calls
      expect(mockReplace.mock.calls.length).toBeLessThanOrEqual(1);

      // Resolve navigation
      resolveNavigation();
      await navigationPromise;
    });
  });

  describe('Normal Authentication Flow', () => {
    it('should redirect to sign-in when user is not authenticated', async () => {
      useUser.mockReturnValue({
        user: null,
        loading: false,
        setUser: jest.fn(),
      });

      useSegments.mockReturnValue(['(tabs)']); // User is in tabs but not authenticated

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
        expect(mockReplace).toHaveBeenCalledTimes(1);
      });
    });

    it('should redirect to tabs when authenticated user is in auth group', async () => {
      useUser.mockReturnValue({
        user: { id: 'user123', email: 'test@example.com' },
        loading: false,
        setUser: jest.fn(),
      });

      useSegments.mockReturnValue(['(auth)', 'sign-in']); // User is in auth but authenticated

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
        expect(mockReplace).toHaveBeenCalledTimes(1);
      });
    });

    it('should not redirect when user is authenticated and in tabs', async () => {
      useUser.mockReturnValue({
        user: { id: 'user123', email: 'test@example.com' },
        loading: false,
        setUser: jest.fn(),
      });

      useSegments.mockReturnValue(['(tabs)', 'index']); // User is authenticated and in tabs

      render(<RootLayout />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should not redirect when user loading', async () => {
      useUser.mockReturnValue({
        user: null,
        loading: true, // Still loading
        setUser: jest.fn(),
      });

      render(<RootLayout />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
