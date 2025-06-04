// ABOUTME: Tests for UserStorageServiceWrapper that handles switching between local and Supabase implementations
// Verifies feature flag integration and data migration functionality

import UserStorageServiceWrapper from '../UserStorageServiceWrapper';
import FeatureFlags from '../FeatureFlags';

// Mock dependencies
jest.mock('../FeatureFlags');
jest.mock('../UserStorageService');
jest.mock('../SupabaseUserStorageService');
jest.mock('../SecureLogger');

describe('UserStorageServiceWrapper', () => {
  let wrapper;
  let mockLocalService;
  let mockSupabaseService;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    stats: {
      tasksCompleted: 10,
      totalXP: 100,
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mocked services
    mockLocalService = require('../UserStorageService').default;
    mockSupabaseService = require('../SupabaseUserStorageService').default;

    // Setup default mocks
    FeatureFlags.getFlag.mockResolvedValue(false); // Default to local storage
    FeatureFlags.getAllFlags.mockResolvedValue({
      useSupabaseUserStorage: false,
      enableDataMigration: false,
    });

    // Setup service mocks
    mockLocalService.getCurrentUser.mockResolvedValue(mockUser);
    mockLocalService.setCurrentUser.mockResolvedValue(true);
    mockLocalService.getAllUsers.mockResolvedValue([mockUser]);
    mockLocalService.saveUser.mockResolvedValue(true);
    mockLocalService.updateUser.mockResolvedValue(true);
    mockLocalService.getUserById.mockResolvedValue(mockUser);
    mockLocalService.getUserByEmail.mockResolvedValue(mockUser);
    mockLocalService.logout.mockResolvedValue(true);
    mockLocalService.saveUserToken.mockResolvedValue(true);
    mockLocalService.getUserToken.mockResolvedValue('local-token');
    mockLocalService.clearAllUsers.mockResolvedValue(true);

    mockSupabaseService.getCurrentUser.mockResolvedValue(mockUser);
    mockSupabaseService.setCurrentUser.mockResolvedValue(true);
    mockSupabaseService.getAllUsers.mockResolvedValue([mockUser]);
    mockSupabaseService.saveUser.mockResolvedValue(true);
    mockSupabaseService.updateUser.mockResolvedValue(true);
    mockSupabaseService.getUserById.mockResolvedValue(mockUser);
    mockSupabaseService.getUserByEmail.mockResolvedValue(mockUser);
    mockSupabaseService.logout.mockResolvedValue(true);
    mockSupabaseService.saveUserToken.mockResolvedValue(true);
    mockSupabaseService.getUserToken.mockResolvedValue('supabase-token');
    mockSupabaseService.clearAllUsers.mockResolvedValue(true);

    // Create new instance for each test
    wrapper = Object.create(UserStorageServiceWrapper);
    wrapper.localService = mockLocalService;
    wrapper.supabaseService = mockSupabaseService;
    wrapper.currentService = null;
  });

  describe('service selection', () => {
    it('should use local service when feature flag is false', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);

      const result = await wrapper.getCurrentUser();

      expect(FeatureFlags.getFlag).toHaveBeenCalledWith('useSupabaseUserStorage');
      expect(mockLocalService.getCurrentUser).toHaveBeenCalled();
      expect(mockSupabaseService.getCurrentUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should use Supabase service when feature flag is true', async () => {
      FeatureFlags.getFlag.mockResolvedValue(true);

      const result = await wrapper.getCurrentUser();

      expect(FeatureFlags.getFlag).toHaveBeenCalledWith('useSupabaseUserStorage');
      expect(mockSupabaseService.getCurrentUser).toHaveBeenCalled();
      expect(mockLocalService.getCurrentUser).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should cache service selection', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);

      // Multiple calls should only check feature flag once
      await wrapper.getCurrentUser();
      await wrapper.setCurrentUser(mockUser);
      await wrapper.getAllUsers();

      expect(FeatureFlags.getFlag).toHaveBeenCalledTimes(1);
    });
  });

  describe('data sync to Supabase', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    });

    afterEach(() => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    });

    it('should sync to Supabase when using local storage with migration enabled', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);
      FeatureFlags.getAllFlags.mockResolvedValue({
        useSupabaseUserStorage: false,
        enableDataMigration: true,
      });
      mockSupabaseService.getUserToken.mockResolvedValue('active-token');

      await wrapper.setCurrentUser(mockUser);

      expect(mockLocalService.setCurrentUser).toHaveBeenCalledWith(mockUser);
      expect(mockSupabaseService.saveUser).toHaveBeenCalledWith(mockUser);
    });

    it('should not sync when migration is disabled', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);
      FeatureFlags.getAllFlags.mockResolvedValue({
        useSupabaseUserStorage: false,
        enableDataMigration: false,
      });

      await wrapper.setCurrentUser(mockUser);

      expect(mockLocalService.setCurrentUser).toHaveBeenCalled();
      expect(mockSupabaseService.saveUser).not.toHaveBeenCalled();
    });

    it('should not sync when no Supabase session exists', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);
      FeatureFlags.getAllFlags.mockResolvedValue({
        useSupabaseUserStorage: false,
        enableDataMigration: true,
      });
      mockSupabaseService.getUserToken.mockResolvedValue(null);

      await wrapper.saveUser(mockUser);

      expect(mockLocalService.saveUser).toHaveBeenCalled();
      expect(mockSupabaseService.saveUser).not.toHaveBeenCalled();
    });

    it('should handle sync failures gracefully', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);
      FeatureFlags.getAllFlags.mockResolvedValue({
        useSupabaseUserStorage: false,
        enableDataMigration: true,
      });
      mockSupabaseService.getUserToken.mockResolvedValue('active-token');
      mockSupabaseService.saveUser.mockRejectedValue(new Error('Sync failed'));

      const result = await wrapper.updateUser(mockUser);

      // Should still succeed with local storage
      expect(result).toBe(true);
      expect(mockLocalService.updateUser).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout from both services', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);

      const result = await wrapper.logout();

      expect(result).toBe(true);
      expect(mockLocalService.logout).toHaveBeenCalled();
      expect(mockSupabaseService.logout).toHaveBeenCalled();
    });

    it('should handle partial logout failures', async () => {
      FeatureFlags.getFlag.mockResolvedValue(true);
      mockLocalService.logout.mockRejectedValue(new Error('Logout failed'));

      const result = await wrapper.logout();

      expect(result).toBe(true); // Supabase logout succeeded
      expect(mockSupabaseService.logout).toHaveBeenCalled();
    });
  });

  describe('refreshServiceSelection', () => {
    it('should clear cached service selection', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);

      // First call selects local service
      await wrapper.getCurrentUser();
      expect(mockLocalService.getCurrentUser).toHaveBeenCalledTimes(1);

      // Change feature flag
      FeatureFlags.getFlag.mockResolvedValue(true);

      // Refresh service selection
      await wrapper.refreshServiceSelection();

      // Next call should use Supabase service
      await wrapper.getCurrentUser();
      expect(mockSupabaseService.getCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('migrateLocalDataToSupabase', () => {
    it('should migrate all local users to Supabase', async () => {
      const users = [
        { ...mockUser, id: 'user1' },
        { ...mockUser, id: 'user2' },
      ];
      mockLocalService.getAllUsers.mockResolvedValue(users);

      const result = await wrapper.migrateLocalDataToSupabase();

      expect(result.success).toBe(true);
      expect(mockSupabaseService.saveUser).toHaveBeenCalledTimes(2);
      expect(mockSupabaseService.saveUser).toHaveBeenCalledWith(users[0]);
      expect(mockSupabaseService.saveUser).toHaveBeenCalledWith(users[1]);
    });

    it('should handle partial migration failures', async () => {
      const users = [
        { ...mockUser, id: 'user1' },
        { ...mockUser, id: 'user2' },
      ];
      mockLocalService.getAllUsers.mockResolvedValue(users);

      // First save succeeds, second fails
      mockSupabaseService.saveUser.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await wrapper.migrateLocalDataToSupabase();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only 1 of 2 users migrated');
    });

    it('should handle empty local storage', async () => {
      mockLocalService.getAllUsers.mockResolvedValue([]);

      const result = await wrapper.migrateLocalDataToSupabase();

      expect(result.success).toBe(true);
      expect(mockSupabaseService.saveUser).not.toHaveBeenCalled();
    });

    it('should handle migration errors', async () => {
      mockLocalService.getAllUsers.mockRejectedValue(new Error('Database error'));

      const result = await wrapper.migrateLocalDataToSupabase();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('method delegation', () => {
    it('should delegate all methods to the selected service', async () => {
      FeatureFlags.getFlag.mockResolvedValue(false);

      // Test all methods
      await wrapper.getCurrentUser();
      await wrapper.setCurrentUser(mockUser);
      await wrapper.getAllUsers();
      await wrapper.saveUser(mockUser);
      await wrapper.updateUser(mockUser);
      await wrapper.getUserById('test-id');
      await wrapper.getUserByEmail('test@example.com');
      await wrapper.saveUserToken('token');
      await wrapper.getUserToken();
      await wrapper.clearAllUsers();

      // Verify all methods were called on local service
      expect(mockLocalService.getCurrentUser).toHaveBeenCalled();
      expect(mockLocalService.setCurrentUser).toHaveBeenCalled();
      expect(mockLocalService.getAllUsers).toHaveBeenCalled();
      expect(mockLocalService.saveUser).toHaveBeenCalled();
      expect(mockLocalService.updateUser).toHaveBeenCalled();
      expect(mockLocalService.getUserById).toHaveBeenCalled();
      expect(mockLocalService.getUserByEmail).toHaveBeenCalled();
      expect(mockLocalService.saveUserToken).toHaveBeenCalled();
      expect(mockLocalService.getUserToken).toHaveBeenCalled();
      expect(mockLocalService.clearAllUsers).toHaveBeenCalled();

      // Verify Supabase service was not called (except for methods that interact with both)
      expect(mockSupabaseService.getCurrentUser).not.toHaveBeenCalled();
      expect(mockSupabaseService.setCurrentUser).not.toHaveBeenCalled();
    });
  });
});
