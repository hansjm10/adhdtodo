// ABOUTME: Comprehensive unit tests for PartnershipService with BaseService error handling
// Tests partnership creation, invites, status updates, and partnership operations with Result<T> patterns

import PartnershipService from '../PartnershipService';
import { supabase } from '../SupabaseService';
import UserStorageService from '../UserStorageService';
import {
  createPartnership,
  acceptPartnership,
  updatePartnershipStats,
} from '../../utils/PartnershipModel';
import { setUserPartner } from '../../utils/UserModel';
import { PARTNERSHIP_STATUS, USER_ROLE } from '../../constants/UserConstants';

// Mock dependencies
jest.mock('../SupabaseService', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(),
  },
}));
jest.mock('../UserStorageService', () => ({
  __esModule: true,
  default: {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
  },
}));
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

  const mockDatabasePartnership = {
    id: 'partnership_123',
    adhd_user_id: 'user_123',
    partner_id: 'partner_456',
    status: 'active',
    invite_code: 'ABC123',
    invite_sent_by: 'user_123',
    settings: mockPartnership.settings,
    stats: mockPartnership.stats,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-07T00:00:00.000Z',
    accepted_at: '2024-01-02T00:00:00.000Z',
    terminated_at: null,
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

  const _mockPartner = {
    id: 'partner_456',
    name: 'Partner User',
    email: 'partner@example.com',
    role: USER_ROLE.PARTNER,
    partnerId: 'user_123',
  };

  let mockSupabaseQuery;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase query chain
    mockSupabaseQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };

    // Set default resolved values for common operations
    mockSupabaseQuery.select.mockResolvedValue({ error: null, data: [] });
    mockSupabaseQuery.insert.mockResolvedValue({ error: null });
    mockSupabaseQuery.update.mockResolvedValue({ error: null });
    mockSupabaseQuery.delete.mockResolvedValue({ error: null });
    mockSupabaseQuery.single.mockResolvedValue({ error: null, data: null });

    supabase.from.mockReturnValue(mockSupabaseQuery);
    supabase.rpc.mockReturnValue({ error: null, data: 'INVITE123' });

    // Default mock implementations
    UserStorageService.getUserById.mockResolvedValue(null);
    UserStorageService.updateUser.mockResolvedValue({ success: true, data: true });

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
    it('should return all partnerships from Supabase', async () => {
      mockSupabaseQuery.select.mockResolvedValue({
        error: null,
        data: [mockDatabasePartnership],
      });

      const result = await PartnershipService.getAllPartnerships();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(supabase.from).toHaveBeenCalledWith('partnerships');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
    });

    it('should return empty array if no partnerships', async () => {
      // Clear cache by calling clearAllPartnerships first
      await PartnershipService.clearAllPartnerships();
      
      mockSupabaseQuery.select.mockResolvedValue({
        error: null,
        data: [],
      });

      const result = await PartnershipService.getAllPartnerships();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle Supabase errors', async () => {
      // Clear cache first
      await PartnershipService.clearAllPartnerships();
      
      mockSupabaseQuery.select.mockResolvedValue({
        error: new Error('Database error'),
        data: null,
      });

      const result = await PartnershipService.getAllPartnerships();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('PARTNERSHIP');
      expect(result.error.code).toContain('GETALLPARTNERSHIPS');
    });
  });

  describe('savePartnership', () => {
    it('should save new partnership to Supabase', async () => {
      mockSupabaseQuery.insert.mockResolvedValue({
        error: null,
      });

      const result = await PartnershipService.savePartnership(mockPartnership);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('partnerships');
      expect(mockSupabaseQuery.insert).toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      mockSupabaseQuery.insert.mockResolvedValue({
        error: new Error('Insert error'),
      });

      const result = await PartnershipService.savePartnership(mockPartnership);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('PARTNERSHIP');
      expect(result.error.code).toContain('SAVEPARTNERSHIP');
    });
  });

  describe('updatePartnership', () => {
    it('should update existing partnership', async () => {
      // Setup fresh mock for this test
      mockSupabaseQuery.update.mockResolvedValueOnce({
        error: null,
      });
      mockSupabaseQuery.eq.mockResolvedValueOnce({
        error: null,
      });

      const updatedPartnership = {
        ...mockPartnership,
        stats: { ...mockPartnership.stats, tasksCompleted: 5 },
      };
      const result = await PartnershipService.updatePartnership(updatedPartnership);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockSupabaseQuery.update).toHaveBeenCalled();
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', updatedPartnership.id);
    });

    it('should handle update errors', async () => {
      mockSupabaseQuery.update.mockResolvedValue({
        error: new Error('Update error'),
      });

      const result = await PartnershipService.updatePartnership(mockPartnership);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('PARTNERSHIP');
      expect(result.error.code).toContain('UPDATEPARTNERSHIP');
    });
  });

  describe('createPartnershipInvite', () => {
    it('should create partnership invite for partner role', async () => {
      mockSupabaseQuery.insert.mockResolvedValueOnce({
        error: null,
      });
      mockSupabaseQuery.select.mockResolvedValueOnce({
        error: null,
        data: mockDatabasePartnership,
      });
      mockSupabaseQuery.single.mockResolvedValueOnce({
        error: null,
        data: mockDatabasePartnership,
      });

      const result = await PartnershipService.createPartnershipInvite('user_123', 'partner');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(supabase.rpc).toHaveBeenCalledWith('generate_invite_code');
      expect(createPartnership).toHaveBeenCalled();
    });

    it('should create partnership invite for adhd_user role', async () => {
      mockSupabaseQuery.insert.mockResolvedValueOnce({
        error: null,
      });
      mockSupabaseQuery.select.mockResolvedValueOnce({
        error: null,
        data: mockDatabasePartnership,
      });
      mockSupabaseQuery.single.mockResolvedValueOnce({
        error: null,
        data: mockDatabasePartnership,
      });

      const result = await PartnershipService.createPartnershipInvite('user_123', 'adhd_user');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors during invite creation', async () => {
      supabase.rpc.mockReturnValue({ error: new Error('RPC error'), data: null });

      const result = await PartnershipService.createPartnershipInvite('user_123', 'partner');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('PARTNERSHIP');
      expect(result.error.code).toContain('CREATEPARTNERSHIPINVITE');
    });
  });

  describe('acceptPartnershipInvite', () => {
    it('should accept valid partnership invite', async () => {
      // Mock finding the partnership
      mockSupabaseQuery.select.mockResolvedValueOnce({
        error: null,
        data: null, // No data for select
      });
      mockSupabaseQuery.eq.mockResolvedValueOnce({
        error: null,
        data: null,
      });
      mockSupabaseQuery.single.mockResolvedValueOnce({
        error: null,
        data: {
          ...mockDatabasePartnership,
          status: 'pending',
          partner_id: null,
          accepted_at: null,
        },
      });

      // Mock updating the partnership
      mockSupabaseQuery.update.mockResolvedValueOnce({
        error: null,
      });
      mockSupabaseQuery.eq.mockResolvedValueOnce({
        error: null,
      });
      mockSupabaseQuery.select.mockResolvedValueOnce({
        error: null,
      });
      mockSupabaseQuery.single.mockResolvedValueOnce({
        error: null,
        data: mockDatabasePartnership,
      });

      UserStorageService.getUserById.mockResolvedValue(mockUser);

      const result = await PartnershipService.acceptPartnershipInvite('ABC123', 'partner_456');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(acceptPartnership).toHaveBeenCalled();
    });

    it('should reject invalid invite code', async () => {
      mockSupabaseQuery.single.mockResolvedValue({
        error: new Error('Not found'),
        data: null,
      });

      const result = await PartnershipService.acceptPartnershipInvite('INVALID', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject already used invite', async () => {
      mockSupabaseQuery.single.mockResolvedValue({
        error: null,
        data: mockDatabasePartnership, // Already active
      });

      const result = await PartnershipService.acceptPartnershipInvite('ABC123', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUserPartnerships', () => {
    it('should return all partnerships for a user', async () => {
      mockSupabaseQuery.or.mockResolvedValue({
        error: null,
        data: [mockDatabasePartnership],
      });

      const result = await PartnershipService.getUserPartnerships('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(mockSupabaseQuery.or).toHaveBeenCalledWith('adhd_user_id.eq.user_123,partner_id.eq.user_123');
    });

    it('should return empty array if no partnerships', async () => {
      // Clear cache first
      await PartnershipService.clearAllPartnerships();
      
      mockSupabaseQuery.select.mockResolvedValueOnce({
        error: null,
        data: [],
      });
      mockSupabaseQuery.or.mockResolvedValueOnce({
        error: null,
        data: [],
      });

      const result = await PartnershipService.getUserPartnerships('user_999'); // Different user ID to avoid cache

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getActivePartnership', () => {
    it('should return active partnership for user', async () => {
      mockSupabaseQuery.single.mockResolvedValue({
        error: null,
        data: mockDatabasePartnership,
      });

      const result = await PartnershipService.getActivePartnership('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should return null if no active partnership', async () => {
      mockSupabaseQuery.single.mockResolvedValue({
        error: new Error('Not found'),
        data: null,
      });

      const result = await PartnershipService.getActivePartnership('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('incrementPartnershipStat', () => {
    it('should increment partnership stat by 1', async () => {
      supabase.rpc.mockReturnValue({ error: null });

      const result = await PartnershipService.incrementPartnershipStat('partnership_123', 'tasksCompleted');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('update_partnership_stats', {
        partnership_id: 'partnership_123',
        stat_key: 'tasksCompleted',
        increment: 1,
      });
    });

    it('should increment partnership stat by custom amount', async () => {
      supabase.rpc.mockReturnValue({ error: null });

      const result = await PartnershipService.incrementPartnershipStat('partnership_123', 'tasksCompleted', 5);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('update_partnership_stats', {
        partnership_id: 'partnership_123',
        stat_key: 'tasksCompleted',
        increment: 5,
      });
    });

    it('should handle errors', async () => {
      supabase.rpc.mockReturnValue({ error: new Error('RPC error') });

      const result = await PartnershipService.incrementPartnershipStat('partnership_123', 'tasksCompleted');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('PARTNERSHIP');
      expect(result.error.code).toContain('INCREMENTPARTNERSHIPSTAT');
    });
  });

  describe('clearAllPartnerships', () => {
    it('should clear all partnerships from Supabase', async () => {
      mockSupabaseQuery.delete.mockResolvedValueOnce({
        error: null,
      });
      mockSupabaseQuery.neq.mockResolvedValueOnce({
        error: null,
      });

      const result = await PartnershipService.clearAllPartnerships();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockSupabaseQuery.delete).toHaveBeenCalled();
      expect(mockSupabaseQuery.neq).toHaveBeenCalledWith('id', '00000000-0000-0000-0000-000000000000');
    });

    it('should handle clear errors', async () => {
      mockSupabaseQuery.delete.mockResolvedValue({
        error: new Error('Delete error'),
      });

      const result = await PartnershipService.clearAllPartnerships();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toContain('PARTNERSHIP');
      expect(result.error.code).toContain('CLEARALLPARTNERSHIPS');
    });
  });

  describe('subscribeToPartnershipUpdates', () => {
    it('should create a realtime subscription', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const result = PartnershipService.subscribeToPartnershipUpdates('user_123', callback);

      expect(supabase.channel).toHaveBeenCalledWith('partnerships-user_123');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(result).toBe(mockChannel);
    });
  });
});