// ABOUTME: Feature flag service for controlling rollout of new features
// Controls which services use Supabase vs local implementations

import { BaseService } from './BaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '../types/common.types';

export interface FeatureFlags {
  useSupabaseAuth: boolean;
  useSupabaseTaskStorage: boolean;
  useSupabaseNotifications: boolean;
  enableRealTimeSync: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  useSupabaseAuth: false,
  useSupabaseTaskStorage: false,
  useSupabaseNotifications: false,
  enableRealTimeSync: false,
};

class FeatureFlagService extends BaseService {
  private static STORAGE_KEY = '@feature_flags';
  private flags: FeatureFlags = { ...DEFAULT_FLAGS };
  private initialized = false;

  constructor() {
    super('FeatureFlags');
  }

  async initialize(): Promise<Result<void>> {
    if (this.initialized) return { success: true, data: undefined };

    return this.wrapAsync('initialize', async () => {
      const stored = await AsyncStorage.getItem(FeatureFlagService.STORAGE_KEY);
      if (stored) {
        this.flags = { ...DEFAULT_FLAGS, ...(JSON.parse(stored) as Partial<FeatureFlags>) };
      }
      this.initialized = true;
    });
  }

  async setFlag(flag: keyof FeatureFlags, value: boolean): Promise<Result<void>> {
    return this.wrapAsync(
      'setFlag',
      async () => {
        await this.initialize();
        this.flags[flag] = value;
        await AsyncStorage.setItem(FeatureFlagService.STORAGE_KEY, JSON.stringify(this.flags));
      },
      { flag, value },
    );
  }

  async getFlag(flag: keyof FeatureFlags): Promise<Result<boolean>> {
    return this.wrapAsync(
      'getFlag',
      async () => {
        await this.initialize();
        return this.flags[flag];
      },
      { flag },
    );
  }

  async getAllFlags(): Promise<Result<FeatureFlags>> {
    return this.wrapAsync('getAllFlags', async () => {
      await this.initialize();
      return { ...this.flags };
    });
  }

  async resetToDefaults(): Promise<Result<void>> {
    return this.wrapAsync('resetToDefaults', async () => {
      this.flags = { ...DEFAULT_FLAGS };
      await AsyncStorage.removeItem(FeatureFlagService.STORAGE_KEY);
    });
  }

  // Convenience methods for specific features
  async isSupabaseAuthEnabled(): Promise<boolean> {
    const result = await this.getFlag('useSupabaseAuth');
    return result.success && result.data ? result.data : false;
  }

  isDataMigrationEnabled(): boolean {
    // Migration is no longer supported - always return false
    return false;
  }

  async isRealTimeSyncEnabled(): Promise<boolean> {
    const result = await this.getFlag('enableRealTimeSync');
    return result.success && result.data ? result.data : false;
  }

  // Enable Supabase features gradually
  async enableSupabaseAuth(): Promise<Result<void>> {
    return this.setFlag('useSupabaseAuth', true);
  }

  async enableAllSupabaseFeatures(): Promise<Result<void>> {
    return this.wrapAsync('enableAllSupabaseFeatures', async () => {
      await this.setFlag('useSupabaseAuth', true);
      await this.setFlag('useSupabaseTaskStorage', true);
      await this.setFlag('useSupabaseNotifications', true);
      await this.setFlag('enableRealTimeSync', true);
    });
  }
}

export default new FeatureFlagService();
