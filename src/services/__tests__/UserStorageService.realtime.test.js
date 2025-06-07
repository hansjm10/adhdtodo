// ABOUTME: Tests for UserStorageService real-time subscription functionality
// Verifies user profile updates are received in real-time through Supabase channels

import UserStorageService from '../UserStorageService';
import { supabase } from '../SupabaseService';
import { NotificationPreference } from '../../types/user.types';

// SupabaseService is already mocked globally in tests/setup.js

// Mock SecureLogger to avoid console spam in tests
jest.mock('../SecureLogger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('UserStorageService - Real-time Subscriptions', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  const mockDbUser = {
    id: mockUser.id,
    email: mockUser.email,
    name: 'Test User',
    theme: 'dark',
    notification_preferences: {
      global: NotificationPreference.ALL,
    },
    encouragement_messages: ['Great job!'],
    partner_id: null,
    xp_total: 100,
    current_streak: 5,
    longest_streak: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Helper to create mock channel
  const createMockChannel = () => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  });

  // Helper to create mock query builder
  const createMockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth mock
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser, access_token: 'test-token' } },
      error: null,
    });
  });

  describe('subscribeToUserUpdates', () => {
    it('should subscribe to user profile updates', async () => {
      const mockChannel = createMockChannel();
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = await UserStorageService.subscribeToUserUpdates(mockUser.id, callback);

      expect(supabase.channel).toHaveBeenCalledWith(`user:${mockUser.id}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${mockUser.id}`,
        },
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle UPDATE events and notify callback', async () => {
      const mockChannel = createMockChannel();
      let capturedHandler;

      mockChannel.on.mockImplementation((event, options, handler) => {
        capturedHandler = handler;
        return mockChannel;
      });

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      await UserStorageService.subscribeToUserUpdates(mockUser.id, callback);

      // Simulate UPDATE event
      const updatedUser = {
        ...mockDbUser,
        name: 'Updated Name',
        theme: 'light',
        xp_total: 150,
      };

      capturedHandler({
        eventType: 'UPDATE',
        new: updatedUser,
        old: mockDbUser,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          name: 'Updated Name',
          theme: 'light',
          stats: expect.objectContaining({
            totalXP: 150,
          }),
        }),
      );
    });

    it('should update cache when receiving real-time updates', async () => {
      const mockChannel = createMockChannel();
      let capturedHandler;

      mockChannel.on.mockImplementation((event, options, handler) => {
        capturedHandler = handler;
        return mockChannel;
      });

      supabase.channel.mockReturnValue(mockChannel);

      // Setup initial user in cache
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.single.mockResolvedValue({
        data: mockDbUser,
        error: null,
      });
      supabase.from.mockReturnValue(mockQueryBuilder);

      // Get current user to populate cache
      await UserStorageService.getCurrentUser();

      const callback = jest.fn();
      await UserStorageService.subscribeToUserUpdates(mockUser.id, callback);

      // Simulate UPDATE event
      const updatedUser = {
        ...mockDbUser,
        name: 'Real-time Updated',
        xp_total: 200,
      };

      capturedHandler({
        eventType: 'UPDATE',
        new: updatedUser,
      });

      // Check if cache was updated
      const cachedUser = await UserStorageService.getCurrentUser();
      expect(cachedUser.name).toBe('Real-time Updated');
      expect(cachedUser.stats.totalXP).toBe(200);

      // Should not hit database again due to cache
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribe properly', async () => {
      const mockChannel = createMockChannel();
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = await UserStorageService.subscribeToUserUpdates(mockUser.id, callback);

      // Call unsubscribe
      unsubscribe();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle errors in subscription gracefully', async () => {
      const mockChannel = createMockChannel();
      mockChannel.subscribe.mockImplementation(() => {
        throw new Error('Subscription failed');
      });
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = await UserStorageService.subscribeToUserUpdates(mockUser.id, callback);

      // Should return a no-op unsubscribe function
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle multiple subscriptions independently', async () => {
      const mockChannel1 = createMockChannel();
      const mockChannel2 = createMockChannel();

      supabase.channel.mockReturnValueOnce(mockChannel1).mockReturnValueOnce(mockChannel2);

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = await UserStorageService.subscribeToUserUpdates('user1', callback1);
      const _unsubscribe2 = await UserStorageService.subscribeToUserUpdates('user2', callback2);

      expect(supabase.channel).toHaveBeenCalledWith('user:user1');
      expect(supabase.channel).toHaveBeenCalledWith('user:user2');

      // Unsubscribe first
      unsubscribe1();
      expect(mockChannel1.unsubscribe).toHaveBeenCalled();
      expect(mockChannel2.unsubscribe).not.toHaveBeenCalled();
    });

    it('should handle partnership updates in real-time', async () => {
      const mockChannel = createMockChannel();
      let capturedHandler;

      mockChannel.on.mockImplementation((event, options, handler) => {
        capturedHandler = handler;
        return mockChannel;
      });

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      await UserStorageService.subscribeToUserUpdates(mockUser.id, callback);

      // Simulate partnership update
      const updatedUser = {
        ...mockDbUser,
        partner_id: 'partner-user-789',
      };

      capturedHandler({
        eventType: 'UPDATE',
        new: updatedUser,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'partner-user-789',
        }),
      );
    });

    it('should handle stats updates in real-time', async () => {
      const mockChannel = createMockChannel();
      let capturedHandler;

      mockChannel.on.mockImplementation((event, options, handler) => {
        capturedHandler = handler;
        return mockChannel;
      });

      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      await UserStorageService.subscribeToUserUpdates(mockUser.id, callback);

      // Simulate stats update
      const updatedUser = {
        ...mockDbUser,
        xp_total: 500,
        current_streak: 15,
        longest_streak: 15,
      };

      capturedHandler({
        eventType: 'UPDATE',
        new: updatedUser,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({
            totalXP: 500,
            currentStreak: 15,
            longestStreak: 15,
          }),
        }),
      );
    });
  });
});
