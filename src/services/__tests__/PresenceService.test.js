// ABOUTME: Tests for PresenceService real-time presence tracking
// Verifies online/offline status tracking and activity monitoring

import PresenceService from '../PresenceService';
import { supabase } from '../SupabaseService';

// SupabaseService is already mocked globally in tests/setup.js

describe('PresenceService', () => {
  const mockUserId = 'user-123';
  const mockUserId2 = 'user-456';
  const mockTaskId = 'task-789';

  // Global mock channel with all necessary methods
  const createMockChannel = () => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn((callback) => {
      callback('SUBSCRIBED');
      return Promise.resolve();
    }),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    track: jest.fn().mockResolvedValue(undefined),
    presenceState: jest.fn(() => ({})),
  });

  beforeEach(() => {
    // Mock timers to prevent hanging
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Reset service state
    PresenceService.__resetForTesting();

    // Set up default mock channel
    supabase.channel.mockReturnValue(createMockChannel());
  });

  afterEach(() => {
    // Just reset state and restore timers
    PresenceService.__resetForTesting();
    // Restore real timers
    jest.useRealTimers();
  });

  describe('startPresence', () => {
    it('should initialize presence tracking for a user', async () => {
      const mockChannel = createMockChannel();
      supabase.channel.mockReturnValue(mockChannel);

      await PresenceService.startPresence(mockUserId, mockTaskId);

      expect(supabase.channel).toHaveBeenCalledWith(`presence:${mockUserId}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'presence',
        { event: 'sync' },
        expect.any(Function),
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'presence',
        { event: 'join' },
        expect.any(Function),
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'presence',
        { event: 'leave' },
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(mockChannel.track).toHaveBeenCalledWith({
        userId: mockUserId,
        status: 'online',
        currentTaskId: mockTaskId,
        lastSeen: expect.any(Date),
      });
    });

    it('should not create duplicate presence if already tracking', async () => {
      const mockChannel = createMockChannel();
      supabase.channel.mockReturnValue(mockChannel);

      // Start presence twice
      await PresenceService.startPresence(mockUserId);
      await PresenceService.startPresence(mockUserId);

      // Channel should only be created once
      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });

    it('should stop existing presence before starting new one', async () => {
      const mockChannel1 = createMockChannel();
      const mockChannel2 = createMockChannel();

      supabase.channel.mockReturnValueOnce(mockChannel1).mockReturnValueOnce(mockChannel2);

      // Start presence for user 1, then user 2
      await PresenceService.startPresence(mockUserId);
      await PresenceService.startPresence(mockUserId2);

      expect(mockChannel1.unsubscribe).toHaveBeenCalled();
      expect(supabase.channel).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopPresence', () => {
    it('should clean up timers and channels', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          callback('SUBSCRIBED');
          return mockChannel;
        }),
        track: jest.fn(),
        presenceState: jest.fn(() => ({})),
        unsubscribe: jest.fn(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await PresenceService.startPresence(mockUserId);
      await PresenceService.stopPresence();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(PresenceService.channel).toBeNull();
      expect(PresenceService.currentUserId).toBeNull();
      expect(PresenceService.heartbeatTimer).toBeNull();
      expect(PresenceService.awayTimer).toBeNull();
      expect(PresenceService.presenceState.size).toBe(0);
    });
  });

  describe('updatePresence', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          callback('SUBSCRIBED');
          return mockChannel;
        }),
        track: jest.fn(),
        presenceState: jest.fn(() => ({})),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await PresenceService.startPresence(mockUserId);
    });

    it('should update presence status', async () => {
      await PresenceService.updatePresence('away', mockTaskId, { workingOn: 'Important task' });

      expect(PresenceService.channel.track).toHaveBeenCalledWith({
        userId: mockUserId,
        status: 'away',
        currentTaskId: mockTaskId,
        lastSeen: expect.any(Date),
        metadata: { workingOn: 'Important task' },
      });
    });

    it('should not update if not initialized', async () => {
      // Ensure service is not initialized by resetting state
      PresenceService.__resetForTesting();

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await PresenceService.updatePresence('online');

      expect(consoleSpy).toHaveBeenCalledWith('Presence not initialized');
      consoleSpy.mockRestore();
    });
  });

  describe('setCurrentTask', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          callback('SUBSCRIBED');
          return mockChannel;
        }),
        track: jest.fn(),
        presenceState: jest.fn(() => ({})),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await PresenceService.startPresence(mockUserId);

      // Set initial presence state
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        lastSeen: new Date(),
      });
    });

    it('should update current task in presence', async () => {
      await PresenceService.setCurrentTask(mockTaskId);

      expect(PresenceService.channel.track).toHaveBeenCalledWith({
        userId: mockUserId,
        status: 'online',
        currentTaskId: mockTaskId,
        lastSeen: expect.any(Date),
      });
    });

    it('should clear current task when null', async () => {
      await PresenceService.setCurrentTask(null);

      expect(PresenceService.channel.track).toHaveBeenCalledWith({
        userId: mockUserId,
        status: 'online',
        currentTaskId: undefined,
        lastSeen: expect.any(Date),
      });
    });
  });

  describe('getPresenceState', () => {
    it('should return presence state for user', () => {
      const presenceState = {
        userId: mockUserId,
        status: 'online',
        lastSeen: new Date(),
      };

      PresenceService.presenceState.set(mockUserId, presenceState);

      const result = PresenceService.getPresenceState(mockUserId);

      expect(result).toEqual(presenceState);
    });

    it('should return null for unknown user', () => {
      const result = PresenceService.getPresenceState('unknown-user');

      expect(result).toBeNull();
    });
  });

  describe('getAllPresenceStates', () => {
    it('should return all presence states', () => {
      const state1 = { userId: mockUserId, status: 'online', lastSeen: new Date() };
      const state2 = { userId: mockUserId2, status: 'away', lastSeen: new Date() };

      PresenceService.presenceState.set(mockUserId, state1);
      PresenceService.presenceState.set(mockUserId2, state2);

      const result = PresenceService.getAllPresenceStates();

      expect(result.size).toBe(2);
      expect(result.get(mockUserId)).toEqual(state1);
      expect(result.get(mockUserId2)).toEqual(state2);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return only online users', () => {
      const onlineUser = { userId: mockUserId, status: 'online', lastSeen: new Date() };
      const awayUser = { userId: mockUserId2, status: 'away', lastSeen: new Date() };
      const offlineUser = { userId: 'user-offline', status: 'offline', lastSeen: new Date() };

      PresenceService.presenceState.set(mockUserId, onlineUser);
      PresenceService.presenceState.set(mockUserId2, awayUser);
      PresenceService.presenceState.set('user-offline', offlineUser);

      const result = PresenceService.getOnlineUsers();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(onlineUser);
    });
  });

  describe('isUserOnline', () => {
    it('should return true for online user', () => {
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        lastSeen: new Date(),
      });

      expect(PresenceService.isUserOnline(mockUserId)).toBe(true);
    });

    it('should return false for offline user', () => {
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'offline',
        lastSeen: new Date(),
      });

      expect(PresenceService.isUserOnline(mockUserId)).toBe(false);
    });

    it('should return false for unknown user', () => {
      expect(PresenceService.isUserOnline('unknown-user')).toBe(false);
    });
  });

  describe('subscribeToUserPresence', () => {
    it('should call callback with initial presence states', () => {
      const callback = jest.fn();
      const userIds = [mockUserId, mockUserId2];

      const state1 = { userId: mockUserId, status: 'online', lastSeen: new Date() };
      const state2 = { userId: mockUserId2, status: 'away', lastSeen: new Date() };

      PresenceService.presenceState.set(mockUserId, state1);
      PresenceService.presenceState.set(mockUserId2, state2);

      PresenceService.subscribeToUserPresence(userIds, callback);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(mockUserId, state1);
      expect(callback).toHaveBeenCalledWith(mockUserId2, state2);
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = PresenceService.subscribeToUserPresence([mockUserId], callback);

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('getUserActivity', () => {
    it('should return task activity when user has current task', () => {
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        currentTaskId: mockTaskId,
        lastSeen: new Date(),
      });

      const activity = PresenceService.getUserActivity(mockUserId);

      expect(activity).toBe(`Working on task ${mockTaskId}`);
    });

    it('should return metadata activity when available', () => {
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        lastSeen: new Date(),
        metadata: { workingOn: 'Writing tests' },
      });

      const activity = PresenceService.getUserActivity(mockUserId);

      expect(activity).toBe('Writing tests');
    });

    it('should return status for online user without specific activity', () => {
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        lastSeen: new Date(),
      });

      const activity = PresenceService.getUserActivity(mockUserId);

      expect(activity).toBe('Online');
    });

    it('should return Away for away user', () => {
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'away',
        lastSeen: new Date(),
      });

      const activity = PresenceService.getUserActivity(mockUserId);

      expect(activity).toBe('Away');
    });

    it('should return null for offline user', () => {
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'offline',
        lastSeen: new Date(),
      });

      const activity = PresenceService.getUserActivity(mockUserId);

      expect(activity).toBeNull();
    });

    it('should return null for unknown user', () => {
      const activity = PresenceService.getUserActivity('unknown-user');

      expect(activity).toBeNull();
    });
  });

  describe('signalActivity', () => {
    beforeEach(async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          callback('SUBSCRIBED');
          return mockChannel;
        }),
        track: jest.fn(),
        presenceState: jest.fn(() => ({})),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await PresenceService.startPresence(mockUserId);

      // Set user as away
      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'away',
        currentTaskId: mockTaskId,
        lastSeen: new Date(),
      });
    });

    it('should update away user to online', async () => {
      await PresenceService.signalActivity();

      expect(PresenceService.channel.track).toHaveBeenCalledWith({
        userId: mockUserId,
        status: 'online',
        currentTaskId: mockTaskId,
        lastSeen: expect.any(Date),
      });
    });

    it('should reset away timer', async () => {
      // Set a mock timer
      PresenceService.awayTimer = setTimeout(() => {}, 1000);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      await PresenceService.signalActivity();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('presence event handlers', () => {
    let mockChannel;

    beforeEach(async () => {
      mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn((callback) => {
          callback('SUBSCRIBED');
          return mockChannel;
        }),
        track: jest.fn(),
        presenceState: jest.fn(() => ({})),
      };
      supabase.channel.mockReturnValue(mockChannel);

      await PresenceService.startPresence(mockUserId);
    });

    it('should handle presence sync event', () => {
      const syncHandler = mockChannel.on.mock.calls.find((call) => call[1].event === 'sync')[2];

      // Mock presence state
      mockChannel.presenceState.mockReturnValue({
        [mockUserId2]: [
          {
            userId: mockUserId2,
            status: 'online',
            lastSeen: new Date().toISOString(),
          },
        ],
      });

      syncHandler();

      expect(PresenceService.presenceState.has(mockUserId2)).toBe(true);
      expect(PresenceService.presenceState.get(mockUserId2).status).toBe('online');
    });

    it('should handle presence join event', () => {
      const joinHandler = mockChannel.on.mock.calls.find((call) => call[1].event === 'join')[2];

      const joinPayload = {
        key: mockUserId2,
        newPresences: [
          {
            userId: mockUserId2,
            status: 'online',
            lastSeen: new Date().toISOString(),
          },
        ],
      };

      joinHandler(joinPayload);

      expect(PresenceService.presenceState.has(mockUserId2)).toBe(true);
      expect(PresenceService.presenceState.get(mockUserId2).status).toBe('online');
    });

    it('should handle presence leave event', () => {
      const leaveHandler = mockChannel.on.mock.calls.find((call) => call[1].event === 'leave')[2];

      // First add a user
      PresenceService.presenceState.set(mockUserId2, {
        userId: mockUserId2,
        status: 'online',
        lastSeen: new Date(),
      });

      const leavePayload = {
        key: mockUserId2,
        leftPresences: [
          {
            userId: mockUserId2,
            status: 'online',
            currentTaskId: mockTaskId,
          },
        ],
      };

      leaveHandler(leavePayload);

      // User should be marked as offline, not removed
      expect(PresenceService.presenceState.has(mockUserId2)).toBe(true);
      expect(PresenceService.presenceState.get(mockUserId2).status).toBe('offline');
    });
  });

  describe('cleanupStalePresence', () => {
    beforeEach(() => {
      // Mock the private method by accessing it through the service
      PresenceService.cleanupStalePresence =
        PresenceService.cleanupStalePresence.bind(PresenceService);
    });

    it('should mark old users as offline', () => {
      const oldTime = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago

      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        lastSeen: oldTime,
      });

      PresenceService.cleanupStalePresence();

      expect(PresenceService.presenceState.get(mockUserId).status).toBe('offline');
    });

    it('should mark inactive users as away', () => {
      const recentTime = new Date(Date.now() - 8 * 60 * 1000); // 8 minutes ago

      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        lastSeen: recentTime,
      });

      PresenceService.cleanupStalePresence();

      expect(PresenceService.presenceState.get(mockUserId).status).toBe('away');
    });

    it('should not modify recently active users', () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

      PresenceService.presenceState.set(mockUserId, {
        userId: mockUserId,
        status: 'online',
        lastSeen: recentTime,
      });

      PresenceService.cleanupStalePresence();

      expect(PresenceService.presenceState.get(mockUserId).status).toBe('online');
    });
  });
});
