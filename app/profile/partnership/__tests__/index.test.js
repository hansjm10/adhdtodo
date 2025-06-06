// ABOUTME: Tests for partnership management screen
// Verifies partnership UI functionality including the Settings button

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import PartnershipScreen from '../index';
import { USER_ROLE, PARTNERSHIP_STATUS } from '../../../../src/constants/UserConstants';
import { testDataFactories } from '../../../../tests/utils';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../../src/services/UserStorageService', () => ({
  __esModule: true,
  default: {
    getCurrentUser: jest.fn(),
    getUserById: jest.fn(),
  },
}));

jest.mock('../../../../src/services/PartnershipService', () => ({
  __esModule: true,
  default: {
    getPartnership: jest.fn(),
    getActivePartnership: jest.fn(),
    updatePartnership: jest.fn(),
  },
}));

jest.mock('../../../../src/utils/PartnershipModel', () => ({
  terminatePartnership: jest.fn(),
}));

jest.mock('../../../../src/services/NotificationService', () => ({
  __esModule: true,
  default: {
    loadNotifications: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Get references to mocked services
const UserStorageService = require('../../../../src/services/UserStorageService').default;
const PartnershipService = require('../../../../src/services/PartnershipService').default;

describe('PartnershipScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockUser = testDataFactories.user({
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
    role: USER_ROLE.ADHD,
    partnerId: 'partner1',
  });

  const mockPartner = testDataFactories.user({
    id: 'partner1',
    name: 'Partner User',
    email: 'partner@example.com',
    role: USER_ROLE.NON_ADHD,
  });

  const mockPartnership = testDataFactories.partnership({
    id: 'partnership1',
    adhdUserId: 'user1',
    partnerId: 'partner1',
    status: PARTNERSHIP_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(mockRouter);
    UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
    UserStorageService.getUserById.mockResolvedValue(mockPartner);
    PartnershipService.getActivePartnership.mockResolvedValue(mockPartnership);
  });

  describe('Partner null checks', () => {
    it('should handle when partner user is deleted and getUserById returns null', async () => {
      // Setup mocks for this specific test
      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
      UserStorageService.getUserById.mockResolvedValue(null);
      PartnershipService.getActivePartnership.mockResolvedValue(mockPartnership);

      // Render the component
      render(<PartnershipScreen />);

      // Simply wait for the Alert to be called
      await waitFor(
        () => {
          expect(Alert.alert).toHaveBeenCalled();
          const alertCall = Alert.alert.mock.calls.find((call) => call[0] === 'Partner Not Found');
          expect(alertCall).toBeTruthy();
          expect(alertCall[1]).toBe('Your partner account appears to have been deleted.');
        },
        { timeout: 10000 },
      );
    }, 15000);

    it('should end partnership when OK is pressed on partner not found alert', async () => {
      // Setup mock to return null for deleted partner
      UserStorageService.getUserById.mockResolvedValue(null);
      const { terminatePartnership } = require('../../../../src/utils/PartnershipModel');
      PartnershipService.updatePartnership.mockResolvedValue(true);

      // Capture the onPress callback
      let onPressCallback;
      Alert.alert.mockImplementation((title, message, buttons) => {
        if (title === 'Partner Not Found') {
          onPressCallback = buttons[0].onPress;
        }
      });

      // Render component
      render(<PartnershipScreen />);

      // Wait for Alert to be called
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Simulate pressing OK on the alert
      if (onPressCallback) {
        await act(async () => {
          await onPressCallback();
        });
      }

      // Verify partnership termination was initiated
      expect(terminatePartnership).toHaveBeenCalledWith(mockPartnership);
    }, 10000);
  });

  describe('Settings button', () => {
    it('should show "Coming Soon" alert when Settings button is pressed', async () => {
      const { findByText } = render(<PartnershipScreen />);

      // Wait for Settings button to appear
      const settingsButton = await findByText('Settings', {}, { timeout: 15000 });

      // Clear any previous Alert.alert calls
      jest.clearAllMocks();

      // Press the Settings button
      fireEvent.press(settingsButton);

      // Verify that Alert.alert was called with "Coming Soon" message
      expect(Alert.alert).toHaveBeenCalledWith(
        'Coming Soon',
        'Partnership settings will be available in the next update.',
      );
    });

    it('should not navigate anywhere when Settings button is pressed', async () => {
      const { findByText } = render(<PartnershipScreen />);

      // Wait for Settings button to appear
      const settingsButton = await findByText('Settings', {}, { timeout: 15000 });

      // Clear any previous router calls
      mockRouter.push.mockClear();

      // Press the Settings button
      fireEvent.press(settingsButton);

      // Verify that router.push was NOT called
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });
});
