// ABOUTME: Comprehensive unit tests for PartnershipService
// Tests partnership creation, invites, status updates, and partnership operations

import PartnershipService from '../PartnershipService';
import SecureStorageService from '../SecureStorageService';
import UserStorageService from '../UserStorageService';
import {
  createPartnership,
  acceptPartnership,
  updatePartnershipStats,
} from '../../utils/PartnershipModel';
import { setUserPartner } from '../../utils/UserModel';
import { PARTNERSHIP_STATUS, USER_ROLE } from '../../constants/UserConstants';

// Mock dependencies
jest.mock('../SecureStorageService');
jest.mock('../UserStorageService');
jest.mock('../../utils/PartnershipModel');
jest.mock('../../utils/UserModel');

describe('PartnershipService', () => {
  const mockPartnership = {
    id: 'partnership_123',
    adhdUserId: 'user_123',
    partnerId: 'partner_456',
    status: PARTNERSHIP_STATUS.ACTIVE,
    inviteCode: 'ABC123',
    inviteSentBy: 'user_123',
    settings: {
      allowTaskAssignment: true,
      shareProgress: true,
      allowEncouragement: true,
      allowCheckIns: true,
      quietHoursStart: null,
      quietHoursEnd: null,
    },
    stats: {
      tasksAssigned: 5,
      tasksCompleted: 3,
      encouragementsSent: 10,
      checkInsCompleted: 2,
      partnershipDuration: 7,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-07'),
    acceptedAt: new Date('2024-01-02'),
    terminatedAt: null,
  };

  const mockPendingPartnership = {
    ...mockPartnership,
    id: 'partnership_pending',
    status: PARTNERSHIP_STATUS.PENDING,
    partnerId: null,
    acceptedAt: null,
  };

  const mockUser = {
    id: 'user_123',
    name: 'Test User',
    email: 'test@example.com',
    role: USER_ROLE.ADHD_USER,
    partnerId: 'partner_456',
  };

  const mockPartner = {
    id: 'partner_456',
    name: 'Partner User',
    email: 'partner@example.com',
    role: USER_ROLE.PARTNER,
    partnerId: 'user_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    SecureStorageService.getItem.mockResolvedValue(null);
    SecureStorageService.setItem.mockResolvedValue();
    SecureStorageService.removeItem.mockResolvedValue();
    UserStorageService.getUserById.mockResolvedValue(null);
    UserStorageService.updateUser.mockResolvedValue(true);

    // Mock partnership model functions
    createPartnership.mockImplementation((data) => ({
      ...mockPendingPartnership,
      ...data,
      id: `partnership_${Date.now()}`,
      inviteCode: `CODE${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
    }));

    acceptPartnership.mockImplementation((partnership) => ({
      ...partnership,
      status: PARTNERSHIP_STATUS.ACTIVE,
      acceptedAt: new Date(),
      updatedAt: new Date(),
    }));

    updatePartnershipStats.mockImplementation((partnership, statUpdates) => ({
      ...partnership,
      stats: {
        ...partnership.stats,
        ...statUpdates,
      },
      updatedAt: new Date(),
    }));

    setUserPartner.mockImplementation((user, partnerId) => ({
      ...user,
      partnerId,
      updatedAt: new Date(),
    }));
  });

  describe('getAllPartnerships', () => {
    it('should return all partnerships from storage', async () => {
      const partnerships = [mockPartnership, mockPendingPartnership];
      SecureStorageService.getItem.mockResolvedValue(partnerships);

      const result = await PartnershipService.getAllPartnerships();

      expect(SecureStorageService.getItem).toHaveBeenCalledWith('partnerships');
      expect(result).toEqual(partnerships);
    });

    it('should return empty array if no partnerships', async () => {
      SecureStorageService.getItem.mockResolvedValue(null);

      const result = await PartnershipService.getAllPartnerships();

      expect(result).toEqual([]);
    });

    it('should handle non-array data gracefully', async () => {
      SecureStorageService.getItem.mockResolvedValue('invalid');

      const result = await PartnershipService.getAllPartnerships();

      expect(result).toEqual([]);
    });

    it('should handle storage errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await PartnershipService.getAllPartnerships();

      expect(consoleError).toHaveBeenCalledWith('Error loading partnerships:', expect.any(Error));
      expect(result).toEqual([]);

      consoleError.mockRestore();
    });
  });

  describe('savePartnership', () => {
    it('should save new partnership to storage', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const newPartnership = { ...mockPendingPartnership, id: 'new_partnership' };
      const result = await PartnershipService.savePartnership(newPartnership);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('partnerships', [
        mockPartnership,
        newPartnership,
      ]);
      expect(result).toBe(true);
    });

    it('should handle empty partnerships list', async () => {
      SecureStorageService.getItem.mockResolvedValue([]);

      const result = await PartnershipService.savePartnership(mockPartnership);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('partnerships', [mockPartnership]);
      expect(result).toBe(true);
    });

    it('should handle save errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.setItem.mockRejectedValue(new Error('Save error'));

      const result = await PartnershipService.savePartnership(mockPartnership);

      expect(consoleError).toHaveBeenCalledWith('Error saving partnership:', expect.any(Error));
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('updatePartnership', () => {
    it('should update existing partnership', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership, mockPendingPartnership]);

      const updatedPartnership = {
        ...mockPartnership,
        stats: { ...mockPartnership.stats, tasksCompleted: 5 },
      };
      const result = await PartnershipService.updatePartnership(updatedPartnership);

      expect(SecureStorageService.setItem).toHaveBeenCalledWith('partnerships', [
        updatedPartnership,
        mockPendingPartnership,
      ]);
      expect(result).toBe(true);
    });

    it('should return false if partnership not found', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const unknownPartnership = { ...mockPartnership, id: 'unknown_id' };
      const result = await PartnershipService.updatePartnership(unknownPartnership);

      expect(SecureStorageService.setItem).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle update errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // First getAllPartnerships succeeds
      SecureStorageService.getItem.mockResolvedValueOnce([mockPartnership]);
      // setItem fails
      SecureStorageService.setItem.mockRejectedValue(new Error('Update error'));

      const result = await PartnershipService.updatePartnership(mockPartnership);

      expect(consoleError).toHaveBeenCalledWith('Error updating partnership:', expect.any(Error));
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('createPartnershipInvite', () => {
    it('should create partnership invite for partner role', async () => {
      SecureStorageService.getItem.mockResolvedValue([]);

      const result = await PartnershipService.createPartnershipInvite('user_123', 'partner');

      expect(createPartnership).toHaveBeenCalledWith({
        inviteSentBy: 'user_123',
        adhdUserId: 'user_123',
        partnerId: null,
      });
      expect(SecureStorageService.setItem).toHaveBeenCalled();
      expect(result).toMatchObject({
        inviteSentBy: 'user_123',
        adhdUserId: 'user_123',
      });
    });

    it('should create partnership invite for adhd_user role', async () => {
      SecureStorageService.getItem.mockResolvedValue([]);

      const result = await PartnershipService.createPartnershipInvite('partner_456', 'adhd_user');

      expect(createPartnership).toHaveBeenCalledWith({
        inviteSentBy: 'partner_456',
        adhdUserId: null,
        partnerId: 'partner_456',
      });
      expect(result).toMatchObject({
        inviteSentBy: 'partner_456',
        partnerId: 'partner_456',
      });
    });

    it('should handle errors during invite creation', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // Mock createPartnership to throw an error
      createPartnership.mockImplementation(() => {
        throw new Error('Create error');
      });

      const result = await PartnershipService.createPartnershipInvite('user_123', 'partner');

      expect(consoleError).toHaveBeenCalledWith(
        'Error creating partnership invite:',
        expect.any(Error),
      );
      expect(result).toBeNull();

      consoleError.mockRestore();
    });
  });

  describe('acceptPartnershipInvite', () => {
    it('should accept valid partnership invite as ADHD user', async () => {
      const pendingInvite = {
        ...mockPendingPartnership,
        adhdUserId: null,
        partnerId: 'partner_456',
      };
      SecureStorageService.getItem.mockResolvedValue([pendingInvite]);
      UserStorageService.getUserById
        .mockResolvedValueOnce(mockUser) // ADHD user
        .mockResolvedValueOnce(mockPartner); // Partner

      const result = await PartnershipService.acceptPartnershipInvite('ABC123', 'user_123');

      expect(result.success).toBe(true);
      expect(result.partnership).toMatchObject({
        adhdUserId: 'user_123',
        partnerId: 'partner_456',
        status: PARTNERSHIP_STATUS.ACTIVE,
      });
      expect(acceptPartnership).toHaveBeenCalled();
      expect(setUserPartner).toHaveBeenCalledTimes(2);
      expect(UserStorageService.updateUser).toHaveBeenCalledTimes(2);
    });

    it('should accept valid partnership invite as partner', async () => {
      const pendingInvite = {
        ...mockPendingPartnership,
        adhdUserId: 'user_123',
        partnerId: null,
      };
      SecureStorageService.getItem.mockResolvedValue([pendingInvite]);
      UserStorageService.getUserById
        .mockResolvedValueOnce(mockUser) // ADHD user
        .mockResolvedValueOnce(mockPartner); // Partner

      const result = await PartnershipService.acceptPartnershipInvite('ABC123', 'partner_456');

      expect(result.success).toBe(true);
      expect(result.partnership).toMatchObject({
        adhdUserId: 'user_123',
        partnerId: 'partner_456',
        status: PARTNERSHIP_STATUS.ACTIVE,
      });
    });

    it('should reject invalid invite code', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const result = await PartnershipService.acceptPartnershipInvite('INVALID', 'user_123');

      expect(result).toEqual({
        success: false,
        error: 'Invalid invite code',
      });
    });

    it('should reject already used invite', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]); // Already active

      const result = await PartnershipService.acceptPartnershipInvite('ABC123', 'user_789');

      expect(result).toEqual({
        success: false,
        error: 'Invite already used',
      });
    });

    it('should reject if partnership already complete', async () => {
      const completePartnership = {
        ...mockPendingPartnership,
        adhdUserId: 'user_123',
        partnerId: 'partner_456',
      };
      SecureStorageService.getItem.mockResolvedValue([completePartnership]);

      const result = await PartnershipService.acceptPartnershipInvite('ABC123', 'user_789');

      expect(result).toEqual({
        success: false,
        error: 'Partnership already complete',
      });
    });

    it('should handle errors during acceptance', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // First call succeeds to find the partnership
      SecureStorageService.getItem.mockResolvedValueOnce([mockPendingPartnership]);
      // acceptPartnership throws error
      acceptPartnership.mockImplementation(() => {
        throw new Error('Accept error');
      });

      const result = await PartnershipService.acceptPartnershipInvite('ABC123', 'user_123');

      expect(consoleError).toHaveBeenCalledWith(
        'Error accepting partnership invite:',
        expect.any(Error),
      );
      expect(result).toEqual({
        success: false,
        error: 'Failed to accept invite',
      });

      consoleError.mockRestore();
    });
  });

  describe('getPartnershipByUsers', () => {
    it('should find partnership by user IDs (order 1)', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership, mockPendingPartnership]);

      const result = await PartnershipService.getPartnershipByUsers('user_123', 'partner_456');

      expect(result).toEqual(mockPartnership);
    });

    it('should find partnership by user IDs (order 2)', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership, mockPendingPartnership]);

      const result = await PartnershipService.getPartnershipByUsers('partner_456', 'user_123');

      expect(result).toEqual(mockPartnership);
    });

    it('should return null if partnership not found', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const result = await PartnershipService.getPartnershipByUsers('user_123', 'unknown_user');

      expect(result).toBeNull();
    });

    it('should handle errors from getAllPartnerships gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // When getAllPartnerships encounters an error, it returns empty array
      SecureStorageService.getItem.mockRejectedValue(new Error('Get error'));

      const result = await PartnershipService.getPartnershipByUsers('user_123', 'partner_456');

      // getAllPartnerships handles the error and returns [], so getPartnershipByUsers returns null
      expect(consoleError).toHaveBeenCalledWith('Error loading partnerships:', expect.any(Error));
      expect(result).toBeNull();

      consoleError.mockRestore();
    });
  });

  describe('getPartnershipByInviteCode', () => {
    it('should find partnership by invite code', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership, mockPendingPartnership]);

      const result = await PartnershipService.getPartnershipByInviteCode('ABC123');

      expect(result).toEqual(mockPartnership);
    });

    it('should return null if invite code not found', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const result = await PartnershipService.getPartnershipByInviteCode('INVALID');

      expect(result).toBeNull();
    });

    it('should handle errors from getAllPartnerships gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // When getAllPartnerships encounters an error, it returns empty array
      SecureStorageService.getItem.mockRejectedValue(new Error('Get error'));

      const result = await PartnershipService.getPartnershipByInviteCode('ABC123');

      // getAllPartnerships handles the error and returns [], so getPartnershipByInviteCode returns null
      expect(consoleError).toHaveBeenCalledWith('Error loading partnerships:', expect.any(Error));
      expect(result).toBeNull();

      consoleError.mockRestore();
    });
  });

  describe('getUserPartnerships', () => {
    it('should return all partnerships for a user', async () => {
      const anotherPartnership = {
        ...mockPartnership,
        id: 'partnership_other',
        adhdUserId: 'user_123',
        partnerId: 'partner_789',
      };
      SecureStorageService.getItem.mockResolvedValue([
        mockPartnership,
        mockPendingPartnership,
        anotherPartnership,
      ]);

      const result = await PartnershipService.getUserPartnerships('user_123');

      expect(result).toHaveLength(3);
      expect(result).toContain(mockPartnership);
      expect(result).toContain(mockPendingPartnership);
      expect(result).toContain(anotherPartnership);
    });

    it('should return partnerships where user is partner', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership, mockPendingPartnership]);

      const result = await PartnershipService.getUserPartnerships('partner_456');

      expect(result).toHaveLength(1);
      expect(result).toContain(mockPartnership);
    });

    it('should return empty array if no partnerships', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const result = await PartnershipService.getUserPartnerships('unknown_user');

      expect(result).toEqual([]);
    });

    it('should handle errors from getAllPartnerships gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // When getAllPartnerships encounters an error, it returns empty array
      SecureStorageService.getItem.mockRejectedValue(new Error('Get error'));

      const result = await PartnershipService.getUserPartnerships('user_123');

      // getAllPartnerships handles the error and returns [], so getUserPartnerships also returns []
      expect(consoleError).toHaveBeenCalledWith('Error loading partnerships:', expect.any(Error));
      expect(result).toEqual([]);

      consoleError.mockRestore();
    });
  });

  describe('getActivePartnership', () => {
    it('should return active partnership for user', async () => {
      const pausedPartnership = {
        ...mockPartnership,
        id: 'partnership_paused',
        status: PARTNERSHIP_STATUS.PAUSED,
      };
      SecureStorageService.getItem.mockResolvedValue([mockPartnership, pausedPartnership]);

      const result = await PartnershipService.getActivePartnership('user_123');

      expect(result).toEqual(mockPartnership);
    });

    it('should return null if no active partnership', async () => {
      const pausedPartnership = {
        ...mockPartnership,
        status: PARTNERSHIP_STATUS.PAUSED,
      };
      SecureStorageService.getItem.mockResolvedValue([pausedPartnership, mockPendingPartnership]);

      const result = await PartnershipService.getActivePartnership('user_123');

      expect(result).toBeNull();
    });

    it('should handle errors from getAllPartnerships gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // When getAllPartnerships encounters an error, it returns empty array
      SecureStorageService.getItem.mockRejectedValue(new Error('Get error'));

      const result = await PartnershipService.getActivePartnership('user_123');

      // getAllPartnerships handles the error and returns [], which leads to no active partnership
      expect(consoleError).toHaveBeenCalledWith('Error loading partnerships:', expect.any(Error));
      expect(result).toBeNull();

      consoleError.mockRestore();
    });
  });

  describe('incrementPartnershipStat', () => {
    it('should increment partnership stat by 1', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const result = await PartnershipService.incrementPartnershipStat(
        'partnership_123',
        'tasksCompleted',
      );

      expect(updatePartnershipStats).toHaveBeenCalledWith(mockPartnership, {
        tasksCompleted: 4, // 3 + 1
      });
      expect(SecureStorageService.setItem).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should increment partnership stat by custom amount', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const result = await PartnershipService.incrementPartnershipStat(
        'partnership_123',
        'encouragementsSent',
        5,
      );

      expect(updatePartnershipStats).toHaveBeenCalledWith(mockPartnership, {
        encouragementsSent: 15, // 10 + 5
      });
      expect(result).toBe(true);
    });

    it('should handle missing stat gracefully', async () => {
      const partnershipWithoutStat = {
        ...mockPartnership,
        stats: {},
      };
      SecureStorageService.getItem.mockResolvedValue([partnershipWithoutStat]);

      const result = await PartnershipService.incrementPartnershipStat(
        'partnership_123',
        'newStat',
      );

      expect(updatePartnershipStats).toHaveBeenCalledWith(partnershipWithoutStat, {
        newStat: 1, // 0 + 1
      });
      expect(result).toBe(true);
    });

    it('should return false if partnership not found', async () => {
      SecureStorageService.getItem.mockResolvedValue([mockPartnership]);

      const result = await PartnershipService.incrementPartnershipStat(
        'unknown_id',
        'tasksCompleted',
      );

      expect(updatePartnershipStats).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      // First getAllPartnerships succeeds
      SecureStorageService.getItem.mockResolvedValueOnce([mockPartnership]);
      // updatePartnershipStats throws error
      updatePartnershipStats.mockImplementation(() => {
        throw new Error('Update stats error');
      });

      const result = await PartnershipService.incrementPartnershipStat(
        'partnership_123',
        'tasksCompleted',
      );

      expect(consoleError).toHaveBeenCalledWith(
        'Error incrementing partnership stat:',
        expect.any(Error),
      );
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });

  describe('clearAllPartnerships', () => {
    it('should clear all partnerships from storage', async () => {
      const result = await PartnershipService.clearAllPartnerships();

      expect(SecureStorageService.removeItem).toHaveBeenCalledWith('partnerships');
      expect(result).toBe(true);
    });

    it('should handle clear errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      SecureStorageService.removeItem.mockRejectedValue(new Error('Clear error'));

      const result = await PartnershipService.clearAllPartnerships();

      expect(consoleError).toHaveBeenCalledWith('Error clearing partnerships:', expect.any(Error));
      expect(result).toBe(false);

      consoleError.mockRestore();
    });
  });
});
