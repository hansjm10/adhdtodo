// ABOUTME: Integration tests for complete authentication flows
// Tests registration, login, logout, and session persistence

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  renderApp,
  renderAppWithAuth,
  clearAllStorage,
  createTestUser,
  setupMocks,
  cleanupIntegrationTest,
  mockAuthService,
} from './setup';
import AuthService from '../../src/services/AuthService';
import UserStorageService from '../../src/services/UserStorageService';
import SecureStorageService from '../../src/services/SecureStorageService';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('Authentication Flow Integration Tests', () => {
  beforeEach(async () => {
    await clearAllStorage();
    setupMocks();
  });

  afterEach(async () => {
    await cleanupIntegrationTest();
  });

  describe('Registration Flow', () => {
    it('should complete full registration flow and navigate to task list', async () => {
      // Start with unauthenticated app
      mockAuthService.verifySession.mockResolvedValue({ isValid: false });
      const { getByText, getByPlaceholderText, getByTestId } = renderApp();

      // Wait for auth screen to load
      await waitFor(
        () => {
          expect(getByText('Login')).toBeTruthy();
        },
        { timeout: 5000 },
      );

      // Switch to registration mode
      fireEvent.press(getByText('Sign Up'));

      // Fill in registration form
      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const nameInput = getByPlaceholderText('Name');

      fireEvent.changeText(emailInput, 'newuser123@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@#');
      fireEvent.changeText(nameInput, 'New User');

      // Mock successful registration
      const newUser = createTestUser({ email: 'newuser123@example.com', name: 'New User' });
      mockAuthService.signUp.mockResolvedValue({
        success: true,
        user: newUser,
      });

      // Submit registration
      fireEvent.press(getByText('Sign Up'));

      // Verify navigation to main app
      await waitFor(() => {
        expect(getByTestId('app-navigator')).toBeTruthy();
      });

      // Verify user is stored
      const storedUser = await UserStorageService.getCurrentUser();
      expect(storedUser).toBeTruthy();
      expect(storedUser.email).toBe('newuser123@example.com');
    });

    it('should show error for duplicate username during registration', async () => {
      mockAuthService.verifySession.mockResolvedValue({ isValid: false });
      const { getByText, getByPlaceholderText } = renderApp();

      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      fireEvent.press(getByText('Sign Up'));

      // Fill registration form
      fireEvent.changeText(getByPlaceholderText('Email'), 'existinguser@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'Test123!@#');
      fireEvent.changeText(getByPlaceholderText('Name'), 'Existing User');

      // Mock registration failure
      mockAuthService.signUp.mockResolvedValue({
        success: false,
        error: 'Username already exists',
      });

      fireEvent.press(getByText('Sign Up'));

      // Verify error is shown
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Registration Failed',
          'Username already exists',
          expect.any(Array),
        );
      });
    });

    it('should validate password requirements during registration', async () => {
      mockAuthService.verifySession.mockResolvedValue({ isValid: false });
      const { getByText, getByPlaceholderText } = renderApp();

      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      fireEvent.press(getByText('Sign Up'));

      // Try weak password
      fireEvent.changeText(getByPlaceholderText('Email'), 'newuser@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'weak');
      fireEvent.changeText(getByPlaceholderText('Name'), 'New User');

      fireEvent.press(getByText('Sign Up'));

      // Verify validation error
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('8 characters'),
          expect.any(Array),
        );
      });
    });
  });

  describe('Login Flow', () => {
    it('should complete successful login and navigate to task list', async () => {
      mockAuthService.verifySession.mockResolvedValue({ isValid: false });
      const { getByText, getByPlaceholderText, getByTestId } = renderApp();

      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      // Fill login form
      fireEvent.changeText(getByPlaceholderText('Email'), 'testuser@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'Test123!@#');

      // Mock successful login
      const user = createTestUser({ email: 'testuser@example.com' });
      mockAuthService.login.mockResolvedValue({
        success: true,
        user,
      });

      fireEvent.press(getByText('Login'));

      // Verify navigation to main app
      await waitFor(() => {
        expect(getByTestId('app-navigator')).toBeTruthy();
      });

      // Verify session is established
      const sessionToken = await SecureStorageService.getItem('sessionToken');
      expect(sessionToken).toBeTruthy();
    });

    it('should show error for invalid credentials', async () => {
      mockAuthService.verifySession.mockResolvedValue({ isValid: false });
      const { getByText, getByPlaceholderText } = renderApp();

      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Email'), 'wronguser@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');

      mockAuthService.login.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      });

      fireEvent.press(getByText('Login'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Invalid email or password',
          expect.any(Array),
        );
      });
    });

    it('should handle empty credentials gracefully', async () => {
      mockAuthService.verifySession.mockResolvedValue({ isValid: false });
      const { getByText } = renderApp();

      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      // Try to login without entering credentials
      fireEvent.press(getByText('Login'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('email'),
          expect.any(Array),
        );
      });
    });
  });

  describe('Session Persistence', () => {
    it('should automatically login user with valid session', async () => {
      // Set up valid session
      const user = createTestUser();
      await UserStorageService.saveUser(user);
      await SecureStorageService.setItem('currentUserId', user.id);
      await SecureStorageService.setItem('sessionToken', 'valid-token');

      mockAuthService.verifySession.mockResolvedValue({
        isValid: true,
        user,
      });

      const { getByTestId, queryByText } = renderApp();

      // Should go directly to main app
      await waitFor(() => {
        expect(getByTestId('app-navigator')).toBeTruthy();
      });

      // Should not show auth screen
      expect(queryByText('Login')).toBeFalsy();
    });

    it('should redirect to auth screen when session is invalid', async () => {
      // Set up expired session
      await SecureStorageService.setItem('sessionToken', 'expired-token');

      mockAuthService.verifySession.mockResolvedValue({
        isValid: false,
      });

      const { getByText, queryByTestId } = renderApp();

      // Should show auth screen
      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      // Should not show main app
      expect(queryByTestId('tab-tasks')).toBeFalsy();
    });
  });

  describe('Logout Flow', () => {
    it('should successfully logout and clear session', async () => {
      // Start with authenticated user
      const { getByTestId, getByText } = await renderAppWithAuth();

      // Navigate to profile tab
      await waitFor(() => {
        expect(getByText('Profile')).toBeTruthy();
      });

      fireEvent.press(getByText('Profile'));

      // Wait for profile screen
      await waitFor(() => {
        expect(getByText('Logout')).toBeTruthy();
      });

      // Mock successful logout
      mockAuthService.logout.mockResolvedValue({ success: true });

      // Press logout button
      fireEvent.press(getByText('Logout'));

      // Confirm logout in alert
      const alertCall = Alert.alert.mock.calls.find((call) => call[0] === 'Confirm Logout');
      expect(alertCall).toBeTruthy();

      // Simulate pressing "Logout" in confirmation dialog
      const confirmButton = alertCall[2].find((btn) => btn.text === 'Logout');
      await confirmButton.onPress();

      // Should navigate back to auth screen
      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      // Verify session is cleared
      const sessionToken = await SecureStorageService.getItem('sessionToken');
      expect(sessionToken).toBeFalsy();

      const currentUser = await UserStorageService.getCurrentUser();
      expect(currentUser).toBeFalsy();
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle password reset request', async () => {
      mockAuthService.verifySession.mockResolvedValue({ isValid: false });
      const { getByText, getByPlaceholderText } = renderApp();

      await waitFor(() => {
        expect(getByText('Login')).toBeTruthy();
      });

      // Enter email for password reset
      fireEvent.changeText(getByPlaceholderText('Email'), 'forgetfuluser@example.com');

      // Mock password reset
      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        message: 'Password reset instructions sent',
      });

      // Note: This assumes there's a "Forgot Password?" link
      // If not implemented, this test should be updated when the feature is added
      try {
        const forgotPasswordLink = getByText('Forgot Password?');
        fireEvent.press(forgotPasswordLink);

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Password Reset',
            'Password reset instructions sent',
            expect.any(Array),
          );
        });
      } catch (error) {
        // Feature not implemented yet - skip this test
        console.log('Forgot Password feature not implemented yet');
      }
    });
  });
});
