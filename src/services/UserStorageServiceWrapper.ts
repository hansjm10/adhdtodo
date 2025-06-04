// ABOUTME: Wrapper service that switches between local and Supabase user storage based on feature flags
// Provides seamless migration path from local to cloud user storage

import { IUserStorageService } from './UserStorageService';
export type { IUserStorageService } from './UserStorageService';
import LocalUserStorageService from './UserStorageService';
import SupabaseUserStorageService from './SupabaseUserStorageService';
import FeatureFlags from './FeatureFlags';
import SecureLogger from './SecureLogger';
import { User } from '../types/user.types';

class UserStorageServiceWrapper implements IUserStorageService {
  private localService: IUserStorageService = LocalUserStorageService;
  private supabaseService: IUserStorageService = SupabaseUserStorageService;
  private currentService: IUserStorageService | null = null;

  private async getService(): Promise<IUserStorageService> {
    if (!this.currentService) {
      const useSupabase = await FeatureFlags.getFlag('useSupabaseUserStorage');
      this.currentService = useSupabase ? this.supabaseService : this.localService;

      SecureLogger.info(`Using ${useSupabase ? 'Supabase' : 'Local'} user storage service`, {
        code: 'USER_STORAGE_WRAPPER_001',
      });
    }
    return this.currentService;
  }

  async getCurrentUser(): Promise<User | null> {
    const service = await this.getService();
    return service.getCurrentUser();
  }

  async setCurrentUser(user: User): Promise<boolean> {
    const service = await this.getService();
    const result = await service.setCurrentUser(user);

    // If using local storage but Supabase is available, sync to cloud
    if (service === this.localService && (await this.shouldSyncToSupabase())) {
      await this.syncUserToSupabase(user);
    }

    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const service = await this.getService();
    return service.getAllUsers();
  }

  async saveUser(user: User): Promise<boolean> {
    const service = await this.getService();
    const result = await service.saveUser(user);

    // Sync to Supabase if using local storage
    if (service === this.localService && (await this.shouldSyncToSupabase())) {
      await this.syncUserToSupabase(user);
    }

    return result;
  }

  async updateUser(updatedUser: User): Promise<boolean> {
    const service = await this.getService();
    const result = await service.updateUser(updatedUser);

    // Sync to Supabase if using local storage
    if (service === this.localService && (await this.shouldSyncToSupabase())) {
      await this.syncUserToSupabase(updatedUser);
    }

    return result;
  }

  async getUserById(userId: string): Promise<User | null> {
    const service = await this.getService();
    return service.getUserById(userId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const service = await this.getService();
    return service.getUserByEmail(email);
  }

  async logout(): Promise<boolean> {
    // Logout from both services
    const service = await this.getService();
    const result = await service.logout();

    // Also logout from the other service if it has data
    if (service === this.localService) {
      await this.supabaseService.logout().catch(() => {});
    } else {
      await this.localService.logout().catch(() => {});
    }

    return result;
  }

  async saveUserToken(token: string): Promise<boolean> {
    const service = await this.getService();
    return service.saveUserToken(token);
  }

  async getUserToken(): Promise<string | null> {
    const service = await this.getService();
    return service.getUserToken();
  }

  async clearAllUsers(): Promise<boolean> {
    const service = await this.getService();
    return service.clearAllUsers();
  }

  // Migration helpers
  private async shouldSyncToSupabase(): Promise<boolean> {
    const flags = await FeatureFlags.getAllFlags();
    return flags.enableDataMigration && process.env.EXPO_PUBLIC_SUPABASE_URL !== undefined;
  }

  private async syncUserToSupabase(user: User): Promise<void> {
    try {
      // Only sync if we have a Supabase session
      const token = await this.supabaseService.getUserToken();
      if (!token) {
        return; // No active Supabase session
      }

      await this.supabaseService.saveUser(user);
      SecureLogger.info('User data synced to Supabase', {
        code: 'USER_STORAGE_SYNC_001',
        context: `User: ${user.id}`,
      });
    } catch (error) {
      // Silent failure - don't affect user experience
      SecureLogger.error('Failed to sync user to Supabase', {
        code: 'USER_STORAGE_SYNC_002',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Force refresh service selection (useful for testing and migration)
  async refreshServiceSelection(): Promise<void> {
    this.currentService = null;
    await this.getService();
  }

  // Migration method to transfer all local data to Supabase
  async migrateLocalDataToSupabase(): Promise<{ success: boolean; error?: string }> {
    try {
      SecureLogger.info('Starting user data migration to Supabase', {
        code: 'USER_STORAGE_MIGRATE_001',
      });

      // Get all users from local storage
      const localUsers = await this.localService.getAllUsers();

      if (localUsers.length === 0) {
        return { success: true }; // Nothing to migrate
      }

      // Migrate each user
      let migratedCount = 0;
      for (const user of localUsers) {
        const success = await this.supabaseService.saveUser(user);
        if (success) {
          migratedCount++;
        }
      }

      SecureLogger.info('User data migration completed', {
        code: 'USER_STORAGE_MIGRATE_002',
        context: `Total: ${localUsers.length}, Migrated: ${migratedCount}`,
      });

      return {
        success: migratedCount === localUsers.length,
        error:
          migratedCount < localUsers.length
            ? `Only ${migratedCount} of ${localUsers.length} users migrated`
            : undefined,
      };
    } catch (error) {
      SecureLogger.error('User data migration failed', {
        code: 'USER_STORAGE_MIGRATE_003',
        context: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      };
    }
  }
}

export default new UserStorageServiceWrapper();
