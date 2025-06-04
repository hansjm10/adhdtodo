// ABOUTME: Tests for Supabase user storage service
// Verifies user CRUD operations, caching, and sync functionality

import { SupabaseUserStorageService } from '../SupabaseUserStorageService';
import * as SecureStore from 'expo-secure-store';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('../SecureLogger');

// Mock SupabaseService with a proper structure
jest.mock('../SupabaseService', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('SupabaseUserStorageService', () => {
  let userService;
  let mockSupabase;
  let mockFromReturn;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-01'),
    lastActiveAt: new Date('2024-01-01'),
    sessionToken: null,
    passwordHash: '',
    passwordSalt: '',
    notificationPreferences: { global: 'all' },
    encouragementMessages: [],
    stats: {
      tasksAssigned: 5,
      tasksCompleted: 3,
      currentStreak: 2,
      longestStreak: 5,
      totalXP: 100,
    },
    partnerId: null,
    theme: 'system',
  };

  const mockDbUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_login: '2024-01-01T00:00:00Z',
    last_active: '2024-01-01T00:00:00Z',
    theme: 'system',
    notification_preferences: { global: 'all' },
    encouragement_messages: [],
    partner_id: null,
    xp_total: 100,
    current_streak: 2,
    longest_streak: 5,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset SecureStore mocks
    SecureStore.getItemAsync.mockReset();
    SecureStore.setItemAsync.mockReset();
    SecureStore.deleteItemAsync.mockReset();

    // Get mocked supabase
    const { supabase } = require('../SupabaseService');
    mockSupabase = supabase;

    // Setup default Supabase mocks
    const mockEq = jest.fn(() => ({
      single: jest.fn(() => ({
        data: mockDbUser,
        error: null,
      })),
    }));

    const mockUpdateEq = jest.fn(() => ({
      error: null,
    }));

    mockFromReturn = {
      select: jest.fn(() => ({
        eq: mockEq,
      })),
      update: jest.fn(() => ({
        eq: mockUpdateEq,
      })),
      upsert: jest.fn(() => ({
        error: null,
      })),
    };

    mockSupabase.from.mockImplementation(() => mockFromReturn);

    // Create service instance
    userService = new SupabaseUserStorageService();
  });

  describe('getCurrentUser', () => {
    it('should return null when no session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await userService.getCurrentUser();

      expect(result).toBeNull();
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    it('should fetch and return current user from database', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
        error: null,
      });

      const result = await userService.getCurrentUser();

      expect(result).toBeDefined();
      expect(result.id).toBe('test-user-id');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.stats.totalXP).toBe(100);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should use cached user within cache duration', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
        error: null,
      });

      // First call should fetch from database
      const result1 = await userService.getCurrentUser();
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await userService.getCurrentUser();
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(result1);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id' },
          },
        },
        error: null,
      });

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' },
            })),
          })),
        })),
      }));

      const result = await userService.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('setCurrentUser', () => {
    it('should update user in database and cache', async () => {
      const result = await userService.setCurrentUser(mockUser);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFromReturn.update).toHaveBeenCalledWith({
        name: mockUser.name,
        theme: mockUser.theme,
        notification_preferences: mockUser.notificationPreferences,
        encouragement_messages: mockUser.encouragementMessages,
        partner_id: mockUser.partnerId,
        xp_total: mockUser.stats.totalXP,
        current_streak: mockUser.stats.currentStreak,
        longest_streak: mockUser.stats.longestStreak,
        last_active: expect.any(String),
      });
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockImplementation(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            error: { message: 'Update failed' },
          })),
        })),
      }));

      const result = await userService.setCurrentUser(mockUser);
      expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no current user', async () => {
      // Mock getCurrentUser to return null
      userService.getCurrentUser = jest.fn().mockResolvedValue(null);

      const result = await userService.getAllUsers();
      expect(result).toEqual([]);
    });

    it('should return current user when no partner', async () => {
      // Mock getCurrentUser
      userService.getCurrentUser = jest.fn().mockResolvedValue(mockUser);

      const result = await userService.getAllUsers();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockUser);
    });

    it('should return current user and partner when partner exists', async () => {
      const userWithPartner = { ...mockUser, partnerId: 'partner-id' };
      userService.getCurrentUser = jest.fn().mockResolvedValue(userWithPartner);

      const partnerDbUser = { ...mockDbUser, id: 'partner-id', name: 'Partner User' };
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: partnerDbUser,
              error: null,
            })),
          })),
        })),
      }));

      const result = await userService.getAllUsers();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(userWithPartner);
      expect(result[1].name).toBe('Partner User');
    });
  });

  describe('saveUser', () => {
    it('should upsert user data to database', async () => {
      const result = await userService.saveUser(mockUser);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFromReturn.upsert).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        theme: mockUser.theme,
        notification_preferences: mockUser.notificationPreferences,
        encouragement_messages: mockUser.encouragementMessages,
        partner_id: mockUser.partnerId,
        xp_total: mockUser.stats.totalXP,
        current_streak: mockUser.stats.currentStreak,
        longest_streak: mockUser.stats.longestStreak,
        last_active: expect.any(String),
      });
    });

    it('should handle upsert errors', async () => {
      mockSupabase.from.mockImplementation(() => ({
        upsert: jest.fn(() => ({
          error: { message: 'Upsert failed' },
        })),
      }));

      const result = await userService.saveUser(mockUser);
      expect(result).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user data in database', async () => {
      const result = await userService.updateUser(mockUser);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFromReturn.update).toHaveBeenCalled();
    });

    it('should update cache if updating current user', async () => {
      // Set cache first
      userService.currentUserCache = mockUser;
      userService.cacheTimestamp = Date.now();

      const updatedUser = { ...mockUser, name: 'Updated Name' };
      const result = await userService.updateUser(updatedUser);

      expect(result).toBe(true);
      expect(userService.currentUserCache.name).toBe('Updated Name');
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID from database', async () => {
      const result = await userService.getUserById('test-user-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-user-id');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should return null for non-existent user', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { code: 'PGRST116' }, // Not found error
            })),
          })),
        })),
      }));

      const result = await userService.getUserById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should fetch user by email from database', async () => {
      const result = await userService.getUserByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle case-insensitive email search', async () => {
      await userService.getUserByEmail('TEST@EXAMPLE.COM');

      expect(mockFromReturn.select).toHaveBeenCalled();
      const mockEq = mockFromReturn.select.mock.results[0].value.eq;
      expect(mockEq).toHaveBeenCalledWith('email', 'test@example.com');
    });
  });

  describe('logout', () => {
    it('should clear cache and stored token', async () => {
      // Set cache
      userService.currentUserCache = mockUser;
      userService.cacheTimestamp = Date.now();

      // Mock deleteItemAsync to resolve
      SecureStore.deleteItemAsync.mockResolvedValue(undefined);

      const result = await userService.logout();

      expect(result).toBe(true);
      expect(userService.currentUserCache).toBeNull();
      expect(userService.cacheTimestamp).toBe(0);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_token');
    });
  });

  describe('saveUserToken', () => {
    it('should save token to secure storage', async () => {
      const token = 'test-token';
      const result = await userService.saveUserToken(token);

      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'user_token',
        token,
        expect.objectContaining({
          requireAuthentication: true,
        }),
      );
    });

    it('should handle storage errors', async () => {
      SecureStore.setItemAsync.mockRejectedValue(new Error('Storage error'));

      const result = await userService.saveUserToken('test-token');
      expect(result).toBe(false);
    });
  });

  describe('getUserToken', () => {
    it('should return token from active session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'session-token',
          },
        },
      });

      const result = await userService.getUserToken();
      expect(result).toBe('session-token');
    });

    it('should fall back to secure storage when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      SecureStore.getItemAsync.mockResolvedValue('stored-token');

      const result = await userService.getUserToken();
      expect(result).toBe('stored-token');
    });
  });

  describe('clearAllUsers', () => {
    it('should clear cache and token', async () => {
      userService.currentUserCache = mockUser;
      userService.cacheTimestamp = Date.now();

      // Mock deleteItemAsync to resolve
      SecureStore.deleteItemAsync.mockResolvedValue(undefined);

      const result = await userService.clearAllUsers();

      expect(result).toBe(true);
      expect(userService.currentUserCache).toBeNull();
      expect(userService.cacheTimestamp).toBe(0);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_token');
    });
  });
});
