// ABOUTME: Feature flag service for controlling rollout of new features
// Controls which services use Supabase vs local implementations

import { BaseService } from './BaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '../types/common.types';
import { supabase } from './SupabaseService';
import ConnectionMonitor from './ConnectionMonitor';

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
  private static REMOTE_CACHE_KEY = '@feature_flags_remote_cache';
  private static REMOTE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private flags: FeatureFlags = { ...DEFAULT_FLAGS };
  private initialized = false;
  private remoteLastFetched: Date | null = null;

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

  /**
   * Fetch feature flags from remote source with retry logic
   * This method demonstrates how to implement network-based feature flag fetching
   * with proper retry mechanisms and caching
   */
  async fetchRemoteFlags(): Promise<Result<FeatureFlags>> {
    return this.wrapAsync('fetchRemoteFlags', async () => {
      // Check if we have a recent cache
      if (this.remoteLastFetched) {
        const cacheAge = Date.now() - this.remoteLastFetched.getTime();
        if (cacheAge < FeatureFlagService.REMOTE_CACHE_DURATION) {
          this.logger.info('Using cached remote feature flags', {
            code: 'FEATURE_FLAGS_001',
            context: JSON.stringify({ cacheAge, maxAge: FeatureFlagService.REMOTE_CACHE_DURATION }),
          });
          return this.flags;
        }
      }

      // Check if connection is available
      if (!ConnectionMonitor.isConnectionAvailable()) {
        this.logger.warn('No connection available for remote feature flags', {
          code: 'FEATURE_FLAGS_002',
        });
        // Fall back to local/cached flags
        return this.flags;
      }

      // Fetch from remote with retry logic
      try {
        const remoteFlags = await ConnectionMonitor.executeWithRetry(
          async () => {
            // Example: Fetch from Supabase configuration table
            const result = await supabase.from('feature_flags').select('*').single();

            if (result.error) {
              throw result.error;
            }

            if (!result.data) {
              throw new Error('No feature flags found');
            }

            return result.data as FeatureFlags;
          },
          {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000,
          },
        );

        // Update local flags with remote values
        this.flags = { ...DEFAULT_FLAGS, ...remoteFlags };
        this.remoteLastFetched = new Date();

        // Cache the remote flags
        await AsyncStorage.setItem(
          FeatureFlagService.REMOTE_CACHE_KEY,
          JSON.stringify({
            flags: this.flags,
            fetchedAt: this.remoteLastFetched.toISOString(),
          }),
        );

        this.logger.info('Successfully fetched remote feature flags', {
          code: 'FEATURE_FLAGS_003',
          context: JSON.stringify({ flags: this.flags }),
        });

        return this.flags;
      } catch (error) {
        this.logger.warn('Failed to fetch remote feature flags, using local cache', {
          code: 'FEATURE_FLAGS_004',
          context: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        });

        // Try to load from cache
        try {
          const cached = await AsyncStorage.getItem(FeatureFlagService.REMOTE_CACHE_KEY);
          if (cached) {
            const { flags, fetchedAt } = JSON.parse(cached) as {
              flags: FeatureFlags;
              fetchedAt: string;
            };
            this.flags = { ...DEFAULT_FLAGS, ...flags };
            this.remoteLastFetched = new Date(fetchedAt);

            this.logger.info('Loaded feature flags from cache', {
              code: 'FEATURE_FLAGS_005',
              context: JSON.stringify({ cacheAge: Date.now() - this.remoteLastFetched.getTime() }),
            });
          }
        } catch (cacheError) {
          this.logger.error('Failed to load cached feature flags', {
            code: 'FEATURE_FLAGS_006',
            context: JSON.stringify({
              error: cacheError instanceof Error ? cacheError.message : String(cacheError),
            }),
          });
        }

        return this.flags;
      }
    });
  }

  /**
   * Initialize with remote flags if available
   * This method combines local and remote flag initialization
   */
  async initializeWithRemote(): Promise<Result<void>> {
    return this.wrapAsync('initializeWithRemote', async () => {
      // First initialize from local storage
      await this.initialize();

      // Then try to fetch remote flags
      const remoteResult = await this.fetchRemoteFlags();
      if (remoteResult.success && remoteResult.data) {
        // Remote flags will have been applied
        this.logger.info('Initialized with remote feature flags', {
          code: 'FEATURE_FLAGS_007',
        });
      }
    });
  }
}

export default new FeatureFlagService();
