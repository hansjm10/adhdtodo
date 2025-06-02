// ABOUTME: Tests for partnership management screen
// Verifies partnership UI functionality including the Settings button

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import PartnershipScreen from '../index';
import { USER_ROLE, PARTNERSHIP_STATUS } from '../../../../src/constants/UserConstants';

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

  const mockUser = {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
    role: USER_ROLE.ADHD,
    partnerId: 'partner1',
  };

  const mockPartner = {
    id: 'partner1',
    name: 'Partner User',
    email: 'partner@example.com',
    role: USER_ROLE.NON_ADHD,
  };

  const mockPartnership = {
    id: 'partnership1',
    adhdUserId: 'user1',
    partnerId: 'partner1',
    status: PARTNERSHIP_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(mockRouter);
    UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
    UserStorageService.getUserById.mockResolvedValue(mockPartner);
    PartnershipService.getActivePartnership.mockResolvedValue(mockPartnership);
  });

  describe('Partner null checks', () => {
    it('should handle when partner user is deleted and getUserById returns null', async () => {
      // Clear all mocks to ensure clean state
      jest.clearAllMocks();

      // Setup mocks
      UserStorageService.getCurrentUser.mockResolvedValue(mockUser);
      UserStorageService.getUserById.mockResolvedValue(null);
      PartnershipService.getActivePartnership.mockResolvedValue(mockPartnership);

      // Render the component
      render(<PartnershipScreen />);

      // Wait for the component to load and Alert to be shown
      await waitFor(
        () => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Partner Not Found',
            'Your partner account appears to have been deleted.',
            expect.arrayContaining([
              expect.objectContaining({
                text: 'OK',
                onPress: expect.any(Function),
              }),
            ]),
          );
        },
        { timeout: 5000 },
      );
    });

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

      render(<PartnershipScreen />);

      // Wait for Alert to be called
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Simulate pressing OK on the alert
      if (onPressCallback) {
        await onPressCallback();
      }

      // Verify partnership termination was initiated
      await waitFor(() => {
        expect(terminatePartnership).toHaveBeenCalledWith(mockPartnership);
      });
    });
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
