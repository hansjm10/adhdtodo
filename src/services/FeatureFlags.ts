// ABOUTME: Feature flag service for controlling rollout of new features
// Allows gradual migration from local to Supabase services

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeatureFlags {
  useSupabaseAuth: boolean;
  useSupabaseUserStorage: boolean;
  useSupabaseTaskStorage: boolean;
  useSupabaseNotifications: boolean;
  enableDataMigration: boolean;
  enableRealTimeSync: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  useSupabaseAuth: false,
  useSupabaseUserStorage: false,
  useSupabaseTaskStorage: false,
  useSupabaseNotifications: false,
  enableDataMigration: true,
  enableRealTimeSync: false,
};

class FeatureFlagService {
  private static STORAGE_KEY = '@feature_flags';
  private flags: FeatureFlags = { ...DEFAULT_FLAGS };
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(FeatureFlagService.STORAGE_KEY);
      if (stored) {
        this.flags = { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      this.flags = { ...DEFAULT_FLAGS };
      this.initialized = true;
    }
  }

  async setFlag(flag: keyof FeatureFlags, value: boolean): Promise<void> {
    await this.initialize();
    this.flags[flag] = value;

    try {
      await AsyncStorage.setItem(FeatureFlagService.STORAGE_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.error('Failed to save feature flags:', error);
    }
  }

  async getFlag(flag: keyof FeatureFlags): Promise<boolean> {
    await this.initialize();
    return this.flags[flag];
  }

  async getAllFlags(): Promise<FeatureFlags> {
    await this.initialize();
    return { ...this.flags };
  }

  async resetToDefaults(): Promise<void> {
    this.flags = { ...DEFAULT_FLAGS };
    try {
      await AsyncStorage.removeItem(FeatureFlagService.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset feature flags:', error);
    }
  }

  // Convenience methods for specific features
  async isSupabaseAuthEnabled(): Promise<boolean> {
    return this.getFlag('useSupabaseAuth');
  }

  async isDataMigrationEnabled(): Promise<boolean> {
    return this.getFlag('enableDataMigration');
  }

  async isRealTimeSyncEnabled(): Promise<boolean> {
    return this.getFlag('enableRealTimeSync');
  }

  // Enable Supabase features gradually
  async enableSupabaseAuth(): Promise<void> {
    await this.setFlag('useSupabaseAuth', true);
  }

  async enableAllSupabaseFeatures(): Promise<void> {
    await this.setFlag('useSupabaseAuth', true);
    await this.setFlag('useSupabaseUserStorage', true);
    await this.setFlag('useSupabaseTaskStorage', true);
    await this.setFlag('useSupabaseNotifications', true);
    await this.setFlag('enableRealTimeSync', true);
  }
}

export default new FeatureFlagService();
