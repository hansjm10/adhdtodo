// ABOUTME: Tests for AuthContext handling app-wide authentication state
// including biometric auth, PIN fallback, and sensitive data protection

import React from 'react';
import { Alert } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { BiometricAuthService } from '../../services/BiometricAuthService';
import { PINAuthService } from '../../services/PINAuthService';

// Mock services
jest.mock('../../services/BiometricAuthService');
jest.mock('../../services/PINAuthService');

// Mock Alert from react-native
Alert.alert = jest.fn();

const createWrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Setup', () => {
    it('should check auth requirement on mount', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(BiometricAuthService.getSecuritySettings).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.authSettings).toEqual(mockSettings);
      });
    });

    it('should require authentication when requireAuthOnLaunch is true', async () => {
      const mockSettings = {
        requireAuthOnLaunch: true,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      BiometricAuthService.authenticate.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(BiometricAuthService.authenticate).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should handle failed authentication on launch', async () => {
      const mockSettings = {
        requireAuthOnLaunch: true,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      BiometricAuthService.authenticate.mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Authentication Required',
          'Please authenticate to access your data',
          expect.any(Array),
        );
      });
    });
  });

  describe('Authentication Methods', () => {
    it('should authenticate with biometrics', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      BiometricAuthService.authenticate.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      let authResult;
      await act(async () => {
        authResult = await result.current.authenticateWithBiometric('Test reason');
      });

      expect(BiometricAuthService.authenticate).toHaveBeenCalledWith('Test reason');
      expect(authResult).toEqual({ success: true });
    });

    it('should authenticate with PIN', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      PINAuthService.verifyPIN.mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      let authResult;
      await act(async () => {
        authResult = await result.current.authenticateWithPIN('1234');
      });

      expect(PINAuthService.verifyPIN).toHaveBeenCalledWith('1234');
      expect(authResult).toBe(true);
    });

    it('should handle failed PIN authentication', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      PINAuthService.verifyPIN.mockResolvedValue(false);
      PINAuthService.recordFailedPINAttempt.mockResolvedValue(1);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      let authResult;
      await act(async () => {
        authResult = await result.current.authenticateWithPIN('wrong');
      });

      expect(PINAuthService.verifyPIN).toHaveBeenCalledWith('wrong');
      expect(PINAuthService.recordFailedPINAttempt).toHaveBeenCalled();
      expect(authResult).toBe(false);
    });
  });

  describe('Sensitive Data Protection', () => {
    it('should protect sensitive actions when enabled', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: true,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      BiometricAuthService.authenticate.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const mockAction = jest.fn().mockResolvedValue();
      await act(async () => {
        await result.current.protectSensitiveAction(mockAction, 'Access sensitive data');
      });

      expect(BiometricAuthService.authenticate).toHaveBeenCalledWith('Access sensitive data');
      expect(mockAction).toHaveBeenCalled();
    });

    it('should not protect actions when disabled', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const mockAction = jest.fn().mockResolvedValue();
      await act(async () => {
        await result.current.protectSensitiveAction(mockAction, 'Access sensitive data');
      });

      expect(BiometricAuthService.authenticate).not.toHaveBeenCalled();
      expect(mockAction).toHaveBeenCalled();
    });

    it('should not execute action when authentication fails', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: true,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      BiometricAuthService.authenticate.mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const mockAction = jest.fn();
      await act(async () => {
        await result.current.protectSensitiveAction(mockAction, 'Access sensitive data');
      });

      expect(BiometricAuthService.authenticate).toHaveBeenCalledWith('Access sensitive data');
      expect(mockAction).not.toHaveBeenCalled();
    });
  });

  describe('Auto-lock Functionality', () => {
    it('should set up auto-lock timer', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 1000, // 1 second for testing
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Record activity
      await act(async () => {
        result.current.recordActivity();
      });

      // Wait for auto-lock
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(result.current.isLocked).toBe(true);
      });
    });

    it('should reset timer on activity', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 1000, // 1 second for testing
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Record initial activity
      await act(async () => {
        result.current.recordActivity();
      });

      // Wait 500ms
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Record new activity (should reset timer)
      await act(async () => {
        result.current.recordActivity();
      });

      // Wait another 700ms (total 1200ms from first activity, but only 700ms from second)
      await act(async () => {
        jest.advanceTimersByTime(700);
      });

      // Should not be locked yet
      expect(result.current.isLocked).toBe(false);

      // Wait another 400ms (now 1100ms from second activity)
      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // Should be locked now
      await waitFor(() => {
        expect(result.current.isLocked).toBe(true);
      });
    });
  });

  describe('Unlock Functionality', () => {
    it('should unlock with biometric authentication', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      BiometricAuthService.authenticate.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Manually lock
      await act(async () => {
        result.current.lock();
      });

      expect(result.current.isLocked).toBe(true);

      // Unlock
      await act(async () => {
        await result.current.unlock();
      });

      expect(BiometricAuthService.authenticate).toHaveBeenCalled();
      expect(result.current.isLocked).toBe(false);
    });

    it('should remain locked when unlock fails', async () => {
      const mockSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      BiometricAuthService.getSecuritySettings.mockResolvedValue(mockSettings);
      BiometricAuthService.authenticate.mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Manually lock
      await act(async () => {
        result.current.lock();
      });

      expect(result.current.isLocked).toBe(true);

      // Try to unlock
      await act(async () => {
        await result.current.unlock();
      });

      expect(BiometricAuthService.authenticate).toHaveBeenCalled();
      expect(result.current.isLocked).toBe(true);
    });
  });

  describe('Security Settings Update', () => {
    it('should update security settings', async () => {
      const initialSettings = {
        requireAuthOnLaunch: false,
        sensitiveDataAuth: false,
        autoLockTimeout: 600000,
        maxFailedAttempts: 5,
      };
      const newSettings = {
        requireAuthOnLaunch: true,
        sensitiveDataAuth: true,
        autoLockTimeout: 300000,
        maxFailedAttempts: 3,
      };

      BiometricAuthService.getSecuritySettings.mockResolvedValue(initialSettings);
      BiometricAuthService.setupAppSecurity.mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.authSettings).toEqual(initialSettings);
      });

      await act(async () => {
        await result.current.updateSecuritySettings(newSettings);
      });

      expect(BiometricAuthService.setupAppSecurity).toHaveBeenCalledWith(newSettings);
      expect(result.current.authSettings).toEqual(newSettings);
    });
  });
});
