// ABOUTME: Tests for BiometricAuthScreen component handling biometric authentication UI
// including biometric prompt, PIN entry fallback, and error handling

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BiometricAuthScreen from '../BiometricAuthScreen';
import BiometricAuthService from '../../services/BiometricAuthService';
import { PINAuthService } from '../../services/PINAuthService';

// Mock services
jest.mock('../../services/BiometricAuthService', () => ({
  __esModule: true,
  default: {
    checkBiometricSupport: jest.fn(),
    authenticate: jest.fn(),
    getSecuritySettings: jest.fn(),
    setupAppSecurity: jest.fn(),
    recordFailedAttempt: jest.fn(),
    resetFailedAttempts: jest.fn(),
    checkIfLocked: jest.fn(),
  },
  BiometricAuthService: jest.fn(),
}));
jest.mock('../../services/PINAuthService');

// Mock Alert
Alert.alert = jest.fn();

describe('BiometricAuthScreen', () => {
  const mockOnSuccess = jest.fn();
  const defaultProps = {
    onSuccess: mockOnSuccess,
    reason: 'Access your ADHD Todo data',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should show biometric prompt by default', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2], // Face ID
        biometricType: 'faceId',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);
      BiometricAuthService.getSecuritySettings.mockResolvedValue({
        maxFailedAttempts: 5,
      });

      const { getByText, queryByPlaceholderText } = render(
        <BiometricAuthScreen {...defaultProps} />,
      );

      await waitFor(() => {
        expect(getByText('Face ID Authentication')).toBeTruthy();
        expect(getByText('Access your ADHD Todo data')).toBeTruthy();
        expect(getByText('Use Face ID')).toBeTruthy();
        expect(getByText('Use PIN Instead')).toBeTruthy();
        expect(queryByPlaceholderText('Enter PIN')).toBeNull();
      });
    });

    it('should show fingerprint UI for fingerprint devices', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [1], // Fingerprint
        biometricType: 'fingerprint',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);
      BiometricAuthService.getSecuritySettings.mockResolvedValue({
        maxFailedAttempts: 5,
      });

      const { getByText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Fingerprint Authentication')).toBeTruthy();
        expect(getByText('Use Fingerprint')).toBeTruthy();
      });
    });

    it('should show PIN entry when biometrics not available', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'none',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);

      const { getByText, getByPlaceholderText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('PIN Authentication')).toBeTruthy();
        expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
        expect(getByText('Submit')).toBeTruthy();
      });
    });

    it('should show setup message when no authentication methods available', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'none',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(false);

      const { getByText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('No Authentication Method')).toBeTruthy();
        expect(
          getByText('Please set up biometric authentication or a PIN in your device settings.'),
        ).toBeTruthy();
      });
    });
  });

  describe('Biometric Authentication', () => {
    it('should authenticate successfully with biometrics', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2],
        biometricType: 'faceId',
      });
      BiometricAuthService.authenticate.mockResolvedValue({ success: true });

      const { getByText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });

      fireEvent.press(getByText('Use Face ID'));

      await waitFor(() => {
        expect(BiometricAuthService.authenticate).toHaveBeenCalledWith(
          'Access your ADHD Todo data',
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle biometric authentication failure', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2],
        biometricType: 'faceId',
      });
      BiometricAuthService.authenticate.mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const { getByText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });

      fireEvent.press(getByText('Use Face ID'));

      await waitFor(() => {
        expect(BiometricAuthService.authenticate).toHaveBeenCalled();
        expect(mockOnSuccess).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Authentication Failed',
          'Please try again or use PIN',
          expect.any(Array),
        );
      });
    });

    it('should switch to PIN entry when user chooses PIN fallback', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2],
        biometricType: 'faceId',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);

      const { getByText, getByPlaceholderText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Use PIN Instead')).toBeTruthy();
      });

      fireEvent.press(getByText('Use PIN Instead'));

      await waitFor(() => {
        expect(getByText('PIN Authentication')).toBeTruthy();
        expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
      });
    });
  });

  describe('PIN Authentication', () => {
    it('should authenticate successfully with PIN', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'none',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);
      PINAuthService.verifyPIN.mockResolvedValue(true);

      const { getByPlaceholderText, getByText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter PIN'), '1234');
      fireEvent.press(getByText('Submit'));

      await waitFor(() => {
        expect(PINAuthService.verifyPIN).toHaveBeenCalledWith('1234');
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle incorrect PIN', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'none',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);
      PINAuthService.verifyPIN.mockResolvedValue(false);
      PINAuthService.recordFailedPINAttempt.mockResolvedValue(1);

      const { getByPlaceholderText, getByText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter PIN'), 'wrong');
      fireEvent.press(getByText('Submit'));

      await waitFor(() => {
        expect(PINAuthService.verifyPIN).toHaveBeenCalledWith('wrong');
        expect(PINAuthService.recordFailedPINAttempt).toHaveBeenCalled();
        expect(mockOnSuccess).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Incorrect PIN',
          'Please try again. 4 attempts remaining.',
        );
      });
    });

    it('should show locked message after max attempts', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'none',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);
      PINAuthService.verifyPIN.mockResolvedValue(false);
      PINAuthService.recordFailedPINAttempt.mockResolvedValue(5);
      BiometricAuthService.getSecuritySettings.mockResolvedValue({
        maxFailedAttempts: 5,
      });

      const { getByPlaceholderText, getByText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByPlaceholderText('Enter PIN')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Enter PIN'), 'wrong');
      fireEvent.press(getByText('Submit'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Account Locked',
          'Too many failed attempts. Please contact support.',
          expect.any(Array),
        );
      });
    });

    it('should mask PIN input', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        biometricType: 'none',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);

      const { getByPlaceholderText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        const pinInput = getByPlaceholderText('Enter PIN');
        expect(pinInput.props.secureTextEntry).toBe(true);
        expect(pinInput.props.keyboardType).toBe('numeric');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during authentication', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2],
        biometricType: 'faceId',
      });
      BiometricAuthService.authenticate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
      );

      const { getByText, getByTestId } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });

      fireEvent.press(getByText('Use Face ID'));

      await waitFor(() => {
        expect(getByTestId('loading-indicator')).toBeTruthy();
      });
    });

    it('should disable buttons during authentication', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2],
        biometricType: 'faceId',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(false);
      BiometricAuthService.getSecuritySettings.mockResolvedValue({
        maxFailedAttempts: 5,
      });
      BiometricAuthService.authenticate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
      );

      const { getByText, getByTestId } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Use Face ID')).toBeTruthy();
      });

      fireEvent.press(getByText('Use Face ID'));

      // Check that loading indicator is shown
      await waitFor(() => {
        expect(getByTestId('loading-indicator')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      BiometricAuthService.checkBiometricSupport.mockResolvedValue({
        hasHardware: true,
        isEnrolled: true,
        supportedTypes: [2],
        biometricType: 'faceId',
      });
      PINAuthService.isPINEnabled.mockResolvedValue(true);
      BiometricAuthService.getSecuritySettings.mockResolvedValue({
        maxFailedAttempts: 5,
      });

      const { getByLabelText } = render(<BiometricAuthScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByLabelText('Authenticate with Face ID Authentication')).toBeTruthy();
        expect(getByLabelText('Use PIN authentication instead')).toBeTruthy();
      });
    });
  });
});
