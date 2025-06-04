// ABOUTME: Tests for simplified UserStorageService that only uses Supabase
// Follows TDD approach - tests written before implementation

// Mock dependencies first
jest.mock('../SupabaseService', () => ({
  supabase: {
    auth: null,
    from: null,
  },
}));
jest.mock('expo-secure-store');
jest.mock('../SecureLogger');

import { supabase } from '../SupabaseService';
import * as SecureStore from 'expo-secure-store';
import { createMockUser } from '../../../tests/utils';
import { NotificationPreference } from '../../types/user.types';
import UserStorageService from '../UserStorageService';

describe('UserStorageService (Simplified Supabase-only)', () => {
  let mockSupabaseAuth;
  let mockSupabaseFrom;
  let mockUser;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock SecureStore methods
    SecureStore.setItemAsync.mockResolvedValue();
    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.deleteItemAsync.mockResolvedValue();

    // Clear the service cache by calling logout
    await UserStorageService.logout();

    // Setup mock user
    mockUser = createMockUser({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    // Mock Supabase auth
    mockSupabaseAuth = {
      getSession: jest.fn(),
      signOut: jest.fn(),
    };

    // Mock Supabase from() method for database operations
    const mockChain = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      limit: jest.fn(),
    };

    // Make each method return the chain for chaining
    Object.keys(mockChain).forEach((method) => {
      mockChain[method].mockReturnValue(mockChain);
    });

    mockSupabaseFrom = jest.fn(() => mockChain);

    // Apply mocks
    supabase.auth = mockSupabaseAuth;
    supabase.from = mockSupabaseFrom;
  });

  describe('getCurrentUser', () => {
    it('should return null when no session exists', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await UserStorageService.getCurrentUser();
      expect(result).toBeNull();
    });

    it('should fetch and return current user from database', async () => {
      const mockSession = {
        user: { id: mockUser.id, email: mockUser.email },
        access_token: 'token-123',
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const dbUser = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        theme: 'system',
        notification_preferences: { global: NotificationPreference.ALL },
        encouragement_messages: [],
        partner_id: null,
        xp_total: 0,
        current_streak: 0,
        longest_streak: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseFrom().single.mockResolvedValue({
        data: dbUser,
        error: null,
      });

      const result = await UserStorageService.getCurrentUser();
      expect(result).toBeTruthy();
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.name).toBe(mockUser.name);
    });

    it('should use cached user within cache duration', async () => {
      // First call - sets cache
      const mockSession = {
        user: { id: mockUser.id, email: mockUser.email },
        access_token: 'token-123',
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const dbUser = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        created_at: new Date().toISOString(),
      };

      mockSupabaseFrom().single.mockResolvedValue({
        data: dbUser,
        error: null,
      });

      const firstResult = await UserStorageService.getCurrentUser();
      expect(mockSupabaseAuth.getSession).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const secondResult = await UserStorageService.getCurrentUser();
      expect(mockSupabaseAuth.getSession).toHaveBeenCalledTimes(1); // Not called again
      expect(secondResult).toEqual(firstResult);
    });
  });

  describe('setCurrentUser', () => {
    it('should update user in database and cache', async () => {
      const mockChain = mockSupabaseFrom();
      mockChain.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await UserStorageService.setCurrentUser(mockUser);
      expect(result).toBe(true);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockUser.name,
          theme: mockUser.theme || 'system',
        }),
      );
    });

    it('should handle database errors', async () => {
      const mockChain = mockSupabaseFrom();
      mockChain.eq.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await UserStorageService.setCurrentUser(mockUser);
      expect(result).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no current user', async () => {
      // Reset mocks to ensure clean state
      jest.clearAllMocks();

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await UserStorageService.getAllUsers();
      expect(result).toEqual([]);
    });

    it('should return current user when no partner', async () => {
      const mockSession = {
        user: { id: mockUser.id, email: mockUser.email },
        access_token: 'token-123',
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const dbUser = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        partner_id: null,
        created_at: new Date().toISOString(),
      };

      mockSupabaseFrom().single.mockResolvedValue({
        data: dbUser,
        error: null,
      });

      const result = await UserStorageService.getAllUsers();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockUser.id);
    });
  });

  describe('saveUser', () => {
    it('should upsert user data to database', async () => {
      mockSupabaseFrom().upsert.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await UserStorageService.saveUser(mockUser);
      expect(result).toBe(true);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
      expect(mockSupabaseFrom().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        }),
      );
    });
  });

  describe('logout', () => {
    it('should clear cache and stored token', async () => {
      const result = await UserStorageService.logout();
      expect(result).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_token');
    });
  });

  describe('getUserToken', () => {
    it('should return token from active session', async () => {
      const mockSession = {
        access_token: 'session-token-123',
        user: { id: mockUser.id },
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await UserStorageService.getUserToken();
      expect(result).toBe('session-token-123');
    });

    it('should fall back to secure storage when no session', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Mock getItemAsync to return the stored token
      SecureStore.getItemAsync.mockResolvedValue('stored-token-123');

      const result = await UserStorageService.getUserToken();
      expect(result).toBe('stored-token-123');
    });
  });
});
