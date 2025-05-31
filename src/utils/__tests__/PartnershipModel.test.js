// ABOUTME: Tests for PartnershipModel utilities ensuring proper partnership management
// Covers partnership creation, status changes, and settings management

import {
  generatePartnershipId,
  createPartnership,
  generateInviteCode,
  validatePartnership,
  acceptPartnership,
  declinePartnership,
  pausePartnership,
  resumePartnership,
  terminatePartnership,
  updatePartnershipSettings,
  updatePartnershipStats,
} from '../PartnershipModel';
import { PARTNERSHIP_STATUS } from '../../constants/UserConstants';

describe('PartnershipModel', () => {
  describe('generatePartnershipId', () => {
    it('should generate unique partnership IDs', () => {
      const id1 = generatePartnershipId();
      const id2 = generatePartnershipId();

      expect(id1).toMatch(/^partnership_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^partnership_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateInviteCode', () => {
    it('should generate 6-character invite codes', () => {
      const code = generateInviteCode();

      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(code).toHaveLength(6);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 10; i++) {
        codes.add(generateInviteCode());
      }
      expect(codes.size).toBe(10);
    });
  });

  describe('createPartnership', () => {
    it('should create a partnership with default values', () => {
      const partnership = createPartnership();

      expect(partnership).toMatchObject({
        id: expect.stringMatching(/^partnership_\d+_[a-z0-9]{9}$/),
        adhdUserId: null,
        partnerId: null,
        status: PARTNERSHIP_STATUS.PENDING,
        inviteCode: expect.stringMatching(/^[A-Z0-9]{6}$/),
        inviteSentBy: null,
        settings: {
          allowTaskAssignment: true,
          shareProgress: true,
          allowEncouragement: true,
          allowCheckIns: true,
          quietHoursStart: null,
          quietHoursEnd: null,
        },
        stats: {
          tasksAssigned: 0,
          tasksCompleted: 0,
          encouragementsSent: 0,
          checkInsCompleted: 0,
          partnershipDuration: 0,
        },
        acceptedAt: null,
        terminatedAt: null,
      });
      expect(partnership.createdAt).toBeInstanceOf(Date);
      expect(partnership.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a partnership with provided data', () => {
      const partnershipData = {
        adhdUserId: 'user_123',
        partnerId: 'user_456',
        inviteSentBy: 'user_123',
      };
      const partnership = createPartnership(partnershipData);

      expect(partnership.adhdUserId).toBe('user_123');
      expect(partnership.partnerId).toBe('user_456');
      expect(partnership.inviteSentBy).toBe('user_123');
    });
  });

  describe('validatePartnership', () => {
    it('should validate a valid partnership', () => {
      const partnership = createPartnership({
        adhdUserId: 'user_123',
      });
      const result = validatePartnership(partnership);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid partnership object', () => {
      const result = validatePartnership(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid partnership object');
    });

    it('should reject partnership without any user IDs', () => {
      const partnership = createPartnership();
      const result = validatePartnership(partnership);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one user ID is required');
    });

    it('should reject partnership with invalid status', () => {
      const partnership = createPartnership({
        adhdUserId: 'user_123',
      });
      partnership.status = 'invalid_status';
      const result = validatePartnership(partnership);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid partnership status');
    });
  });

  describe('acceptPartnership', () => {
    it('should accept a partnership and set acceptedAt', () => {
      const partnership = createPartnership();
      const accepted = acceptPartnership(partnership);

      expect(accepted.status).toBe(PARTNERSHIP_STATUS.ACTIVE);
      expect(accepted.acceptedAt).toBeInstanceOf(Date);
      expect(accepted.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('declinePartnership', () => {
    it('should decline a partnership', () => {
      const partnership = createPartnership();
      const declined = declinePartnership(partnership);

      expect(declined.status).toBe(PARTNERSHIP_STATUS.DECLINED);
      expect(declined.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('pausePartnership', () => {
    it('should pause an active partnership', () => {
      const partnership = createPartnership();
      partnership.status = PARTNERSHIP_STATUS.ACTIVE;
      const paused = pausePartnership(partnership);

      expect(paused.status).toBe(PARTNERSHIP_STATUS.PAUSED);
      expect(paused.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('resumePartnership', () => {
    it('should resume a paused partnership', () => {
      const partnership = createPartnership();
      partnership.status = PARTNERSHIP_STATUS.PAUSED;
      const resumed = resumePartnership(partnership);

      expect(resumed.status).toBe(PARTNERSHIP_STATUS.ACTIVE);
      expect(resumed.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('terminatePartnership', () => {
    it('should terminate a partnership and set terminatedAt', () => {
      const partnership = createPartnership();
      partnership.status = PARTNERSHIP_STATUS.ACTIVE;
      const terminated = terminatePartnership(partnership);

      expect(terminated.status).toBe(PARTNERSHIP_STATUS.TERMINATED);
      expect(terminated.terminatedAt).toBeInstanceOf(Date);
      expect(terminated.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updatePartnershipSettings', () => {
    it('should update partnership settings', () => {
      const partnership = createPartnership();
      const newSettings = {
        allowTaskAssignment: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };
      const updated = updatePartnershipSettings(partnership, newSettings);

      expect(updated.settings.allowTaskAssignment).toBe(false);
      expect(updated.settings.quietHoursStart).toBe('22:00');
      expect(updated.settings.quietHoursEnd).toBe('08:00');
      expect(updated.settings.shareProgress).toBe(true); // Unchanged
    });
  });

  describe('updatePartnershipStats', () => {
    it('should update partnership statistics', () => {
      const partnership = createPartnership();
      const statUpdates = {
        tasksAssigned: 5,
        tasksCompleted: 3,
        encouragementsSent: 10,
      };
      const updated = updatePartnershipStats(partnership, statUpdates);

      expect(updated.stats.tasksAssigned).toBe(5);
      expect(updated.stats.tasksCompleted).toBe(3);
      expect(updated.stats.encouragementsSent).toBe(10);
      expect(updated.stats.checkInsCompleted).toBe(0); // Unchanged
    });
  });
});
